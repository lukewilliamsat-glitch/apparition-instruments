import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createPreviewAccess} from './preview-access.mjs';

const [dir,manifest,commit]=process.argv.slice(2),root=resolve(dir);
const account=process.env.CLOUDFLARE_ACCOUNT_ID,project=process.env.CLOUDFLARE_PAGES_PROJECT;
const token=process.env.CLOUDFLARE_API_TOKEN,wrangler=process.env.WRANGLER_BIN;
const branch='staging',host='apparition-phoenix-preview.pages.dev';
const alias='https://'+branch+'.'+host;
assert(project==='apparition-phoenix-preview'&&/^[a-f0-9]{32}$/.test(account)&&token&&wrangler&&/^[a-f0-9]{40}$/.test(commit));
const {PHOENIX66_ACCESS_CLIENT_ID:clientId,PHOENIX66_ACCESS_CLIENT_SECRET:clientSecret,...uploadEnv}=process.env;
assert(clientId&&clientSecret);
const base='https://api.cloudflare.com/client/v4/accounts/'+account+'/pages/projects/'+project;
async function api(suffix=''){
 const r=await fetch(base+suffix,{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(12000)});
 assert(r.ok,'Cloudflare Pages API HTTP '+r.status);
 const b=await r.json();assert(b.success===true);return b.result;
}
const p=await api();
assert(p.name===project&&p.subdomain===host&&p.production_branch==='production'&&
 p.domains.length===1&&p.domains[0]===host&&(!p.source?.type||p.source.type==='direct_upload'),'Unexpected preview project or domain');
const baselineBefore=p.canonical_deployment?.id;
assert(baselineBefore,'Could not pin the existing protected baseline');
async function accessGate(target){
 const r=await fetch(target+'/',{redirect:'manual',signal:AbortSignal.timeout(12000)}),location=r.headers.get('location');
 await r.body?.cancel();
 const found=location?new URL(location,target):null;
 assert(r.status>=300&&r.status<400&&found?.protocol==='https:'&&found.hostname.endsWith('.cloudflareaccess.com')&&found.pathname.startsWith('/cdn-cgi/access/login/'),
 'Cloudflare Access gate missing at '+target+' ('+r.status+')');
}
await Promise.all([accessGate('https://nightfall.'+host),accessGate('https://'+host),accessGate(alias)]);
const paths=['_headers','app.mjs','config.mjs','index.html','style.css'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const inventory=JSON.parse(await readFile(manifest,'utf8'));
const list=(await readdir(root,{recursive:true,withFileTypes:true})).filter(x=>!x.isDirectory()).map(x=>{
 assert(x.isFile());return resolve(x.parentPath,x.name).slice(root.length+1);
}).sort();
assert.deepEqual(list,paths);
assert.deepEqual(inventory.map(x=>x.path),paths);
const db='https://prwmowexhonguvtiywsy.supabase.co';
for(const e of inventory){
 const bytes=await readFile(resolve(root,e.path));assert(bytes.length===e.bytes&&hash(bytes)===e.sha256);
 const source=bytes.toString('utf8');
 assert(!/acdxpxvksvdwfajntzfx|sb_secret_|sk_live_|rk_live_|whsec_|api\.stripe\.com/.test(source));
 for(const found of source.matchAll(/https:\/\/[^'"; ]+?\.supabase\.co/g)) assert.equal(found[0],db);
}
assert((await readFile(resolve(root,'_headers'),'utf8')).includes("connect-src "+db+';'));
const config=await readFile(resolve(root,'config.mjs'),'utf8');
const publicKey=config.match(/'((?:sb_publishable_)[A-Za-z0-9_-]+)'/)?.[1];
assert(publicKey);
async function stagingGet(path,options={}){
 const target=new URL(path,db);
 assert.equal(target.origin,db);
 return fetch(target,{...options,headers:{apikey:publicKey,...options.headers},redirect:'error',signal:AbortSignal.timeout(15000)});
}
const known=await stagingGet('/rest/v1/catalogue_components?select=id&id=in.(fixture-staging-cap,fixture-staging-pot)&limit=2');
assert.equal(known.status,200,'Synthetic catalogue public contract mismatch');
assert.deepEqual((await known.json()).map(x=>x.id).sort(),['fixture-staging-cap','fixture-staging-pot']);
const disable=await stagingGet('/functions/v1/create-checkout',{method:'POST',headers:{Origin:alias,'Content-Type':'application/json'},body:'{}'});
assert.equal(disable.status,503,'Expected staging checkout to fail closed without Sandbox keys');
assert.match((await disable.json()).message,/not configured/i);
const unauthorized=await stagingGet('/functions/v1/stripe-webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
assert([400,401,403,503].includes(unauthorized.status),'Unsigned staging webhook was not denied');
await unauthorized.body?.cancel();
const started=Date.now();
const upload=spawnSync(wrangler,['pages','deploy',root,'--project-name',project,'--branch',branch,'--commit-hash',commit,'--commit-dirty=true'],
 {stdio:'inherit',timeout:180000,env:{...uploadEnv,WRANGLER_SEND_METRICS:'false'}});
assert.equal(upload.status,0,'Preview upload did not confirm success; check current provider state before any retry');
const row=(await api('/deployments?env=preview&per_page=20')).find(d=>d.environment==='preview'&&
 d.deployment_trigger?.metadata?.branch===branch&&d.deployment_trigger.metadata.commit_hash===commit&&Date.parse(d.created_on)>started-60000);
assert(row?.latest_stage?.name==='deploy'&&row.latest_stage.status==='success');
const origin=new URL(row.url).origin;
const access=createPreviewAccess(origin,project,{clientId,clientSecret});
await access.assertProtected();
await accessGate(alias);
for(const path of ['index.html','app.mjs','config.mjs','style.css']){
 const r=await access.get(path==='index.html'?'/':'/'+path),e=inventory.find(row=>row.path===path),b=Buffer.from(await r.arrayBuffer());
 assert.equal(hash(b),e.sha256,'Served bytes differed: '+path);
 if(path==='index.html'){
  assert(r.headers.get('x-robots-tag')?.includes('noindex'));
  assert(r.headers.get('content-security-policy')?.includes("connect-src "+db+';'));
 }
}
assert.equal((await api()).canonical_deployment?.id,baselineBefore,'Preview changed the production-branch deployment');
console.log(JSON.stringify({source:commit,preview:origin,alias,deploymentId:row.id,inventoryDigest:hash(JSON.stringify(inventory)),hostedStaging:true,syntheticCatalogue:true,paymentsEnabled:false,privateAccess:true}));

import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createPreviewAccess} from './preview-access.mjs';

const [dir,manifest,commit]=process.argv.slice(2),root=resolve(dir);
const account=process.env.CLOUDFLARE_ACCOUNT_ID,project=process.env.CLOUDFLARE_PAGES_PROJECT;
const token=process.env.CLOUDFLARE_API_TOKEN,wrangler=process.env.WRANGLER_BIN;
const branch='commerce67',host='apparition-phoenix-preview.pages.dev';
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
async function accessGate(target){
 const r=await fetch(target+'/',{redirect:'manual',signal:AbortSignal.timeout(12000)}),location=r.headers.get('location');
 await r.body?.cancel();
 const found=location?new URL(location,target):null;
 assert(r.status>=300&&r.status<400&&found?.protocol==='https:'&&found.hostname.endsWith('.cloudflareaccess.com')&&found.pathname.startsWith('/cdn-cgi/access/login/'),
 'Cloudflare Access gate missing at '+target+' ('+r.status+')');
}
await Promise.all([accessGate('https://nightfall.'+host),accessGate('https://'+host),accessGate(alias)]);
const paths=['_headers','admin/data.mjs','backend/public-config.mjs','commercial/commerce67-activation.mjs','commercial/commerce67-admin.mjs',
 'commercial/commerce67-client.mjs','commercial/offers.mjs','index.html','preview.css','preview.mjs'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const inventory=JSON.parse(await readFile(manifest,'utf8'));
const list=(await readdir(root,{recursive:true,withFileTypes:true})).filter(x=>!x.isDirectory()).map(x=>{
 assert(x.isFile());return resolve(x.parentPath,x.name).slice(root.length+1);
}).sort();
assert.deepEqual(list,paths);
assert.deepEqual(inventory.map(x=>x.path),paths);
for(const e of inventory){
 const bytes=await readFile(resolve(root,e.path));assert(bytes.length===e.bytes&&hash(bytes)===e.sha256);
 assert(!bytes.includes('.supabase.co')&&!bytes.includes('api.stripe.com')&&!bytes.includes('sb_secret_'));
}
assert((await readFile(resolve(root,'_headers'),'utf8')).includes("connect-src 'none'"));
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
for(const path of ['index.html','preview.mjs','commercial/commerce67-admin.mjs','backend/public-config.mjs']){
 const r=await access.get(path==='index.html'?'/':'/'+path),e=inventory.find(row=>row.path===path),b=Buffer.from(await r.arrayBuffer());
 assert.equal(hash(b),e.sha256,'Served bytes differed: '+path);
 if(path==='index.html'){
  assert(r.headers.get('x-robots-tag')?.includes('noindex'));
  assert(r.headers.get('content-security-policy')?.includes("connect-src 'none'"));
 }
}
assert.equal((await api()).canonical_deployment?.id,baselineBefore,'Preview changed the production-branch deployment');
console.log(JSON.stringify({source:commit,preview:origin,alias,deploymentId:row.id,inventoryDigest:hash(JSON.stringify(inventory)),fixturesOnly:true,privateAccess:true}));

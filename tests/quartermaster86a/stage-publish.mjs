import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createPreviewAccess} from './preview-access.mjs';

const [directory,manifestPath,commit]=process.argv.slice(2);
const root=resolve(directory);
const project='apparition-phoenix-preview';
const host=project+'.pages.dev';
const branch='quartermaster86a-stage';
const alias='https://'+branch+'.'+host;
const expectedProduction='69408aa8-4b4c-4dd8-a302-6a738dd37bf9';
const expectedPreviewBaseline='a73b0e75-fd2c-4321-953d-c6c173e9ecfe';
const priorPreview='032858b8-d443-4456-84dd-e67020089e5c';
const {PHOENIX66_ACCESS_CLIENT_ID:clientId,PHOENIX66_ACCESS_CLIENT_SECRET:clientSecret,
  CLOUDFLARE_ACCOUNT_ID:account,CLOUDFLARE_PAGES_PROJECT:configured,CLOUDFLARE_API_TOKEN:token,
  WRANGLER_BIN:wrangler,...env}=process.env;
assert(configured===project && /^[a-f0-9]{32}$/.test(account) && /^[a-f0-9]{40}$/.test(commit));
assert(token&&clientId&&clientSecret&&wrangler);
const apiBase='https://api.cloudflare.com/client/v4/accounts/'+account+'/pages/projects/';
async function metadata(name,path='') {
  const response=await fetch(apiBase+name+path,{headers:{Authorization:'Bearer '+token},
    redirect:'error',signal:AbortSignal.timeout(12000)});
  assert(response.ok,'Pages metadata HTTP '+response.status);
  const data=await response.json();
  assert.equal(data.success,true);
  return data.result;
}
const digest=data=>createHash('sha256').update(data).digest('hex');
const manifestBytes=await readFile(manifestPath);
assert.equal(digest(manifestBytes),'47a067eb30c049a58609bf9a05558e7f59a35c4efd3faf54cc362ac0f8999ccc');
const manifest=JSON.parse(manifestBytes);
const names=(await readdir(root,{recursive:true,withFileTypes:true})).filter(e=>!e.isDirectory()).map(e=>{
  assert(e.isFile());
  return resolve(e.parentPath,e.name).slice(root.length+1);
}).sort();
assert.equal(names.length,20);
assert.deepEqual(names,manifest.map(e=>e.path));
for(const name of names) {
  const row=manifest.find(e=>e.path===name);
  const data=await readFile(resolve(root,name));
  assert.equal(data.length,row.bytes);
  assert.equal(digest(data),row.sha256);
  assert(!/acdxpxvksvdwfajntzfx|stripe\.com|ebay\.com|sb_secret_|sk_live_|whsec_|apparitioninstruments\.co\.uk|\/functions\/v1/.test(data.toString()),
    'Unexpected production reference in '+name);
}
const [preview,production,list]=await Promise.all([metadata(project),metadata('apparition-instruments'),
  metadata(project,'/deployments?env=preview&per_page=25')]);
assert(preview.name===project&&preview.subdomain===host&&preview.production_branch==='production');
assert.deepEqual(preview.domains,[host]);
assert(!preview.source?.type||preview.source.type==='direct_upload');
assert.equal(preview.canonical_deployment?.id,expectedPreviewBaseline);
assert.equal(production.canonical_deployment?.id,expectedProduction);
assert.equal(preview.latest_deployment?.id,priorPreview);
assert(!list.some(d=>d.deployment_trigger?.metadata?.branch===branch),'A QUARTERMASTER preview already exists');
console.log('Preview recovery: canonical '+preview.canonical_deployment.id+'; previous latest '+preview.latest_deployment.id);
const projectURL='https://prwmowexhonguvtiywsy.supabase.co';
const cfg=(await readFile(resolve(root,'backend/public-config.mjs'),'utf8')).match(/publishableKey:'(sb_publishable_[A-Za-z0-9_-]+)'/);
assert(cfg);
const readiness=await fetch(projectURL+'/rest/v1/rpc/quartermaster86_page?p_section=overview',{headers:{apikey:cfg[1]},redirect:'error',signal:AbortSignal.timeout(10000)});
const deny=await readiness.json();
assert.equal(readiness.status,401,'Verified staging RPC must exist and deny anonymous access');
assert.equal(deny.code,'42501');

async function assertGate(origin,path='/'){
  const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(12000)});
  const raw=response.headers.get('location');
  const location=raw?new URL(raw,origin):null;
  await response.body?.cancel();
  assert(response.status>=300&&response.status<400&&location?.protocol==='https:'&&
    location.hostname.endsWith('.cloudflareaccess.com')&&location.pathname.startsWith('/cdn-cgi/access/login/'),
    'Preview Access gate missing on '+path+' (HTTP '+response.status+')');
}
await Promise.all([assertGate('https://'+host),assertGate(alias),assertGate(alias,'/admin/quartermaster/'),
  assertGate(alias,'/hq.mjs')]);

const start=Date.now();
const upload=spawnSync(wrangler,['pages','deploy',root,'--project-name',project,'--branch',branch,
  '--commit-hash',commit,'--commit-dirty=true'],{stdio:'inherit',timeout:180000,
  env:{...env,CLOUDFLARE_ACCOUNT_ID:account,CLOUDFLARE_API_TOKEN:token,WRANGLER_SEND_METRICS:'false'}});
assert.equal(upload.status,0,'Upload uncertain. Inspect provider state before any further action.');
const rows=(await metadata(project,'/deployments?env=preview&per_page=25')).filter(d=>d.environment==='preview'&&
 d.deployment_trigger?.metadata?.branch===branch&&d.deployment_trigger.metadata.commit_hash===commit&&Date.parse(d.created_on)>start-60000);
assert.equal(rows.length,1);
const [deployment]=rows;
assert.equal(deployment.latest_stage?.status,'success');
const origin=new URL(deployment.url).origin;
const access=createPreviewAccess(origin,project,{clientId,clientSecret});
await access.assertProtected();
await Promise.all(['/','/admin/orders/','/admin/quartermaster/','/hq.mjs'].map(path=>assertGate(alias,path)));
await Promise.all(['/admin/orders/','/admin/quartermaster/','/hq.mjs'].map(path=>assertGate(origin,path)));
for (const row of manifest.filter(row=>row.path!=='_headers')) {
  const missing=row.path==='404.html';
  const response=await access.get(missing?'/__quartermaster86a_missing__':'/'+row.path.replace(/index\.html$/,''),missing?404:200);
  assert.equal(digest(Buffer.from(await response.arrayBuffer())),row.sha256,'Readback mismatch '+row.path);
  if(!missing){
    assert(response.headers.get('content-security-policy')?.includes("connect-src https://prwmowexhonguvtiywsy.supabase.co;"));
    assert(response.headers.get('x-robots-tag')?.includes('noindex'));
  }
}
assert.equal((await metadata(project)).canonical_deployment?.id,expectedPreviewBaseline);
assert.equal((await metadata('apparition-instruments')).canonical_deployment?.id,expectedProduction);
console.log(JSON.stringify({id:deployment.id,origin,alias,project,branch,commit,files:manifest.length,
  production:expectedProduction,privateAccess:true,stageBackend:'prwmowexhonguvtiywsy'}));

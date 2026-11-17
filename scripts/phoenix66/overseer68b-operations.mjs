import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {setTimeout as wait} from 'node:timers/promises';
import {immutableHost,verifyGate} from './stage-baseline.mjs';
const account='5ecc2102d615e638e3b0ec932f941232',project='apparition-instruments',apex='https://apparitioninstruments.co.uk';
const rollback='7bfe4df0-02be-4bf2-9130-7e200be3688d',baseline='afbac1358e782b588d222960eebb03f170a026bb';
const overlay=['admin/site-operations/index.html','admin/site-operations/operations.css','admin/site-operations/operations.mjs',
 'admin/overseer-typography.css','backend/operations-admin.mjs'];
const transport='backend/providers.mjs';
const changed=[...overlay,transport].sort();
const [[mode,dist,artifact],candidate]=[process.argv.slice(2,5),process.argv[5]];
assert(/^[a-f0-9]{40}$/.test(candidate),'Immutable source required');
const root=resolve(artifact),full=resolve(root,'release'),prior=resolve(root,'nightfall');
const sha=b=>createHash('sha256').update(b).digest('hex');
async function inventory(dir){
 const out={};
 for(const entry of await readdir(dir,{recursive:true,withFileTypes:true})){
  if(entry.isDirectory())continue;
  assert(entry.isFile(),'Nonregular file in payload');
  const at=resolve(entry.parentPath,entry.name);
  out[at.slice(dir.length+1)]=sha(await readFile(at));
 }
 return Object.fromEntries(Object.entries(out).sort());
}
async function readback(data,files){
 for(const f of files){
  assert(data[f],'Missing readback asset '+f);
  const path=f==='index.html'?'/':f.endsWith('/index.html')?'/'+f.slice(0,-10):'/'+f;
  const r=await fetch(apex+path+'?overseer68b='+data[f].slice(0,18),{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)});
  assert.equal(r.status,200,'Unexpected public HTTP at '+path);
  const b=Buffer.from(await r.arrayBuffer());assert(b.length<5*1024*1024);
  assert.equal(sha(b),data[f],'Public byte readback differs: '+path);
 }
}
const smoke=['index.html','checkout/index.html','admin/index.html','admin/orders/index.html','operations/snapshot.json','backend/component-data.mjs','products/bleed-cap/image.png'];
if(mode==='prepare'){
 const base=await inventory(prior),receipt=JSON.parse(await readFile(resolve(root,'receipt.json'),'utf8'));
 assert(receipt.payloads.nightfall.applicationCommit===baseline&&Object.keys(base).length===460);
 assert.deepEqual(base,Object.fromEntries(receipt.payloads.nightfall.files.map(f=>[f.path,f.sha256]).sort()));
 const p=spawnSync('cp',['-a',prior,full],{stdio:'inherit'});assert.equal(p.status,0);
 for(const file of overlay){
  let bytes=await readFile(resolve(dist,file));
  if(file==='backend/operations-admin.mjs'){
   let t=bytes.toString('utf8');
   const s=t.indexOf('deliveryRead:'),e=t.indexOf('destinations:');
   assert(s>=0&&e>s);t=t.slice(0,s)+t.slice(e);
   bytes=Buffer.from(t);
  }
  await mkdir(dirname(resolve(full,file)),{recursive:true});
  await writeFile(resolve(full,file),bytes);
 }
 const filename=resolve(full,transport),contents=await readFile(filename,'utf8'),anchor="'rpc/set_store_operations',";
 assert.equal(contents.split(anchor).length,2);assert(!contents.includes("'rpc/get_site_operations'"));
 await writeFile(filename,contents.replace(anchor,anchor+"'rpc/get_site_operations',"));
 const release=await inventory(full);
 assert.deepEqual([...new Set([...Object.keys(base),...Object.keys(release)])].filter(f=>base[f]!==release[f]).sort(),changed);
 await writeFile(resolve(root,'operations-receipt.json'),JSON.stringify({candidate,rollback,base,release,changed},null,2));
 await readback(base,['admin/site-operations/index.html',...smoke]);
 console.log('PASS: exact verified production baseline and isolated Operations-only payload');
}else if(mode==='publish'){
 assert(process.env.OVERSEER68B_OPERATIONS==='true'&&process.env.CLOUDFLARE_ACCOUNT_ID===account);
 const token=process.env.CLOUDFLARE_API_TOKEN,wrangler=process.env.WRANGLER_BIN;assert(token&&wrangler);
 const data=JSON.parse(await readFile(resolve(root,'operations-receipt.json'),'utf8'));
 assert.equal(data.candidate,candidate);assert.equal(data.rollback,rollback);assert.deepEqual(data.changed,changed);
 assert.deepEqual(await inventory(full),data.release);
 assert.deepEqual([...new Set([...Object.keys(data.base),...Object.keys(data.release)])].filter(f=>data.base[f]!==data.release[f]).sort(),changed);
 const path='https://api.cloudflare.com/client/v4/accounts/'+account+'/pages/projects/'+project;
 async function api(s=''){const r=await fetch(path+s,{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(10000)});assert(r.ok,'Pages verification HTTP '+r.status);const v=await r.json();assert.equal(v.success,true);return v.result;}
 const p=await api(),old=await api('/deployments/'+rollback);
 assert(p.name===project&&p.production_branch==='production'&&p.canonical_deployment?.id===rollback&&(!p.source?.type||p.source.type==='direct_upload'),'Production baseline changed');
 assert(old.id===rollback&&old.environment==='production'&&old.latest_stage?.status==='success'&&old.deployment_trigger?.metadata?.commit_hash===baseline,'Rollback unavailable');
 assert.deepEqual((await api('/domains')).map(d=>[d.name,d.status]).sort(),[['apparitioninstruments.co.uk','active'],['www.apparitioninstruments.co.uk','active']]);
 await verifyGate('https://apparition-instruments.pages.dev');await verifyGate(immutableHost(old.url));
 await readback(data.base,['admin/site-operations/index.html',...smoke]);
 assert.equal((await api()).canonical_deployment?.id,rollback);
 assert.equal(spawnSync(wrangler,['pages','deploy',full,'--project-name',project,'--branch','production','--commit-hash',candidate,'--commit-message','OVERSEER 68B Operations only','--commit-dirty=true'],{stdio:'inherit',timeout:180000,env:{...process.env,WRANGLER_SEND_METRICS:'false'}}).status,0);
 const result=(await api()).canonical_deployment;
 assert(result.environment==='production'&&result.latest_stage?.status==='success'&&result.deployment_trigger?.metadata?.commit_hash===candidate&&result.id!==rollback);
 console.log(JSON.stringify({deployment:result.id,candidate,rollback,manifestSha256:sha(Buffer.from(JSON.stringify(data.release)))}));
 await wait(12000);await readback(data.release,[...changed,...smoke]);await verifyGate(immutableHost(result.url));
 assert.equal((await api('/deployments/'+rollback)).id,rollback);assert.equal((await api()).canonical_deployment?.id,result.id);
 console.log('PASS: live Operations assets, public storefront sentinels, Access and current rollback verified');
}else throw Error('Explicit operations release mode required');

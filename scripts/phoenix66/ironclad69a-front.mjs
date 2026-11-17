import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,mkdir,cp} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {setTimeout as wait} from 'node:timers/promises';
import {immutableHost,verifyGate} from './stage-baseline.mjs';
const account='5ecc2102d615e638e3b0ec932f941232',project='apparition-instruments',apex='https://apparitioninstruments.co.uk';
const rollback='2433ee1f-5623-4c3c-8327-a90a968c545c',baseline='f277e1ec0f5ab4fb8630ad48ebf1efa81a7d8877';
const [mode,input,folder,candidate]=process.argv.slice(2);
assert(/^[a-f0-9]{40}$/.test(candidate));
const root=resolve(folder),prior=resolve(root,'release'),full=resolve(root,'candidate');
const overlay=['admin/ironclad/index.html','admin/ironclad/estimator.mjs','admin/ironclad/armoury.css','admin/ironclad/model.mjs'];
const changed=['admin/index.html',...overlay].sort();
const smoke=['index.html','checkout/index.html','admin/index.html','admin/orders/index.html','admin/site-operations/index.html','operations/snapshot.json','backend/component-data.mjs','products/bleed-cap/image.png'];
const sha=b=>createHash('sha256').update(b).digest('hex');
async function inventory(dir){
 const out={};
 for(const item of await readdir(dir,{recursive:true,withFileTypes:true})){
  if(item.isDirectory())continue;assert(item.isFile(),'Nonregular package file');
  const f=resolve(item.parentPath,item.name);out[f.slice(dir.length+1)]=sha(await readFile(f));
 }
 return Object.fromEntries(Object.entries(out).sort());
}
const diff=(a,b)=>[...new Set([...Object.keys(a),...Object.keys(b)])].filter(f=>a[f]!==b[f]).sort();
async function readback(data,files){
 for(const f of new Set(files)){
  assert(data[f]);
  const route=f==='index.html'?'/':f.endsWith('/index.html')?'/'+f.slice(0,-10):'/'+f;
  const r=await fetch(apex+route+'?ironclad69a='+data[f].slice(0,18),{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
  assert.equal(r.status,200);const b=Buffer.from(await r.arrayBuffer());assert.equal(sha(b),data[f],'Served bytes differ: '+route);
 }
}
if(mode==='prepare'){
 const receipt=JSON.parse(await readFile(resolve(root,'operations-receipt.json'),'utf8')),base=await inventory(prior);
 assert.equal(receipt.candidate,baseline);assert.deepEqual(base,receipt.release);assert(base['admin/site-operations/index.html']);
 await cp(prior,full,{recursive:true,errorOnExist:true,force:false});
 for(const f of overlay){
  const src=f.endsWith('index.html')||f.endsWith('estimator.mjs')?'release-overlays/ironclad69a-frontend/':'dist/';
  const bytes=await readFile(resolve(input,src+f));const s=bytes.toString('utf8');
  assert(!/fixture|supabase\.co|\/rest\/v1|sessionStorage|localStorage|XMLHttpRequest|\bfetch\s*\(/i.test(s));
  if(f.endsWith('index.html')){assert(s.includes('src="/admin/admin-gate.mjs" data-admin-entry="./estimator.mjs"'));assert(s.includes('not active on the live site'));assert(!s.includes('admin-authorized'));}
  const dest=resolve(full,f);await mkdir(dirname(dest),{recursive:true});await writeFile(dest,bytes,{flag:'wx'});
 }
 const f=resolve(full,'admin/index.html'),body=await readFile(f,'utf8'),tag='<main id="main" class="admin-main">';
 assert.equal(body.split(tag).length,2);assert(!body.includes('href="/admin/ironclad/"'));
 await writeFile(f,body.replace(tag,tag+'<p class="storage-note"><a href="/admin/ironclad/">IRONCLAD: The Armoury</a> · Landed cost calculator</p>'));
 const release=await inventory(full);assert.deepEqual(diff(base,release),changed);
 await writeFile(resolve(root,'ironclad69a-receipt.json'),JSON.stringify({candidate,rollback,base,release,changed},null,2));
 await readback(base,smoke);
 console.log('PASS: current Operations production and exact five-file frontend overlay');
}else if(mode==='publish'){
 assert(process.env.IRONCLAD69A_FRONT_ONLY==='true'&&process.env.CLOUDFLARE_ACCOUNT_ID===account);
 const token=process.env.CLOUDFLARE_API_TOKEN,wrangler=process.env.WRANGLER_BIN;assert(token&&wrangler);
 const data=JSON.parse(await readFile(resolve(root,'ironclad69a-receipt.json'),'utf8'));
 assert.equal(data.candidate,candidate);assert.equal(data.rollback,rollback);assert.deepEqual(data.changed,changed);
 assert.deepEqual(await inventory(full),data.release);assert.deepEqual(diff(data.base,data.release),changed);
 const path='https://api.cloudflare.com/client/v4/accounts/'+account+'/pages/projects/'+project;
 async function api(append=''){const r=await fetch(path+append,{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(10000)});
  assert(r.ok,'Pages verification HTTP '+r.status);const v=await r.json();assert.equal(v.success,true);return v.result;}
 const p=await api(),old=await api('/deployments/'+rollback);
 assert(p.name===project&&p.production_branch==='production'&&p.canonical_deployment?.id===rollback&&(!p.source?.type||p.source.type==='direct_upload'));
 assert(old.id===rollback&&old.environment==='production'&&old.latest_stage?.status==='success'&&old.deployment_trigger?.metadata?.commit_hash===baseline);
 assert.deepEqual((await api('/domains')).map(d=>[d.name,d.status]).sort(),[['apparitioninstruments.co.uk','active'],['www.apparitioninstruments.co.uk','active']]);
 await verifyGate('https://apparition-instruments.pages.dev');await verifyGate(immutableHost(old.url));
 await readback(data.base,smoke);assert.equal((await api()).canonical_deployment?.id,rollback);
 assert.equal(spawnSync(wrangler,['pages','deploy',full,'--project-name',project,'--branch','production','--commit-hash',candidate,'--commit-message','IRONCLAD 69A frontend calculator only','--commit-dirty=true'],{stdio:'inherit',timeout:180000,env:{...process.env,WRANGLER_SEND_METRICS:'false'}}).status,0);
 const result=(await api()).canonical_deployment;
 assert(result.environment==='production'&&result.latest_stage?.status==='success'&&result.deployment_trigger?.metadata?.commit_hash===candidate&&result.id!==rollback);
 console.log(JSON.stringify({deployment:result.id,candidate,rollback,manifestSha256:sha(JSON.stringify(data.release)),frontendOnly:true}));
 await wait(12000);await readback(data.release,[...changed,...smoke]);await verifyGate(immutableHost(result.url));
 assert.equal((await api('/deployments/'+rollback)).id,rollback);assert.equal((await api()).canonical_deployment?.id,result.id);
 console.log('PASS: Admin entry and estimator bytes, established storefront sentinels, Access and rollback');
}else throw Error('Explicit IRONCLAD frontend mode required');

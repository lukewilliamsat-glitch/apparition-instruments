// Cloudflare can only receive the two verified static packages on a staging project.
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root=resolve(process.argv[2]);
const account=process.env.CLOUDFLARE_ACCOUNT_ID,project=process.env.CLOUDFLARE_PAGES_PROJECT,token=process.env.CLOUDFLARE_API_TOKEN,wrangler=process.env.WRANGLER_BIN;
assert(/^[a-f0-9]{32}$/.test(account||'')&&/^apparition-phoenix(?:-[a-z0-9]+){1,4}$/.test(project||'')&&token&&wrangler,'Set the preview-scoped account, project, token and pinned Wrangler binary.');
assert.equal(process.env.PHOENIX66_PREVIEW_ONLY,'true','Explicit preview flag is required.');
const host=project+'.pages.dev', base='https://api.cloudflare.com/client/v4/accounts/'+account+'/pages/projects/'+project;
async function metadata(suffix=''){
 const r=await fetch(base+suffix,{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(15000)});
 assert(r.ok,'Cloudflare Pages API rejected the request ('+r.status+').');
 const body=await r.json();
 assert(body.success===true,'Cloudflare Pages API did not confirm success.');
 return body.result;
}
const settings=await metadata();
assert(settings.name===project&&settings.subdomain===host&&settings.production_branch==='production','Unexpected staging project identity or production branch.');
assert(!settings.source?.type,'Expected an isolated Direct Upload project.');
assert(Array.isArray(settings.domains)&&settings.domains.every(domain=>domain===host),'Preview project has a custom domain.');

const receipt=JSON.parse(await readFile(resolve(root,'receipt.json'),'utf8'));
assert(receipt.sourceRun===43703349542&&receipt.sourceArtifact===14157650445,'Unexpected baseline provenance.');
const expected={
 baseline:{commit:'53331335fe3f1418bc8ea77b82e29ef5ae58c9f1',digest:'d82ba2358bd5e5d4a6bc803f1c092cecd707cfb27a2e515b220281d4f29101b5'},
 nightfall:{commit:'afbac1358e782b588d222960eebb03f170a026bb',digest:'1c462ac8fcaad2becb39aeb3a7f003789e8a843f127b55890db3af4afaf20412'}
};
const sha=value=>createHash('sha256').update(value).digest('hex');
async function listing(dir,prefix=''){
 const result=[];
 for(const e of await readdir(dir,{withFileTypes:true})){
  const path=prefix+e.name;
  assert(e.isFile()||e.isDirectory(),'Non-regular static asset.');
  if(e.isDirectory())result.push(...await listing(resolve(dir,e.name),path+'/'));else result.push(path);
 }
 return result;
}
for(const [label,pin] of Object.entries(expected)){
 const item=receipt.payloads[label],assetRoot=resolve(root,label);
 assert(item.applicationCommit===pin.commit&&item.payloadDigest===pin.digest&&item.files.length===460);
 const sorted=[...item.files].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 assert.equal(sha(JSON.stringify(sorted.map(({bytes,path,sha256})=>({bytes,path,sha256})))),pin.digest,'Unapproved inventory');
 assert.deepEqual((await listing(assetRoot)).sort(),sorted.map(x=>x.path));
 for(const entry of sorted){
  const b=await readFile(resolve(assetRoot,entry.path));
  assert(b.byteLength===entry.bytes&&sha(b)===entry.sha256,'Asset digest differs: '+entry.path);
 }
}
for(const [label,pin] of Object.entries(expected)){
 const branch='phoenix66-'+label;
 const r=spawnSync(wrangler,['pages','deploy',resolve(root,label),'--project-name',project,'--branch',branch,'--commit-hash',pin.commit,'--commit-dirty=true'],
     {stdio:'inherit',timeout:180000,env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
 assert.equal(r.status,0,'Preview upload was not confirmed for '+label);
 const deployments=await metadata('/deployments?env=preview&per_page=20');
 const d=deployments.find(d=>d.environment==='preview'&&d.deployment_trigger?.metadata?.branch===branch&&d.deployment_trigger.metadata.commit_hash===pin.commit);
 assert(d&&d.latest_stage?.name==='deploy'&&d.latest_stage?.status==='success','Preview identity or success could not be read back.');
 const u=new URL(d.url);
 assert(u.protocol==='https:'&&u.hostname.endsWith('.'+host)&&!u.username&&!u.password,'Unexpected preview URL.');
 console.log(JSON.stringify({kind:label,source:pin.commit,payloadDigest:pin.digest,deploymentId:d.id,preview:u.origin}));
}

// Data-only Git branch. Local fixture remotes are supported by these functions;
// the Actions entry point fixes the sole production repository and branch.
import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {readFile,writeFile,mkdir,cp,readdir,stat} from 'node:fs/promises';import {join,dirname} from 'node:path';
import {verifyArchive,sha} from './trusted-image-publisher.mjs';import {validateImageManifest} from '../dist/backend/catalogue-image-delivery.mjs';import {planImageAssets} from './catalogue-image-assets.mjs';
const exec=promisify(execFile);export const assetBranch='catalogue-image-assets',initialisationTag='catalogue-images-initialised';
export async function archiveRefs({remote,env}){const {stdout}=await exec('git',['ls-remote',remote,'refs/heads/'+assetBranch,'refs/tags/'+initialisationTag],{env:env||process.env,timeout:30000,maxBuffer:1024*1024});const refs=new Map(stdout.trim().split('\n').filter(Boolean).map(v=>{const [hash,ref]=v.split(/\s+/);if(!/^[a-f0-9]{40}$/.test(hash))throw Error('Invalid archive ref');return [ref,hash];}));return {head:refs.get('refs/heads/'+assetBranch)||null,marker:refs.get('refs/tags/'+initialisationTag)||null};}
const pathPattern=/^assets\/catalogue-images\/(?:[a-f0-9]{64}\.(?:png|jpg|webp)|manifest(?:\.[a-f0-9]{64})?\.json)$/;
async function git(root,args,env){const {stdout}=await exec('git',['-C',root,...args],{env:env||process.env,maxBuffer:520*1024*1024});return stdout.trim();}
function validFile(path,bytes){try{const leaf=path.split('/').pop();if(leaf.startsWith('manifest')){const m=validateImageManifest(JSON.parse(bytes));return sha(JSON.stringify(m.entries))===m.revision&&(leaf==='manifest.json'||leaf==='manifest.'+m.revision+'.json');}const hash=leaf.split('.')[0],mime=leaf.endsWith('.png')?'image/png':leaf.endsWith('.jpg')?'image/jpeg':'image/webp';return bytes.length<=8*1024*1024&&sha(bytes)===hash&&planImageAssets([{id:'verify',image:'data:'+mime+';base64,'+bytes.toString('base64')}]).manifest.entries.verify.assetHash===hash;}catch{return false;}}
async function blob(root,commit,path,env){const r=await exec('git',['-C',root,'show',commit+':'+path],{env:env||process.env,encoding:'buffer',maxBuffer:12*1024*1024});return r.stdout;}
export async function recoverStore(root,env){
 const listing=await git(root,['ls-tree','-r','--format=%(objectmode) %(path)','HEAD'],env),files=listing?listing.split('\n'):[];const existing=new Set(files.map(x=>x.slice(7)));const historyPaths=(await git(root,['log','--format=','--name-only','--','assets/catalogue-images'],env)).split('\n').filter(Boolean);for(const path of new Set(historyPaths)){if(!pathPattern.test(path))throw Error('Unexpected historical asset path');if(!existing.has(path))files.push('100644 '+path);}if(files.length>10000)throw Error('Durable file limit');let bytesTotal=0;const repaired=[];
 for(const entry of files){const [mode,path]=entry.split(' ');if(mode!=='100644'||!pathPattern.test(path))throw Error('Unexpected durable branch object');let bytes;try{bytes=await readFile(join(root,path));}catch(e){if(e.code!=='ENOENT')throw e;bytes=Buffer.alloc(0);}bytesTotal+=bytes.length;if(bytesTotal>256*1024*1024)throw Error('Durable archive exceeds 256 MiB');if(validFile(path,bytes))continue;
  const history=(await git(root,['log','--format=%H','--',path],env)).split('\n').filter(Boolean);if(history.length>1000)throw Error('Recovery history limit');let recovered;
  for(const commit of history){let candidate;try{candidate=await blob(root,commit,path,env);}catch(e){if(e.code===128&&String(e.stderr).includes('does not exist in'))continue;throw e;}if(validFile(path,candidate)){recovered=candidate;break;}}
  if(!recovered)throw Error('No verified historical copy: '+path);bytesTotal+=recovered.length-bytes.length;if(bytesTotal>256*1024*1024)throw Error('Recovered archive exceeds 256 MiB');await mkdir(dirname(join(root,path)),{recursive:true});await writeFile(join(root,path),recovered);repaired.push(path);
 }
 const archive=await verifyArchive(root);return {...archive,repaired};
}
export async function openStore({root,remote,initial=false,allowUninitialised=false,env}){
 await mkdir(root,{recursive:true});await git(root,['init','-q'],env);await git(root,['remote','add','origin',remote],env);
 const refs=await archiveRefs({remote,env});
 if(!refs.head){if(refs.marker)throw Error('Initialised archive branch missing');if(initial){await git(root,['checkout','--orphan',assetBranch],env);return {head:null,repaired:[]};}if(allowUninitialised)return {head:null,marker:null,uninitialised:true,repaired:[]};throw Error('Durable asset branch absent; separately approved bootstrap required');}
 if(!refs.marker)throw Error('Archive initialisation marker missing');
 await git(root,['fetch','--no-tags','origin','refs/heads/'+assetBranch+':refs/remotes/origin/'+assetBranch],env);await git(root,['checkout','-q','-b',assetBranch,'refs/remotes/origin/'+assetBranch],env);
 const head=await git(root,['rev-parse','HEAD'],env);if(head!==refs.head)throw Error('Archive changed during fetch');await git(root,['merge-base','--is-ancestor',refs.marker,'HEAD'],env);if(initial)throw Error('Durable store already initialised');return {head,marker:refs.marker,...await recoverStore(root,env)};
}
export async function commitStore({root,preparedRoot,expectedHead,env}){
 // Staging must retain every old path. No deletion, history rewriting or force push.
 const before=expectedHead?(await git(root,['ls-tree','-r','--name-only',expectedHead],env)).split('\n'):[];
 for(const path of before)await stat(join(preparedRoot,path));await verifyArchive(preparedRoot);
 await cp(join(preparedRoot,'assets'),join(root,'assets'),{recursive:true});await recoverStoreTree(root);await git(root,['add','--','assets/catalogue-images'],env);
 const current=await git(root,['ls-remote','--heads','origin','refs/heads/'+assetBranch],env);const observed=current?current.split(/\s/)[0]:null;if(observed!==expectedHead)throw Error('Durable branch advanced; retry a fresh run');
 if(expectedHead&&!(await git(root,['diff','--cached','--name-only'],env)))return {commit:expectedHead,changed:false};
 await git(root,['-c','user.name=Apparition image publisher','-c','user.email=actions@users.noreply.github.com','commit','-q','-m','Retain verified public catalogue image versions'],env);const commit=await git(root,['rev-parse','HEAD'],env);
 const objectStats=await git(root,['count-objects','-v'],env);const sizes=Object.fromEntries(objectStats.split('\n').map(line=>line.split(': ')));if(Number(sizes.size)+Number(sizes['size-pack'])>384*1024)throw Error('Durable Git object budget exceeds 384 MiB');
 const refs=await archiveRefs({remote:await git(root,['remote','get-url','origin'],env),env});if(refs.head!==expectedHead||expectedHead&&!refs.marker||!expectedHead&&refs.marker)throw Error('Archive refs changed before push');
 await git(root,['push','--atomic','origin',commit+':refs/heads/'+assetBranch,...(!expectedHead?[commit+':refs/tags/'+initialisationTag]:[])],env);return {commit,changed:true};
}
async function recoverStoreTree(root){const archive=await verifyArchive(root);let total=0;for(const f of archive.files)total+=(await stat(join(root,'assets/catalogue-images',f))).size;if(total>256*1024*1024)throw Error('Durable archive exceeds 256 MiB');}
export async function exportStore({root,destination,expectedCommit,env}){if(await git(root,['rev-parse','HEAD'],env)!==expectedCommit)throw Error('Durable commit mismatch');if(await git(root,['status','--porcelain','--untracked-files=all','--','assets/catalogue-images'],env))throw Error('Archive recovery requires a reviewed forward commit before assembly');await recoverStoreTree(root);await mkdir(join(destination,'assets'),{recursive:true});await cp(join(root,'assets/catalogue-images'),join(destination,'assets/catalogue-images'),{recursive:true});}

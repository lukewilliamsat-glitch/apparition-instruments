// Callable, host-neutral assembly only. No deployment API, credentials or HTTP.
import {readFile,writeFile,mkdir,mkdtemp,rename,rm,stat,lstat,readdir} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {archiveRefs,exportStore} from './durable-image-store.mjs';
import {verifyArchive,sha} from './trusted-image-publisher.mjs';
const commit=/^[a-f0-9]{40}$/;
const exec=promisify(execFile),leaf=/^(?:[a-f0-9]{64}\.(?:png|jpg|webp)|manifest(?:\.[a-f0-9]{64})?\.json)$/;
async function regularArchiveFiles(root){
 for(const path of ['assets','assets/catalogue-images'])if(!(await lstat(join(root,path))).isDirectory())throw Error('Unsafe portable file directory');
 const folder=join(root,'assets/catalogue-images'),files=await readdir(folder,{withFileTypes:true});if(files.length>10000)throw Error('Portable file count exceeds budget');let total=0;
 for(const file of files){if(!file.isFile()||!leaf.test(file.name))throw Error('Unsafe portable file');const info=await lstat(join(folder,file.name));if(!info.isFile()||info.size>(file.name.endsWith('.json')?1024*1024:8*1024*1024))throw Error('Unsafe portable file size');total+=info.size;}
 if(total>256*1024*1024)throw Error('Portable archive exceeds budget');
}
export async function verifyPortableBundle(root){
 const info=await lstat(join(root,'publication-receipt.json'));if(!info.isFile()||info.size>4*1024*1024)throw Error('Unsafe portable file receipt');
 const receipt=JSON.parse(await readFile(join(root,'publication-receipt.json'),'utf8'));
 if(receipt.version!==1||!commit.test(receipt.archiveCommit)||!commit.test(receipt.initialisationMarker)||!Array.isArray(receipt.files)||receipt.files.length>10000)throw Error('Invalid publication receipt');
 await regularArchiveFiles(root);
 const archive=await verifyArchive(root);
 if(archive.manifest.revision!==receipt.currentManifest||receipt.files.length!==archive.files.length)throw Error('Publication selection mismatch');
 const paths=new Set();
 for(const item of receipt.files){
  if(!/^assets\/catalogue-images\/(?:[a-f0-9]{64}\.(?:png|jpg|webp)|manifest(?:\.[a-f0-9]{64})?\.json)$/.test(item.path)||paths.has(item.path))throw Error('Unsafe publication path');
  paths.add(item.path);const bytes=await readFile(join(root,item.path));
  if(bytes.length!==item.bytes||sha(bytes)!==item.sha256)throw Error('Publication integrity mismatch');
 }
 if(archive.files.some(f=>!paths.has('assets/catalogue-images/'+f)))throw Error('Publication missing retained asset');
 const {bundleRevision,...payload}=receipt;if(sha(JSON.stringify(payload))!==bundleRevision)throw Error('Publication receipt mismatch');
 return receipt;
}
export async function assemblePortablePublication({storeRoot,remote,expectedCommit,destination,revision,env}){
 if(!commit.test(expectedCommit)||revision!==undefined&&!/^[a-f0-9]{64}$/.test(revision))throw Error('Invalid publication selection');
 const refs=await archiveRefs({remote,env});if(refs.head!==expectedCommit||!refs.marker)throw Error('Required durable archive changed or missing');
 const {stdout}=await exec('git',['-C',storeRoot,'ls-tree','-r','--format=%(objectmode) %(path)',expectedCommit],{env:env||process.env,timeout:10000,maxBuffer:2*1024*1024});
 const objects=stdout.trim().split('\n');if(objects.length>10000||objects.some(line=>!line.startsWith('100644 assets/catalogue-images/')||!leaf.test(line.slice('100644 assets/catalogue-images/'.length))))throw Error('Unsafe durable Git object');
 // Exclusive local assembly lock; durable writes still use the reused Git CAS.
 await mkdir(dirname(destination),{recursive:true});const lock=destination+'.lock';await mkdir(lock);
 let temporary;
 try{
  try{await stat(destination);throw Error('Publication destination already exists');}catch(error){if(error.code!=='ENOENT')throw error;}
  temporary=await mkdtemp(join(dirname(destination),'.nightfall-'));
  await exportStore({root:storeRoot,destination:temporary,expectedCommit,env});
  if(revision){const selected=await readFile(join(temporary,'assets/catalogue-images/manifest.'+revision+'.json'));await writeFile(join(temporary,'assets/catalogue-images/manifest.json'),selected);}
  const archive=await verifyArchive(temporary),files=[];
  for(const name of archive.files){const path='assets/catalogue-images/'+name,b=await readFile(join(temporary,path));files.push({path,bytes:b.length,sha256:sha(b)});}
  const payload={version:1,archiveCommit:expectedCommit,initialisationMarker:refs.marker,currentManifest:archive.manifest.revision,files};
  const receipt={...payload,bundleRevision:sha(JSON.stringify(payload))};
  await writeFile(join(temporary,'publication-receipt.json'),JSON.stringify(receipt,null,2)+'\n');await verifyPortableBundle(temporary);
  const final=await archiveRefs({remote,env});if(final.head!==refs.head||final.marker!==refs.marker)throw Error('Archive changed during assembly');
  await rename(temporary,destination);temporary=null;return receipt;
 }finally{if(temporary)await rm(temporary,{recursive:true,force:true});await rm(lock,{recursive:true,force:true});}
}

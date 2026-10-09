// Pure/fixture preparatory publisher. Not wired into production Actions.
// No CLI or implicit production fetch: bulk extraction/publication is approval-gated.
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {validateImageManifest} from '../dist/backend/catalogue-image-delivery.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const extensions={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
function decode(image){
 const m=typeof image==='string'&&image.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
 if(!m)throw Error('Unsupported embedded product image');
 const bytes=Buffer.from(m[2],'base64');if(!bytes.length||bytes.length>8*1024*1024||bytes.toString('base64')!==m[2])throw Error('Invalid image bytes');
 const valid=m[1]==='image/png'&&Buffer.from([137,80,78,71,13,10,26,10]).equals(bytes.subarray(0,8))||m[1]==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255||m[1]==='image/webp'&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
 if(!valid)throw Error('Image MIME/signature mismatch');return {bytes,mime:m[1]};
}
export function planImageAssets(records){
 if(!Array.isArray(records)||records.length>2000)throw Error('Invalid public image inventory');
 const entries={},assets=new Map(),ids=new Set();
 for(const row of [...records].sort((a,b)=>String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0)){
  if(typeof row.id!=='string'||!row.id||row.id.length>80||ids.has(row.id)||['__proto__','constructor','prototype'].includes(row.id))throw Error('Invalid or duplicate stable product ID');ids.add(row.id);
  if(row.image==null||row.image==='')continue;
  if(row.image?.kind==='object'){if(!/^https:\/\//.test(row.image.url||''))throw Error('Invalid existing image reference');continue;}
  const {bytes,mime}=decode(row.image),sourceHash=sha(row.image),assetHash=sha(bytes),path='/assets/catalogue-images/'+assetHash+'.'+extensions[mime];
  entries[row.id]={sourceHash,assetHash,mime,bytes:bytes.length,path};assets.set(path,bytes);
 }
 return {manifest:{version:1,revision:sha(JSON.stringify(entries)),entries},assets};
}
export async function writeImageAssets(plan,root){
 // Validate and write assets first, verify exact bytes, then atomically publish the
 // manifest last. Existing content-addressed files are never overwritten/deleted.
 validateImageManifest(plan.manifest);if(sha(JSON.stringify(plan.manifest.entries))!==plan.manifest.revision)throw Error('Manifest revision mismatch');
 const expected=new Map(Object.values(plan.manifest.entries).map(e=>[e.path,e]));if(plan.assets.size!==expected.size)throw Error('Incomplete asset plan');for(const [path,bytes] of plan.assets){const e=expected.get(path);if(!e||sha(bytes)!==e.assetHash||bytes.length!==e.bytes)throw Error('Asset plan mismatch');}
 const folder=join(root,'assets/catalogue-images');await mkdir(folder,{recursive:true});
 for(const [path,bytes] of plan.assets){const target=join(root,path.slice(1));try{const old=await readFile(target);if(!old.equals(bytes))throw Error('Existing immutable asset mismatch');}catch(e){if(e.code!=='ENOENT')throw e;try{await writeFile(target,bytes,{flag:'wx'});}catch(writeError){if(writeError.code!=='EEXIST')throw writeError;}}if(sha(await readFile(target))!==sha(bytes))throw Error('Asset verification failed');}
 const manifest=JSON.stringify(plan.manifest,null,2)+'\n',temporary=join(folder,'manifest.'+plan.manifest.revision+'.json');
 try{await writeFile(temporary,manifest,{flag:'wx'});}catch(e){if(e.code!=='EEXIST'||await readFile(temporary,'utf8')!==manifest)throw e;}
 // Caller controls atomic deployment, not an in-place production filesystem.
 const pending=join(folder,'.manifest-pending-'+plan.manifest.revision+'-'+randomUUID());await writeFile(pending,manifest);await rename(pending,join(folder,'manifest.json'));
 return {revision:plan.manifest.revision,assets:plan.assets.size,bytes:[...plan.assets.values()].reduce((n,b)=>n+b.length,0)};
}

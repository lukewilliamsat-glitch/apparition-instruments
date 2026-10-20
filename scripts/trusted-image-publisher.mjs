// Preparation: callable functions only. Production execution is isolated in the gated Actions CLI.
import {createHash} from 'node:crypto';
import {readFile,readdir,copyFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {planImageAssets,writeImageAssets} from './catalogue-image-assets.mjs';
import {validateImageManifest} from '../dist/backend/catalogue-image-delivery.mjs';
export const sha=value=>createHash('sha256').update(value).digest('hex');
const hash=/^[a-f0-9]{64}$/;
export async function verifyArchive(root,{initial=false}={}){
 const directory=join(root,'assets/catalogue-images');let files;try{files=await readdir(directory);}catch(e){if(e.code!=='ENOENT')throw e;if(initial)return {manifest:null,files:[],history:[]};throw Error('Required previous image archive missing');}
 if(files.length>10000)throw Error('Retained archive file limit');
 if(!files.includes('manifest.json')){if(initial&&files.length===0)return {manifest:null,files:[],history:[]};throw Error('Previous manifest missing');}
 const manifests=new Map(),referenced=new Set(),verified=new Map();let references=0;
 for(const file of files.filter(f=>/^manifest(?:\.[a-f0-9]{64})?\.json$/.test(f))){
  const content=await readFile(join(directory,file));if(content.length>1024*1024)throw Error('Oversized manifest');
  const m=validateImageManifest(JSON.parse(content));if(sha(JSON.stringify(m.entries))!==m.revision||file!=='manifest.json'&&file!=='manifest.'+m.revision+'.json')throw Error('Manifest revision mismatch');
  for(const e of Object.values(m.entries)){if(++references>100000)throw Error('Manifest history reference limit');let checked=verified.get(e.path);if(!checked){const bytes=await readFile(join(root,e.path.slice(1)));if(bytes.length!==e.bytes||sha(bytes)!==e.assetHash)throw Error('Recovered asset mismatch');checked=planImageAssets([{id:'verification',image:'data:'+e.mime+';base64,'+bytes.toString('base64')}]).manifest.entries.verification;verified.set(e.path,checked);}if(checked.assetHash!==e.assetHash||checked.sourceHash!==e.sourceHash||checked.mime!==e.mime||checked.bytes!==e.bytes)throw Error('Recovered MIME/source identity mismatch');referenced.add(e.path.split('/').pop());}manifests.set(file,m);
 }
 const manifest=manifests.get('manifest.json');if(!manifests.has('manifest.'+manifest.revision+'.json'))throw Error('Current immutable manifest missing');
 for(const file of files)if(!manifests.has(file)&&!referenced.has(file))throw Error('Unverified retained asset '+file);
 return {manifest,files:files.sort(),history:[...new Map([...manifests.values()].flatMap(m=>Object.values(m.entries)).map(e=>[e.sourceHash,e])).values()]};
}
export async function preparePublication({rows,previousRoot,outputRoot,fetchImage,initial=false,inventory}){
 if(!Array.isArray(rows)||rows.length>2000)throw Error('Invalid lightweight catalogue');
 const ids=new Set();for(const row of rows){if(!row||typeof row.id!=='string'||!row.id||row.id.length>80||ids.has(row.id)||['__proto__','constructor','prototype'].includes(row.id)||row.image_identity!==null&&!hash.test(row.image_identity)||Object.hasOwn(row,'image')||row.image_reference!==null)throw Error('Invalid or unsupported catalogue identity');ids.add(row.id);}
 const previous=await verifyArchive(previousRoot,{initial});
 if(initial&&previous.manifest)throw Error('Initial publication already complete');
 if(initial){if(!inventory||rows.filter(r=>r.image_identity).length!==inventory.items.length||inventory.items.some(i=>rows.find(r=>r.id===i.id)?.image_identity!==i.source_sha256))throw Error('Initial approved inventory changed');}
 const current={},assets=new Map();let imageRequests=0,sourceBytes=0,decodedBytes=0;
 for(const row of [...rows].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)){
  if(!row.image_identity)continue;
  const old=previous.manifest?.entries[row.id];if(old?.sourceHash===row.image_identity){current[row.id]=old;continue;}
  // Reuse an identical source from another product without fetching again.
  const same=[...Object.values(current),...previous.history].find(e=>e.sourceHash===row.image_identity);if(same){current[row.id]=same;continue;}
  const record=await fetchImage(row.id);imageRequests++;
  if(record?.id!==row.id||typeof record.image!=='string'||sha(record.image)!==row.image_identity)throw Error('Concurrent image change: '+row.id);
  const plan=planImageAssets([record]),entry=plan.manifest.entries[row.id];
  const expected=initial?inventory.items.find(i=>i.id===row.id):null;
  if(expected&&(entry.assetHash!==expected.asset_sha256||entry.bytes!==expected.decoded_bytes||entry.mime!==expected.mime))throw Error('Initial image bytes differ from approved inventory');
  current[row.id]=entry;for(const [path,bytes] of plan.assets)assets.set(path,bytes);sourceBytes+=Buffer.byteLength(record.image);decodedBytes+=entry.bytes;
 }
 if(initial)for(const expected of inventory.items){const e=current[expected.id];if(!e||e.sourceHash!==expected.source_sha256||e.assetHash!==expected.asset_sha256||e.bytes!==expected.decoded_bytes||e.mime!==expected.mime)throw Error('Initial inventory byte mismatch');}
 // No writes occur until every changed image and the complete recovered archive validate.
 await mkdir(join(outputRoot,'assets/catalogue-images'),{recursive:true});
 for(const file of previous.files){const target=join(outputRoot,'assets/catalogue-images',file);let existing;try{existing=await readFile(target);}catch(e){if(e.code!=='ENOENT')throw e;}const source=await readFile(join(previousRoot,'assets/catalogue-images',file));if(existing&&!existing.equals(source))throw Error('Output archive collision');if(!existing)await copyFile(join(previousRoot,'assets/catalogue-images',file),target);}
 for(const e of Object.values(current))if(!assets.has(e.path))assets.set(e.path,await readFile(join(previousRoot,e.path.slice(1))));
 const changedAssetPaths=[...assets.keys()].filter(path=>!previous.files.includes(path.split('/').pop()));
 const manifest={version:1,revision:sha(JSON.stringify(current)),entries:current};await writeImageAssets({manifest,assets},outputRoot);await verifyArchive(outputRoot);
 const snapshot=rows.map(({image_identity,image_reference,...r})=>({...r,image:current[r.id]?{kind:'object',key:current[r.id].assetHash,url:'https://apparitioninstruments.co.uk'+current[r.id].path,mimeType:current[r.id].mime}:null}));
 return {manifest,snapshot,changedAssetPaths,metrics:{identityRequests:1,imageRequests,sourceBytes,decodedBytes,activeAssets:assets.size,retainedFiles:previous.files.length}};
}
// Newest completed archive can include a failed deployment candidate. Retain its
// verified versions too; never silently discard a partially deployed candidate.
export function selectPreviousRun(runs,currentId){
 const eligible=runs.filter(r=>r.id<currentId&&r.status==='completed'&&r.conclusion&&r.head_branch==='main'&&r.path==='.github/workflows/static.yml'&&['push','schedule','workflow_dispatch'].includes(r.event));
 eligible.sort((a,b)=>b.id-a.id);if(!eligible.length)throw Error('Previous completed Pages run unavailable');return eligible[0];
}
export function selectPagesArtifact(artifacts){if(artifacts.length!==1||artifacts[0].name!=='github-pages'||artifacts[0].expired||artifacts[0].size_in_bytes>256*1024*1024)throw Error('Previous Pages artifact missing, expired, duplicate or oversized');return artifacts[0];}

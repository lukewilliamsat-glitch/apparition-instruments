import {readPublicRows,componentColumns} from './public-read.mjs';
import {imageDeliveryConfig} from './image-delivery-config.mjs';
const hashPattern=/^[a-f0-9]{64}$/,types={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
export async function sha256Text(value){
 const digest=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function imageIdentity(image){const value=typeof image==='string'?image:image?.kind==='object'?image.url:null;return value?sha256Text(value):null;}
export function validateImageManifest(value){
 if(value?.version!==1||!hashPattern.test(value.revision)||!value.entries||typeof value.entries!=='object'||Array.isArray(value.entries)||Object.keys(value.entries).length>2000)throw Error('Invalid image manifest');
 for(const [id,e] of Object.entries(value.entries)){
  if(['__proto__','constructor','prototype'].includes(id)||!id||id.length>80||!e||!hashPattern.test(e.sourceHash)||!hashPattern.test(e.assetHash)||!types[e.mime]||!Number.isSafeInteger(e.bytes)||e.bytes<1||e.bytes>8*1024*1024||e.path!=='/assets/catalogue-images/'+e.assetHash+'.'+types[e.mime])throw Error('Invalid image manifest entry');
 }
 return value;
}
// All state is scoped to the request function and expires. No private data or
// token enters this layer; V1 remains the default and never requests a manifest.
const states=new WeakMap();
function state(request){let s=states.get(request);if(!s){s={manifest:new Map(),assets:new Map()};states.set(request,s);}return s;}
async function manifest(request,delivery){
 const url=new URL(delivery.manifestPath,delivery.assetOrigin).href,s=state(request),old=s.manifest.get(url);
 if(old?.expires>Date.now())return old.promise;
 const promise=(async()=>{const r=await request(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Image manifest unavailable');const text=await r.text();if(text.length>1024*1024)throw Error('Image manifest exceeds limit');const value=validateImageManifest(JSON.parse(text));if(await sha256Text(JSON.stringify(value.entries))!==value.revision)throw Error('Image manifest revision mismatch');return value;})();
 const entry={promise,expires:Date.now()+30000};s.manifest.set(url,entry);while(s.manifest.size>4)s.manifest.delete(s.manifest.keys().next().value);try{return await promise;}catch(e){if(s.manifest.get(url)===entry)s.manifest.delete(url);throw e;}
}
async function availableAsset(request,delivery,entry){
 const url=new URL(entry.path,delivery.assetOrigin).href,s=state(request),old=s.assets.get(url);
 if(old?.expires>Date.now())return old.promise;
 const promise=(async()=>{const r=await request(url,{method:'HEAD',cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok||r.headers.get('content-type')?.split(';')[0]!==entry.mime||Number(r.headers.get('content-length'))!==entry.bytes)throw Error('Published image unavailable or inconsistent');return {kind:'object',key:entry.assetHash,url,mimeType:entry.mime};})();
 const item={promise,expires:Date.now()+30000};s.assets.set(url,item);while(s.assets.size>64)s.assets.delete(s.assets.keys().next().value);
 try{return await promise;}catch(e){if(s.assets.get(url)===item)s.assets.delete(url);throw e;}
}
async function legacyImage({config,request},row){
 const rows=await readPublicRows({config,request,maxAgeMs:0},'catalogue_components','?select=id,image&id=eq.'+encodeURIComponent(row.id),'Legacy product image');
 const value=rows.find(r=>r.id===row.id)?.image??null;
 // A concurrent replacement must not attach a different image to the reviewed
 // metadata identity. A later fresh metadata read will obtain the new identity.
 if(await imageIdentity(value)!==row.image_identity)throw Error('Image changed during publication');
 return value;
}
export async function readCatalogueComponents({config,request=globalThis.fetch,delivery=imageDeliveryConfig},columns=componentColumns,filter=''){
 if(!delivery.enabled)return readPublicRows({config,request},'catalogue_components','?select='+columns+filter);
 const projection=columns.split(',').filter(c=>c!=='image').join(',');
 const rows=await readPublicRows({config,request},'catalogue_delivery_v2','?select='+projection+',image_identity,image_reference'+filter,'Public catalogue delivery');
 let published;try{published=await manifest(request,delivery);}catch{published=null;}
 return Promise.all(rows.map(async row=>{
  if(!row.image_identity)return {...row,image:null,imageDeliveryState:'none'};
  if(!hashPattern.test(row.image_identity))throw Error('Invalid catalogue image identity');
  const entry=published?.entries[row.id];
  if(entry?.sourceHash===row.image_identity){try{return {...row,image:await availableAsset(request,delivery,entry),imageDeliveryState:'static'};}catch{/* Scoped legacy recovery, never an invented static reference. */}}
  // Existing approved object references remain supported; all current production
  // images are embedded strings. New object writes still need separate approval.
  if(row.image_reference?.kind==='object'&&/^https:\/\//.test(row.image_reference.url||'')&&await imageIdentity(row.image_reference)===row.image_identity)return {...row,image:row.image_reference,imageDeliveryState:'reference'};
  try{return {...row,image:await legacyImage({config,request},row),imageDeliveryState:'legacy'};}
  catch{return {...row,image:null,imageDeliveryState:'unavailable'};}
 }));
}

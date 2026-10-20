import {readPublicRows,componentColumns,publicReadGeneration} from './public-read.mjs';
import {imageDeliveryConfig} from './image-delivery-config.mjs';
const hashPattern=/^[a-f0-9]{64}$/,types={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
export async function boundedResponseBytes(response,limit){
 const declared=response.headers.get('content-length');if(declared!==null&&Number(declared)>limit)throw Error('Image response exceeds limit');
 if(!response.body)throw Error('Image response body missing');
 const reader=response.body.getReader(),chunks=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error('Image response exceeds limit');chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}return bytes;}finally{try{await reader.cancel();}catch{}reader.releaseLock();}
}
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
export function validateImageDelivery(delivery){
 const origin=new URL(delivery.assetOrigin);
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||!/^\/assets\/catalogue-images\/manifest(?:\.[a-f0-9]{64})?\.json$/.test(delivery.manifestPath))throw Error('Invalid static image delivery configuration');
 return origin.origin;
}
function state(request){let s=states.get(request);const generation=publicReadGeneration(request);if(!s||s.generation!==generation){s={generation,manifest:new Map(),assets:new Map(),active:0,waiting:[]};states.set(request,s);}return s;}
async function assetSlot(s,request,verify){
 if(s.active<4)s.active++;else await new Promise(resolve=>s.waiting.push(resolve));
 try{if(s.generation!==publicReadGeneration(request))throw Error('Catalogue changed during image resolution');return await verify();}
 finally{const next=s.waiting.shift();if(next)next();else s.active--;}
}
async function manifest(request,delivery){
 const url=new URL(delivery.manifestPath,delivery.assetOrigin).href,s=state(request),old=s.manifest.get(url);
 if(old?.expires>Date.now())return old.promise;
 const promise=(async()=>{const r=await request(url,{cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});if(r.status!==200||r.redirected)throw Error('Image manifest unavailable');const text=new TextDecoder('utf-8',{fatal:true}).decode(await boundedResponseBytes(r,1024*1024));const value=validateImageManifest(JSON.parse(text));if(await sha256Text(JSON.stringify(value.entries))!==value.revision)throw Error('Image manifest revision mismatch');const pinned=delivery.manifestPath.match(/manifest\.([a-f0-9]{64})\.json$/)?.[1];if(pinned&&value.revision!==pinned)throw Error('Pinned manifest revision mismatch');return value;})();
 const entry={promise,expires:Date.now()+30000};s.manifest.set(url,entry);while(s.manifest.size>4)s.manifest.delete(s.manifest.keys().next().value);try{return await promise;}catch(e){if(s.manifest.get(url)===entry)entry.expires=Date.now()+2000;throw e;}
}
export async function verifyStaticImageBytes(response,entry){
 if(response.status!==200||response.redirected||response.headers.get('content-type')?.split(';')[0]!==entry.mime)throw Error('Static image response mismatch');
 const bytes=await boundedResponseBytes(response,Math.min(entry.bytes,8*1024*1024));if(bytes.length!==entry.bytes)throw Error('Static image byte count mismatch');const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');if(hash!==entry.assetHash)throw Error('Static image hash mismatch');
}
async function availableAsset(request,delivery,entry){
 const url=new URL(entry.path,delivery.assetOrigin).href,s=state(request),old=s.assets.get(url);
 if(old?.expires>Date.now())return old.promise;
 // Validate the complete bytes, even when Content-Length matches. The immutable
 // URL is reusable by the normal browser HTTP cache; no HEAD proof is assumed.
 const promise=assetSlot(s,request,async()=>{await verifyStaticImageBytes(await request(url,{cache:'force-cache',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)}),entry);return {kind:'object',key:entry.assetHash,url,mimeType:entry.mime};});
 const item={promise,expires:Date.now()+30000};s.assets.set(url,item);while(s.assets.size>64)s.assets.delete(s.assets.keys().next().value);
 try{return await promise;}catch(e){if(s.assets.get(url)===item)item.expires=Date.now()+2000;throw e;}
}
export async function readCatalogueComponents({config,request=globalThis.fetch,delivery=imageDeliveryConfig},columns=componentColumns,filter=''){
 if(!delivery.enabled)return readPublicRows({config,request},'catalogue_components','?select='+columns+filter);
 validateImageDelivery(delivery);const before=publicReadGeneration(request);
 const projection=columns.split(',').filter(c=>c!=='image').join(',');
 const rows=await readPublicRows({config,request},'catalogue_delivery_v2','?select='+projection+',image_identity,image_reference'+filter,'Public catalogue delivery');
 if(before!==publicReadGeneration(request))throw Error('Catalogue changed during image resolution');
 const ids=new Set();for(const row of rows){if(!row||typeof row.id!=='string'||!row.id||row.id.length>80||ids.has(row.id)||['__proto__','constructor','prototype'].includes(row.id)||Object.hasOwn(row,'image')||row.image_identity!==null&&!hashPattern.test(row.image_identity))throw Error('Invalid lightweight catalogue image contract');ids.add(row.id);}
 let published;if(rows.some(row=>row.image_identity)){try{published=await manifest(request,delivery);}catch{published=null;}}
 const resolved=await Promise.all(rows.map(async row=>{
  if(row.image_identity===null)return {...row,image:null,imageDeliveryState:'none'};
  const entry=published?.entries[row.id];
  if(entry?.sourceHash===row.image_identity){try{return {...row,image:await availableAsset(request,delivery,entry),imageDeliveryState:'static'};}catch{/* Keep authoritative metadata; render the existing image placeholder. */}}
  // Never recover embedded bytes or trust an arbitrary image_reference URL in
  // this path. Publication lag is explicit, not a different product photograph.
  return {...row,image:null,imageDeliveryState:'unavailable'};
 }));
 if(before!==publicReadGeneration(request))throw Error('Catalogue changed during image resolution');
 return resolved;
}

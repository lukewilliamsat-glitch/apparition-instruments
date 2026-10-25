import {summary} from './command01/model.mjs';
// No fetch, credentials, endpoint, public/local fallback or production writes.
export const READ_CONTRACT='command05-read-v1';
const capabilities=['catalogueRead','productRead','inventoryRead','draftPreview'];
const safeColumns=['id','sku','name','category','manufacturer','active','individually','in_kits','sale_price','kit_price','kit_price_quantity','updated_at'];
const hints={resistance:'Resistance',taper:'Taper',tolerance:'Tolerance',capacitance:'Value',voltage:'Voltage',shaft:'Shaft',connection:'Topology'};
const error=(code,message)=>Object.assign(new Error(message),{code,outcome:'not-applied'});
const blocked=async()=>{throw error('UNSUPPORTED','Production writes are disabled. No request was submitted.');};
export function createReadBoundary({auth,adapter=null,now=Date.now,timeoutMs=5000}={}){
 if(typeof auth?.restore!=='function')throw Error('Existing Admin authentication boundary required.');
 if(adapter&&(adapter.contract!==READ_CONTRACT||adapter.environment!=='synthetic'||['authorize','list','detail','subscribe'].some(k=>typeof adapter[k]!=='function')))throw Error('Only an explicitly injected synthetic read adapter is accepted. Real-service activation is gated.');
 let alive=true,epoch=0,grant=null,expiry=null;
 const listeners=new Set(),active=new Set(),cache=new Map();
 let state={status:adapter?'checking':'inactive',subject:null,capabilities:Object.fromEntries(capabilities.map(k=>[k,false])),observedAt:null,catalogueReady:false,source:adapter?'synthetic':'inactive',productionWrites:false};
 const snapshot=()=>structuredClone(state),emit=()=>{for(const fn of listeners)fn(snapshot());};
 function reset(status){epoch++;grant=null;cache.clear();clearTimeout(expiry);for(const c of active)c.abort();active.clear();state={...state,status,subject:null,observedAt:null,catalogueReady:false,capabilities:Object.fromEntries(capabilities.map(k=>[k,false]))};emit();}
 const off=adapter?.subscribe(()=>reset('checking'))||(()=>{});
 function ensure(token){if(!alive||token!==epoch)throw error('STALE','The session changed; the old response was rejected.');if(grant&&grant.expiresAt<=now()){reset('expired');throw error('EXPIRED','Session expired. Restore authentication to continue.');}}
 async function bounded(run,signal){
  const c=new AbortController();active.add(c);let timer,abort;
  const cancel=new Promise((_,reject)=>{c.signal.addEventListener('abort',()=>reject(error('STALE','Read cancelled; no changes were submitted.')),{once:true});abort=()=>c.abort();if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});});
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(error('TIMEOUT','Read timed out. Retry safely.'));c.abort();},timeoutMs);});
  try{return await Promise.race([Promise.resolve().then(()=>{if(c.signal.aborted)throw error('STALE','Read cancelled.');return run(c.signal);}),cancel,deadline]);}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);active.delete(c);}
 }
 async function authorize(){
  if(!alive)throw error('CLOSED','Workspace closed.');if(!adapter)throw error('INACTIVE','Read-only COMMAND. The authenticated catalogue adapter is not activated. No product data has been requested.');
  const token=epoch;
  try{
   const membership=await bounded(()=>auth.restore());ensure(token);
   if(membership.status!=='authorized')throw error(membership.status==='denied'?'DENIED':'EXPIRED','An authorised Admin session is required.');
   const next=await bounded(signal=>adapter.authorize({signal}));ensure(token);
   if(!next||typeof next.subject!=='string'||!next.subject||typeof next.sessionId!=='string'||!next.sessionId||!Number.isFinite(next.expiresAt)||next.expiresAt<=now()||next.expiresAt-now()>86400000||!next.capabilities||capabilities.some(k=>typeof next.capabilities[k]!=='boolean'))throw error('DENIED','The authority did not supply valid read capabilities.');
   if(!next.capabilities.catalogueRead)throw error('DENIED','This session has no catalogue-read authority. Product records remain concealed.');
   if(grant&&(grant.subject!==next.subject||grant.sessionId!==next.sessionId||capabilities.some(k=>grant.capabilities[k]!==next.capabilities[k]))){reset('checking');throw error('STALE','Session capabilities changed. Recheck access.');}
   grant=structuredClone(next);state={...state,status:'ready',subject:grant.subject,capabilities:{...grant.capabilities,productWrite:false}};
   clearTimeout(expiry);expiry=setTimeout(()=>reset('expired'),Math.min(2147483647,grant.expiresAt-now()));expiry.unref?.();emit();return {token,grant:structuredClone(grant)};
  }catch(e){if(token===epoch&&['DENIED','EXPIRED'].includes(e.code))reset(e.code.toLowerCase());throw ['DENIED','EXPIRED','STALE','INACTIVE','TIMEOUT'].includes(e.code)?e:error('READ','Access verification unavailable. No fallback data was used.');}
 }
 async function map(row,stock,full,ctx){
  const allowed=[...safeColumns,...full?['description','specs']:Object.keys(hints)];
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!allowed.includes(k)))throw error('PROJECTION','The response contains fields outside the approved projection.');
  if(safeColumns.some(k=>!Object.hasOwn(row,k))||['active','individually','in_kits'].some(k=>typeof row[k]!=='boolean')||['sale_price','kit_price'].some(k=>row[k]!==null&&(!Number.isSafeInteger(row[k])||row[k]<0||row[k]>2147483647)))throw error('MALFORMED','Required source fields or integer-pence prices are invalid.');
  if(!Number.isFinite(Date.parse(row.updated_at))||typeof row.name!=='string'||row.name.length>300||typeof row.sku!=='string'||row.sku.length>80)throw error('MALFORMED','Invalid product identity or timestamp.');
  if(ctx.grant.capabilities.inventoryRead){
   if(!stock||Object.keys(stock).some(k=>!['component_id','quantity','stock_unit'].includes(k))||stock.component_id!==row.id||!Number.isSafeInteger(stock.quantity)||stock.quantity<0||!['item','m','g'].includes(stock.stock_unit))throw error('MALFORMED','Inventory identity or quantity is invalid.');
  }else if(stock!==undefined&&stock!==null)throw error('PROJECTION','Inventory was returned without permission.');
  const technicalSpecs={};for(const [key,label]of Object.entries(hints)){const value=full?row.specs?.[label]:row[key];if(value!=null){if(typeof value!=='string'||value.length>300)throw error('MALFORMED','Invalid technical specification.');technicalSpecs[key]=value;}}
  const common=safeColumns.map(k=>row[k]);common.push(stock?.quantity??null,stock?.stock_unit??null);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(common)));ensure(ctx.token);
  const revision='read-'+Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');
  const result=summary({id:row.id,name:row.name,sku:row.sku,category:row.category,manufacturer:row.manufacturer,active:row.active,individually:row.individually,inKits:row.in_kits,salePrice:row.sale_price,kitPrice:row.kit_price,kitPriceQuantity:row.kit_price_quantity,stock:stock?.quantity??null,stockUnit:stock?.stock_unit??'item',technicalSpecs,revision});
  if(!full)return result;
  if(typeof row.description!=='string'||row.description.length>5000||!row.specs||typeof row.specs!=='object'||Array.isArray(row.specs)||Object.keys(row.specs).length>100||Object.entries(row.specs).some(([k,v])=>k.length>60||typeof v!=='string'||v.length>300))throw error('MALFORMED','Invalid description/specifications.');
  return {...result,description:row.description,specs:structuredClone(row.specs),imageInfo:{kind:'unloaded'}};
 }
 function freshness(payload){if(payload?.complete!==true||typeof payload.observedAt!=='string'||!Number.isFinite(Date.parse(payload.observedAt))||Math.abs(now()-Date.parse(payload.observedAt))>300000)throw error('INCOMPLETE','Complete, fresh read evidence is required. No partial catalogue was accepted.');state.observedAt=payload.observedAt;}
 async function list({signal}={}){
  const ctx=await authorize();
  try{
   const payload=await bounded(s=>adapter.list({grant:ctx.grant,signal:s,inventory:ctx.grant.capabilities.inventoryRead}),signal);ensure(ctx.token);freshness(payload);
   if(!Array.isArray(payload.rows)||payload.rows.length>500||new Set(payload.rows.map(r=>r?.id)).size!==payload.rows.length)throw error('MALFORMED','Invalid bounded catalogue or duplicate identities.');
   const inv=payload.inventory;
   if(ctx.grant.capabilities.inventoryRead&&(!Array.isArray(inv)||inv.length!==payload.rows.length||new Set(inv.map(r=>r?.component_id)).size!==inv.length||inv.some(r=>!payload.rows.some(p=>p.id===r.component_id))))throw error('MALFORMED','Inventory does not match the catalogue.');
   if(!ctx.grant.capabilities.inventoryRead&&inv!==undefined)throw error('PROJECTION','Inventory was returned without permission.');
   const rows=await Promise.all(payload.rows.map(r=>map(r,inv?.find(s=>s.component_id===r.id),false,ctx)));ensure(ctx.token);state.catalogueReady=true;emit();return rows;
  }catch(e){if(ctx.token===epoch)reset(['DENIED','EXPIRED'].includes(e.code)?e.code.toLowerCase():'error');throw error(e.code||'READ','Catalogue read unavailable. No partial, private or fallback data was accepted.');}
 }
 async function readProduct(id,{signal,force=false}={}){
  if(typeof id!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/.test(id))throw error('IDENTITY','Invalid product ID.');
  const ctx=await authorize();if(!ctx.grant.capabilities.productRead)throw error('DENIED','Product inspection is not authorised for this session.');
  const hit=cache.get(id);if(hit&&!force&&now()-hit.at<15000)return structuredClone(hit.record);
  try{
   const payload=await bounded(s=>adapter.detail(id,{grant:ctx.grant,signal:s,inventory:ctx.grant.capabilities.inventoryRead}),signal);ensure(ctx.token);freshness(payload);
   if(payload.row?.id!==id)throw error('IDENTITY','The authority returned a different product.');
   const record=await map(payload.row,payload.inventory,true,ctx);ensure(ctx.token);cache.set(id,{at:now(),record});return structuredClone(record);
  }catch(e){if(ctx.token===epoch&&['DENIED','EXPIRED'].includes(e.code))reset(e.code.toLowerCase());throw error(e.code||'READ','Product details could not be verified. No fallback data was used.');}
 }
 return Object.freeze({snapshot,authorize,readProduct,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  catalogueTransport:Object.freeze({kind:'command05-readonly',list,detail:async(id,options)=>{const r=await readProduct(id,options);return {...r,specs:Object.entries(r.specs).map(([k,v])=>k+': '+v).join(' · ')};}}),
  mutations:Object.freeze({save:blocked,status:blocked,changeStock:blocked,writeImage:blocked}),
  lock(reason='expired'){reset(reason);},destroy(){if(!alive)return;alive=false;off();reset('closed');listeners.clear();}
 });
}

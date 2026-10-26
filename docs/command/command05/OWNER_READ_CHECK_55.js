/* COMMAND55 owner-only read check. Loading this defines a function and sends zero requests. Separate exact live approval required. */
(()=>{if(Object.hasOwn(globalThis,"COMMAND55_READ_CHECK"))throw Error("Owner check already installed; no automatic replacement.");const __m=Object.create(null);
__m["dist/backend/public-config.mjs"]=(function(){
// Public browser configuration only. The publishable key is intentionally public;
// database RLS and explicit Admin roles must enforce all real permissions.
const publicBackendConfig=Object.freeze({
 url:'https://acdxpxvksvdwfajntzfx.supabase.co',
 publishableKey:'sb_publishable_BuLl3MB52Cr1qciusCm0Ow_dzOeHQ24'
});

return {"publicBackendConfig":publicBackendConfig};
})();
__m["dist/admin/command/bounded-json.mjs"]=(function(){
// A decoded-byte ceiling applies even when Content-Length describes compressed bytes.
const readError=(code,message)=>Object.assign(new Error(message),{code,outcome:'not-applied'});
async function boundedJSON(response,maxBytes,{signal,onBytes=()=>{}}={}){
 if(!response?.ok){
  const code=response?.status===401?'EXPIRED':response?.status===403?'DENIED':response?.status===429?'QUOTA':'READ';
  await response?.body?.cancel?.().catch(()=>{});
  throw readError(code,'The authorised read is unavailable. No fallback data was used.');
 }
 const length=response.headers.get('content-length');
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes)){await response.body?.cancel?.().catch(()=>{});throw readError('BOUNDS','Read response exceeds its byte limit.');}
 if(!/^application\/json\b/i.test(response.headers.get('content-type')||'')||!response.body?.getReader)throw readError('PROJECTION','A bounded JSON response is required.');
 const reader=response.body.getReader(),chunks=[];let size=0;
 const abort=()=>{void reader.cancel().catch(()=>{});};
 signal?.addEventListener('abort',abort,{once:true});
 try{
  if(signal?.aborted)throw readError('STALE','Read cancelled.');
  while(true){
   const {done,value}=await reader.read();
   if(signal?.aborted)throw readError('STALE','Read cancelled.');
   if(done)break;
   size+=value.byteLength;
   if(size>maxBytes){await reader.cancel();throw readError('BOUNDS','Read response exceeds its byte limit.');}
   chunks.push(value);
  }
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}
  onBytes(size);
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw readError('MALFORMED','The authorised read returned invalid JSON.');}
 }finally{signal?.removeEventListener('abort',abort);reader.releaseLock();}
}

return {"readError":readError,"boundedJSON":boundedJSON};
})();
__m["dist/admin/admin-auth.mjs"]=(function({publicBackendConfig},{boundedJSON,readError}){


const sessionKey='apparition.admin.supabase-session.v1';
const validConfig=config=>/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config?.url||'')&&/^sb_publishable_[A-Za-z0-9_-]+$/.test(config?.publishableKey||'');

// Browser tokens are ordinary Supabase Auth session tokens, never Admin credentials.
// Membership and all future business writes are decided by the database under RLS.
function createAdminAuth({config=publicBackendConfig,request=globalThis.fetch,storage=globalThis.localStorage,now=Date.now}={}){
 if(!validConfig(config)||typeof request!=='function'||!storage)throw new Error('Admin authentication is unavailable.');
 let session=null;const listeners=new Set();
 const headers=token=>({apikey:config.publishableKey,...token?{Authorization:'Bearer '+token}:{}});
 const read=()=>{try{const raw=storage.getItem(sessionKey),value=raw&&JSON.parse(raw);return value&&typeof value.access_token==='string'&&typeof value.refresh_token==='string'&&Number.isFinite(value.expires_at)?value:null;}catch{return null;}};
 const clear=()=>{session=null;storage.removeItem(sessionKey);for(const listener of listeners)listener();};
 const save=data=>{if(!data?.access_token||!data?.refresh_token||!Number.isFinite(data.expires_in))throw new Error('Invalid authentication response.');session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(now()/1000)+data.expires_in};storage.setItem(sessionKey,JSON.stringify(session));};
 const refresh=async(options={})=>{const response=await request(config.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token}),...options.signal?{signal:options.signal}:{}});if(!response.ok){clear();return false;}save(options.bounded?await boundedJSON(response,16384,options):await response.json());return true;};
 async function accessToken(options={}){session||=read();if(!session)throw new Error('Admin sign-in is required.');if(session.expires_at<=Math.floor(now()/1000)+60&&!await refresh(options))throw new Error('Admin session expired. Please sign in again.');return session.access_token;}
 const check=async()=>{
  let token=await accessToken();let user=await request(config.url+'/auth/v1/user',{headers:headers(token)});
  if(user.status===401&&session?.refresh_token){if(!await refresh())return {status:'signed-out'};token=await accessToken();user=await request(config.url+'/auth/v1/user',{headers:headers(token)});}
  if(user.status===401){clear();return {status:'signed-out'};}if(!user.ok)throw new Error('Could not verify the Admin session.');
  const identity=await user.json();if(!/^[0-9a-f-]{36}$/i.test(identity?.id||'')){clear();return {status:'signed-out'};}
  const members=await request(config.url+'/rest/v1/admin_members?select=user_id&user_id=eq.'+encodeURIComponent(identity.id),{headers:{...headers(token),Accept:'application/json'}});
  if(members.status===401){clear();return {status:'signed-out'};}if(!members.ok)throw new Error('Could not verify Admin membership.');
  const rows=await members.json();if(!Array.isArray(rows))throw new Error('Could not verify Admin membership.');
  return {status:rows.some(row=>row.user_id===identity.id)?'authorized':'denied'};
 };
 return Object.freeze({
  async restore(){session=read();return session?check():{status:'signed-out'};},
  async authorizeRead({signal,onBytes}={}){
   // Existing restore/sign-in contracts are unchanged. This stricter read proof is
   // based on a server-accepted token and self membership, never client role claims.
   session=read();if(!session)throw readError('EXPIRED','Admin sign-in is required.');
   let token;try{token=await accessToken({signal,bounded:true,onBytes});}catch(e){if(e.code)throw e;throw readError('EXPIRED','Restore the Admin session to continue.');}
   const options={headers:{...headers(token),Accept:'application/json'},signal,cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'};
   const identity=await boundedJSON(await request(config.url+'/auth/v1/user',options),16384,{signal,onBytes});
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identity?.id||''))throw readError('DENIED','Verified Admin identity is unavailable.');
   const rows=await boundedJSON(await request(config.url+'/rest/v1/admin_members?select=user_id&user_id=eq.'+encodeURIComponent(identity.id)+'&limit=2',options),2048,{signal,onBytes});
   if(!Array.isArray(rows)||rows.length!==1||Object.keys(rows[0]||{}).length!==1||rows[0]?.user_id!==identity.id)throw readError('DENIED','Current Admin membership is required.');
   let claims;try{const part=token.split('.')[1];claims=JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')));}catch{throw readError('DENIED','The server-accepted session has an unsupported token format.');}
   // The Auth server accepted this token above. Decode only its subject/expiry;
   // no decoded role/app/user metadata grants authority.
   if(claims.sub!==identity.id||!Number.isSafeInteger(claims.exp)||claims.exp*1000<=now()||claims.exp*1000-now()>86400000)throw readError('EXPIRED','The verified Admin session has expired or has an unsupported lifetime.');
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
   if(signal?.aborted||read()?.access_token!==token)throw readError('STALE','The Admin session changed during verification.');
   return {subject:identity.id,sessionId:'token-'+Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join(''),expiresAt:claims.exp*1000,token};
  },
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  async signIn(email,password){const response=await request(config.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify({email,password})});if(!response.ok)return {status:'invalid-credentials'};save(await response.json());return check();},
  async signOut(){session||=read();if(session){const response=await request(config.url+'/auth/v1/logout?scope=local',{method:'POST',headers:headers(await accessToken())});if(!response.ok&&response.status!==401)throw new Error('Could not end the Admin session. Please retry.');}clear();return {status:'signed-out'};},
  accessToken
 });
}


return {"createAdminAuth":createAdminAuth,"adminAuthSessionKey":sessionKey};
})(__m["dist/backend/public-config.mjs"],__m["dist/admin/command/bounded-json.mjs"]);
__m["dist/admin/command/read-activation.mjs"]=(function(){
// Release gate, not a client role. Server identity, membership and RLS are still required.
// Enable only after the exact owner-operated metadata and bounded live acceptance.
const productionReadActivation=Object.freeze({
 enabled:false,
 inventoryRead:false,
 metadataEvidenceSHA256:null,
 liveReadEvidenceSHA256:null
});

return {"productionReadActivation":productionReadActivation};
})();
__m["dist/admin/command/production-read.mjs"]=(function({publicBackendConfig},{adminAuthSessionKey},{boundedJSON,readError},{productionReadActivation}){




const branded=new WeakSet();
const columns=['id','sku','name','category','manufacturer','active','individually','in_kits','sale_price','kit_price','kit_price_quantity','updated_at'];
const hints={resistance:'Resistance',taper:'Taper',tolerance:'Tolerance',capacitance:'Value',voltage:'Voltage',shaft:'Shaft',connection:'Topology'};
const productionReadLimits=Object.freeze({rows:500,listBytes:524288,inventoryBytes:98304,detailBytes:49152,timeoutMs:5000});
const isProductionReadAdapter=value=>branded.has(value);

function createProductionReadAdapter({auth,config=publicBackendConfig,request=globalThis.fetch,activation=productionReadActivation,now=Date.now,events=globalThis}={}){
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config?.url||'')||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config?.publishableKey||'')||typeof request!=='function')throw Error('Invalid authenticated read configuration.');
 const enabled=activation?.enabled===true;
 if(enabled&&(typeof auth?.authorizeRead!=='function'||typeof auth?.subscribe!=='function'))throw Error('Verified existing Admin read authority is required.');
 let authority=null,alive=true;const listeners=new Set(),pending=new Set();
 const stats={catalogueRequests:0,detailRequests:0,decodedBytes:0,responseBytes:[]};
 const invalidate=()=>{authority=null;for(const controller of pending)controller.abort();for(const listener of listeners)listener();};
 const off=auth?.subscribe?.(invalidate)||(()=>{});
 const storage=event=>{if(event.key===adminAuthSessionKey||event.key===null)invalidate();};events.addEventListener?.('storage',storage);
 const current=grant=>{if(!alive||!enabled)throw readError('INACTIVE','The production read connection is not activated.');if(!authority||authority.sessionId!==grant?.sessionId||authority.subject!==grant?.subject)throw readError('STALE','The verified session changed.');if(authority.expiresAt<=now())throw readError('EXPIRED','Restore the Admin session to continue.');if(grant.capabilities?.inventoryRead!==(activation.inventoryRead===true)||grant.capabilities?.draftPreview!==false)throw readError('DENIED','Read scope does not match the approved adapter.');return authority;};
 const bytes=n=>{stats.decodedBytes+=n;stats.responseBytes.push(n);if(stats.responseBytes.length>32)stats.responseBytes.shift();};
 async function rows(table,select,filter,grant,signal,maxBytes,kind,maxRows){
  const proof=current(grant),controller=new AbortController(),abort=()=>controller.abort();pending.add(controller);
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  const timer=setTimeout(abort,productionReadLimits.timeoutMs);let cancel;
  const cancelled=new Promise((_,reject)=>{cancel=()=>reject(readError(signal?.aborted?'STALE':'TIMEOUT','Read cancelled or timed out. Retry explicitly.'));controller.signal.addEventListener('abort',cancel,{once:true});});
  try{
   if(controller.signal.aborted)throw readError('STALE','Read cancelled.');
   const query=new URLSearchParams({select,order:(table==='inventory'?'component_id':'id')+'.asc',limit:String(maxRows+1),...filter});
   stats[kind]++;
   const response=await Promise.race([Promise.resolve().then(()=>request(config.url+'/rest/v1/'+table+'?'+query,{method:'GET',headers:{apikey:config.publishableKey,Authorization:'Bearer '+proof.token,Accept:'application/json',Prefer:'count=exact'},signal:controller.signal,cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'})).then(response=>{if(controller.signal.aborted){void response?.body?.cancel?.().catch(()=>{});throw readError('STALE','Read cancelled.');}return response;}),cancelled]);
   const range=response.headers.get('content-range');
   const value=await boundedJSON(response,maxBytes,{signal:controller.signal,onBytes:bytes});current(grant);
   const match=/^(?:(\d+)-(\d+)|\*)\/(\d+)$/.exec(range||'');
   if(!Array.isArray(value)||!match)throw readError('INCOMPLETE','Exact bounded read counts are required.');
   const count=Number(match[3]);
   if(!Number.isSafeInteger(count)||count>maxRows||value.length!==count||(count>0?(Number(match[1])!==0||Number(match[2])!==count-1):match[1]!==undefined))throw readError('INCOMPLETE','The read is incomplete or exceeds the supported catalogue size.');
   return value;
  }catch(e){if(e.code)throw e;if(controller.signal.aborted)throw readError(signal?.aborted?'STALE':'TIMEOUT','Read cancelled or timed out. Retry explicitly.');throw readError('READ','The authorised read is unavailable. Retry explicitly.');}
  finally{clearTimeout(timer);pending.delete(controller);controller.signal.removeEventListener('abort',cancel);signal?.removeEventListener('abort',abort);}
 }
 const adapter=Object.freeze({contract:'command05-read-v1',environment:'production',enabled,
  async authorize({signal}={}){
   if(!enabled||!alive)throw readError('INACTIVE','The production read connection is not activated.');
   // authorizeRead verifies the actual current user and self membership on each
   // uncached read; the outer boundary supplies the total authorization deadline.
   const proof=await auth.authorizeRead({signal,onBytes:bytes});
   if(signal?.aborted||!alive)throw readError('STALE','Read cancelled.');
   if(!proof?.token||typeof proof.subject!=='string'||typeof proof.sessionId!=='string'||!Number.isFinite(proof.expiresAt)||proof.expiresAt<=now())throw readError('DENIED','Verified Admin authority is unavailable.');
   authority=proof;
   return {subject:proof.subject,sessionId:proof.sessionId,expiresAt:proof.expiresAt,capabilities:{catalogueRead:true,productRead:true,inventoryRead:activation.inventoryRead===true,draftPreview:false}};
  },
  async list({grant,signal,inventory}={}){
   current(grant);if(inventory!==grant.capabilities.inventoryRead)throw readError('DENIED','Inventory read scope does not match the verified grant.');
   const select=[...columns,...Object.entries(hints).map(([alias,key])=>alias+':specs->>'+key)].join(',');
   const products=await rows('components',select,{},grant,signal,productionReadLimits.listBytes,'catalogueRequests',productionReadLimits.rows);
   const stock=inventory?await rows('inventory','component_id,quantity,stock_unit',{},grant,signal,productionReadLimits.inventoryBytes,'catalogueRequests',productionReadLimits.rows):undefined;
   return {rows:products,...inventory?{inventory:stock}:{},complete:true,observedAt:new Date(now()).toISOString()};
  },
  async detail(id,{grant,signal,inventory}={}){
   if(typeof id!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/.test(id))throw readError('IDENTITY','Unsupported product identity.');
   current(grant);if(inventory!==grant.capabilities.inventoryRead)throw readError('DENIED','Inventory read scope does not match the verified grant.');
   const products=await rows('components',[...columns,'description','specs'].join(','),{id:'eq.'+id},grant,signal,productionReadLimits.detailBytes,'detailRequests',1);
   if(products.length!==1)throw readError('IDENTITY','This product is no longer available to the verified session.');
   const stock=inventory?await rows('inventory','component_id,quantity,stock_unit',{component_id:'eq.'+id},grant,signal,2048,'detailRequests',1):undefined;
   if(inventory&&stock.length!==1)throw readError('INCOMPLETE','Product inventory is unavailable.');
   return {row:products[0],...inventory?{inventory:stock[0]}:{},complete:true,observedAt:new Date(now()).toISOString()};
  },
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  metrics:()=>structuredClone(stats),
  dispose(){if(!alive)return;alive=false;off();events.removeEventListener?.('storage',storage);invalidate();listeners.clear();}
 });
 branded.add(adapter);return adapter;
}

return {"productionReadLimits":productionReadLimits,"isProductionReadAdapter":isProductionReadAdapter,"createProductionReadAdapter":createProductionReadAdapter};
})(__m["dist/backend/public-config.mjs"],__m["dist/admin/admin-auth.mjs"],__m["dist/admin/command/bounded-json.mjs"],__m["dist/admin/command/read-activation.mjs"]);
__m["dist/admin/command/command01/model.mjs"]=(function(){
// COMMAND 01: an explicit, image-free read model. No transport or side effects.
const categories = Object.freeze({
  potentiometers: 'Potentiometers', capacitors: 'Capacitors',
  'treble-bleeds': 'Treble bleeds', switches: 'Switches', jacks: 'Output jacks', other: 'Other'
});
const LOW_STOCK_DISPLAY_THRESHOLD = 3; // Prototype presentation, never a reorder rule.
const emptyFilters = () => ({query:'',category:'',manufacturer:'',individual:'',kit:'',stock:''});
const text = (v, fallback='') => typeof v === 'string' ? v.trim().slice(0,4000) : fallback;
const integer = (v, field, optional=true) => {
  if (v == null && optional) return null;
  if (!Number.isSafeInteger(v) || v < 0) throw new Error('Invalid '+field+'.');
  return v;
};
const flag = (v, fallback=false) => {
  if (v === undefined) return fallback;
  if (typeof v !== 'boolean') throw new Error('Invalid eligibility flag.');
  return v;
};
const specKeys = ['resistance','taper','tolerance','capacitance','voltage','shaft','mounting','connection','material'];
function summary(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Invalid product record.');
  const id=text(record.id), name=text(record.name);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/.test(id) || !name) throw new Error('Product identity is missing or invalid.');
  if (!Object.hasOwn(categories,record.category)) throw new Error('Unrecognised component category.');
  const technicalSpecs={};
  for (const key of specKeys) if (text(record.technicalSpecs?.[key])) technicalSpecs[key]=text(record.technicalSpecs[key]);
  const quantity=integer(record.kitPriceQuantity,'kit price quantity');
  if (quantity===0) throw new Error('Kit price quantity must be positive.');
  return Object.freeze({
    id,name,sku:text(record.sku,id),category:record.category,manufacturer:text(record.manufacturer,'Not supplied'),
    active:flag(record.active,true),individually:flag(record.individually),inKits:flag(record.inKits),
    salePrice:integer(record.salePrice,'selling price'),kitPrice:integer(record.kitPrice,'kit price'),
    kitPriceQuantity:quantity,stock:integer(record.stock,'stock'),stockUnit:text(record.stockUnit,'item'),
    technicalSpecs:Object.freeze(technicalSpecs),revision:text(record.revision,'unversioned'),
    imageState:'unloaded'
  });
}
function catalogue(records) {
  if (!Array.isArray(records)) throw new Error('Catalogue response must be a list.');
  const ids=new Set();
  return records.map(record=>{
    const row=summary(record);
    if(ids.has(row.id)) throw new Error('Duplicate product identifier: '+row.id+'.');
    ids.add(row.id);return row;
  });
}
function detail(record,expectedId) {
  const row=summary(record);
  if(row.id!==expectedId) throw new Error('Product detail identity does not match the selection.');
  const info=record.imageInfo;
  const kind=info?.kind??'unloaded';
  if(!['unloaded','absent','available','unavailable','removed'].includes(kind)) throw new Error('Invalid image state.');
  if(kind==='removed' && info?.provenance!=='explicit-synthetic-removal') throw new Error('Image removal requires explicit provenance.');
  const imageInfo={kind};
  if(kind==='available'){
    if(!['image/png','image/webp','image/jpeg'].includes(info.mime) || !/^[a-f0-9]{64}$/.test(info.sha256??'')) throw new Error('Invalid image identity.');
    Object.assign(imageInfo,{mime:info.mime,sha256:info.sha256,bytes:integer(info.bytes,'image byte count',false),width:integer(info.width,'image width',false),height:integer(info.height,'image height',false)});
    if(!imageInfo.width||!imageInfo.height||!imageInfo.bytes) throw new Error('Invalid image dimensions.');
  }
  return Object.freeze({...row,description:text(record.description),specs:text(record.specs),
    productSpecifications:text(record.productSpecifications),imageInfo:Object.freeze(imageInfo)});
}
function stockState(row) {
  if(row.stock===null)return 'unknown';
  return row.stock===0?'out':row.stock<=LOW_STOCK_DISPLAY_THRESHOLD?'low':'in';
}
const stockLabel = row => ({unknown:'Not supplied',out:'Out of stock',low:'Low stock',in:'In stock'})[stockState(row)];
function filterCatalogue(rows,filters) {
  const terms=filters.query.trim().toLocaleLowerCase('en-GB').split(/\s+/).filter(Boolean);
  return rows.filter(row=>{
    const haystack=[row.name,row.sku,row.manufacturer,row.category,categories[row.category],...Object.values(row.technicalSpecs)].join(' ').toLocaleLowerCase('en-GB');
    return terms.every(term=>haystack.includes(term)) &&
      (!filters.category||row.category===filters.category) &&
      (!filters.manufacturer||row.manufacturer===filters.manufacturer) &&
      (!filters.individual||row.individually===(filters.individual==='yes')) &&
      (!filters.kit||row.inKits===(filters.kit==='yes')) &&
      (!filters.stock||stockState(row)===filters.stock);
  });
}
const money = value => value===null?'Not supplied':new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(value/100);

return {"categories":categories,"LOW_STOCK_DISPLAY_THRESHOLD":LOW_STOCK_DISPLAY_THRESHOLD,"emptyFilters":emptyFilters,"summary":summary,"catalogue":catalogue,"detail":detail,"stockState":stockState,"stockLabel":stockLabel,"filterCatalogue":filterCatalogue,"money":money};
})();
__m["dist/admin/command/read-boundary.mjs"]=(function({summary},{isProductionReadAdapter}){


// No fetch, credentials, endpoint, public/local fallback or production writes.
const READ_CONTRACT='command05-read-v1';
const capabilities=['catalogueRead','productRead','inventoryRead','draftPreview'];
const safeColumns=['id','sku','name','category','manufacturer','active','individually','in_kits','sale_price','kit_price','kit_price_quantity','updated_at'];
const hints={resistance:'Resistance',taper:'Taper',tolerance:'Tolerance',capacitance:'Value',voltage:'Voltage',shaft:'Shaft',connection:'Topology'};
const error=(code,message)=>Object.assign(new Error(message),{code,outcome:'not-applied'});
const blocked=async()=>{throw error('UNSUPPORTED','Production writes are disabled. No request was submitted.');};
function createReadBoundary({auth,adapter=null,now=Date.now,timeoutMs=5000}={}){
 if(typeof auth?.restore!=='function')throw Error('Existing Admin authentication boundary required.');
 const production=isProductionReadAdapter(adapter);
 if(adapter&&(adapter.contract!==READ_CONTRACT||(!production&&adapter.environment!=='synthetic')||['authorize','list','detail','subscribe'].some(k=>typeof adapter[k]!=='function')))throw Error('Only an explicitly injected synthetic or verified production read adapter is accepted. Real-service activation is gated.');
 let alive=true,epoch=0,grant=null,expiry=null;
 const listeners=new Set(),active=new Set(),cache=new Map();
 let state={status:adapter&&(!production||adapter.enabled)?'checking':'inactive',subject:null,capabilities:Object.fromEntries(capabilities.map(k=>[k,false])),observedAt:null,catalogueReady:false,source:production?'production':adapter?'synthetic':'inactive',productionWrites:false};
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
   if(!production){const membership=await bounded(()=>auth.restore());ensure(token);
    if(membership.status!=='authorized')throw error(membership.status==='denied'?'DENIED':'EXPIRED','An authorised Admin session is required.');}
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
  // Detail comparisons include fields that an updated_at-only writer might not bump.
  // This remains a local comparison hash, never a database compare-and-set revision.
  const detailHash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([common,row.description,Object.fromEntries(Object.entries(row.specs).sort(([a],[b])=>a.localeCompare(b)))])));ensure(ctx.token);
  const previewRevision='read-'+Array.from(new Uint8Array(detailHash),v=>v.toString(16).padStart(2,'0')).join('');
  return {...result,description:row.description,specs:structuredClone(row.specs),previewRevision,imageInfo:{kind:'unloaded'}};
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
  if(production&&grant)ensure(epoch);
  // An already authorised local detail remains usable for at most 15s without
  // another network call. Sign-out/storage changes/expiry clear this cache.
  const local=cache.get(id);if(production&&!force&&local&&now()-local.at<15000&&grant&&state.status==='ready'&&grant.capabilities.productRead&&!signal?.aborted){ensure(epoch);return structuredClone(local.record);}
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
  lock(reason='expired'){reset(reason);},destroy(){if(!alive)return;alive=false;off();if(production)adapter.dispose();reset('closed');listeners.clear();}
 });
}

return {"READ_CONTRACT":READ_CONTRACT,"createReadBoundary":createReadBoundary};
})(__m["dist/admin/command/command01/model.mjs"],__m["dist/admin/command/production-read.mjs"]);
__m["scripts/command-release/owner-read-check.mjs"]=(function({publicBackendConfig},{createAdminAuth},{createProductionReadAdapter},{createReadBoundary}){
// Inert until called by the owner after the separately bounded live-read approval.
// Existing session tokens stay in the owner's browser and go only to their own
// verified project. No credentials, product rows, IDs or private values are output.




let attempted=false;
async function ownerReadCheck({approvalRef,metadataSHA256,origin,inventoryRead=false,sourceCommit}={},runtime=globalThis){
 let boundary,timer,gets=0,refreshes=0;
 const report={status:'HOLD',approvalRef:null,sourceCommit:sourceCommit||null,projectRef:publicBackendConfig.url.split('//')[1].split('.')[0],checkedAt:new Date().toISOString(),ownerOperated:true,independentlyObservedByAssistant:false,productionWrites:false,requests:0,authRefreshes:0};
 try{
  if(typeof approvalRef!=='string'||!/^[A-Za-z0-9_:-]{1,120}$/.test(approvalRef)||!/^[a-f0-9]{64}$/.test(metadataSHA256||'')||!/^[a-f0-9]{40}$/.test(sourceCommit||''))throw Object.assign(Error(),{code:'APPROVAL_REQUIRED'});
  report.approvalRef=approvalRef;
  if(typeof origin!=='string'||!/^https:\/\/[^/]+$/.test(origin)||runtime.location?.origin!==origin)throw Object.assign(Error(),{code:'ORIGIN_MISMATCH'});
  if(attempted)throw Object.assign(Error(),{code:'ALREADY_ATTEMPTED_NO_RETRY'});attempted=true;report.origin=origin;
  const target=new URL(publicBackendConfig.url),request=async(url,options={})=>{
   const u=new URL(url),method=options.method||'GET';
   if(u.origin!==target.origin)throw Object.assign(Error(),{code:'REQUEST_SCOPE'});
   if(method==='POST'){
    if(u.pathname!=='/auth/v1/token'||u.searchParams.get('grant_type')!=='refresh_token'||refreshes>=1)throw Object.assign(Error(),{code:'REQUEST_SCOPE'});
    refreshes++;
   }else if(method!=='GET'||!['/auth/v1/user','/rest/v1/admin_members','/rest/v1/components','/rest/v1/inventory'].includes(u.pathname)||gets>=8)throw Object.assign(Error(),{code:'REQUEST_SCOPE'});
   else gets++;
   report.requests=gets+refreshes;report.authRefreshes=refreshes;
   return runtime.fetch(url,{...options,credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer'});
  };
  const auth=createAdminAuth({request,storage:runtime.localStorage}),adapter=createProductionReadAdapter({auth,request,events:runtime,activation:{enabled:true,inventoryRead:inventoryRead===true}});
  boundary=createReadBoundary({auth,adapter});timer=setTimeout(()=>boundary.lock('expired'),25000);
  const rows=await boundary.catalogueTransport.list();
  if(rows.length===0)throw Object.assign(Error(),{code:'EMPTY_NO_DETAIL_EVIDENCE'});
  const detail=await boundary.readProduct(rows[0].id);if(detail.id!==rows[0].id)throw Object.assign(Error(),{code:'IDENTITY'});
  const metrics=adapter.metrics();if(metrics.decodedBytes>768*1024)throw Object.assign(Error(),{code:'BOUNDS'});
  return {...report,status:'PASS_READ_COMPATIBILITY_OWNER_OPERATED',catalogueRows:rows.length,detailVerified:true,serverIdentityAndMembershipVerified:true,inventoryRead:inventoryRead===true,decodedJSONBytes:metrics.decodedBytes,responseBytes:metrics.responseBytes,scope:'One bounded catalogue and one product detail; no record values exported.',metadataSHA256};
 }catch(error){return {...report,code:typeof error?.code==='string'?error.code:'READ_UNVERIFIED'};}
 finally{clearTimeout(timer);boundary?.destroy();}
}

return {"ownerReadCheck":ownerReadCheck};
})(__m["dist/backend/public-config.mjs"],__m["dist/admin/admin-auth.mjs"],__m["dist/admin/command/production-read.mjs"],__m["dist/admin/command/read-boundary.mjs"]);
globalThis.COMMAND55_READ_CHECK=options=>__m["scripts/command-release/owner-read-check.mjs"].ownerReadCheck({...options,sourceCommit:"df78c5bf5144b012a7d96c628186180fa6432df3"});})();

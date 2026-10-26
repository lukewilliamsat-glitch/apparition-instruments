import {publicBackendConfig} from '../../backend/public-config.mjs';
import {adminAuthSessionKey} from '../admin-auth.mjs';
import {boundedJSON,readError} from './bounded-json.mjs';
import {productionReadActivation} from './read-activation.mjs';

const branded=new WeakSet();
const columns=['id','sku','name','category','manufacturer','active','individually','in_kits','sale_price','kit_price','kit_price_quantity','updated_at'];
const hints={resistance:'Resistance',taper:'Taper',tolerance:'Tolerance',capacitance:'Value',voltage:'Voltage',shaft:'Shaft',connection:'Topology'};
export const productionReadLimits=Object.freeze({rows:500,listBytes:524288,inventoryBytes:98304,detailBytes:49152,timeoutMs:5000});
export const isProductionReadAdapter=value=>branded.has(value);

export function createProductionReadAdapter({auth,config=publicBackendConfig,request=globalThis.fetch,activation=productionReadActivation,now=Date.now,events=globalThis}={}){
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

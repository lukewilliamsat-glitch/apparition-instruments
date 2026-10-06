import {publicBackendConfig} from './public-config.mjs';
let presentation=null;
export function readOperationsPresentation({request=globalThis.fetch}={}){return presentation||=request(new URL('../operations/snapshot.json',import.meta.url),{cache:'no-cache'}).then(async r=>{if(!r.ok)throw Error('Updates unavailable');return r.json();}).catch(e=>{presentation=null;throw e;});}
// Fresh, uncached UI read for purchasing surfaces. Failure disables purchasing;
// informational pages do not depend on this request or load privileged code.
export async function readCurrentStore({config=publicBackendConfig,request=globalThis.fetch}={}){
 const r=await request(config.url+'/rest/v1/rpc/get_site_operations',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:'{}'});
 if(!r.ok)throw Error('Store availability could not be checked. Please retry shortly.');const data=await r.json();if(!data?.store||!['OPEN','ORDERS_PAUSED'].includes(data.store.state)||!Number.isFinite(Date.parse(data.server_time)))throw Error('Store availability could not be checked. Please retry shortly.');return {...data.store,observed_at:data.server_time};
}
// Existing curated public RPC only; no authoring table, drafts or private fields.
export async function readPublicAnnouncements({config=publicBackendConfig,request=globalThis.fetch}={}){
 const fields=['id','slug','title','excerpt','category','publication_at','expires_at','cta_label','cta_url','announcement','priority','dismissible','updated_at'];
 const r=await request(config.url+'/rest/v1/rpc/public_news?announcement=eq.true&select='+fields.join(','),{method:'POST',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:'{}'});
 if(!r.ok)throw Error('Site updates unavailable.');const rows=await r.json();if(!Array.isArray(rows)||rows.length>1000)throw Error('Invalid site updates.');
 return rows.filter(p=>p.announcement===true).map(p=>{if(typeof p.title!=='string'||typeof p.excerpt!=='string'||!Number.isFinite(Date.parse(p.publication_at))||!Number.isInteger(p.priority)||typeof p.slug!=='string'||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug))throw Error('Invalid site update.');return Object.fromEntries(fields.map(key=>[key,p[key]??null]));});
}

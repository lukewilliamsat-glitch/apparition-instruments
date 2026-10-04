import {publicBackendConfig} from './public-config.mjs';
let presentation=null;
export function readOperationsPresentation({request=globalThis.fetch}={}){return presentation||=request(new URL('../operations/snapshot.json',import.meta.url),{cache:'no-cache'}).then(async r=>{if(!r.ok)throw Error('Updates unavailable');return r.json();}).catch(e=>{presentation=null;throw e;});}
// Fresh, uncached UI read for basket/checkout only. Failure disables purchasing;
// informational pages do not depend on this request or load privileged code.
export async function readCurrentStore({config=publicBackendConfig,request=globalThis.fetch}={}){
 const r=await request(config.url+'/rest/v1/rpc/get_site_operations',{method:'POST',cache:'no-store',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:'{}'});
 if(!r.ok)throw Error('Store availability could not be checked. Please retry shortly.');const data=await r.json();if(!data?.store||!['OPEN','ORDERS_PAUSED'].includes(data.store.state)||!Number.isFinite(Date.parse(data.server_time)))throw Error('Store availability could not be checked. Please retry shortly.');return {...data.store,observed_at:data.server_time};
}

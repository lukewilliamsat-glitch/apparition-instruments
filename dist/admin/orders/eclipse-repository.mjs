import {createAdminAuth} from '../admin-auth.mjs';
import {publicBackendConfig} from '../../backend/public-config.mjs';
import {boundedJSON} from '../command/bounded-json.mjs';
const calls=Object.freeze({read:'eclipse_fulfilment_library',save:'eclipse_save_fulfilment_library'});
export function createEclipseLibraryRepository({auth=createAdminAuth(),config=publicBackendConfig,request=fetch}={}){
 async function rpc(method,body){
  const signal=AbortSignal.timeout(8000);
  if(config.enabled===false)throw Error('The private fulfilment library is unavailable.');
  const jwt=await auth.accessToken({signal,bounded:true});
  const response=await request(config.url+'/rest/v1/rpc/'+calls[method],{method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+jwt,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal});
  if(!response.ok){
   await response.body?.cancel().catch(()=>{});
   throw Error(({401:'Sign in again to access the fulfilment library.',403:'Current Admin permission is required.',409:'This library changed. Reload before saving.'})[response.status]||'The fulfilment library rejected this request. Review the inputs or reload before trying again.');
  }
  const data=await boundedJSON(response,24576,{signal});
  if(!Number.isSafeInteger(data?.revision)||!Array.isArray(data.items)||data.items.length>32||!Array.isArray(data.presets)||data.presets.length>12||JSON.stringify(data).length>20000)throw Error('Invalid fulfilment library response.');
  return data;
 }
 return {read:()=>rpc('read',{}),save:(revision,items,presets)=>rpc('save',{p_revision:revision,p_items:items,p_presets:presets})};
}

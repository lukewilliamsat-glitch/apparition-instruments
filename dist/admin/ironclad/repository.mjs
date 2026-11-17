import {createAdminAuth} from '../admin-auth.mjs';
import {publicBackendConfig} from '../../backend/public-config.mjs';
import {boundedJSON} from '../command/bounded-json.mjs';
export function createArmouryRepository({auth=createAdminAuth(),config=publicBackendConfig,request=fetch}={}){
 async function rpc(kind,body,signal){
  const endpoint=new URL(config.url);
  if(endpoint.origin!=='https://prwmowexhonguvtiywsy.supabase.co'||endpoint.pathname!=='/'||endpoint.search||endpoint.hash)
   throw new Error('IRONCLAD staging is isolated from production. Use an authorised staging build.');
  const timeout=AbortSignal.timeout(10000),token=await auth.accessToken({signal:signal?AbortSignal.any([timeout,signal]):timeout,bounded:true});
  const effective=signal?AbortSignal.any([timeout,signal]):timeout;
  const r=await request(config.url+'/rest/v1/rpc/ironclad69_'+kind,{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',
   headers:{'Content-Type':'application/json',apikey:config.publishableKey,Authorization:'Bearer '+token},body:JSON.stringify(body),signal:effective});
  if(!r.ok){
   let value;try{value=await boundedJSON(r,4000,{signal:effective});}catch{}
   if(r.status===401||r.status===403)throw new Error('Admin access is required.');
   if(value?.code==='40001')throw new Error('Stock changed while you were working. Refresh before continuing.');
   throw new Error(value?.message&&String(value.message).length<270?value.message:'The inventory operation could not be completed.');
  }
  return boundedJSON(r,180000,{signal:effective});
 }
 return {read:(view,filter,signal)=>rpc('read',{p_view:view,p_filter:filter},signal),
 write:(id,action,body)=>rpc('write',{p_id:id,p_action:action,p_body:body}), readCosts:(order,signal)=>rpc('cost_read',{p_order:order},signal)};
}

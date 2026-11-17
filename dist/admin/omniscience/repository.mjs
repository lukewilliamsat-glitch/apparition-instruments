import {createAdminAuth} from '../admin-auth.mjs';
import {publicBackendConfig} from '../../backend/public-config.mjs';
import {boundedJSON} from '../command/bounded-json.mjs';
import {rowsPerPage,validateRange} from './model.mjs';
const id=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const endpoints=Object.freeze({orders:'omniscience74_orders',outlays:'omniscience74_outlays',outlay:'omniscience74_record_outlay',reimburse:'omniscience74_reimburse'});
export function financeRepository({auth=createAdminAuth(),config=publicBackendConfig,request=globalThis.fetch}={}){
 async function rpc(method,data,outer){
  if(config.enabled===false)throw Error('Private financial data is not available.');
  const timeout=AbortSignal.timeout(10000),signal=outer?AbortSignal.any([outer,timeout]):timeout;
  const token=await auth.accessToken({signal,bounded:true});
  const r=await request(config.url+'/rest/v1/rpc/'+endpoints[method],{method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(data),signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error'});
  if(!r.ok){
   const error=await boundedJSON(r,4096,{signal}).catch(()=>null);
   if(['401','403'].includes(String(r.status)))throw Error('Sign in again with a current authorised Admin account.');
   if(error?.code==='23505')throw Error('That record or evidence reference already exists. Review the register before retrying.');
   if(error?.code==='23514')throw Error('The amount or classification is invalid, or the reimbursement exceeds what is owed.');
   if(r.status===404||error?.code==='PGRST202')throw Error('This financial workspace has not been activated on the selected database.');
   throw Error('The request could not be confirmed. Check the inputs and refresh the register before starting a different entry.');
  }
  return boundedJSON(r,method==='orders'?384000:24000,{signal});
 }
 async function page(method,{from,to},cursor,signal){
  validateRange(from,to);
  if(cursor&&(!id.test(cursor.id)||typeof cursor.day!=='string'||cursor.day<from||cursor.day>to))throw Error('Unexpected reporting cursor.');
  const data=await rpc(method,{p_from:from,p_to:to,p_cursor_day:cursor?.day??null,p_cursor_id:cursor?.id??null},signal);
  if(!Array.isArray(data?.rows)||data.rows.length>rowsPerPage||data.rows.some(r=>!id.test(r.id)||typeof r.day!=='string'||r.day<from||r.day>to||(method==='orders'&&(!Array.isArray(r.items)||r.items.length>10))))throw Error('Unexpected reporting data.');
  const last=data.rows.at(-1);
  if(data.next&&(!last||data.next.id!==last.id||data.next.day!==last.day||cursor?.id===data.next.id))throw Error('Unexpected reporting cursor.');
  return data;
 }
 async function save(kind,key,fields,signal){
  if(!id.test(key))throw Error('Invalid record identity.');
  const reply=await rpc(kind,{p_id:key,...fields},signal);
  if(reply?.id!==key||typeof reply.duplicate!=='boolean')throw Error('The save outcome is unknown. Reload the register before changing the entry.');
  return reply;
 }
 return {orders:(r,c,s)=>page('orders',r,c,s),outlays:(r,c,s)=>page('outlays',r,c,s),outlay:(key,body,s)=>save('outlay',key,{p_data:body},s), reimburse:(key,fields,s)=>save('reimburse',key,fields,s)};
}

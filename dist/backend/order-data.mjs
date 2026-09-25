import {publicBackendConfig} from './public-config.mjs';

const errorMessage=async(response)=>{let body;try{body=await response.json();}catch{}return typeof body?.message==='string'?body.message:'Order service unavailable ('+response.status+').';};
export function createGuestOrderRepository({config=publicBackendConfig,request=globalThis.fetch}={}){
 return Object.freeze({async create(input){
  const response=await request(config.url+'/rest/v1/rpc/create_guest_kit_order',{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({p_request:input})});
  if(!response.ok)throw new Error(await errorMessage(response));
  const result=await response.json();if(!result?.id||!/^AI-\d+$/.test(result.reference)||!Number.isSafeInteger(result.totalPence)||result.paymentStatus!=='unpaid')throw new Error('Order confirmation was unreadable. Contact Apparition before retrying.');
  return result;
 }});
}
export function createSecureCheckoutRepository({config=publicBackendConfig,request=globalThis.fetch}={}){
 return Object.freeze({async create(input){
  const response=await request(config.url+'/functions/v1/create-checkout',{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(input)});
  if(!response.ok)throw new Error(await errorMessage(response));
  const result=await response.json();
  if(!/^https:\/\/checkout\.stripe\.com\//.test(result?.url||'')||!/^AI-\d+$/.test(result.reference)||!Number.isSafeInteger(result.totalPence))throw new Error('The secure checkout link was unreadable. Please retry.');
  return result;
 }});
}
export function createAdminOrderRepository(transport){
 if(typeof transport?.send!=='function')throw new Error('Authenticated Admin transport required.');
 return Object.freeze({async list(){const response=await transport.send('orders',{query:'?select=*&order=created_at.desc'});if(!response.ok)throw new Error(await errorMessage(response));const rows=await response.json();if(!Array.isArray(rows))throw new Error('Invalid shared Orders response.');return rows.map(row=>({id:row.id,reference:row.reference,createdAt:row.created_at,updatedAt:row.updated_at,customer:row.customer,delivery:row.delivery,items:row.items,status:'PENDING',paymentStatus:row.payment_status,channel:'WEBSITE',pricing:{subtotal:row.subtotal_pence,delivery:row.delivery_pence,total:row.total_pence},statusHistory:[{status:'PENDING',at:row.created_at}]}));}});
}
let adminOrderRepository;
export function setAdminOrderRepository(repository){adminOrderRepository=repository;}
export function currentAdminOrderRepository(){if(!adminOrderRepository)throw new Error('Authorised Orders access is unavailable. Sign in again.');return adminOrderRepository;}

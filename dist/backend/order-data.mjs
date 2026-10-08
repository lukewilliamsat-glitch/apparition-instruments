import {publicBackendConfig} from './public-config.mjs';
import {orderHistory} from '../admin/orders/lifecycle.mjs';

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
 return Object.freeze({async create(input,{accessToken=null}={}){
  const response=await request(config.url+'/functions/v1/create-checkout',{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json',Accept:'application/json',...(accessToken?{Authorization:'Bearer '+accessToken}:{})},body:JSON.stringify(input)});
  if(!response.ok)throw new Error(await errorMessage(response));
  const result=await response.json();
  if(!/^https:\/\/checkout\.stripe\.com\//.test(result?.url||'')||!/^AI-\d+$/.test(result.reference)||!Number.isSafeInteger(result.totalPence))throw new Error('The secure checkout link was unreadable. Please retry.');
  return result;
 }});
}
export function createAdminOrderRepository(transport){
 if(typeof transport?.send!=='function')throw new Error('Authenticated Admin transport required.');
 return Object.freeze({
 async externalProducts(){
  const read=async(resource,query)=>{const response=await transport.send(resource,{query});if(!response.ok)throw new Error(await errorMessage(response));const rows=await response.json();if(!Array.isArray(rows))throw new Error('Invalid external catalogue response.');return rows;};
  const [components,inventory,assemblies,bom]=await Promise.all([
   read('components','?select=id,sku,name,active,individually,sale_price&active=eq.true'),
   read('inventory','?select=component_id,quantity'),
   read('assemblies','?select=id,sku,name,kind,active&active=eq.true&kind=eq.assembly'),
   read('assembly_bom','?select=assembly_id,component_id,quantity')]);
  const stock=new Map(inventory.map(row=>[row.component_id,row.quantity]));
  return [...components.filter(row=>row.individually).map(row=>({type:'component',id:row.id,sku:row.sku,name:row.name,price:row.sale_price,available:stock.get(row.id)??0})),
   ...assemblies.flatMap(row=>{const parts=bom.filter(part=>part.assembly_id===row.id);if(!parts.length||parts.some(part=>!components.some(c=>c.id===part.component_id)))return [];return [{type:'assembly',id:row.id,sku:row.sku,name:row.name,price:null,available:Math.min(...parts.map(part=>Math.floor((stock.get(part.component_id)??0)/part.quantity)))}];})].sort((a,b)=>a.name.localeCompare(b.name));
 },
 async editExternal(id,updatedAt,change){const response=await transport.send('rpc/edit_external_order',{method:'POST',body:{p_order_id:id,p_expected_updated_at:updatedAt,p_change:change}});if(!response.ok)throw new Error(await errorMessage(response));return response.json();},
 async createExternal(input){const response=await transport.send('rpc/create_external_order',{method:'POST',body:{p_request:input}});if(!response.ok)throw new Error(await errorMessage(response));const result=await response.json();if(!result?.id||!/^AI-\d+$/.test(result.reference))throw new Error('Order result was unreadable. Retry the same reference to check safely.');return result;},
 async list(){const response=await transport.send('orders',{query:'?select=*&order=created_at.desc'});if(!response.ok)throw new Error(await errorMessage(response));const rows=await response.json();if(!Array.isArray(rows))throw new Error('Invalid shared Orders response.');let reviews=[];if(rows.some(row=>row.payment_status==='partially_refunded')){const reviewResponse=await transport.send('partial_refund_reviews',{query:'?select=order_id,refunded_pence,refund_at,admin_user_id,reviewed_at'});if(!reviewResponse.ok)throw new Error(await errorMessage(reviewResponse));reviews=await reviewResponse.json();if(!Array.isArray(reviews))throw new Error('Invalid refund review response.');}const deliveriesResponse=await transport.send('order_email_deliveries',{query:'?select=order_id,kind,state,created_at,attempted_at,sent_at,attempts,recipient_email,external_requested_by,claimed_at,failure_reason&order=created_at.desc'});if(!deliveriesResponse.ok)throw new Error(await errorMessage(deliveriesResponse));const deliveries=await deliveriesResponse.json();if(!Array.isArray(deliveries))throw new Error('Invalid delivery status response.');return rows.map(row=>({id:row.id,reference:row.reference,createdAt:row.created_at,updatedAt:row.updated_at,customer:row.customer||{},delivery:row.delivery||{},dispatchDetails:row.dispatch_details||{},emailDeliveries:deliveries.filter(delivery=>delivery.order_id===row.id),items:row.items,status:row.status,paymentStatus:row.payment_status,refundedPence:row.refunded_pence??0,latestRefundAt:row.latest_refund_at,partialRefundAcknowledged:reviews.some(review=>review.order_id===row.id&&review.refunded_pence===row.refunded_pence&&review.refund_at===row.latest_refund_at),fulfilmentStatus:row.status,confirmationEmailStatus:row.confirmation_email_status,confirmationEmailSentAt:row.confirmation_email_sent_at,confirmationEmailFailure:row.confirmation_email_failure,channel:row.sales_channel||'WEBSITE',externalReference:row.external_reference,orderDate:row.order_date,notes:row.internal_notes||'',pricing:{subtotal:row.subtotal_pence,delivery:row.delivery_pence,total:row.total_pence},dispatchEmailDeclined:(row.status_history||[]).some(e=>e.type==='external_dispatch_no_email'),statusHistory:orderHistory(row)}));},
 async acknowledgePartialRefund(id,refundedPence,latestRefundAt){const response=await transport.send('rpc/acknowledge_partial_refund',{method:'POST',body:{p_order_id:id,p_expected_pence:refundedPence,p_expected_refund_at:latestRefundAt}});if(!response.ok)throw new Error(await errorMessage(response));return response.json();},
 async advanceFulfilment(id,nextStatus){const response=await transport.send('rpc/advance_order_fulfilment',{method:'POST',body:{p_order_id:id,p_next_status:nextStatus}});if(!response.ok)throw new Error(await errorMessage(response));return response.json();},
 async recordDispatchDetails(id,{carrier='',trackingReference='',trackingUrl=''}){const response=await transport.send('rpc/record_order_dispatch_details',{method:'POST',body:{p_order_id:id,p_carrier:carrier,p_tracking_reference:trackingReference,p_tracking_url:trackingUrl}});if(!response.ok)throw new Error(await errorMessage(response));return response.json();}});
}
let adminOrderRepository;
export function setAdminOrderRepository(repository){adminOrderRepository=repository;}
export function currentAdminOrderRepository(){if(!adminOrderRepository)throw new Error('Authorised Orders access is unavailable. Sign in again.');return adminOrderRepository;}

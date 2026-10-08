import {mountFulfilmentCorrections} from './fulfilment-corrections.mjs';
import {mountFirstDispatchPreview,reviewDispatchEmail} from './email-review.mjs';
import {mountExternalEditing,confirmDispatchEmail,requestExternalDispatch,externalRecipientAllowed} from './external-edit.mjs';
import {presentOrderDetail} from './detail-presentation.mjs';
import {statusBadge} from '../application.mjs';
import {currentAdminOrderRepository} from '../../backend/order-data.mjs?v=external-v1';
import {fulfilmentLabels,paymentLabels,isPaidOrder,isCheckoutAttempt,nextFulfilment} from './lifecycle.mjs';
import {el,money,date,showOrder} from './view.mjs?v=external-v1';
import {mountExternalOrderForm} from './external-order.mjs';
import {channels} from './model.mjs';
import {deploymentPath} from '../../deployment.mjs';
import {createAdminAuth} from '../admin-auth.mjs';
import {publicBackendConfig} from '../../backend/public-config.mjs';
const $=selector=>document.querySelector(selector);
let records=[];
$('#order-create-actions').hidden=false;
$('#order-editor').hidden=true;
const creating=new URLSearchParams(location.search).get('new')==='external';
if(creating)mountExternalOrderForm({repository:currentAdminOrderRepository()});
const attempts=new URLSearchParams(location.search).get('view')==='attempts';
for(const [key,label] of Object.entries(fulfilmentLabels)){const option=el('option',label);option.value=key;$('#order-filter').append(option);}
const deliveryLabels={in_production:'In Production',ready_to_dispatch:'Ready to Dispatch',dispatched:'Dispatched',full_refund:'Refund Processed'};
function appendEmailStatus(order){
 const section=el('section',undefined,'order-email-status');section.append(el('h3','Customer communications'));
 if(order.channel!=='WEBSITE'){mountExternalEditing(order,{root:$('#detail-content'),repository:currentAdminOrderRepository(),refresh,message:$('#order-message')});return;}
 section.append(el('p','Lifecycle and refund email delivery is not yet active. Existing order confirmations remain on the approved production path.','storage-note'));
 for(const [kind,label] of Object.entries(deliveryLabels)){
  const row=(order.emailDeliveries||[]).find(item=>item.kind===kind);
  const state=row?({pending:'Eligible / Pending',claimed:'Claimed / Requires Review',sent:'Sent',failed:'Failed / Requires Review',unknown:'Unknown / Requires Review'})[row.state]||'Requires Review':'Not yet eligible';
  section.append(el('p',label+': '+state+(row?.sent_at?' · '+date(row.sent_at):row?.attempted_at?' · Last attempt '+date(row.attempted_at):'')));
 }
 section.append(el('p','Failed and uncertain outcomes require controlled review. Manual dispatch emails require a reviewed preview; resends require a successful prior notification and a reason.','storage-note'));
 mountFirstDispatchPreview(order,{root:section,refresh,message:$('#order-message'),recipientAllowed:externalRecipientAllowed});
 $('#detail-content').append(section);
}
function appendDispatchEditor(order){
 if(!['ready_to_dispatch','dispatched'].includes(order.fulfilmentStatus)||order.paymentStatus==='refunded')return;
 const form=el('form',undefined,'dispatch-details');form.append(el('h3',order.fulfilmentStatus==='ready_to_dispatch'?'Dispatch details · Step 1':'Dispatch details'),el('p','Carrier and tracking are optional. Save any details before advancing to Dispatched; an untracked Order can be dispatched without entering anything.'));
 const inputs={};for(const [key,label,max] of [['carrier','Carrier / service',100],['trackingReference','Tracking reference',150],['trackingUrl','HTTPS tracking link',500]]){
  const field=el('label',label),input=el('input');input.name=key;input.maxLength=max;input.value=order.dispatchDetails?.[key==='trackingReference'?'tracking_reference':key==='trackingUrl'?'tracking_url':key]||'';field.append(input);form.append(field);inputs[key]=input;
 }
 inputs.trackingUrl.type='url';inputs.trackingUrl.inputMode='url';inputs.trackingUrl.placeholder='https://…';
 const values=()=>JSON.stringify(Object.values(inputs).map(input=>input.value.trim()));const savedValues=values();
 form.addEventListener('input',()=>{form.dataset.dirty=String(values()!==savedValues);});
 const button=el('button','Save dispatch details','button');button.type='submit';button.className='button';form.append(button);
 form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;try{await currentAdminOrderRepository().recordDispatchDetails(order.id,{carrier:inputs.carrier.value.trim(),trackingReference:inputs.trackingReference.value.trim(),trackingUrl:inputs.trackingUrl.value.trim()});await refresh();$('#order-message').textContent='Dispatch information saved. No email was sent.';}catch(error){$('#order-message').textContent=error.message;button.disabled=false;}});
 $('#order-status-form').before(form);
}
function render(){
 document.querySelector('.dispatch-details')?.remove();
 const id=new URLSearchParams(location.search).get('id'),order=records.find(item=>item.id===id);
 $('#order-detail').hidden=!id;$('#order-list').hidden=!!id;
 if(creating){$('#order-list').hidden=true;$('#order-detail').hidden=true;return;}
 if(id){if(!order){$('#order-message').textContent='Order not found in shared Orders. Return to the list and refresh.';return;}$('#detail-title').textContent=order.reference;showOrder(order,$('#detail-content'));if(isPaidOrder(order)&&order.channel==='WEBSITE'){const invoice=el('a','Print / Save Invoice','button');invoice.href=deploymentPath('/admin/orders/invoice/?id='+encodeURIComponent(order.id));$('#detail-content').prepend(invoice);}
  if(order.channel==='WEBSITE'&&order.reference==='AI-010010'&&order.paymentStatus==='paid'&&order.confirmationEmailStatus==='legacy'){
   const button=el('button','Send one confirmation for AI-010010','button');button.type='button';
   button.addEventListener('click',async()=>{
    if(!window.confirm('Send one order confirmation to the customer email already saved on AI-010010? This cannot be undone.'))return;
    button.disabled=true;$('#order-message').textContent='Requesting one confirmation…';
    try{const token=await createAdminAuth().accessToken();const reply=await fetch(publicBackendConfig.url+'/functions/v1/send-legacy-confirmation',{method:'POST',headers:{apikey:publicBackendConfig.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({reference:'AI-010010'})});
     const result=await reply.json();if(!reply.ok)throw new Error(result.message||'Confirmation unavailable.');await refresh();$('#order-message').textContent=result.message;}
    catch(error){$('#order-message').textContent=error.message;await refresh();}
   });$('#detail-content').prepend(button);
  }
  appendEmailStatus(order);appendDispatchEditor(order);mountFulfilmentCorrections(order,{repository:currentAdminOrderRepository(),refresh,message:$('#order-message')});presentOrderDetail(document,order);
  const next=nextFulfilment(order),form=$('#order-status-form');form.hidden=!next;
  const select=$('#detail-status');select.replaceChildren();if(next){const choice=el('option',fulfilmentLabels[next]);choice.value=next;select.append(choice);}
  if(next){const button=form.querySelector('button');button.textContent='Advance to '+fulfilmentLabels[next];const note=form.querySelector('p');note.textContent=order.channel!=='WEBSITE'?'External order fulfilment. Dispatch emails require your explicit confirmation; saving details never sends email.':next==='completed'?'Completed has no customer email. Payment state is unchanged.':'After customer emails are activated, this transition will create a customer '+fulfilmentLabels[next]+' update. Email delivery is currently inactive.';form.querySelector('label').firstChild.textContent=next==='dispatched'?'Step 2 · Advance fulfilment':'Advance fulfilment';}
  if(order.channel==='WEBSITE'&&order.paymentStatus==='paid'&&(!order.customer.name||!order.delivery.line1)){
   const button=el('button','Retrieve verified Stripe delivery details','button');button.type='button';
   button.addEventListener('click',async()=>{button.disabled=true;$('#order-message').textContent='Retrieving verified delivery details…';
    try{const token=await createAdminAuth().accessToken();const reply=await fetch(publicBackendConfig.url+'/functions/v1/sync-order-contact',{method:'POST',headers:{apikey:publicBackendConfig.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({reference:order.reference})});
     if(!reply.ok)throw new Error((await reply.json()).message||'Could not retrieve delivery details.');await refresh();}
    catch(error){$('#order-message').textContent=error.message;button.disabled=false;}});
   $('#detail-content').prepend(button);
  }
  if(order.paymentStatus==='partially_refunded'&&!order.partialRefundAcknowledged){
   const notice=el('p','Partially refunded: '+money(order.refundedPence)+' of '+money(order.pricing.total)+'. Fulfilment is paused until an Admin reviews this exact refund state. A further refund requires a new review.','storage-note');
   const button=el('button','Acknowledge partial refund and allow fulfilment','button');button.type='button';
   button.addEventListener('click',async()=>{if(!window.confirm('Confirm you have reviewed the current partial refund on '+order.reference+'? This does not advance fulfilment.'))return;
    button.disabled=true;try{await currentAdminOrderRepository().acknowledgePartialRefund(order.id,order.refundedPence,order.latestRefundAt);await refresh();}
    catch(error){$('#order-message').textContent=error.message;button.disabled=false;}});
   $('#detail-content').append(notice,button);
  }else if(order.paymentStatus==='refunded')$('#detail-content').append(el('p','This Order has been fully refunded. Fulfilment progression is unavailable; the existing fulfilment history is unchanged.','storage-note'));
  return;}
 const q=$('#order-search').value.toLowerCase().trim(),filter=$('#order-filter').value;
 const rows=records.filter(item=>(attempts?isCheckoutAttempt(item):isPaidOrder(item))&&(!filter||item.fulfilmentStatus===filter)&&[item.reference,item.externalReference,channels[item.channel],item.customer.name,item.customer.email].join(' ').toLowerCase().includes(q));
 $('#order-rows').replaceChildren();$('#orders-empty').hidden=!!rows.length;
 for(const order of rows){const row=el('tr'),cell=el('td'),link=el('a',order.reference);link.href=deploymentPath('/admin/orders/?id='+encodeURIComponent(order.id));cell.append(link);if(order.externalReference)cell.append(el('small',' · '+order.externalReference));row.append(cell,el('td',channels[order.channel]||order.channel),...[order.orderDate||date(order.createdAt),order.customer.name||'Not supplied',money(order.pricing.total),paymentLabels[order.paymentStatus]||order.paymentStatus,isPaidOrder(order)?fulfilmentLabels[order.fulfilmentStatus]||order.fulfilmentStatus:'Checkout attempt'].map((value,index)=>{const cell=el('td',index===3||index===4?undefined:value,index===3||index===4?'order-state':'');if(index===3||index===4)cell.append(statusBadge(document,value,index===3&&['unpaid','partially_refunded'].includes(order.paymentStatus)||index===4&&['pending','ready_to_dispatch'].includes(order.fulfilmentStatus)?'warning':'neutral'));if(index===4&&order.paymentStatus==='partially_refunded'&&!order.partialRefundAcknowledged)cell.append(statusBadge(document,'Refund review required','warning'));return cell;}));$('#order-rows').append(row);}
}
async function refresh(){if(document.querySelector('.external-order-edit,.external-dispatch-dialog'))return;try{records=await currentAdminOrderRepository().list();$('#order-message').textContent='';render();}catch(error){$('#order-message').textContent=error.message;}}
$('#order-search').addEventListener('input',render);$('#order-filter').addEventListener('change',render);
$('#order-status-form').addEventListener('submit',async event=>{event.preventDefault();const id=new URLSearchParams(location.search).get('id'),order=records.find(item=>item.id===id),next=nextFulfilment(order);
 if(!order||!next||$('#detail-status').value!==next)return;
 if(next==='dispatched'&&document.querySelector('.dispatch-details')?.dataset.dirty==='true'){$('#order-message').textContent='Save your dispatch details before marking this Order Dispatched.';document.querySelector('.dispatch-details button')?.focus();return;}
 const button=$('#order-status-form button');button.disabled=true;
 try{
  let notice='',choice='no';
  if(next==='dispatched'){
   if(externalRecipientAllowed((order.customer.email||'').trim(),order.channel))choice=await confirmDispatchEmail({email:order.customer.email,channel:order.channel});
   if(choice==='cancel')return;
   if(order.channel!=='WEBSITE')await requestExternalDispatch(order,{dispatch:true,send:false});else await currentAdminOrderRepository().advanceFulfilment(order.id,next);
   notice='Order changed to Dispatched. No email has been sent.';await refresh();$('#order-message').textContent=notice;
   if(choice==='yes'){
    const current=records.find(o=>o.id===id);if(!current||current.fulfilmentStatus!=='dispatched')throw Error('Dispatch saved. Refresh the order before previewing the email.');
    const result=await reviewDispatchEmail(current,{transitionNotice:notice+' Cancelling this preview keeps the order Dispatched.'});
    await refresh();notice='Order changed to Dispatched. '+(result||'No email was sent.');
   }
  }else {await currentAdminOrderRepository().advanceFulfilment(order.id,next);await refresh();}
  if(notice)$('#order-message').textContent=notice;
 }
 catch(error){$('#order-message').textContent=error.message;}
 finally{button.disabled=false;}
});
window.addEventListener('pageshow',refresh);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
refresh();

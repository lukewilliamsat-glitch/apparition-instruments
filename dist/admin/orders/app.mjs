import {currentAdminOrderRepository} from '../../backend/order-data.mjs?v=p08a1';
import {fulfilmentLabels,paymentLabels,isPaidOrder,isCheckoutAttempt,nextFulfilment} from './lifecycle.mjs';
import {el,money,date,showOrder} from './view.mjs?v=p08a1';
import {deploymentPath} from '../../deployment.mjs';
import {createAdminAuth} from '../admin-auth.mjs';
import {publicBackendConfig} from '../../backend/public-config.mjs';
const $=selector=>document.querySelector(selector);
let records=[];
$('#order-create-actions').hidden=true;
$('#order-editor').hidden=true;
const attempts=new URLSearchParams(location.search).get('view')==='attempts';
for(const [key,label] of Object.entries(fulfilmentLabels)){const option=el('option',label);option.value=key;$('#order-filter').append(option);}
function render(){
 const id=new URLSearchParams(location.search).get('id'),order=records.find(item=>item.id===id);
 $('#order-detail').hidden=!id;$('#order-list').hidden=!!id;
 if(id){if(!order){$('#order-message').textContent='Order not found in shared Orders. Return to the list and refresh.';return;}$('#detail-title').textContent=order.reference;showOrder(order,$('#detail-content'));if(isPaidOrder(order)){const invoice=el('a','Print / Save Invoice','button');invoice.href=deploymentPath('/admin/orders/invoice/?id='+encodeURIComponent(order.id));$('#detail-content').prepend(invoice);}
  if(order.reference==='AI-010010'&&order.paymentStatus==='paid'&&order.confirmationEmailStatus==='legacy'){
   const button=el('button','Send one confirmation for AI-010010','button');button.type='button';
   button.addEventListener('click',async()=>{
    if(!window.confirm('Send one order confirmation to the customer email already saved on AI-010010? This cannot be undone.'))return;
    button.disabled=true;$('#order-message').textContent='Requesting one confirmation…';
    try{const token=await createAdminAuth().accessToken();const reply=await fetch(publicBackendConfig.url+'/functions/v1/send-legacy-confirmation',{method:'POST',headers:{apikey:publicBackendConfig.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({reference:'AI-010010'})});
     const result=await reply.json();if(!reply.ok)throw new Error(result.message||'Confirmation unavailable.');await refresh();$('#order-message').textContent=result.message;}
    catch(error){$('#order-message').textContent=error.message;await refresh();}
   });$('#detail-content').prepend(button);
  }
  const next=nextFulfilment(order),form=$('#order-status-form');form.hidden=!next;
  const select=$('#detail-status');select.replaceChildren();if(next){const choice=el('option',fulfilmentLabels[next]);choice.value=next;select.append(choice);}
  if(order.paymentStatus==='paid'&&(!order.customer.name||!order.delivery.line1)){
   const button=el('button','Retrieve verified Stripe delivery details','button');button.type='button';
   button.addEventListener('click',async()=>{button.disabled=true;$('#order-message').textContent='Retrieving verified delivery details…';
    try{const token=await createAdminAuth().accessToken();const reply=await fetch(publicBackendConfig.url+'/functions/v1/sync-order-contact',{method:'POST',headers:{apikey:publicBackendConfig.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({reference:order.reference})});
     if(!reply.ok)throw new Error((await reply.json()).message||'Could not retrieve delivery details.');await refresh();}
    catch(error){$('#order-message').textContent=error.message;button.disabled=false;}});
   $('#detail-content').prepend(button);
  }return;}
 const q=$('#order-search').value.toLowerCase().trim(),filter=$('#order-filter').value;
 const rows=records.filter(item=>(attempts?isCheckoutAttempt(item):isPaidOrder(item))&&(!filter||item.fulfilmentStatus===filter)&&[item.reference,item.customer.name,item.customer.email].join(' ').toLowerCase().includes(q));
 $('#order-rows').replaceChildren();$('#orders-empty').hidden=!!rows.length;
 for(const order of rows){const row=el('tr'),cell=el('td'),link=el('a',order.reference);link.href=deploymentPath('/admin/orders/?id='+encodeURIComponent(order.id));cell.append(link);row.append(cell,...[date(order.createdAt),order.customer.name||'Not supplied',money(order.pricing.total),paymentLabels[order.paymentStatus]||order.paymentStatus,isPaidOrder(order)?fulfilmentLabels[order.fulfilmentStatus]||order.fulfilmentStatus:'Checkout attempt'].map((value,index)=>el('td',value,index===3?'order-state '+(isPaidOrder(order)?'paid':'unpaid'):index===4?'order-state':'')));$('#order-rows').append(row);}
}
async function refresh(){try{records=await currentAdminOrderRepository().list();$('#order-message').textContent='';render();}catch(error){$('#order-message').textContent=error.message;}}
$('#order-search').addEventListener('input',render);$('#order-filter').addEventListener('change',render);
$('#order-status-form').addEventListener('submit',async event=>{event.preventDefault();const id=new URLSearchParams(location.search).get('id'),order=records.find(item=>item.id===id),next=nextFulfilment(order);
 if(!order||!next||$('#detail-status').value!==next)return;
 const button=$('#order-status-form button');button.disabled=true;
 try{await currentAdminOrderRepository().advanceFulfilment(order.id,next);await refresh();}
 catch(error){$('#order-message').textContent=error.message;}
 finally{button.disabled=false;}
});
window.addEventListener('pageshow',refresh);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
refresh();

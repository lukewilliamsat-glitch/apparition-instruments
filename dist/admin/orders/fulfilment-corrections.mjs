import {el,date} from './view.mjs?v=external-v1';
import {fulfilmentLabels} from './lifecycle.mjs';
import {externalRecipientAllowed} from './external-edit.mjs';
import {reviewDispatchEmail} from './email-review.mjs';
const stages=['pending','in_production','ready_to_dispatch','dispatched'];
export function reasonDialog({document=globalThis.document,title,description,choices=[],confirmLabel='Confirm correction'}={}){
 return new Promise(resolve=>{
  const previous=document.activeElement,dialog=document.createElement('dialog'),form=el('form');dialog.className='external-dispatch-dialog';const heading=el('h2',title);heading.id='order-correction-title';dialog.setAttribute('aria-labelledby',heading.id);form.append(heading,el('p',description));
  let select;if(choices.length){const label=el('label','Proposed earlier stage');select=el('select');for(const value of choices){const o=el('option',fulfilmentLabels[value]);o.value=value;select.append(o);}label.append(select);form.append(label);}
  const label=el('label','Reason (required, 5–1000 characters)'),reason=el('textarea');reason.required=true;reason.minLength=5;reason.maxLength=1000;reason.name='reason';label.append(reason);form.append(label);
  const finish=value=>{dialog.close();dialog.remove();previous?.focus();resolve(value);};
  const confirm=el('button',confirmLabel,'button'),cancel=el('button','Cancel','button');confirm.type='submit';cancel.type='button';cancel.addEventListener('click',()=>finish(null));form.append(confirm,cancel);form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity()||reason.value.trim().length<5)return;finish({reason:reason.value.trim(),target:select?.value});});dialog.addEventListener('cancel',e=>{e.preventDefault();finish(null);});dialog.append(form);document.body.append(dialog);dialog.showModal();reason.focus();
 });
}
export function mountFulfilmentCorrections(order,{document=globalThis.document,repository,refresh,message,confirm=reasonDialog,review=reviewDispatchEmail}={}){
 document.querySelector('.fulfilment-correction-action')?.remove();
 const eligible=order.paymentStatus==='paid'||order.paymentStatus==='partially_refunded'&&order.partialRefundAcknowledged;
 const index=stages.indexOf(order.fulfilmentStatus),dispatch=document.querySelector('.dispatch-details')||document.querySelector('#order-status-form');
 if(eligible&&index>0&&dispatch){const button=el('button','Correct fulfilment stage','button fulfilment-correction-action');button.type='button';dispatch.append(button);let busy=false;button.addEventListener('click',async()=>{if(busy)return;busy=true;button.disabled=true;try{const result=await confirm({document,title:'Correct fulfilment stage?',description:`Current stage: ${fulfilmentLabels[order.fulfilmentStatus]} · ${order.reference}. Select the proposed earlier stage. This changes fulfilment only; inventory, payments, refunds, tracking and previously sent emails remain unchanged.`,choices:stages.slice(0,index)});if(!result)return;await repository.correctFulfilment(order.id,order.updatedAt,order.fulfilmentStatus,result.target,result.reason);await refresh();message.textContent='Fulfilment stage corrected. No email, inventory or payment change.';}catch(e){message.textContent=e.message;}finally{busy=false;button.disabled=false;}});}
 const communications=document.querySelector('.order-email-status');if(!communications)return;
 const notifications=(order.emailDeliveries||[]).filter(d=>d.kind==='dispatched');
 for(const d of notifications){communications.append(el('p',(d.resend_of?'Resend':'Original send')+' · '+d.state+' · '+(d.recipient_email||'recipient unavailable')+(d.resend_reason?' · Reason: '+d.resend_reason:'')+' · Admin: '+(d.external_requested_by||'System')+' · '+date(d.sent_at||d.attempted_at||d.created_at)));}
 const history=[...document.querySelectorAll('#detail-content details')].find(d=>d.querySelector('summary')?.textContent==='Order history');
 for(const d of notifications)history?.append(el('p',`${d.resend_of?'Dispatch email resend':'Dispatch notification'} · ${d.state==='sent'?'Mail server accepted; buyer delivery unconfirmed':d.state} · ${d.recipient_email||'Historical recipient unavailable'} · ${date(d.created_at)}${d.resend_reason?' · Reason: '+d.resend_reason+' · Admin: '+d.external_requested_by:''}`));
 const latest=notifications[0];
 if(!eligible||order.fulfilmentStatus!=='dispatched'||latest?.state!=='sent'||!latest.id||!externalRecipientAllowed((order.customer.email||'').trim(),order.channel))return;
 const button=el('button','Preview Resend Email','button');button.type='button';communications.append(button);let busy=false;
 button.addEventListener('click',async()=>{if(busy)return;busy=true;button.disabled=true;try{const notice=await review(order,{document,mode:'resend'});if(notice){await refresh();message.textContent=notice;}}catch(e){message.textContent=e.message+' Refresh and review the notification audit before another attempt.';}finally{busy=false;button.disabled=false;}});
}

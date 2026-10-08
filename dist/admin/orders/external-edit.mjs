import {el,date} from './view.mjs?v=external-v1';
import {createAdminAuth} from '../admin-auth.mjs';
import {publicBackendConfig} from '../../backend/public-config.mjs';
import {mountFirstDispatchPreview,reviewDispatchEmail} from './email-review.mjs';
export const validExternalEmail=email=>email.length<=254&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
export const isEbayRelay=email=>validExternalEmail(email)&&email.split('@')[1].toLowerCase()==='members.ebay.com';
export function externalRecipientAllowed(email,channel){
 if(!validExternalEmail(email))return false;
 const domain=email.split('@')[1].toLowerCase();
 return domain==='members.ebay.com'?channel==='EBAY':!/(members[.-]ebay|(^|[.])ebay[.])/.test(domain);
}
export function confirmDispatchEmail({document=globalThis.document,email,channel,dispatch=true}={}){
 return new Promise(resolve=>{
  const previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='external-dispatch-dialog';
  const title=el('h2','Dispatch this order?');title.id='external-dispatch-title';dialog.setAttribute('aria-labelledby',title.id);
  dialog.append(title,el('p','Dispatching changes the fulfilment stage first. You can then review the email to the saved recipient. No email is sent until you confirm the preview.'),el('p',email),el('p',isEbayRelay(email)&&channel==='EBAY'?'eBay relay addresses forward permitted order-related communications through eBay’s messaging system. Delivery remains subject to eBay’s filtering.':'Use the customer address saved for this order and permitted for order-related communication.'));
  const finish=value=>{dialog.close();dialog.remove();previous?.focus();resolve(value);};
  const actions=el('div',undefined,'dialog-actions');
  for(const [label,value] of [['Dispatch & Preview Email','yes'],...(dispatch?[['Dispatch without Email','no']]:[]),['Cancel','cancel']]){const button=el('button',label,'button');button.type='button';button.addEventListener('click',()=>finish(value));actions.append(button);}
  dialog.append(actions);dialog.addEventListener('cancel',event=>{event.preventDefault();finish('cancel');});document.body.append(dialog);dialog.showModal();actions.lastElementChild.focus();
 });
}
export async function requestExternalDispatch(order,{dispatch=false,send=false,request=globalThis.fetch,auth=createAdminAuth(),config=publicBackendConfig,resend=false,operationId,previousDelivery,reason}={}){
 const response=await request(config.url+'/functions/v1/transactional-email/external-dispatch',{method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+await auth.accessToken(),'Content-Type':'application/json'},body:JSON.stringify({orderId:order.id,dispatch,send,...resend?{resend:true,operationId,previousDelivery,expectedUpdatedAt:order.updatedAt,reason}:{},expectedEmail:(order.customer.email||'').trim().toLowerCase()})});
 const result=await response.json();if(!response.ok)throw Error(result.message||'Dispatch request unavailable. Refresh and review the notification status.');return result.message;
}
export function mountExternalEditing(order,{root,repository,refresh,message,document=globalThis.document,review=reviewDispatchEmail}={}){
 if(order.channel==='WEBSITE')return;
 const edit=el('button','Edit Order','button');edit.type='button';root.prepend(edit);
 edit.addEventListener('click',()=>{
  if(root.querySelector('.external-order-edit'))return;
  const form=el('form',undefined,'external-order-edit');form.append(el('h3','Edit external order'),el('p','Saving details sends no email and changes no inventory. Item and quantity amendments are unavailable.'));
  const fields={};
  const definitions=[['customerName','Customer name',order.customer.name,150,true],['email','Customer email (optional)',order.customer.email,254,false],['externalReference','External order reference',order.externalReference,150,true],['notes','Internal notes',order.notes,2000,false],...['recipient','line1','line2','city','region','postcode','country'].map(k=>['delivery.'+k,'Delivery '+({recipient:'name',line1:'address line 1',line2:'address line 2'}[k]||k),order.delivery?.[k],200,false]),...['carrier','tracking_reference','tracking_url'].map(k=>['dispatch.'+k,({carrier:'Shipping service',tracking_reference:'Tracking reference',tracking_url:'HTTPS tracking link'})[k],order.dispatchDetails?.[k],({carrier:100,tracking_reference:150,tracking_url:500})[k],false])];
  for(const [key,label,value,max,required] of definitions){const field=el('label',label),input=el(key==='notes'?'textarea':'input');input.name=key;input.value=value||'';input.maxLength=max;input.required=required;if(key==='email')input.type='email';if(key==='dispatch.tracking_url')input.type='url';field.append(input);form.append(field);fields[key]=input;}
  const label=el('label','External platform'),channel=el('select');channel.name='channel';for(const [value,text] of [['EBAY','eBay'],['DIRECT','Direct sale'],['OTHER','Other']]){const option=el('option',text);option.value=value;channel.append(option);}channel.value=order.channel;label.append(channel);form.append(label);
  const save=el('button','Save order details','button'),cancel=el('button','Cancel','button');save.type='submit';cancel.type='button';cancel.addEventListener('click',()=>{form.remove();edit.focus();});form.append(save,cancel);root.prepend(form);fields.customerName.focus();let busy=false;
  form.addEventListener('submit',async event=>{event.preventDefault();if(busy||!form.reportValidity())return;busy=true;save.disabled=cancel.disabled=true;
   const change={customerName:fields.customerName.value.trim(),email:fields.email.value.trim().toLowerCase(),channel:channel.value,externalReference:fields.externalReference.value.trim(),notes:fields.notes.value,delivery:{},dispatch:{}};
   for(const [key,input] of Object.entries(fields)){const [group,name]=key.split('.');if(name)change[group][name]=input.value.trim();}
   try{await repository.editExternal(order.id,order.updatedAt,change);form.remove();await refresh();message.textContent='Order details saved. No email was sent. Inventory is unchanged.';}catch(error){message.textContent=error.message;busy=false;save.disabled=cancel.disabled=false;}
  });
 });
 const section=el('section',undefined,'order-email-status');section.append(el('h3','Dispatch notification'));
 const notification=(order.emailDeliveries||[]).find(d=>d.kind==='dispatched');
 const state=notification?({pending:'Not Sent · explicitly requested',claimed:'Sending / requires review if stalled',sent:'Sent · mail server accepted; inbox delivery unconfirmed',failed:'Failed · requires review',unknown:'Unknown · requires review'})[notification.state]||'Unknown':!order.dispatchEmailDeclined&&order.statusHistory?.some(e=>['dispatched','completed'].includes(e.status))?'Unknown · no historical notification evidence':'Not Sent';
 section.append(el('p',state));if(notification?.recipient_email)section.append(el('p','Recipient used: '+notification.recipient_email));if(notification?.sent_at||notification?.attempted_at||notification?.claimed_at)section.append(el('p','Last notification activity: '+date(notification.sent_at||notification.attempted_at||notification.claimed_at)));
 section.append(el('p','Customer-detail saves never send email. Automatic external notifications and retries are disabled. Resends require a separate confirmation and reason.'));
 mountFirstDispatchPreview(order,{document,root:section,refresh,message,recipientAllowed:externalRecipientAllowed,review});
 if(!order.customer.email)section.append(el('p','No customer email saved. Dispatch is available without a notification.'));
 root.append(section);
}

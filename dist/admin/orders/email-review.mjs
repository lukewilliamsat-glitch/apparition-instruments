import {createAdminAuth} from '../admin-auth.mjs';
import {publicBackendConfig} from '../../backend/public-config.mjs';

const drafts=new Map();
export async function emailReviewRequest(action,payload,{request=globalThis.fetch,auth=createAdminAuth(),config=publicBackendConfig}={}){
 const response=await request(config.url+'/functions/v1/transactional-email/'+action,{method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+await auth.accessToken(),'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const result=await response.json();if(!response.ok)throw Object.assign(Error(result.message||'Email preview unavailable'),{code:result.code});return result;
}
export function isolatedPreview(html){
 const policy="default-src 'none'; script-src 'none'; img-src https://apparitioninstruments.co.uk; style-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'";
 return html.replace(/<head>/i,'<head><meta http-equiv="Content-Security-Policy" content="'+policy+'">');
}
export function reviewDispatchEmail(order,{document=globalThis.document,mode='first',request=emailReviewRequest,transitionNotice=''}={}){
 return new Promise(resolve=>{
  const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
  const previous=document.activeElement,dialog=el('dialog',undefined,'external-dispatch-dialog email-review-dialog');
  const heading=el('h2',mode==='resend'?'Preview Resend Email':'Preview Dispatch Email');heading.id='email-review-heading';dialog.setAttribute('aria-labelledby',heading.id);
  const subtitle=el('p'),status=el('p','Preparing order-specific preview…','email-review-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const context=el('p',transitionNotice||'Previewing does not send an email or change the order.');
  const details=el('dl',undefined,'email-review-details');const values={};for(const label of ['From','Recipient','Subject']){const value=el('dd');details.append(el('dt',label),value);values[label]=value;}
  const switcher=el('div',undefined,'email-review-switch');switcher.setAttribute('role','group');switcher.setAttribute('aria-label','Email preview format');
  const htmlButton=el('button','HTML','button'),textButton=el('button','Plain text','button');htmlButton.type=textButton.type='button';htmlButton.setAttribute('aria-pressed','true');textButton.setAttribute('aria-pressed','false');
  const frame=el('iframe');frame.title='Order-specific dispatch email preview';frame.setAttribute('sandbox','');frame.setAttribute('referrerpolicy','no-referrer');frame.id='email-review-html';frame.loading='eager';
  const plain=el('pre',undefined,'email-review-text');plain.id='email-review-text';plain.hidden=true;plain.tabIndex=0;htmlButton.setAttribute('aria-controls',frame.id);textButton.setAttribute('aria-controls',plain.id);
  htmlButton.addEventListener('click',()=>{frame.hidden=false;plain.hidden=true;htmlButton.setAttribute('aria-pressed','true');textButton.setAttribute('aria-pressed','false');});
  textButton.addEventListener('click',()=>{frame.hidden=true;plain.hidden=false;htmlButton.setAttribute('aria-pressed','false');textButton.setAttribute('aria-pressed','true');});switcher.append(htmlButton,textButton);
  const reasonLabel=el('label','Reason for resend (required, 5–1000 characters)'),reason=el('textarea');reason.name='resendReason';reason.minLength=5;reason.maxLength=1000;reason.required=mode==='resend';reason.value=drafts.get(order.id)||'';reasonLabel.append(reason);reasonLabel.hidden=mode!=='resend';
  reason.addEventListener('input',()=>{drafts.set(order.id,reason.value);enableConfirm();});
  const recipientLabel=el('label',undefined,'email-review-recipient'),recipient=el('input');recipient.type='checkbox';recipientLabel.append(recipient,document.createTextNode(' I have reviewed this message and confirm the recipient shown above.'));recipient.addEventListener('change',()=>enableConfirm());
  const actions=el('div',undefined,'dialog-actions'),back=el('button','Back to Order','button'),cancel=el('button','Cancel','button'),refresh=el('button','Refresh Preview','button'),confirm=el('button',mode==='resend'?'Confirm & Resend Email':'Confirm & Send Email','button');
  for(const b of [back,cancel,refresh,confirm])b.type='button';refresh.hidden=true;confirm.disabled=true;actions.append(back,cancel,refresh,confirm);
  let prepared=null,busy=false,sending=false,closed=false,needsReview=false,outcome=null,generation=0;
  function enableConfirm(){confirm.disabled=busy||!prepared||!recipient.checked||mode==='resend'&&(reason.value.trim().length<5||reason.value.trim().length>1000||/[\x00-\x1f\x7f]/.test(reason.value));}
  function finish(){if(sending||closed)return;closed=true;generation++;if(mode==='resend')drafts.set(order.id,reason.value);dialog.close();dialog.remove();previous?.focus();resolve(outcome);}
  back.addEventListener('click',finish);cancel.addEventListener('click',finish);dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});
  async function prepare(){
   if(busy||closed||needsReview)return;busy=true;const gen=++generation;prepared=null;recipient.checked=false;enableConfirm();refresh.disabled=true;
   status.textContent='Preparing order-specific preview…';dialog.setAttribute('aria-busy','true');frame.srcdoc='';plain.textContent='';
   try{
    const p=await request('prepare-dispatch',{orderId:order.id,mode});if(closed||gen!==generation)return;
    if(!p.previewIdentity||p.kind!=='dispatched'||p.mode!==mode||typeof p.html!=='string'||typeof p.text!=='string'||typeof p.to!=='string')throw Error('Unexpected preview response.');
    prepared=p;heading.textContent=mode==='resend'?'Preview Resend Email':'Preview Dispatch Email';subtitle.textContent=`Dispatch notification · ${mode==='resend'?'Resend':'First send'} · ${p.orderReference} · ${p.channel}`;
    values.From.textContent=p.from.name+' <'+p.from.email+'>';values.Recipient.textContent=p.to;values.Subject.textContent=p.subject;
    frame.srcdoc=isolatedPreview(p.html);plain.textContent=p.text;
    status.textContent='Review the message below. Preview expires at '+new Date(p.expires).toLocaleTimeString('en-GB')+'.'+(p.channel==='EBAY'?' eBay forwarding remains subject to marketplace filtering.':'');refresh.hidden=true;
   }catch(e){if(!closed){status.textContent=e.message;refresh.hidden=false;}}
   finally{if(!closed){busy=false;dialog.removeAttribute('aria-busy');refresh.disabled=false;enableConfirm();}}
  }
  refresh.addEventListener('click',prepare);
  confirm.addEventListener('click',async()=>{
   if(busy||!prepared||confirm.disabled)return;
   busy=true;sending=true;enableConfirm();back.disabled=cancel.disabled=reason.disabled=recipient.disabled=true;refresh.disabled=true;dialog.setAttribute('aria-busy','true');status.textContent='Sending reviewed message…';
   try{
    const result=await request('confirm-dispatch',{orderId:order.id,previewIdentity:prepared.previewIdentity,recipientConfirmed:true,...mode==='resend'?{reason:reason.value.trim()}:{}});
    outcome=result.message;drafts.delete(order.id);busy=false;closed=true;dialog.close();dialog.remove();previous?.focus();resolve(outcome);
   }catch(e){
    prepared=null;recipient.checked=false;
    if(e.code==='PREVIEW_STALE'){heading.textContent='Preview out of date';status.textContent='This order or email has changed since you opened the preview. Please generate a new preview before sending.';refresh.hidden=false;}
    else {needsReview=true;status.textContent=e.message+' Return to the order and review its communication history before another attempt.';outcome=status.textContent;refresh.hidden=true;}
   }finally{if(!closed){busy=false;sending=false;dialog.removeAttribute('aria-busy');back.disabled=cancel.disabled=reason.disabled=recipient.disabled=false;refresh.disabled=false;enableConfirm();}}
  });
  dialog.append(heading,subtitle,context,status,details,switcher,frame,plain,reasonLabel,recipientLabel,actions);document.body.append(dialog);dialog.showModal();cancel.focus();prepare();
 });
}

export function mountFirstDispatchPreview(order,{document=globalThis.document,root,refresh,message,review=reviewDispatchEmail,recipientAllowed}={}){
 const latest=(order.emailDeliveries||[]).find(d=>d.kind==='dispatched');
 const eligible=order.paymentStatus==='paid'||order.paymentStatus==='partially_refunded'&&order.partialRefundAcknowledged;
 if(!eligible||!['dispatched','completed'].includes(order.fulfilmentStatus)||!recipientAllowed((order.customer.email||'').trim(),order.channel)||latest&&(latest.state!=='pending'||latest.resend_of||latest.automatic_delivery_eligible))return;
 if(order.channel==='WEBSITE'&&!latest)return;
 const button=document.createElement('button');button.type='button';button.className='button';button.textContent='Preview Dispatch Email';root.append(button);let busy=false;
 button.addEventListener('click',async()=>{if(busy)return;busy=true;button.disabled=true;try{const notice=await review(order,{document});if(notice){await refresh();message.textContent=notice;}}catch(e){message.textContent=e.message;}finally{busy=false;button.disabled=false;}});
}

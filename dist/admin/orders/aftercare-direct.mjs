import {createAdminAuth} from '../admin-auth.mjs';
import {publicBackendConfig} from '../../backend/public-config.mjs';
export async function directRequest(payload,{request=globalThis.fetch,auth=createAdminAuth(),config=publicBackendConfig}={}){
 const target=new URL('/functions/v1/overseer-aftercare',config.url);
 const response=await request(target,{method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+await auth.accessToken(),'Content-Type':'application/json'},body:JSON.stringify(payload),redirect:'error',signal:AbortSignal.timeout(15000)});
 const result=await response.json().catch(()=>null);
 if(!response.ok||!result)throw Error(result?.message||'Direct email is unavailable. Use the eBay order conversation.');
 return result;
}
const labels={'sink_recorded':'Internal test recorded · No email sent',submitted:'SMTP accepted · Delivery not confirmed',claimed:'Claimed · Review required',unknown:'Outcome unknown · Do not retry',failed:'Failed · Review before using another route'};
export function openAftercareDirect(order,{document:d=globalThis.document,request=directRequest,history}={}){
 const el=(tag,text)=>{const n=d.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const dialog=el('dialog'),previous=d.activeElement;dialog.className='external-dispatch-dialog email-review-dialog aftercare-direct-dialog';dialog.setAttribute('aria-labelledby','aftercare-direct-title');
 const title=el('h2','Aftercare Direct');title.id='aftercare-direct-title';
 const note=el('p','Order '+order.reference+' · Transaction support only. Use the eBay order conversation or the existing manual-copy draft if the direct route is unavailable.');
 const status=el('p');status.setAttribute('aria-live','polite');status.setAttribute('role','status');
 const meta=el('dl');meta.className='email-review-details';
 const from=el('dd','Checking intended sender…'),to=el('dd','Checking saved recipient…');meta.append(el('dt','Sender'),from,el('dt','Saved recipient'),to);
 const fields=el('div');fields.className='aftercare-direct-fields';
 const control=(label,tag)=>{const n=el(tag),l=el('label',label);l.append(n);fields.append(l);return n;};
 const template=control('Support template','select'),subject=control('Subject','input'),message=control('Message','textarea');subject.maxLength=160;message.maxLength=4000;message.rows=7;
 for(const [key,label] of [['order_support','Order support'],['delivery_help','Delivery help']]){const op=el('option',label);op.value=key;template.append(op);}
 const frame=el('iframe');frame.title='Rendered order email';frame.sandbox='';frame.setAttribute('referrerpolicy','no-referrer');frame.hidden=true;
 const ackLabel=el('label'),ack=el('input');ack.type='checkbox';ackLabel.append(ack,d.createTextNode(' I reviewed the saved recipient and message. This is about this eBay transaction.'));ackLabel.hidden=true;
 const journal=el('details'),list=el('ol');journal.append(el('summary','Message history'),list);
 const actions=el('div');actions.className='dialog-actions';
 const button=label=>{const b=el('button',label);b.type='button';actions.append(b);return b;};
 const close=button('Close'),preview=button('Render preview'),copy=button('Copy rendered text'),send=button('Confirm submission');
 let prepared=null,closed=false,busy=false,attempted=false,available=false,outcome=null;
 const clear=()=>{prepared=null;ack.checked=false;ackLabel.hidden=true;frame.hidden=true;frame.srcdoc='';update();};
 const update=()=>{preview.disabled=busy||!available;copy.disabled=busy||!prepared;send.disabled=busy||attempted||!prepared||!ack.checked;template.disabled=subject.disabled=message.disabled=busy||!available;close.disabled=busy;};
 const payload=action=>({action,orderId:order.id,template:template.value,subject:subject.value,message:message.value});
 async function journalLoad(){
  try{const rows=await history();attempted=Array.isArray(rows)&&rows.length>0;
   list.replaceChildren(...(rows.length?rows.map(x=>el('li',(labels[x.state]||x.state)+' · '+x.subject+' · '+new Date(x.created_at).toLocaleString('en-GB',{timeZone:'Europe/London'}))):[el('li','No Aftercare Direct messages recorded.')]));
  }catch{list.replaceChildren(el('li','Message history could not be verified. Sending is disabled.'));attempted=true;}
 }
 const run=async(fn,errorAfterAttempt=false)=>{
  if(closed||busy)return;busy=true;update();
  try{await fn();}catch(e){status.textContent=e.message;if(errorAfterAttempt){attempted=true;await journalLoad();attempted=true;}}
  finally{busy=false;update();}
 };
 function selectTemplate(){return run(async()=>{clear();status.textContent='Checking saved order and sender…';const p=await request({action:'draft',orderId:order.id,template:template.value});
  if(!['sink','smtp'].includes(p.mode)||typeof p.sender!=='string'||typeof p.recipient!=='string')throw Error('Direct route is unavailable.');
  subject.value=p.subject;message.value=p.message;from.textContent=p.sender+(p.mode==='sink'?' (intended sender; no email sent)':'');to.textContent=p.recipient;available=true;
  status.textContent=p.mode==='sink'?'Staging sink only. No email will be sent.':'eBay routing is subject to relay acceptance. Use transaction-support text.';
 });}
 const done=()=>{if(busy||closed)return;closed=true;dialog.close();dialog.remove();if(previous?.isConnected&&!previous.disabled)previous.focus();resolveDone(outcome);};
 let resolveDone;const result=new Promise(resolve=>{resolveDone=resolve;});
 close.addEventListener('click',done);dialog.addEventListener('cancel',e=>{e.preventDefault();done();});
 template.addEventListener('change',selectTemplate);for(const n of [subject,message])n.addEventListener('input',clear);ack.addEventListener('change',update);
 preview.addEventListener('click',()=>run(async()=>{clear();const p=await request(payload('preview'));
  if(!p.token||typeof p.html!=='string'||typeof p.text!=='string')throw Error('Rendered preview is unavailable.');
  prepared=p;from.textContent=p.sender+(p.mode==='sink'?' (staging sink)':'');to.textContent=p.recipient;
  frame.srcdoc=p.html.replace(/<head>/i,'<head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; base-uri \'none\'; form-action \'none\'">');
  frame.hidden=false;ackLabel.hidden=false;send.textContent=p.mode==='sink'?'Record internal test':'Confirm & send';status.textContent='Preview only. Review and confirm before submitting.';
 }));
 copy.addEventListener('click',()=>run(async()=>{if(prepared){await d.defaultView.navigator.clipboard.writeText(prepared.text);status.textContent='Copied. Nothing was sent.';}}));
 send.addEventListener('click',()=>{if(send.disabled)return;run(async()=>{const data={...payload('confirm'),token:prepared.token,confirmed:true};attempted=true;
  const p=await request(data);outcome=p.message;status.textContent=p.message;clear();journal.open=true;await journalLoad();attempted=true;
 },true);});
 dialog.append(title,note,status,meta,fields,frame,ackLabel,actions,journal);d.body.append(dialog);
 dialog.showModal();close.focus();update();void selectTemplate().then(journalLoad).then(update);
 return result;
}

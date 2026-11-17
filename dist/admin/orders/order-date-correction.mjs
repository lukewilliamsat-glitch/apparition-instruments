import {commercialOrderDay,latestManualDay,manualDateEligible,validBusinessDate} from './commercial-date.mjs';

const stamp=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'});
function node(d,tag,text,attrs={}){const n=d.createElement(tag);if(text!=null)n.textContent=text;for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;}

export function promptOrderDate(order,{document:d=globalThis.document,repository,now=()=>new Date(),uuid=()=>crypto.randomUUID()}={}){
 const previous=d.activeElement,dialog=node(d,'dialog',null,{class:'external-dispatch-dialog order-date-dialog','aria-labelledby':'order-date-title'});
 const form=node(d,'form'),title=node(d,'h2','Correct order date',{id:'order-date-title'});
 const old=commercialOrderDay(order),limit=latestManualDay(order,now());
 const dateLabel=node(d,'label','Corrected commercial order date (UK)'),input=node(d,'input',null,{type:'date',required:'',min:'1900-01-01',max:limit});input.value=old;dateLabel.append(input);
 const reasonLabel=node(d,'label','Reason for correction (5–300 characters)'),reason=node(d,'textarea',null,{required:'',minlength:'5',maxlength:'300',rows:'3'});reasonLabel.append(reason);
 const impact=node(d,'p',null,{id:'order-date-impact',class:'storage-note','aria-live':'polite'});
 const ackLabel=node(d,'label',null,{class:'order-date-ack'}),ack=node(d,'input',null,{type:'checkbox',required:''});
 ackLabel.append(ack,d.createTextNode(' I understand that this may move the sale to a different reporting period.'));
 const feedback=node(d,'p',null,{class:'error',role:'alert'}),buttons=node(d,'div',null,{class:'dialog-actions'});
 const save=node(d,'button','Save correction',{type:'submit',class:'button'}),cancel=node(d,'button','Cancel',{type:'button',class:'button'});buttons.append(cancel,save);
 form.append(title,node(d,'p',order.reference+' · Current commercial date: '+old),dateLabel,reasonLabel,impact,ackLabel,feedback,buttons);dialog.append(form);d.body.append(dialog);
 let resolve, busy=false,closed=false,lastIntent,lastKey;
 const result=new Promise(r=>{resolve=r;});
 function update(){
  const date=input.value,changed=validBusinessDate(date)&&date!==old&&date<=limit;
  const why=reason.value.trim();
  const period=changed?(date.slice(0,7)===old.slice(0,7)?'Same calendar month; date filters may change.':'Reporting month changes from '+old.slice(0,7)+' to '+date.slice(0,7)+'.'):'Choose a different date, up to '+limit+'.';
  impact.textContent=period+' Payment, stock, dispatch and financial amounts are unchanged.';
  save.disabled=busy||!changed||why.length<5||why.length>300||/[\x00-\x1f\x7f-\x9f]/.test(why)||!ack.checked;
 }
 function finish(value){if(closed)return;closed=true;dialog.close();dialog.remove();if(previous?.isConnected&&!previous.disabled)previous.focus();resolve(value);}
 cancel.addEventListener('click',()=>{if(!busy)finish(null);});
 dialog.addEventListener('cancel',e=>{e.preventDefault();if(!busy)finish(null);});
 for(const control of [input,reason])control.addEventListener('input',()=>{ack.checked=false;feedback.textContent='';update();});
 ack.addEventListener('change',update);
 form.addEventListener('submit',async e=>{
  e.preventDefault();update();if(save.disabled)return;
  const newDate=input.value,why=reason.value.trim(),intent=JSON.stringify([newDate,why]);
  if(intent!==lastIntent){lastIntent=intent;lastKey=uuid();}
  busy=true;update();for(const n of [input,reason,ack,cancel])n.disabled=true;
  feedback.textContent='Saving correction…';
  try{
   const saved=await repository.correctOrderDate(order.id,{expectedUpdatedAt:order.updatedAt,newDate,reason:why,requestId:lastKey});
   if(saved?.orderId!==order.id||!validBusinessDate(saved.orderDate))throw Error('Save could not be verified. Reopen the order before changing it again.');
   finish(saved);
  }catch(error){feedback.textContent=error.message||'The date could not be saved. Refresh the order and review its history.';}
  finally{busy=false;for(const n of [input,reason,ack,cancel])n.disabled=false;update();}
 });
 dialog.showModal();input.focus();update();
 return result;
}

export function mountOrderDateCorrection(order,{document:d=globalThis.document,root,repository,refresh,message,prompt=promptOrderDate}={}){
 if(!manualDateEligible(order))return null;
 const panel=node(d,'section',null,{class:'order-date-correction','aria-label':'Commercial order date'});
 const current=node(d,'p','Commercial order date: '+commercialOrderDay(order),{'data-commercial-current':''});
 const button=node(d,'button','Correct order date',{class:'button',type:'button','data-correct-order-date':''});
 const history=node(d,'details'),entries=node(d,'div',null,{role:'status'});
 history.append(node(d,'summary','Order date correction history'),entries);
 let loading=false;
 async function load(){
  if(loading)return;loading=true;entries.textContent='Loading correction history…';
  try{
   const rows=await repository.orderDateHistory(order.id);
   if(!Array.isArray(rows))throw Error('Correction history could not be read.');
   if(!rows.length){entries.textContent='No corrections recorded.';return;}
   const list=node(d,'ol');
   for(const row of rows){
    const entry=node(d,'li'),time=new Date(row.correctedAt);
    entry.append(node(d,'strong',row.previousDate+' → '+row.correctedDate),node(d,'p',row.reason),
     node(d,'p',(Number.isFinite(time.getTime())?stamp.format(time)+' UK':'Time unavailable')+' · Admin '+row.actor));list.append(entry);
   }
   entries.replaceChildren(list);
  }catch(error){entries.textContent=error.message||'Correction history unavailable.';}
  finally{loading=false;}
 }
 history.addEventListener('toggle',()=>{if(history.open)void load();});
 button.addEventListener('click',async()=>{
  if(button.disabled)return;button.disabled=true;let saved;
  try{
   saved=await prompt(order,{document:d,repository});if(!saved)return;
   current.textContent='Commercial order date: '+saved.orderDate;
   await refresh?.();
   if(message)message.textContent=saved.duplicate?'The earlier correction was already saved. The current order date is '+saved.orderDate+'.':'Commercial order date corrected to '+saved.orderDate+'. Reports use the corrected date after refresh.';
   if(history.open&&panel.isConnected)void load();
  }catch(error){if(message)message.textContent=error.message;}
  finally{
   button.disabled=false;
   if(button.isConnected)button.focus();else if(saved)root.querySelector('[data-correct-order-date]')?.focus();
  }
 });
 panel.append(node(d,'h3','Commercial order date'),current,button,history);root.append(panel);
 return {panel,button,history};
}

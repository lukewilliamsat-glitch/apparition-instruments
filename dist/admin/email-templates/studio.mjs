import {currentEmailTemplateRepository} from '../../backend/email-templates.mjs';
import {emailReviewRequest,isolatedPreview} from '../orders/email-review.mjs';
const fields=['subject','heading','body'];
const title=key=>(key.startsWith('aftercare:')?'Customer Aftercare':'Dispatch Confirmation')+' · '+(key.endsWith(':EBAY')?'eBay':'Website');

export function publishConfirmation(row,{document=globalThis.document}={}){
 return new Promise(resolve=>{
  const previous=document.activeElement,d=document.createElement('dialog');d.className='template-publish';
  const h=document.createElement('h2');h.textContent='Publish email template';h.id='publish-template-title';d.setAttribute('aria-labelledby',h.id);
  const p=document.createElement('p'),changed=fields.filter(k=>row.draft[k]!==row.published.content[k]);
  p.textContent=title(row.template_key)+': version '+row.published.version+' → '+(row.published.version+1)+'. Changed fields: '+(changed.join(', ')||'none')+'. This affects future uses and invalidates older previews. Publishing sends no email.';
  const actions=document.createElement('div');actions.className='template-actions';
  function finish(value){d.close();d.remove();previous?.focus({preventScroll:true});resolve(value);}
  for(const [label,value] of [['Cancel',false],['Publish',true]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>finish(value));actions.append(b);}
  d.addEventListener('cancel',e=>{e.preventDefault();finish(false);});d.append(h,p,actions);document.body.append(d);d.showModal();actions.firstChild.focus({preventScroll:true});
 });
}

export async function mountEmailTemplateStudio({document=globalThis.document,repository=currentEmailTemplateRepository(),preview=emailReviewRequest,confirm=message=>document.defaultView.confirm(message),publication=publishConfirmation}={}){
 const $=s=>document.querySelector(s),form=$('#template-form'),status=$('#template-status');
 let rows=[],selected=null,dirty=false,busy=false,activeField=form.elements.body,renderedHTML='',previewReady=false,format='html',validatedDraft=null,navigationApproved=false;
 const content=()=>Object.fromEntries(fields.map(k=>[k,form.elements[k].value]));
 const draftIdentity=()=>selected&&JSON.stringify([selected.template_key,selected.revision,selected.draft]);
 const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 function notify(message,error=false){status.textContent=message;status.dataset.tone=error?'error':'success';}
 function clearErrors(){for(const key of fields){$('#'+key+'-error').textContent='';form.elements[key].removeAttribute('aria-invalid');}}
 function resetViewport(){
  // A fresh browsing context starts at the top even when a sandboxed frame cannot be read.
  // Only the preview is replaced; editor focus, selection and page position stay intact.
  const old=$('#template-html'),fresh=old.cloneNode(false);
  fresh.srcdoc=renderedHTML;fresh.hidden=!previewReady||format!=='html';old.replaceWith(fresh);
  $('#template-text').scrollTop=0;$('#template-text').scrollLeft=0;
  $('#template-text').hidden=!previewReady||format!=='text';$('#preview-empty').hidden=previewReady;
 }
 function clearPreview(){
  renderedHTML='';previewReady=false;$('#template-text').textContent='';$('#preview-subject').textContent='No preview yet';
  $('#preview-context').textContent='Sample order only · '+title(selected.template_key)+'. Validate & Preview to see the rendered email.';
  resetViewport();
 }
 function state(){
  if(!selected)return;
  const valid=!dirty&&!!selected.draft&&validatedDraft===draftIdentity();
  $('#template-state').textContent='Published and Live · v'+selected.published.version+' · '+(dirty?'Unsaved changes':selected.draft?'Saved Draft':'No draft');
  $('#draft-validation').textContent=dirty?'Unsaved changes. Save Draft, then validate before publishing.':selected.draft?(valid?'Saved draft validated. Ready for publication confirmation.':'Saved draft is unpublished. Validate & Preview before publishing.'):'Published content is live. Previewing and editing never send an email.';
  $('#draft-publish').disabled=busy||!valid;$('#draft-discard').disabled=busy||(!selected.draft&&!dirty);
  $('#draft-save').disabled=busy||!dirty;
  for(const key of ['subject','heading'])$('#'+key+'-count').textContent=form.elements[key].value.length+' / '+form.elements[key].maxLength;
 }
 function choose(row){
  selected=row;dirty=false;validatedDraft=null;clearErrors();$('#template-editor').hidden=false;$('#editor-title').textContent=title(row.template_key);
  for(const key of fields)form.elements[key].value=(row.draft||row.published.content)[key];
  activeField=form.elements.body;
  const descriptions={first_name:'Customer first name',order_number:'Order reference',shipping_service:'Carrier / service, when recorded',tracking_reference:'Tracking reference, when recorded'};
  const select=$('#placeholder-select');select.replaceChildren();
  for(const key of ['first_name','order_number',...(row.template_key.startsWith('dispatched:')?['shipping_service','tracking_reference']:[])]){const o=node('option',descriptions[key]+' · {{'+key+'}}');o.value=key;select.append(o);}
  renderHistory();clearPreview();state();
  for(const b of $('#template-list').querySelectorAll('button')){if(b.dataset.key===row.template_key)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');}
 }
 function renderHistory(){
  $('#history-count').textContent=selected.history.length+' published '+(selected.history.length===1?'version':'versions');
  const root=$('#template-history');root.replaceChildren();
  for(const v of selected.history){
   const a=node('article'),p=node('p','Version '+v.version+(v.id===selected.current_version?' · Published and Live':'')+' · '+new Date(v.published_at).toLocaleString('en-GB')+' · Publisher: '+(v.published_by||'Initial system seed'));a.append(p);
   for(const [label,action] of [['Preview Version',()=>showPreview({versionId:v.id},'Published version '+v.version)],['Restore to Draft',async()=>{if((dirty||selected.draft)&&!confirm('Replace unpublished edits with this historical version as a draft?'))return;await mutate('restore',null,v.id);}]]){const b=node('button',label);b.type='button';b.addEventListener('click',()=>run(action));a.append(b);}
   root.append(a);
  }
 }
 async function load(){
  const key=selected?.template_key;rows=await repository.list();if(!Array.isArray(rows)||rows.length!==4)throw Error('Expected four published email templates');
  const list=$('#template-list');list.replaceChildren();
  for(const [kind,label] of [['aftercare','Customer Aftercare'],['dispatched','Dispatch Confirmation']]){
   const group=node('section');group.className='template-group';const h=node('h3',label),buttons=node('div');group.append(h,buttons);
   for(const channel of ['WEBSITE','EBAY']){
    const row=rows.find(r=>r.template_key===kind+':'+channel);if(!row)throw Error('Expected four published email templates');
    const b=node('button');b.type='button';b.dataset.key=row.template_key;b.setAttribute('aria-label',title(row.template_key)+' · v'+row.published.version+' · '+(row.draft?'Saved Draft':'No draft'));
    b.append(node('strong',channel==='EBAY'?'eBay':'Website'),node('small','v'+row.published.version+' · '+(row.draft?'Saved Draft':'No draft')));
    b.addEventListener('click',()=>{if(busy||row.template_key===selected?.template_key||dirty&&!confirm('Discard unsaved edits before changing template?'))return;run(async()=>{choose(row);await showPreview();});});buttons.append(b);
   }
   list.append(group);
  }
  choose(rows.find(r=>r.template_key===key)||rows.find(r=>r.template_key==='aftercare:WEBSITE'));
 }
 async function mutate(action,value=null,version=null){
  await repository.mutate(selected.template_key,selected.revision,action,value,version);await load();
  notify(action==='publish'?'Published and Live. Future uses now use the new version. No email was sent.':action==='save'?'Saved Draft. Live content has not changed. Validate & Preview before publishing.':action==='restore'?'Historical version restored into a new draft. Live content has not changed.':'Draft discarded. Published content is unchanged.');
 }
 async function showPreview(options={},indicator=dirty?'Unsaved Draft':selected.draft?'Saved Draft':'Published and Live'){
  clearErrors();
  let data;
  try{data=await preview('template-preview',{key:selected.template_key,...Object.keys(options).length?options:{content:content()},tracking:true});}
  catch(error){
   if(!options.versionId){
    validatedDraft=null;
    const message=error.message||'Preview unavailable';
    const field=/^subject/i.test(message)?'subject':/^heading/i.test(message)?'heading':'body';
    $('#'+field+'-error').textContent=message;
    if(!/unavailable|sign-in|membership/i.test(message))form.elements[field].setAttribute('aria-invalid','true');
   }
   throw error;
  }
  if(typeof data.html!=='string'||typeof data.text!=='string')throw Error('Invalid preview response');
  renderedHTML=isolatedPreview(data.html);previewReady=true;$('#template-text').textContent=data.text;resetViewport();
  $('#preview-subject').textContent=data.subject;$('#preview-context').textContent=data.label+' · '+title(data.key)+' · '+indicator+' · '+data.orderReference;
  if(!options.versionId&&!dirty&&selected.draft&&fields.every(k=>content()[k]===selected.draft[k]))validatedDraft=draftIdentity();
  notify('Content validated. Preview only; nothing was sent.');
 }
 async function run(action){
  if(busy)return;busy=true;
  const focus=document.activeElement,selection={field:activeField,value:activeField.value,start:activeField.selectionStart,end:activeField.selectionEnd,direction:activeField.selectionDirection,scroll:activeField.scrollTop,focused:focus===activeField};
  $('#template-editor').setAttribute('aria-busy','true');
  document.querySelectorAll('.template-layout button,#template-form input,#template-form textarea,#template-form select').forEach(b=>b.disabled=true);
  try{await action();}catch(error){notify(error.message+(error.code==='40001'?' Your edits remain in the editor. Reload explicitly to review the newer version.':''),true);}
  finally{
   busy=false;$('#template-editor').removeAttribute('aria-busy');
   document.querySelectorAll('.template-layout button,#template-form input,#template-form textarea,#template-form select').forEach(b=>b.disabled=false);state();
   if(selection.field.value===selection.value){if(selection.focused)selection.field.focus({preventScroll:true});selection.field.setSelectionRange(selection.start,selection.end,selection.direction);selection.field.scrollTop=selection.scroll;}
  }
 }
 function edited(){dirty=fields.some(k=>form.elements[k].value!==(selected.draft||selected.published.content)[k]);validatedDraft=null;navigationApproved=false;clearErrors();clearPreview();state();}
 form.addEventListener('submit',e=>e.preventDefault());
 for(const field of fields){form.elements[field].addEventListener('focus',()=>activeField=form.elements[field]);form.elements[field].addEventListener('input',edited);}
 $('#placeholder-insert').addEventListener('click',()=>{
  const placeholder='{{'+$('#placeholder-select').value+'}}',start=activeField.selectionStart??activeField.value.length,end=activeField.selectionEnd??start;
  activeField.setRangeText(placeholder,start,end,'end');activeField.setSelectionRange(start+placeholder.length,start+placeholder.length);activeField.focus({preventScroll:true});edited();
 });
 $('#draft-save').addEventListener('click',()=>run(()=>mutate('save',content())));
 $('#draft-preview').addEventListener('click',()=>run(()=>showPreview()));
 $('#draft-discard').addEventListener('click',()=>{
  if(!confirm('Discard the saved draft and any unsaved edits? Published content remains unchanged.'))return;
  run(async()=>{if(selected.draft)await mutate('discard');else{choose(selected);notify('Unsaved edits discarded. Published content is unchanged.');}});
 });
 $('#draft-publish').addEventListener('click',()=>run(async()=>{
  if(dirty||!selected.draft||validatedDraft!==draftIdentity())throw Error('Save and validate the draft before publishing');
  await showPreview();if(await publication(selected,{document}))await mutate('publish');
 }));
 $('#template-reload').addEventListener('click',()=>{if(!dirty||confirm('Discard unsaved edits and reload templates?'))run(async()=>{await load();await showPreview();});});
 for(const value of ['html','text'])$('#preview-'+value).addEventListener('click',()=>{
  format=value;$('#preview-html').setAttribute('aria-pressed',String(value==='html'));$('#preview-text').setAttribute('aria-pressed',String(value==='text'));resetViewport();
 });
 document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href]');
  if(dirty&&link&&!event.defaultPrevented&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey&&link.target!=='_blank'){
   if(!confirm('Leave Email Templates and discard unsaved changes?'))event.preventDefault();else navigationApproved=true;
  }
 });
 document.defaultView.addEventListener('beforeunload',event=>{if(dirty&&!navigationApproved){event.preventDefault();event.returnValue='';}});
 await run(async()=>{await load();await showPreview();});return {get selected(){return selected;},get dirty(){return dirty;}};
}
if(typeof document!=='undefined'&&document.querySelector('#template-form'))mountEmailTemplateStudio();

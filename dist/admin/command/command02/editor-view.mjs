import {uiNode as node} from '../../application.mjs';
import {fields,displayValue,categories,editable} from './schema.mjs';
import {createEditorSession} from './session.mjs';

export function createEditorView(document,{persistence,onSaved=()=>{},timeoutMs=8000,canSave=()=>false,onState=()=>{},getSelectedId=()=>null}){
 const $=id=>document.getElementById(id),root=$('editor-workspace'),form=$('product-form');
 let session,renderedId=null,section='general',savedRevision=null,confirmPending=null,confirmInvoker=null,closed=false;
 let reviewReturnTarget=null,returnFromReview=false;
 const controls=new Map(),errors=new Map(),cleanups=[];
 const listen=(element,event,handler)=>{element.addEventListener(event,handler);cleanups.push(()=>element.removeEventListener(event,handler));};
 const add=(parent,tag,text,cls)=>{const e=node(document,tag,text,cls);parent.append(e);return e;};
 const sections=['general','specifications','pricing','availability','inventory','images'];
 const titles={general:'General',specifications:'Specifications',pricing:'Pricing',availability:'Availability',inventory:'Inventory',images:'Images'};
 const selectSection=key=>{
  section=key;
  for(const s of sections){$('editor-panel-'+s).hidden=s!==key;const tab=$('editor-tab-'+s);tab.setAttribute('aria-selected',String(s===key));tab.tabIndex=s===key?0:-1;}
 };
 for(const key of sections){
  const tab=add($('editor-tabs'),'button',titles[key]);tab.type='button';tab.id='editor-tab-'+key;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','editor-panel-'+key);
  const panel=add(form,'section',undefined,'editor-section');panel.id='editor-panel-'+key;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);
  listen(tab,'click',()=>selectSection(key));
 }
 add($('editor-panel-general'),'p','The stable product ID is immutable. Text is trimmed using the existing Admin convention; overlength values are rejected.','editor-help');
 for(const [key,field]of Object.entries(fields)){
  const parent=$('editor-panel-'+field.section),label=add(parent,'label',field.label,'editor-field');
  const input=add(label,key==='description'?'textarea':'input');input.name=key;input.id='editor-field-'+key;
  if(key!=='description')input.type=field.boolean?'checkbox':'text';
  if(key==='description')input.rows=5;
  if(field.money||field.integer)input.inputMode=field.money?'decimal':'numeric';
  if(field.money){label.classList.add('currency-field');input.setAttribute('aria-label',field.label+' in GBP');}
  input.autocomplete='off';
  if(field.required)input.required=true;
  const error=add(label,'span','','field-error');error.id='field-error-'+key;input.setAttribute('aria-describedby',error.id);
  controls.set(key,input);errors.set(key,error);
  listen(input,field.boolean?'change':'input',()=>session.set(key,field.boolean?input.checked:input.value));
 }
 add($('editor-panel-specifications'),'p','Series and part reference use the existing specs object. Electrical values, units, physical geometry and category-specific structures remain read-only.','editor-help');
 add($('editor-panel-specifications'),'div',undefined,'existing-specs').id='existing-specs';
 add($('editor-panel-pricing'),'p','Prices are GBP. Blank means not supplied. salePrice is the selling price; kit fields are not promotional or multibuy discounts. No automatic rounding.','editor-help');
 add($('editor-panel-availability'),'p','These are existing component flags, not a draft/published workflow. Checkout, assembly eligibility rules and live stock remain authoritative elsewhere.','editor-help');
 add($('editor-panel-inventory'),'h3','Inventory remains separate');
 add($('editor-panel-inventory'),'dl').id='editor-stock';
 add($('editor-panel-inventory'),'p','Read only. The existing stock operation uses a separate quantity-conditional update. Product changes here cannot rewrite stock or units.','editor-help');
 add($('editor-panel-images'),'h3','Original image preserved');
 add($('editor-panel-images'),'p','Metadata only. No image bytes are loaded or written. Uploads are unavailable in this workspace.','editor-help');
 add($('editor-panel-images'),'p',undefined,'image-placeholder').id='editor-image-state';
 const pair=(dl,name,value)=>{const row=add(dl,'div',undefined,'detail-line');add(row,'dt',name);add(row,'dd',value);};
 function render(s){
  if(closed)return;
  const visible=s.phase!=='closed';document.body.classList.toggle('command-editor-open',visible);root.hidden=!visible;
  if(!visible){renderedId=null;return;}
  $('editor-loading').hidden=!['loading','load-error'].includes(s.phase);
  $('editor-content').hidden=['loading','load-error'].includes(s.phase);
  $('editor-load-message').textContent=s.phase==='load-error'?s.error:'Reading selected authorised product details…';
  $('editor-load-retry').hidden=s.phase!=='load-error';
  root.setAttribute('aria-busy',String(['loading','reloading'].includes(s.phase)));
  if(!s.baseline)return;
  $('editor-title').textContent=s.baseline.name;
  $('editor-identity').textContent=s.id+' · '+s.baseline.manufacturer+' · '+categories[s.baseline.category];
  $('editor-revision').textContent='Read identity: '+s.baseline.revision+' · not a database write revision';
  $('editor-state').textContent=s.phase==='saving'?'Saving submitted changes':s.conflict?'Revision conflict':s.phase==='unknown'||s.phase==='checking'?'Outcome unresolved':s.dirty?s.changes.length+' unsaved field'+(s.changes.length===1?'':'s'):'No pending changes';
  for(const [key,input]of controls){
   const value=s.draft[key];
   if(fields[key].boolean)input.checked=value;
   else if(input.value!==value)input.value=value;
   input.disabled=['reloading'].includes(s.phase);
   input.setAttribute('aria-invalid',String(Boolean(s.validation.errors[key])));
   errors.get(key).textContent=s.validation.errors[key]??'';
  }
  const changed=$('changed-fields');changed.replaceChildren();
  for(const item of s.changes){const button=add(changed,'button',item.label+(item.error?' · invalid':''),'changed-field');button.type='button';button.dataset.fieldTarget=item.key;}
  $('editor-message').textContent=s.error||s.notice||'Local proposal only. Production saving is disabled.';
  $('editor-message').setAttribute('role',s.error?'alert':'status');
  $('review-changes').disabled=!s.canReview;
  $('save-fixture').disabled=!canSave()||s.phase!=='review'||!s.review;
  $('review-changes').textContent=['saving','reviewing'].includes(s.phase)?s.phase==='saving'?'Saving…':'Checking revision…':'Review changes'+(s.dirty?' ('+s.changes.length+')':'');
  $('discard-changes').disabled=!s.dirty||['saving','unknown','checking','reloading'].includes(s.phase);
  $('check-outcome').hidden=!['unknown','checking'].includes(s.phase);$('check-outcome').disabled=s.phase==='checking';
  $('conflict-panel').hidden=!s.conflict;
  if(s.conflict){
   const body=$('conflict-rows');body.replaceChildren();
   const original=editable(s.baseline),server=s.server?editable(s.server):null;
   for(const [key,field]of Object.entries(fields))if(server&&server[key]!==original[key]||s.changes.some(c=>c.key===key)){
    const row=add(body,'tr');for(const value of [field.label,original[key],s.draft[key],server?server[key]:'Not confirmed'])add(row,'td',typeof value==='boolean'?(value?'Yes':'No'):String(value||'Not supplied'));
   }
  }
  if(renderedId!==s.id){
   renderedId=s.id;selectSection('general');$('editor-heading').focus({preventScroll:true});
   if(document.defaultView.innerWidth<=1000)root.scrollIntoView({block:'start',behavior:'auto'});
  }
  const stock=$('editor-stock');stock.replaceChildren();pair(stock,'Quantity',s.baseline.stock===null||s.baseline.stock===undefined?'Not supplied':String(s.baseline.stock));pair(stock,'Stock unit',s.baseline.stockUnit);pair(stock,'Authority','Read-only permitted inventory');
  $('editor-image-state').textContent='Image state: '+(s.baseline.imageInfo?.kind??'unloaded')+'. Original source image is not part of this patch.';
  const existing=$('existing-specs');existing.replaceChildren();
  for(const [key,value]of Object.entries(s.baseline.technicalSpecs??{}))if(typeof value==='string')add(existing,'p',key+': '+value,'editor-help');
  if(s.phase==='saved'&&s.id+':'+s.baseline.revision!==savedRevision){savedRevision=s.id+':'+s.baseline.revision;onSaved(s.baseline);}
 }
 session=createEditorSession({persistence,onChange:s=>{render(s);onState(s);},timeoutMs});
 function confirm(message){
  if(confirmPending)return Promise.resolve(false);
  confirmInvoker=document.activeElement;$('confirm-message').textContent=message;$('discard-confirm').showModal();$('keep-editing').focus();
  return new Promise(resolve=>{confirmPending=resolve;});
 }
 function finishConfirm(value){
  const resolve=confirmPending;if(!resolve)return;confirmPending=null;$('discard-confirm').close();if(confirmInvoker?.isConnected)confirmInvoker.focus({preventScroll:true});resolve(value);
 }
 async function discard(message='Discard your local changes and reload the latest read values?'){
  const s=session.snapshot();if(['saving','unknown','checking'].includes(s.phase)){$('editor-message').textContent='Resolve the pending save outcome before leaving or discarding.';$('editor-message').focus();return false;}
  if(s.dirty&&!await confirm(message))return false;
  const reloaded=await session.reload();if(reloaded)$('editor-heading').focus({preventScroll:true});return reloaded;
 }
 async function beforeAction(action){
  const s=session.snapshot();if(s.phase==='closed')return true;
  if(action.type==='select'&&action.id===s.id)return true;
  if(s.needsProtection&&!await discard(action.type==='refresh'?'Discard local edits and refresh the catalogue?':'Discard local edits before changing product context?'))return false;
  if(action.type==='select'||action.type==='close'){session.close();if(action.type==='select')document.querySelector('[data-product="'+action.id+'"]')?.focus({preventScroll:true});}
  return true;
 }
 function workbenchState(s){
  const state=session.snapshot();
  const current=s.rows.find(row=>row.id===state.id);
  $('editor-context-note').textContent=state.id&&!s.visible.some(row=>row.id===state.id)?'The edited product is outside the current list. Your local edits are preserved.':current&&state.baseline&&current.revision.split('-')[0]===(state.baseline.catalogueRevision??state.baseline.revision).split('-')[0]&&current.revision!==(state.baseline.catalogueRevision??state.baseline.revision)?'The catalogue has a newer read identity. Local values are preserved; review checks the current version.':'';
  if(s.detailStatus==='ready'&&!$('inspector').querySelector('[data-enter-editor]')){
   const button=add($('inspector').querySelector('.inspector-body'),'button','Draft product changes','enter-editor');button.type='button';button.dataset.enterEditor='';
  }
 }
 listen($('inspector'),'click',event=>{if(event.target.closest('[data-enter-editor]'))void session.open(document.querySelector('#rows button[aria-pressed=true]')?.dataset.product??getSelectedId());});
 listen($('editor-load-retry'),'click',()=>void session.open(session.snapshot().id));
 listen($('editor-tabs'),'keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const old=sections.indexOf(section),next=event.key==='Home'?0:event.key==='End'?sections.length-1:(old+(event.key==='ArrowRight'?1:-1)+sections.length)%sections.length;
  selectSection(sections[next]);$('editor-tab-'+sections[next]).focus();
 });
 listen($('changed-fields'),'click',event=>{const button=event.target.closest('[data-field-target]');if(button){const key=button.dataset.fieldTarget;selectSection(fields[key].section);controls.get(key).focus();}});
 listen($('review-changes'),'click',async()=>{
  if(!await session.review())return;
  const s=session.snapshot(),body=$('review-rows');body.replaceChildren();
  for(const change of s.changes){const row=add(body,'tr');for(const value of [change.label,displayValue(change.key,change.before),displayValue(change.key,change.after)])add(row,'td',value);}
  $('review-version').textContent='Reviewed against '+s.baseline.revision+'. This is a comparison identity, not a write revision. Production saving is disabled.';
  reviewReturnTarget=$('review-changes');returnFromReview=true;
  $('change-review').showModal();$('cancel-review').focus();
 });
 listen($('cancel-review'),'click',()=>{$('change-review').close();});
 listen($('save-fixture'),'click',()=>{if(!canSave())return;returnFromReview=false;const task=session.save();$('change-review').close();$('editor-heading').focus({preventScroll:true});void task;});
 listen($('discard-changes'),'click',()=>void discard());
 listen($('reload-conflict'),'click',()=>void discard('Discard local edits and load the newer current read identity?'));
 listen($('continue-reviewing'),'click',()=>{selectSection('general');controls.get('name').focus();});
 listen($('check-outcome'),'click',()=>void session.checkOutcome());
 listen($('close-editor'),'click',async()=>{const s=session.snapshot();if(s.needsProtection&&!await discard('Discard local edits and close the editor?'))return;session.close();document.querySelector('[data-enter-editor]')?.focus();});
 listen($('keep-editing'),'click',()=>finishConfirm(false));listen($('confirm-discard'),'click',()=>finishConfirm(true));
 listen($('discard-confirm'),'cancel',event=>{event.preventDefault();finishConfirm(false);});
 // Native Escape keeps its default dismissal. Restore only after the modal closes.
 listen($('change-review'),'close',()=>{
  const target=reviewReturnTarget,restore=returnFromReview;reviewReturnTarget=null;returnFromReview=false;
  if(!closed&&restore&&!$('change-review').open&&target?.isConnected&&!target.disabled&&!target.closest('[hidden],[inert]')&&document.body.classList.contains('admin-authorized')&&['review','editing','error'].includes(session.snapshot().phase))target.focus({preventScroll:true});
 });
 listen(form,'submit',event=>event.preventDefault());
 listen(document,'keydown',event=>{if(event.key==='Escape'&&root.contains(event.target)&&!event.target.closest('dialog')&&!document.querySelector('dialog[open]')){event.preventDefault();$('close-editor').click();}});
 listen(document.defaultView,'beforeunload',event=>{if(session.snapshot().needsProtection){event.preventDefault();event.returnValue='';}});
 listen(document.defaultView,'pagehide',()=>session.destroy());
 // Shared Admin navigation is guarded by the owning workspace composition.
 return{session,beforeAction,workbenchState,discard,selectSection,destroy(){closed=true;session.destroy();for(const cleanup of cleanups)cleanup();}};
}

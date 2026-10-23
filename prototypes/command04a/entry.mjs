// Presentation only. The accepted entry point mounts the unchanged workbench,
// editor, session bridge and IRONCLAD authority against this candidate document.
import './compose.mjs';
import {fields} from '../command02/schema.mjs';
const app=window.command04,$=id=>document.getElementById(id);
let pending=false,closed=false,wasOpen=false,lastValidation='';
const setText=(element,text)=>{if(element.textContent!==text)element.textContent=text;};
const sections=['general','specifications','pricing','availability','inventory','images'];
const names=['General','Specifications','Pricing','Availability','Inventory · read only','Images · metadata only'];
// Native dialog cancellation releases its focus trap after the cancel event.
// Restore the invoker on close; never move focus after submission or concealment.
$('change-review').addEventListener('close',()=>{
 if(!closed&&!$('bridge-protected').hidden&&app.editor.snapshot().phase==='review')$('review-changes').focus({preventScroll:true});
});
for(const [i,key] of sections.entries())$('section-select').add(new Option(names[i],key));
$('section-select').addEventListener('change',()=>{app.view.selectSection($('section-select').value);$('section-select').focus({preventScroll:true});});
$('catalogue-toggle').addEventListener('click',()=>{
 const browse=document.body.classList.toggle('nocturne-browse');
 $('catalogue-toggle').setAttribute('aria-expanded',String(browse));
 setText($('catalogue-toggle'),browse?'Return to product editor':'Browse catalogue');
 const target=browse?$('search'):$('editor-heading');target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'auto'});
});
// Associate field instructions without changing values, validators or write rules.
const hints={name:'Required. Use a recognisable product name.',sku:'Required. The authority checks SKU uniqueness.',description:'Plain text. New lines are preserved.',salePrice:'GBP · selling price, not a promotional discount.',kitPrice:'GBP · price for the kit quantity below.',kitPriceQuantity:'Whole number. Blank means not supplied.'};
for(const [key,field] of Object.entries(fields)){
 const input=$('editor-field-'+key),label=input.closest('label');label.htmlFor=input.id;
 const caption=document.createElement('span');caption.id='field-label-'+key;caption.textContent=field.label+(field.money?' (GBP)':'');label.firstChild.replaceWith(caption);input.setAttribute('aria-labelledby',caption.id);
 if(hints[key]){const hint=document.createElement('span');hint.id='field-hint-'+key;hint.className='field-hint';hint.textContent=hints[key];label.append(hint);input.setAttribute('aria-describedby',input.getAttribute('aria-describedby')+' '+hint.id);}
 if(field.money)label.dataset.currency='GBP';
}
const help={general:'Product identity and description. The stable record ID remains read only.',pricing:'Prices are in GBP. Blank means not supplied. Kit pricing is separate from promotions.',availability:'Existing eligibility flags. Inventory and checkout rules remain separate.'};
for(const [key,text]of Object.entries(help)){const p=$('editor-panel-'+key).querySelector('.editor-help');if(p)setText(p,text);}
function render(){
 pending=false;if(closed)return;
 const session=app.bridge.snapshot(),draft=app.editor.snapshot(),protectedVisible=!$('bridge-protected').hidden;
 document.body.dataset.workspace=protectedVisible?'authorised':'locked';
 const open=draft.phase!=='closed';
 if(open&&!wasOpen){document.body.classList.remove('nocturne-browse');$('catalogue-toggle').setAttribute('aria-expanded','false');setText($('catalogue-toggle'),'Browse catalogue');}
 const justOpened=open&&!wasOpen;wasOpen=open;$('catalogue-toggle').hidden=!open;
 if(justOpened&&protectedVisible)$('editor-workspace').scrollIntoView({block:'start',behavior:'auto'});
 // Only generic guidance is rendered outside the protected subtree.
 let title='Authentication required',description='Start a fictional session to inspect the catalogue. Product data stays concealed until access is authorised.';
 if(session.status==='authorized'&&protectedVisible){title=session.capabilities.productWrite?'Preview session active':'Read-only access';description=session.capabilities.productWrite?'Synthetic catalogue · changes apply only to this temporary preview.':'This session can inspect products. Saving needs product write permission; local proposals remain unsaved.';}
 else if(session.status==='authorized'&&draft.needsProtection){title='Restore the original session';description='A retained draft belongs to an earlier identity. Restore that session to continue; its product details remain concealed.';}
 else if(session.status==='authorized'||session.status==='checking'){title='Opening catalogue';description='Checking this session and loading the synthetic catalogue.';}
 else if(session.status==='expired'){title='Session expired';description='Restore authentication to continue. Any retained local draft is unsaved and remains concealed until the original identity returns.';}
 else if(session.status==='revoked'||session.status==='permission'){title='Access denied';description='This session no longer has authority. Product details are concealed. Restore an authorised session to continue.';}
 else if(draft.needsProtection){title='Session ended';description='Your local draft is retained but unsaved. Restore the original session to continue.';}
 setText($('session-title'),title);setText($('session-description'),description);
 $('session-guidance').dataset.tone=protectedVisible&&session.capabilities.productWrite?'neutral':'attention';
 if(!open)return;
 const tab=document.querySelector('#editor-tabs [aria-selected=true]');if(tab)$('section-select').value=tab.id.replace('editor-tab-','');
 setText($('draft-context'),draft.baseline?draft.baseline.name:'Reading product…');
 $('editor-workspace').dataset.phase=draft.phase;
 const errors=Object.entries(draft.validation.errors),key=JSON.stringify(errors);
 if($('validation-summary').hidden!==(errors.length===0))$('validation-summary').hidden=errors.length===0;
 if(key!==lastValidation){lastValidation=key;const list=$('validation-links');list.replaceChildren();for(const [name,message]of errors){const li=document.createElement('li'),button=document.createElement('button');button.type='button';button.textContent=fields[name].label+': '+message;button.addEventListener('click',()=>{app.view.selectSection(fields[name].section);const control=$('editor-field-'+name);control.focus();control.scrollIntoView({block:'center',behavior:'auto'});});li.append(button);list.append(li);}}
 const guidance=draft.phase==='unknown'?'Save outcome unresolved. A response may have been lost after commitment. Check the outcome before retrying; review and discard stay blocked.':draft.phase==='checking'?'Checking the original operation. No new save is being submitted.':draft.phase==='saving'?'Saving the reviewed changes. Wait for confirmation before leaving.':draft.phase==='conflict'?'Revision conflict. Your draft is preserved. Compare the current values and reload before saving.':draft.phase==='saved'?(draft.dirty?'Submitted changes confirmed. Newer local edits remain unsaved.':'Save confirmed. The authority accepted the reviewed changes.'):draft.phase==='error'&&draft.operation===null?'Save or review failed. Read the authority message below before reviewing again.':'';
 if($('outcome-guidance').hidden!==!guidance)$('outcome-guidance').hidden=!guidance;setText($('outcome-guidance'),guidance);$('outcome-guidance').dataset.tone=draft.phase;
 for(const table of document.querySelectorAll('.review-table,.conflict-table')){
  const labels=[...table.querySelectorAll('thead th')].map(th=>th.textContent);
  for(const th of table.querySelectorAll('thead th'))th.scope='col';
  for(const row of table.querySelectorAll('tbody tr'))[...row.cells].forEach((cell,i)=>{if(cell.dataset.label!==labels[i])cell.dataset.label=labels[i];});
 }
}
function schedule(){if(!pending&&!closed){pending=true;queueMicrotask(render);}}
const observer=new MutationObserver(schedule);
observer.observe($('editor-workspace'),{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','aria-selected']});
observer.observe($('bridge-protected'),{attributes:true,attributeFilter:['hidden']});
const unsubscribe=app.bridge.subscribe(schedule);
function destroy(){if(closed)return;closed=true;observer.disconnect();unsubscribe();}
window.addEventListener('pagehide',destroy,{once:true});
Object.defineProperty(window,'nocturne',{value:Object.freeze({version:'nocturne-v1',destroy}),writable:false});
render();

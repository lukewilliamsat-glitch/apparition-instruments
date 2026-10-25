import {fields} from './command02/schema.mjs';
// NOCTURNE labels, section chooser, mobile context and accessible recovery summary.
export function mountPresentation(document,view){
 const $=id=>document.getElementById(id),cleanups=[];let closed=false,lastErrors='',wasOpen=false,pending=false;
 const listen=(target,event,fn)=>{target.addEventListener(event,fn);cleanups.push(()=>target.removeEventListener(event,fn));};
 const set=(e,text)=>{if(e.textContent!==text)e.textContent=text;};
 for(const [key,label]of [['general','General'],['specifications','Specifications'],['pricing','Pricing'],['availability','Availability'],['inventory','Inventory · read only'],['images','Images · metadata only']]){const o=document.createElement('option');o.value=key;o.textContent=label;$('section-select').append(o);}
 listen($('section-select'),'change',()=>{view.selectSection($('section-select').value);$('section-select').focus({preventScroll:true});});
 listen($('catalogue-toggle'),'click',()=>{const browse=document.body.classList.toggle('nocturne-browse');$('catalogue-toggle').setAttribute('aria-expanded',String(browse));set($('catalogue-toggle'),browse?'Return to product draft':'Browse catalogue');const target=browse?$('search'):$('editor-heading');target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'auto'});});
 const hints={name:'Required. Use a recognisable product name.',sku:'Required. Uniqueness needs future server validation.',description:'Plain text. New lines are preserved.',salePrice:'GBP selling price, not a promotional discount.',kitPrice:'GBP price for the kit quantity below.',kitPriceQuantity:'Positive whole number. Blank means not supplied.'};
 for(const [key,field]of Object.entries(fields)){
  const input=$('editor-field-'+key),label=input.closest('label');label.htmlFor=input.id;
  const caption=document.createElement('span');caption.id='field-label-'+key;caption.textContent=field.label+(field.money?' (GBP)':'');label.firstChild.replaceWith(caption);input.setAttribute('aria-labelledby',caption.id);
  if(hints[key]){const hint=document.createElement('span');hint.id='field-hint-'+key;hint.className='field-hint';hint.textContent=hints[key];label.append(hint);input.setAttribute('aria-describedby',input.getAttribute('aria-describedby')+' '+hint.id);}
 }
 function render(){
  pending=false;if(closed)return;const s=view.session.snapshot(),open=s.phase!=='closed';
  if(open&&!wasOpen){document.body.classList.remove('nocturne-browse');$('catalogue-toggle').setAttribute('aria-expanded','false');set($('catalogue-toggle'),'Browse catalogue');}
  wasOpen=open;$('catalogue-toggle').hidden=!open;if(!open)return;
  $('editor-workspace').dataset.phase=s.phase;set($('draft-context'),s.baseline?.name??'Reading product…');
  const tab=document.querySelector('#editor-tabs [aria-selected=true]');if(tab)$('section-select').value=tab.id.replace('editor-tab-','');
  const errors=Object.entries(s.validation.errors),key=JSON.stringify(errors);if($('validation-summary').hidden!==!errors.length)$('validation-summary').hidden=!errors.length;
  if(key!==lastErrors){lastErrors=key;$('validation-links').replaceChildren();for(const [name,message]of errors){const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.textContent=fields[name].label+': '+message;b.addEventListener('click',()=>{view.selectSection(fields[name].section);$('editor-field-'+name).focus();$('editor-field-'+name).scrollIntoView({block:'center',behavior:'auto'});});li.append(b);$('validation-links').append(li);}}
  const guidance=s.phase==='unknown'?'SYNTHETIC TEST · Save outcome unresolved. Check the original operation before retrying.':s.phase==='checking'?'SYNTHETIC TEST · Reconciling the original operation; no new save is being submitted.':s.phase==='conflict'?'Source values changed. Your proposal is retained. Compare and reload; force-save is unavailable.':s.phase==='saved'?'SYNTHETIC TEST · Submission confirmed by the temporary fixture. This is not a production save.':'';
  if($('outcome-guidance').hidden!==!guidance)$('outcome-guidance').hidden=!guidance;set($('outcome-guidance'),guidance);$('outcome-guidance').dataset.tone=s.phase;
  for(const table of document.querySelectorAll('.review-table,.conflict-table')){const labels=[...table.querySelectorAll('thead th')].map(n=>n.textContent);for(const th of table.querySelectorAll('thead th'))th.scope='col';for(const row of table.querySelectorAll('tbody tr'))[...row.cells].forEach((cell,i)=>{if(cell.dataset.label!==labels[i])cell.dataset.label=labels[i];});}
 }
 const schedule=()=>{if(!pending&&!closed){pending=true;queueMicrotask(render);}};
 const observer=new document.defaultView.MutationObserver(schedule);observer.observe($('editor-workspace'),{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','aria-selected']});observer.observe($('review-rows'),{childList:true});
 listen($('change-review'),'close',()=>{if(!$('command-content').hidden&&view.session.snapshot().phase==='review')$('review-changes').focus({preventScroll:true});});
 render();return {render,destroy(){closed=true;observer.disconnect();cleanups.forEach(f=>f());}};
}

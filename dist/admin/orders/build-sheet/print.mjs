import {el} from '../view.mjs';
export function printValue(input){return input.type==='checkbox'?(input.checked?'[X]':'[ ]'):input.tagName==='SELECT'?(input.selectedOptions[0]?.textContent||'Not recorded'):(input.value||'Not recorded');}
export function mountPrint(context){
 const content=document.querySelector('#build-content'),tools=el('div',null,'screen-tools'),button=el('button','Print Build Sheet','admin-button'),hint=el('p','A4 production sheet with a complete circuit overview and enlarged landscape wiring details. Save edits before printing.','sheet-note');button.type='button';tools.append(button,hint);content.prepend(tools);
 const prepare=()=>{
  content.querySelectorAll('.print-value,.print-diagram-details').forEach(n=>n.remove());
  for(const input of content.querySelectorAll('.production-form input,.production-form select,.production-form textarea')){const value=el('span',printValue(input),'print-value');input.after(value);}
  const svg=content.querySelector('.build-diagram svg');if(svg){const pages=el('div',null,'print-diagram-details');for(const [title,box] of [['Upper circuit detail · continues on lower detail','0 0 1320 680'],['Lower circuit detail · overlaps upper detail','0 520 1320 755']]){const page=el('div',null,'diagram-print-page');page.append(el('h2',context.reference+' · '+context.kitName+' · unit '+context.unit),el('p',title));const clone=svg.cloneNode(true);clone.setAttribute('viewBox',box);clone.removeAttribute('id');clone.removeAttribute('aria-labelledby');clone.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));page.append(clone);pages.append(page);}content.append(pages);}
 };
 button.addEventListener('click',()=>{if(content.querySelector('[data-dirty="true"]')){alert('Save assembly notes and Build & QC changes before printing.');return;}prepare();window.print();});window.addEventListener('beforeprint',prepare);
}

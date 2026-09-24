import {el,definition} from '../view.mjs';
import {specLabels} from '../../../les-paul-kits/config.mjs';
import {pickList,captureBOM} from './model.mjs';
import {browserProductionStore} from './production.mjs';
import {assemblyRepository} from '../../assembly-repository.mjs';
import {componentRepository} from '../../component-repository.mjs';
export async function mountPicking(root,context){
 const store=browserProductionStore(),section=el('section');section.id='build-specification';section.append(el('h3','Build specification'),definition(Object.entries(context.snapshot.specification).map(([k,v])=>[specLabels[k]||k,v])));root.append(section);
 const picks=el('section');picks.id='component-picking';picks.append(el('h3','Component pick list'),el('p','Quantities below are for this one kit unit. Picking is a checklist only; nothing is reserved or deducted.'));
 const status=el('p',undefined,'production-message');status.setAttribute('role','status');picks.append(status,el('p','Internal wiring and consumable quantities were not captured in these kit snapshots. Confirm them at the bench; no quantities or SKUs are inferred.'));const tableWrap=el('div',undefined,'admin-table-scroll'),table=el('table'),head=el('thead'),hr=el('tr');for(const t of ['Qty','Component','Specification','Internal ref / SKU','Picked'])hr.append(el('th',t));head.append(hr);table.append(head);const body=el('tbody');table.append(body);tableWrap.append(table);picks.append(tableWrap);root.append(picks);
 let rows;try{rows=pickList(context);}catch(e){status.textContent=e.message;return;}
 const assemblies=await assemblyRepository().list();
 function render(){const record=store.get(context);body.replaceChildren();
 function line(p,key,child=false){const tr=el('tr');if(child)tr.className='bom-child';tr.append(el('td',String(p.quantity)),el('td',p.name),el('td',p.specification||'See saved kit specification'),el('td',p.sku||'Not recorded'));const cell=el('td'),label=el('label'),input=el('input');input.type='checkbox';input.checked=record.picked[key]===true;input.setAttribute('aria-label','Picked '+p.name);const mark=el('span',input.checked?'Picked':'Not picked','picked-label');label.append(input,mark);cell.append(label);tr.append(cell);input.addEventListener('change',async()=>{const wanted=input.checked;input.disabled=true;try{await store.update(context,r=>{r.picked[key]=wanted;});mark.textContent=wanted?'Picked':'Not picked';status.textContent='Picking saved in this browser. Stock unchanged.';}catch(e){input.checked=!wanted;status.textContent=e.message;}finally{input.disabled=false;}});body.append(tr);return tr;}
 for(const p of rows){const tr=line(p,p.id),plan=record.bomPlans[p.id];if(p.role==='trebleBleeds'){
  const details=el('details',undefined,'bom-choice screen-tools');details.append(el('summary',plan?'Production BOM: '+plan.name:'Optional: build this assembly from a BOM'));
  details.append(el('p','Select only a BOM you have verified for this purchased product. Its parts are captured as a separate production plan.'));
  const select=el('select');select.setAttribute('aria-label','Production BOM for '+p.name);const none=el('option','Use finished assembly as listed');none.value='';select.append(none);
  const activeAssemblies=assemblies.filter(a=>a.active);
  for(const a of activeAssemblies){const o=el('option',a.name+' · '+a.sku);o.value=a.id;select.append(o);}if(plan&&!activeAssemblies.some(a=>a.id===plan.assemblyId)){const o=el('option',plan.name+' · saved plan');o.value=plan.assemblyId;select.append(o);}select.value=plan?.assemblyId||'';
  const button=el('button','Save production BOM');button.type='button';button.addEventListener('click',async()=>{try{if(!confirm('Save this production BOM selection? Its picked checks will be reset. The purchased kit will not change.'))return;const selected=select.value?captureBOM(activeAssemblies.find(a=>a.id===select.value),await componentRepository().list(),p.quantity):null;await store.update(context,r=>{if(selected)r.bomPlans[p.id]=selected;else delete r.bomPlans[p.id];for(const k of Object.keys(r.picked))if(k===p.id||k.startsWith(p.id+'/'))delete r.picked[k];});render();status.textContent='Production BOM saved. Purchased specification and stock unchanged.';}catch(e){status.textContent=e.message;}});details.append(select,button);tr.children[1].append(details);
 }
 if(plan){const caption=el('tr',undefined,'bom-caption'),cell=el('td','Production parts from saved BOM: '+plan.name+' · '+new Date(plan.capturedAt).toLocaleDateString('en-GB'));cell.colSpan=5;caption.append(cell);body.append(caption);for(const part of plan.parts)line(part,p.id+'/'+part.id,true);}
 }
 }
 render();
}

import {forgeCircuit} from './model.mjs';
import {forgeDiagram,visualCrossings} from './presentation.mjs';
import {endpoint} from '../wiring-generator/model.mjs';
import {selectorReport,changeReport,inspectSelection,selectionHighlight,terminalName} from './workbench.mjs';
import {pickupConventions} from '../wiring-generator/colours.mjs';

const $=query=>document.querySelector(query),form=$('#forge-controls'),mount=$('#forge-diagram'),viewport=$('#forge-viewport');
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
let circuit,selection=null,roleView='all';
const choose=(kind,value)=>{selection=kind==='component'?{kind,id:value}:kind==='wire'?{kind,id:value}:{kind:'terminal',ref:value};updateSelection();};
function paint(){
 const active=document.activeElement,attribute=['data-terminal','data-wire','data-component'].find(name=>active?.hasAttribute?.(name)),value=attribute&&active.getAttribute(attribute),left=viewport.scrollLeft,top=viewport.scrollTop;
 mount.innerHTML=forgeDiagram(circuit,{selection:selectionHighlight(circuit,selection),filter:roleView});viewport.scrollLeft=left;viewport.scrollTop=top;
 if(value)mount.querySelector(`[${attribute}="${value}"]`)?.focus({preventScroll:true});
}
function updateSelection(){
 const info=inspectSelection(circuit,selection),box=$('#forge-inspection');box.replaceChildren();
 if(!info){selection=null;box.append(el('p','Choose a part from the list or select a terminal or wire in the diagram. Trace buttons reveal a conductive segment.'));}
 else {
  box.append(el('h4',info.heading),el('p',info.subtitle));
  if(info.physical)box.append(el('p',info.physical));
  if(info.kind==='component'){
   box.append(el('p',info.purpose));
   const list=el('ul');for(const t of info.terminals){const item=el('li'),button=el('button',t.label);button.type='button';button.addEventListener('click',()=>choose('terminal',t.ref));item.append(button,document.createTextNode(' · '+(t.connections.length?t.connections.join(' · '):'No external wire')));list.append(item);}box.append(list);
  }else if(info.kind==='wire'){
   box.append(el('p',info.summary));
   const trace=el('button','Trace complete electrical net');trace.type='button';trace.addEventListener('click',()=>choose('terminal',info.ref));box.append(trace);
  }else{
   box.append(el('p',info.summary));
   const label=el('h5','Connections on this segment'),list=el('ul');for(const wire of info.connections){const item=el('li'),button=el('button',wire.description);button.type='button';button.addEventListener('click',()=>choose('wire',wire.id));item.append(button);list.append(item);}box.append(label,list);
   if(info.contacts.length){box.append(el('h5','Closed switch contacts'));const contacts=el('ul');for(const text of info.contacts)contacts.append(el('li',text));box.append(contacts);}
   const terminals=el('details'),summary=el('summary','Terminal references ('+info.references.length+')'),refs=el('ul');for(const ref of info.references)refs.append(el('li',terminalName(circuit,ref)));terminals.append(summary,refs);box.append(terminals);
  }
 }
 for(const button of document.querySelectorAll('#forge-parts button'))button.setAttribute('aria-pressed',String(selection?.kind==='component'&&button.dataset.part===selection.id));
 for(const button of document.querySelectorAll('[data-trace]'))button.setAttribute('aria-pressed',String(selection?.kind==='terminal'&&button.dataset.trace===selection.ref));
 paint();
}
function updateInventory(){
 const list=$('#forge-parts');list.replaceChildren();
 for(const part of circuit.components){const item=el('li'),button=el('button');button.type='button';button.dataset.part=part.id;button.append(el('strong',part.label),el('small',part.value||part.type));button.addEventListener('click',()=>choose('component',part.id));item.append(button);list.append(item);}
 $('#forge-count').textContent=`(${circuit.components.length})`;
 $('#forge-facts').textContent=`${circuit.components.length} components · ${circuit.connections.length} external connections · ${visualCrossings(circuit).length} separated crossings`;
}
function updateSelector(){
 const report=selectorReport(circuit),box=$('#forge-contacts');$('#forge-selector').textContent=report.description;box.replaceChildren();
 for(const channel of report.channels){const item=el('div'),button=el('button',channel.label+' volume output');button.type='button';button.addEventListener('click',()=>choose('terminal',channel.ref));item.append(el('strong',channel.active?'Connected to jack':'Not connected to jack'),button);box.append(item);}
 const closed=el('p','Closed contacts: '+(report.closed.map(x=>x.description).join('; ')||'none')+'. Unselected switch contacts remain open.');box.append(closed);
}
function updateChanges(previous){const report=changeReport(previous,circuit),box=$('#forge-change');box.replaceChildren(el('h4',report.heading));const list=el('ul');for(const line of report.lines)list.append(el('li',line));box.append(list);}
function render(){
 try{
  const choices=Object.fromEntries(['wiring','bleed','neckCap','bridgeCap','position','neckProfile','bridgeProfile'].map(key=>[key,form.elements.namedItem(key).value]));
  const previous=circuit,result=forgeCircuit(choices);circuit=result.circuit;
  if(selection&&!inspectSelection(circuit,selection))selection=null;
  form.elements.bleed.disabled=choices.wiring==='50s';$('#forge-kit').href=result.kitURL;$('#forge-kit').hidden=!result.kitURL;
  $('#forge-loading-help').hidden=true;
  $('#forge-status').textContent=`${choices.wiring==='50s'?'50s':choices.wiring==='60s'?'60s':'Modern'} wiring · ${choices.position} selector`;
  updateInventory();updateSelector();updateChanges(previous);updateSelection();
 }catch(error){$('#forge-loading-help').hidden=true;
  $('#forge-status').textContent='Unsupported circuit choice: '+error.message;}
}
form.addEventListener('change',event=>{if(event.target.name==='wiring'&&event.target.value==='50s')form.elements.bleed.value='none';render();});
for(const channel of ['neck','bridge']){const select=form.elements.namedItem(channel+'Profile');for(const [id,profile] of Object.entries(pickupConventions)){const option=el('option',profile.label);option.value=id;select.append(option);}}
form.addEventListener('reset',()=>setTimeout(()=>{selection=null;render();},0));
mount.addEventListener('click',event=>{const target=event.target.closest('[data-terminal],[data-wire],[data-component]');if(!target)return;if(target.dataset.terminal)choose('terminal',target.dataset.terminal);else if(target.dataset.wire)choose('wire',target.dataset.wire);else choose('component',target.dataset.component);});
mount.addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key))return;const target=event.target.closest('[data-terminal],[data-wire],[data-component]');if(target){event.preventDefault();target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
$('#forge-clear').addEventListener('click',()=>{selection=null;updateSelection();});
for(const button of document.querySelectorAll('[data-role-view]'))button.addEventListener('click',()=>{
 roleView=button.dataset.roleView;
 for(const option of document.querySelectorAll('[data-role-view]'))option.setAttribute('aria-pressed',String(option===button));
 paint();
});
for(const button of document.querySelectorAll('[data-trace]'))button.addEventListener('click',()=>choose('terminal',button.dataset.trace));
render();

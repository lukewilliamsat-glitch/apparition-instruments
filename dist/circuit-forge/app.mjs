import {setupMobileWorkbench} from './mobile-workbench.mjs';
import {forgeCircuit,defaultControls} from './model.mjs';
import {forgeResponse,responseComponent} from './response.mjs';
import {responseGraph} from './response-view.mjs';
import {forgeDiagram,visualCrossings} from './presentation.mjs';
import {endpoint} from '../wiring-generator/model.mjs';
import {selectorReport,changeReport,inspectSelection,selectionHighlight,terminalName} from './workbench.mjs';
import {pickupConventions} from '../wiring-generator/colours.mjs';

const $=query=>document.querySelector(query),form=$('#forge-controls'),mount=$('#forge-diagram'),viewport=$('#forge-viewport');
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
let circuit,selection=null,roleView='all',mobile;
function setWorkspaceMode(mode){
 const physical=mode==='physical';
 mobile?.modeChanged(mode);
 $('#forge-mode-physical').hidden=!physical;$('#forge-response-lab').hidden=physical;
 $('#forge-diagram-title').textContent=physical?'Circuit Lab':'Signal Lab';
 for(const button of document.querySelectorAll('[data-forge-mode]'))button.setAttribute('aria-pressed',String(button.dataset.forgeMode===mode));
}
const choose=(kind,value)=>{selection=kind==='component'?{kind,id:value}:kind==='wire'?{kind,id:value}:{kind:'terminal',ref:value};updateSelection();mobile?.selectionChanged(selection);};
function paint(){
 const active=document.activeElement,attribute=['data-terminal','data-wire','data-component'].find(name=>active?.hasAttribute?.(name)),value=attribute&&active.getAttribute(attribute),left=viewport.scrollLeft,top=viewport.scrollTop;
 mount.innerHTML=forgeDiagram(circuit,{selection:selectionHighlight(circuit,selection),filter:roleView});mobile?.diagramChanged();viewport.scrollLeft=left;viewport.scrollTop=top;
 if(value)mount.querySelector(`[${attribute}="${value}"]`)?.focus({preventScroll:true});
}
function updateSelection(){
 const info=inspectSelection(circuit,selection),box=$('#forge-inspection');box.replaceChildren();
 mobile?.selectionLabel(info);
 if(!info){selection=null;box.append(el('p','Choose a part from the list or select a terminal or wire in the diagram. Trace buttons reveal a conductive segment.'));}
 else {
  box.append(el('h4',info.heading),el('p',info.subtitle));
  if(info.kind==='component'){
   if(info.physicalWiring?.length){const heading=el('h5','Physical wiring'),list=el('dl');list.className='forge-wiring-list';for(const lead of info.physicalWiring){const row=el('div'),name=el('dt',lead.colour),detail=el('dd');detail.append(el('strong',lead.role),el('span','→ '+lead.destination),el('small',lead.termination));row.append(name,detail);list.append(row);}box.append(heading,list);}
   box.append(el('h5','Electrical role'));
   box.append(el('p',info.purpose));
   const terminals=el('details'),summary=el('summary','Inspect terminals'),list=el('ul');for(const t of info.terminals){const item=el('li'),button=el('button',t.label);button.type='button';button.addEventListener('click',()=>choose('terminal',t.ref));item.append(button,document.createTextNode(' · '+(t.connections.length?t.connections.join(' · '):'No external wire')));list.append(item);}terminals.append(summary,list);box.append(terminals);
  }else if(info.kind==='wire'){
   if(info.physicalData){const list=el('dl');list.className='forge-inspection-facts';for(const [label,value] of [['Role',info.physicalData.role],['Destination',info.physicalData.destination],['Termination',info.physicalData.termination],['Electrical path',info.physicalData.path]]){const term=el('dt',label),definition=el('dd',value);list.append(term,definition);}box.append(list);}
   box.append(el('p',info.summary));
   const trace=el('button','Trace complete electrical net');trace.type='button';trace.addEventListener('click',()=>choose('terminal',info.ref));box.append(trace);
  }else{
   if(info.physical)box.append(el('p',info.physical));
   box.append(el('p',info.summary));
   const label=el('h5','Connections on this segment'),list=el('ul');for(const wire of info.connections){const item=el('li'),button=el('button',wire.description);button.type='button';button.addEventListener('click',()=>choose('wire',wire.id));item.append(button);list.append(item);}box.append(label,list);
   if(info.contacts.length){box.append(el('h5','Closed switch contacts'));const contacts=el('ul');for(const text of info.contacts)contacts.append(el('li',text));box.append(contacts);}
   const terminals=el('details'),summary=el('summary','Terminal references ('+info.references.length+')'),refs=el('ul');for(const ref of info.references)refs.append(el('li',terminalName(circuit,ref)));terminals.append(summary,refs);box.append(terminals);
  }
 }
 for(const button of document.querySelectorAll('#forge-parts button'))button.setAttribute('aria-pressed',String(selection?.kind==='component'&&button.dataset.part===selection.id));
 for(const button of document.querySelectorAll('[data-trace]'))button.setAttribute('aria-pressed',String(selection?.kind==='terminal'&&button.dataset.trace===selection.ref));
 paint();
 updateLabSelection();
}
function updateLabSelection(){
 const target=selection?.kind==='component'?selection.id:selection?.kind==='wire'?circuit.connections.find(w=>w.id===selection.id)?.from.split('.')[0]:selection?.ref?.split('.')[0];
 const element=target&&responseComponent(circuit,target),box=$('#forge-response-selection');
 box.textContent=element?`${element.label} is a ${element.role==='bleed'?'treble bleed element':element.role+' control'} in the ${element.channel} circuit.${element.channel===circuit.state.position?' It affects the displayed response.':' Select that pickup alone to analyse it.'}`:selection?'This selection has no direct role in the supported response model.':'';
}
function renderLab(){
 const report=forgeResponse(circuit),context=$('#forge-response-context'),graph=$('#forge-response-graph'),controls=$('#forge-response-controls'),key=$('#forge-response-key'),assumptions=$('#forge-response-assumptions'),actions=$('#forge-response-actions');
 for(const button of document.querySelectorAll("[data-lab-pickup]"))button.setAttribute("aria-pressed",String(button.dataset.labPickup===circuit.state.position));
 graph.replaceChildren();assumptions.replaceChildren();controls.hidden=!report.supported;key.hidden=!report.supported;key.querySelector('.forge-response-reference').hidden=!report.reference;key.querySelector('.forge-response-current').textContent=report.reference?'Current circuit · with treble bleed':'Current circuit';
 $('#forge-response-lab').classList.toggle('is-unsupported',!report.supported);
 actions.hidden=report.supported||circuit.state.wiring!=='modern'||circuit.state.position!=='both';
 assumptions.closest('details').hidden=!report.supported;
 $('#forge-response-lab .forge-response-explanation').textContent=report.supported?'What changes?':'Response unavailable for this circuit state';
 if(!report.supported){context.textContent=circuit.state.wiring==='modern'?'MODEL LIMIT · SELECTOR':'MODEL LIMIT · WIRING';$('#forge-response-summary').textContent=report.reason;return;}
 context.textContent=`${report.channel.toUpperCase()} PICKUP · Modern wiring · ${report.bleed} · ${report.state.toneCap/1000} µF tone capacitor`;
 for(const [name,keyName] of [['volume','volume'],['tone','tonePosition']]){const input=$('#forge-response-'+name),value=report.state[keyName];input.value=value;$('#forge-response-'+name+'-value').textContent=value.toFixed(1)+' / 10';}
 graph.append(responseGraph(report,{compact:mobile?.isMobile}));$('#forge-response-summary').textContent=report.summary;
 for(const line of report.assumptions)assumptions.append(el('li',line));
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
function render(resetControls=false){
 try{
  const choices=Object.fromEntries(['wiring','bleed','neckCap','bridgeCap','position','neckProfile','bridgeProfile'].map(key=>[key,form.elements.namedItem(key).value]));
  const previous=circuit,result=forgeCircuit(choices,resetControls?defaultControls:circuit?.state.controlPositions||defaultControls);circuit=result.circuit;
  if(selection&&!inspectSelection(circuit,selection))selection=null;
  form.elements.bleed.disabled=choices.wiring==='50s';$('#forge-kit').href=result.kitURL;$('#forge-kit').hidden=!result.kitURL;
  $('#forge-loading-help').hidden=true;
  $('#forge-status').textContent=`${choices.wiring==='50s'?'50s':choices.wiring==='60s'?'60s':'Modern'} wiring · ${choices.position} selector`;
  updateInventory();updateSelector();updateChanges(previous);updateSelection();renderLab();
  return true;
 }catch(error){$('#forge-loading-help').hidden=true;
  $('#forge-status').textContent='Unsupported circuit choice: '+error.message;return false;}
}
form.addEventListener('change',event=>{if(event.target.name==='wiring'&&event.target.value==='50s')form.elements.bleed.value='none';render();});
for(const channel of ['neck','bridge']){const select=form.elements.namedItem(channel+'Profile');for(const [id,profile] of Object.entries(pickupConventions)){const option=el('option',profile.label);option.value=id;select.append(option);}}
form.addEventListener('reset',()=>setTimeout(()=>{selection=null;render(true);},0));
for(const name of ['volume','tone'])$('#forge-response-'+name).addEventListener('input',event=>{
 const channel=circuit?.state.position;if(!['neck','bridge'].includes(channel))return;
 circuit.state.controlPositions[channel][name]=Number(event.target.value);renderLab();
});
mount.addEventListener('click',event=>{const target=event.target.closest('[data-terminal],[data-wire],[data-component]');if(!target)return;if(target.dataset.terminal)choose('terminal',target.dataset.terminal);else if(target.dataset.wire)choose('wire',target.dataset.wire);else choose('component',target.dataset.component);});
mount.addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key))return;const target=event.target.closest('[data-terminal],[data-wire],[data-component]');if(target){event.preventDefault();target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
$('#forge-clear').addEventListener('click',()=>{selection=null;updateSelection();});
for(const button of document.querySelectorAll('[data-role-view]'))button.addEventListener('click',()=>{
 roleView=button.dataset.roleView;
 for(const option of document.querySelectorAll('[data-role-view]'))option.setAttribute('aria-pressed',String(option===button));
 paint();
});
for(const button of document.querySelectorAll('[data-trace]'))button.addEventListener('click',()=>choose('terminal',button.dataset.trace));
for(const button of document.querySelectorAll('[data-forge-mode]'))button.addEventListener('click',()=>setWorkspaceMode(button.dataset.forgeMode));
for(const button of document.querySelectorAll('[data-analyse],[data-lab-pickup]'))button.addEventListener('click',()=>{
 form.querySelector(`input[name="position"][value="${button.dataset.analyse||button.dataset.labPickup}"]`).click();
});
mobile=setupMobileWorkbench({mount,viewport,onChoose:choose,onLayoutChange:()=>{if(circuit)renderLab();}});
if(render())window.__forgeEntry?.ready();else window.__forgeEntry?.fail();

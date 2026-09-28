import {forgeCircuit} from './model.mjs';
import {forgeDiagram,pathDetails,circuitChanges,visualCrossings} from './presentation.mjs';
import {endpoint,inspectComponent} from '../wiring-generator/model.mjs';

const $=selector=>document.querySelector(selector),form=$('#forge-controls'),mount=$('#forge-diagram'),status=$('#forge-status'),inspection=$('#forge-inspection'),kit=$('#forge-kit'),parts=$('#forge-parts'),facts=$('#forge-facts'),change=$('#forge-change');
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
let circuit,selection;
function paint(){
 const active=document.activeElement,attribute=['data-terminal','data-wire','data-component'].find(name=>active?.hasAttribute?.(name)),value=attribute&&active.getAttribute(attribute);
 const viewport=$('#forge-viewport'),left=viewport.scrollLeft,top=viewport.scrollTop;
 mount.innerHTML=forgeDiagram(circuit,{selection});viewport.scrollLeft=left;viewport.scrollTop=top;
 if(value)mount.querySelector(`[${attribute}="${value}"]`)?.focus({preventScroll:true});
}
function showParts(){
 parts.replaceChildren();
 for(const component of circuit.components){const item=el('li'),button=el('button',component.label+' · '+component.value);button.type='button';button.addEventListener('click',()=>inspectComponentId(component.id));item.append(button);parts.append(item);}
 const junctions=circuit.components.flatMap(part=>Object.keys(part.terminals).map(key=>part.id+'.'+key)).filter(ref=>circuit.connections.filter(w=>w.from===ref||w.to===ref).length>1).length;
 facts.textContent=`${circuit.components.length} components · ${circuit.connections.length} external connections · ${junctions} shared-terminal junctions · ${visualCrossings(circuit).length} separated crossings`;
 $('#forge-contacts').textContent='Closed selector contacts: '+circuit.contacts.map(([a,b])=>endpoint(circuit,a).terminal.label+' ↔ '+endpoint(circuit,b).terminal.label).join('; ')+'.';
}
function showPath(reference){
 const detail=pathDetails(circuit,reference),origin=endpoint(circuit,reference);
 selection={kind:'path',refs:detail.references};
 inspection.replaceChildren(el('h4',origin.component.label+' / '+origin.terminal.label),el('p',`${detail.wires.length} connected external wires; ${detail.contacts.length} closed selector contacts on this conductive path.`));
 const list=el('ul');for(const ref of detail.references){const part=endpoint(circuit,ref);list.append(el('li',part.component.label+' / '+part.terminal.label));}inspection.append(list,el('p','The trace follows conductive wires and closed switch contacts. It does not treat pot resistance, capacitors, resistors or crossings as shorts.'));
 paint();
}
function inspectComponentId(id){
 const detail=inspectComponent(circuit,id);selection={kind:'component',id};
 inspection.replaceChildren(el('h4',detail.label),el('p',detail.value));
 const list=el('ul');for(const terminal of detail.terminals){const item=el('li'),button=el('button','Trace '+terminal.label);button.type='button';button.addEventListener('click',()=>showPath(terminal.ref));item.append(button,document.createTextNode(' · '+(terminal.connections.join(' · ')||'No external wire')));list.append(item);}inspection.append(list);
 paint();
}
function render(){
 try{
  const choices=Object.fromEntries(['wiring','bleed','neckCap','bridgeCap','position'].map(key=>[key,form.elements.namedItem(key).value]));
  const previous=circuit,result=forgeCircuit(choices);circuit=result.circuit;selection=null;
  form.elements.bleed.disabled=choices.wiring==='50s';kit.href=result.kitURL;kit.hidden=!result.kitURL;
  const changes=circuitChanges(previous,circuit);change.textContent=!previous?'Starting Les Paul circuit loaded.':changes.length?`${changes.length} connection${changes.length===1?'':'s'} changed: `+changes.map(({id,from,to})=>id+': '+(from||'added')+' → '+(to||'removed')).join(' · '):'Component values or selector state changed; external wire endpoints are unchanged.';
  status.textContent='Circuit updated. Choose a part or a wire to inspect its connections.';
  inspection.textContent='Choose a part, terminal or wire in the diagram. The selector position changes which internal contacts are closed.';
  showParts();paint();
 }catch(error){status.textContent=error.message;}
}
form.addEventListener('change',event=>{if(event.target.name==='wiring'&&event.target.value==='50s')form.elements.bleed.value='none';render();});
form.addEventListener('reset',()=>setTimeout(render,0));
mount.addEventListener('click',event=>{const target=event.target.closest('[data-terminal],[data-wire],[data-component]');if(!target)return;if(target.dataset.terminal)showPath(target.dataset.terminal);else if(target.dataset.wire){const wire=circuit.connections.find(w=>w.id===target.dataset.wire);showPath(wire.from);}else inspectComponentId(target.dataset.component);});
mount.addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key))return;const target=event.target.closest('[data-terminal],[data-wire],[data-component]');if(target){event.preventDefault();target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
$('#forge-clear').addEventListener('click',()=>{selection=null;inspection.textContent='Choose a part, terminal or wire in the diagram.';paint();});
for(const [button,reference] of [['forge-trace-neck','neckPickup.hot'],['forge-trace-bridge','bridgePickup.hot'],['forge-trace-output','jack.tip'],['forge-trace-ground','jack.sleeve']])$('#'+button).addEventListener('click',()=>showPath(reference));
render();

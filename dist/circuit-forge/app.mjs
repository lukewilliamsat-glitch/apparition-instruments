import {forgeCircuit,connectionPath,terminalPath} from './model.mjs';
import {drawCircuit} from '../wiring-generator/render.mjs';
import {endpoint,inspectComponent} from '../wiring-generator/model.mjs';

const form=document.querySelector('#forge-controls'),mount=document.querySelector('#forge-diagram'),status=document.querySelector('#forge-status'),inspection=document.querySelector('#forge-inspection'),kit=document.querySelector('#forge-kit');
let circuit,selection;
function paint(){mount.innerHTML=drawCircuit(circuit,{selection});}
function render(){
 try{
  const choices=Object.fromEntries(['wiring','bleed','neckCap','bridgeCap','position'].map(key=>[key,form.elements.namedItem(key).value]));
  const result=forgeCircuit(choices);circuit=result.circuit;selection=null;
  const restricted=choices.wiring==='50s';form.elements.bleed.disabled=restricted;
  status.textContent='Circuit updated. Select a component, terminal or connection to inspect it.';
  inspection.textContent='Choose a part or connection in the diagram to inspect its electrical path.';
  kit.href=result.kitURL;kit.hidden=!result.kitURL;
  paint();
 }catch(error){status.textContent=error.message;}
}
function inspect(target){
 const ref=target.dataset.terminal,id=target.dataset.wire||target.dataset.component;
 if(ref){const part=endpoint(circuit,ref);const refs=terminalPath(circuit,ref);selection={kind:'wire',id:circuit.connections.find(w=>w.from===ref||w.to===ref)?.id||''};inspection.textContent=part.component.label+' / '+part.terminal.label+' · Conductive path: '+refs.join(' · ');}
 else if(target.dataset.wire){const wire=circuit.connections.find(w=>w.id===id);selection={kind:'wire',id};inspection.textContent=wire.from+' → '+wire.to+' · Conductive path: '+connectionPath(circuit,id).join(' · ');}
 else {const info=inspectComponent(circuit,id);selection={kind:'component',id};inspection.textContent=info.label+' · '+info.value+'. '+info.terminals.map(t=>t.label+': '+(t.connections.join(', ')||'no external wire')).join(' · ');}
 paint();
}
form.addEventListener('change',event=>{
 if(event.target.name==='wiring'&&event.target.value==='50s')form.elements.bleed.value='none';
 render();
});
form.addEventListener('reset',()=>setTimeout(render,0));
mount.addEventListener('click',event=>{const target=event.target.closest('[data-terminal],[data-wire],[data-component]');if(target)inspect(target);});
mount.addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key))return;const target=event.target.closest('[data-terminal],[data-wire],[data-component]');if(target){event.preventDefault();inspect(target);}});
render();

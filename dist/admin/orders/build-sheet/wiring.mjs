import {validateCircuit} from '../../../wiring-generator/model.mjs';
import {drawCircuit} from '../../../wiring-generator/render.mjs';
import {el,definition} from '../view.mjs';
import {browserProductionStore} from './production.mjs';
export function savedDiagram(context){
 try{const d=context.snapshot.diagram,c=structuredClone(d?.circuit);if(d?.schemaVersion!==1||c?.state?.guitar!=='les-paul'||c.state.wiring!==context.snapshot.configuration.wiring)throw Error();validateCircuit(c);return drawCircuit(c,{exporting:true,view:'full'});}catch{return null;}
}
export function mountWiring(root,context){
 const section=el('section',null,'sheet-section wiring-section');section.append(el('h2','Wiring & Assembly'));
 const s=context.snapshot,t=s.template||{};
 section.append(definition([['Platform',s.kitName],['Control arrangement',t.volumeControls+' volume / '+t.toneControls+' tone'],['Wiring style',s.specification.wiring],['Treble bleed',s.specification.bleed],['Selector',s.specification.selector],['Output jack',s.specification.jack]]));
 section.append(el('p','Complete installation circuit from the saved purchase. Pickups and existing hardware may be required but are not necessarily supplied. Follow the component pick list for kit contents.','sheet-note'));
 const svg=savedDiagram(context);
 if(svg){const frame=el('div',null,'build-diagram');frame.setAttribute('aria-label','Saved order wiring diagram, complete circuit');frame.innerHTML=svg;section.append(frame);section.append(el('p','Rear control view. Confirm the exact pickup conductor convention and physical terminal orientation before soldering.','sheet-note'));}
 else section.append(el('p','CUSTOM / UNSUPPORTED DIAGRAM CONFIGURATION. Manual wiring verification required.','admin-warning'));
 const store=browserProductionStore(),form=el('form',null,'production-form'),label=el('label','Assembly notes'),notes=el('textarea');notes.rows=5;notes.value=store.get(context).assemblyNotes||'';label.append(notes);const save=el('button','Save assembly notes','admin-button'),message=el('p');message.setAttribute('role','status');form.append(label,save,message);let dirty=false;
 notes.addEventListener('input',()=>{dirty=true;form.dataset.dirty='true';message.textContent='Unsaved assembly notes.';});window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 form.addEventListener('submit',async e=>{e.preventDefault();save.disabled=true;try{await store.update(context,r=>{r.assemblyNotes=notes.value;});dirty=false;form.dataset.dirty='false';message.textContent='Assembly notes saved.';}catch(error){message.textContent=error.message;}finally{save.disabled=false;}});
 section.append(form);root.append(section);
}

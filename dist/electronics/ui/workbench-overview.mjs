import {selectorContext} from '../../wiring-generator/explanation.mjs';
import {layoutInfo} from '../../wiring-generator/model.mjs';
import {humbuckerCoilState} from '../switching/coils.mjs';
// Reads existing connectivity and control assignments; no presentation-only state.
export function workbenchOverview(circuit){
 if(!layoutInfo[circuit.state.guitar])return {identity:'Circuit configuration',rows:[['Status','Choose a supported circuit to inspect its connections.']]};
 const context=selectorContext(circuit),pickups=circuit.components.filter(p=>['singlecoil','humbucker','p90'].includes(p.type));
 const active=pickups.filter(p=>context.active.includes(p.label)).map(p=>p.label+(p.coils?' · '+(humbuckerCoilState(circuit,p.id).mode==='coil-A'?'Coil A split':'full series'):''));
 const states=circuit.components.filter(p=>p.type==='dpdt').map(p=>p.assemblyLabel||circuit.components.find(h=>h.id===p.mechanicalHost)?.label).map((host,n)=>host+' · '+circuit.components.filter(p=>p.type==='dpdt')[n].position.toUpperCase());
 const controls=circuit.components.filter(p=>p.role==='tone').map(p=>p.label+(p.assignments?.length?' → '+p.assignments.join(' + '):''));
 return {identity:layoutInfo[circuit.state.guitar].label+' · '+circuit.state.wiring+' wiring',rows:[['Selector',String(context.position).replace('Full bridge humbucker','Bridge')],['Participating pickups',active.join('; ')||'No pickup reaches the output'],...states.length?[['Push/pulls',states.join('; ')]]:[],['Tone controls',controls.join('; ')]]};
}
export function appendWorkbenchOverview(root,circuit){
 const doc=root.ownerDocument,make=(tag,text)=>{const n=doc.createElement(tag);n.textContent=text;return n;},overview=workbenchOverview(circuit),section=make('section','');section.className='bench-overview';section.setAttribute('aria-label','Current circuit overview');section.append(make('h4',overview.identity));const dl=make('dl','');for(const [key,value] of overview.rows){dl.append(make('dt',key),make('dd',value));}section.append(dl,make('p','Select a component, solder terminal or conductor for its role and destinations.'));root.append(section);
}

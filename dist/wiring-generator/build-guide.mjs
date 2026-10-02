// Workshop presentation projects existing graph + physical intent; adds no edges.
import {endpoint} from './model.mjs';
import {composePhysicalWiring,pickupProfile} from './physical.mjs';
import {conductorRoles} from './colours.mjs';
import {routeSemantics} from './routing.mjs';
export function terminalDescription(circuit,ref){const {component,terminal}=endpoint(circuit,ref),key=ref.split('.')[1];const profile=component.type==='humbucker'?pickupProfile(circuit,component.id):null;return {ref,component:component.id,label:component.label+' / '+terminal.label+(profile?' / '+profile.wires[key][1]+' · '+(terminal.coilFunction||conductorRoles[key]):''),role:terminal.function||terminal.coilFunction||conductorRoles[key]||terminal.label,connections:circuit.connections.filter(w=>w.from===ref||w.to===ref).map(w=>({id:w.id,destination:w.from===ref?w.to:w.from})),contacts:circuit.contacts.filter(pair=>pair.includes(ref)).map(pair=>pair.find(r=>r!==ref))};}
export function workshopGuide(circuit){
 const physical=composePhysicalWiring(circuit),semantics=routeSemantics(circuit);
 const connections=circuit.connections.map(w=>{const intent=physical.conductors.get(w.id),from=terminalDescription(circuit,w.from),to=terminalDescription(circuit,w.to),shared=[w.from,w.to].filter(ref=>physical.terminations.get(ref).length>1),casings=[w.from,w.to].filter(ref=>physical.solderPoints.has(ref));
 const purpose=semantics.get(w.id).role;
 const method=intent.kind==='local-series'&&circuit.state.switching?.some(m=>m.pickup==='both'||w.from.startsWith(m.pickup+'Pickup.'))?'Join both series leads and insulate exposed metal. Carry this junction to the listed DPDT common. UP grounds it through the corresponding throw 2.':intent.kind==='local-series'?'Join '+intent.seriesColours.join(' + ')+' together and insulate this series joint; it is not a ground connection.':casings.length?'Make the indicated casing solder connection.':'Connect the indicated physical terminals.';
 return {id:w.id,from:w.from,to:w.to,fromLabel:from.label,toLabel:to.label,purpose,kind:intent.kind,method,shared,casings,conductor:intent.colour};});
 const groupOf=row=>row.kind==='local-series'||row.kind.startsWith('pickup-')||circuit.components.find(p=>p.id===row.from.split('.')[0])?.type==='singlecoil'?'Pickup leads':row.purpose==='ground'?'Ground / shield':row.purpose==='auxiliary'?'Treble bleed':row.purpose==='tone'?'Tone controls':row.from.startsWith('jack.')||row.to.startsWith('jack.')?'Output jack':row.from.startsWith('selector.')||row.to.startsWith('selector.')?'Selector / control outputs':'Control connections';
 const sequence=['Pickup leads','Control connections','Treble bleed','Tone controls','Selector / control outputs','Output jack','Ground / shield'];
 const groups=sequence.map(label=>({label,connections:connections.filter(row=>groupOf(row)===label)})).filter(g=>g.connections.length);
 const grouped=new Map();for(const part of circuit.components){const key=JSON.stringify([part.type,part.role||'',part.value||'',!!part.existing]);if(!grouped.has(key))grouped.set(key,{type:part.type,role:part.role||part.type,value:part.value||part.label,quantity:0,existing:!!part.existing,ids:[]});const row=grouped.get(key);row.quantity++;row.ids.push(part.id);}
 const pickups=circuit.components.filter(p=>p.type==='humbucker').map(part=>({id:part.id,label:part.label,profile:pickupProfile(circuit,part.id),leads:Object.keys(part.terminals).map(key=>terminalDescription(circuit,part.id+'.'+key))}));
 return {connections,groups,parts:[...grouped.values()],pickups,contacts:circuit.contacts.map(([from,to])=>({from,to,fromLabel:terminalDescription(circuit,from).label,toLabel:terminalDescription(circuit,to).label})),physical};
}

import {dpdtTerminals,dpdtContacts} from './devices.mjs';
import {seriesCoils} from './coils.mjs';
// Applies wiring to the existing circuit; mechanical association owns no contacts.
export function applySwitching(circuit){
 if(!['hss','hsh','hh'].includes(circuit.state.guitar)&&!circuit.state.switching)return circuit;
 circuit.elements=[];
 for(const pickup of circuit.components.filter(part=>part.type==='humbucker')){
 const elements=seriesCoils(pickup.id);circuit.elements.push(...elements);pickup.coils=elements.map(element=>element.id);
 const functions={hot:'coilAStart',linkA:'coilAFinish',linkB:'coilBStart',ground:'coilBFinish',shield:'shield'};const names={hot:'Coil A start / hot',linkA:'Coil A finish / series junction',linkB:'Coil B start / series junction',ground:'Coil B finish / return',shield:'Separate shield'};pickup.terminals=Object.fromEntries(Object.entries(pickup.terminals).map(([key,t])=>[key,{...t,label:names[key],coilFunction:functions[key]}]));
 }
 // Physical clearance only: reserve volume lug escapes before the attached housing.
 if(['hss','hsh'].includes(circuit.state.guitar)&&circuit.state.switching){const tone=circuit.components.find(p=>p.id==='middleTone');if(tone)tone.y=1000;}
 for(const modifier of circuit.state.switching||[]){
  if(modifier.pickup==='both'){
  const host=circuit.components.find(p=>p.id==='neckTone');host.physicalControl='push-pull';host.associatedSwitch=modifier.id;
  circuit.components.push({id:modifier.id,type:'dpdt',label:'SHARED TONE PUSH/PULL DPDT',value:modifier.position.toUpperCase()+' · A: neck / B: bridge split',x:host.x,y:host.y+225,terminals:dpdtTerminals,mechanicalHost:host.id,actuator:'push-pull',position:modifier.position,usedPoles:['A','B'],function:'coil-split',pickup:'both'});
  for(const [pole,ch] of [['A','neck'],['B','bridge']])circuit.connections.push({id:modifier.id+ch+'Junction',from:ch+'Pickup.linkA',to:modifier.id+'.'+pole+'C',category:'switching',route:[],conductor:'linkA'},{id:modifier.id+ch+'Ground',from:modifier.id+'.'+pole+'2',to:host.id+'.case',category:'ground',route:[]});
  circuit.contacts.push(...dpdtContacts(modifier.id,modifier.position));continue;
 }
  const pickup=circuit.components.find(part=>part.id===modifier.pickup+'Pickup');
  const host=circuit.components.find(part=>part.id===modifier.host&&part.type==='pot');
  if(!host)throw Error('Push/pull host is unavailable.');
  host.physicalControl='push-pull';host.associatedSwitch=modifier.id;
  circuit.components.push({id:modifier.id,type:'dpdt',label:modifier.pickup.toUpperCase()+' PUSH/PULL DPDT',value:modifier.position.toUpperCase()+' · Pole A split / Pole B unused',x:host.x,y:host.y+(circuit.state.guitar==='hss'?335:225),terminals:dpdtTerminals,mechanicalHost:host.id,actuator:modifier.actuator,position:modifier.position,usedPoles:['A'],function:modifier.function,pickup:modifier.pickup});
  circuit.connections.push({id:modifier.id+'Junction',from:pickup.id+'.linkA',to:modifier.id+'.AC',category:'switching',route:[],conductor:'linkA'},
   {id:modifier.id+'Ground',from:modifier.id+'.A2',to:host.id+'.case',category:'ground',route:[]});
  circuit.contacts.push(...dpdtContacts(modifier.id,modifier.position));
 }
 return circuit;
}

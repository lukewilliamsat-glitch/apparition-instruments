import {dpdtTerminals,dpdtContacts} from './devices.mjs';
import {seriesCoils} from './coils.mjs';
// Applies wiring to the existing circuit; mechanical association owns no contacts.
export function applySwitching(circuit){
 if(circuit.state.guitar!=='hss')return circuit;
 const pickup=circuit.components.find(part=>part.id==='bridgePickup');
 circuit.elements=seriesCoils(pickup.id);pickup.coils=circuit.elements.map(element=>element.id);
 const functions={hot:'coilAStart',linkA:'coilAFinish',linkB:'coilBStart',ground:'coilBFinish',shield:'shield'};const names={hot:'Coil A start / hot',linkA:'Coil A finish / series junction',linkB:'Coil B start / series junction',ground:'Coil B finish / return',shield:'Separate shield'};pickup.terminals=Object.fromEntries(Object.entries(pickup.terminals).map(([key,t])=>[key,{...t,label:names[key],coilFunction:functions[key]}]));
 for(const modifier of circuit.state.switching||[]){
  const host=circuit.components.find(part=>part.id===modifier.host&&part.type==='pot');
  if(!host)throw Error('Push/pull host is unavailable.');
  host.physicalControl='push-pull';host.associatedSwitch=modifier.id;
  circuit.components.push({id:modifier.id,type:'dpdt',label:'PUSH/PULL DPDT',value:modifier.position.toUpperCase()+' · Pole A split / Pole B unused',x:host.x,y:host.y+225,terminals:dpdtTerminals,mechanicalHost:host.id,actuator:modifier.actuator,position:modifier.position,usedPoles:['A'],function:modifier.function});
  circuit.connections.push({id:'bridgeSplitJunction',from:pickup.id+'.linkA',to:modifier.id+'.AC',category:'switching',route:[],conductor:'linkA'},
   {id:'bridgeSplitGround',from:modifier.id+'.A2',to:host.id+'.case',category:'ground',route:[]});
  circuit.contacts.push(...dpdtContacts(modifier.id,modifier.position));
 }
 return circuit;
}

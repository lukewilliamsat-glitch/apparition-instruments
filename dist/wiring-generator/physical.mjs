// Physical assembly is a projection of the authoritative terminal graph.
// It never adds conductive graph edges or changes switch/contact behaviour.
import {endpoint,net} from './model.mjs';
import {resolveConvention} from './colours.mjs';

export function pickupProfile(circuit,pickupId){
 const part=circuit.components.find(p=>p.id===pickupId);
 const id=circuit.state.pickupProfiles?.[part?.channel]||circuit.state.colours||'generic';
 return resolveConvention(id);
}

export function composePhysicalWiring(circuit){
 const ground=net(circuit,'jack.sleeve');
 const terminations=new Map(),conductors=new Map();
 const attach=(ref,id)=>{if(!terminations.has(ref))terminations.set(ref,[]);terminations.get(ref).push(id);};
 for(const wire of circuit.connections){
  let kind='conductor',pickup=null,role=wire.conductor||null,join=null;
  const from=endpoint(circuit,wire.from),to=endpoint(circuit,wire.to);
  if(from.component.type==='humbucker'&&(role||wire.insulate)){
   pickup=from.component.id;
   kind=wire.insulate?'local-series':role==='ground'||role==='shield'?'pickup-ground':'pickup-hot';
   if(wire.insulate)role='linkA';
   if(kind==='pickup-ground'&&to.component.type==='pot'&&to.component.role==='volume'&&wire.to.endsWith('.case')&&ground.has(wire.to))join=wire.to;
  }else if(from.component.type==='pot'&&to.component.id===from.component.id&&wire.to.endsWith('.case')&&ground.has(wire.from))kind='local-casing-bond';
  else if(from.component.type==='pot'&&to.component.type==='pot'&&wire.from.endsWith('.case')&&wire.to.endsWith('.case')&&ground.has(wire.from)&&ground.has(wire.to))kind='ground-bus';
  else if(wire.category==='ground'&&ground.has(wire.from)&&ground.has(wire.to))kind='ground-harness-branch';
  const profile=pickup?pickupProfile(circuit,pickup):null;
  const physical={id:wire.id,from:wire.from,to:wire.to,kind,pickup,role,join,profile:profile?.label||null,colour:role?profile.wires[role][1]:null,seriesColours:kind==='local-series'?[profile.wires.linkA[1],profile.wires.linkB[1]]:null,net:[...net(circuit,wire.from)].sort()[0]};
  conductors.set(wire.id,physical);attach(wire.from,wire.id);attach(wire.to,wire.id);
 }
 return {conductors,terminations};
}

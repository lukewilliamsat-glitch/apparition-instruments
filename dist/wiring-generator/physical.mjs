// Physical assembly is a projection of the authoritative terminal graph.
// It never adds conductive graph edges or changes switch/contact behaviour.
import {endpoint} from './model.mjs';
import {conductiveIndex} from '../electronics/circuit-connectivity.mjs';
import {resolveConvention} from './colours.mjs';

export function pickupProfile(circuit,pickupId){
 const part=circuit.components.find(p=>p.id===pickupId);
 const id=circuit.state.pickupProfiles?.[part?.channel]||circuit.state.colours||'generic';
 const profile=resolveConvention(id);if(!part?.coils)return profile;
 const labels={hot:'COIL A START / HOT',linkA:'COIL A FINISH',linkB:'COIL B START',ground:'COIL B FINISH / RETURN',shield:'SEPARATE SHIELD'};return {...profile,label:id==='generic'?'Neutral four-conductor coil identities':profile.label,wires:Object.fromEntries(Object.entries(profile.wires).map(([key,wire])=>[key,[wire[0],id==='generic'?labels[key]:wire[1]+' · '+labels[key]]]))};
}

export function composePhysicalWiring(circuit){
 const connectivity=conductiveIndex(circuit),ground=connectivity.net('jack.sleeve');
 const terminations=new Map(),conductors=new Map();
 const attach=(ref,id)=>{if(!terminations.has(ref))terminations.set(ref,[]);terminations.get(ref).push(id);};
 for(const wire of circuit.connections){
  let kind='conductor',pickup=null,role=wire.conductor||null,join=null;
  const from=endpoint(circuit,wire.from),to=endpoint(circuit,wire.to);
  if(from.component.type==='humbucker'&&(role||wire.insulate)){
   pickup=from.component.id;
   kind=wire.insulate?'local-series':role?.startsWith('link')?'pickup-series-lead':role==='ground'||role==='shield'?'pickup-ground':'pickup-hot';
   if(wire.insulate)role='linkA';
   if(kind==='pickup-ground'&&to.component.type==='pot'&&to.component.role==='volume'&&wire.to.endsWith('.case')&&ground.has(wire.to))join=wire.to;
  }else if(from.component.type==='pot'&&to.component.id===from.component.id&&wire.to.endsWith('.case')&&ground.has(wire.from))kind='local-casing-bond';
  else if(from.component.type==='pot'&&to.component.type==='pot'&&wire.from.endsWith('.case')&&wire.to.endsWith('.case')&&ground.has(wire.from)&&ground.has(wire.to))kind='ground-bus';
  else if(wire.category==='ground'&&ground.has(wire.from)&&ground.has(wire.to))kind='ground-harness-branch';
  const profile=pickup?pickupProfile(circuit,pickup):null;
  const physical={id:wire.id,from:wire.from,to:wire.to,kind,pickup,role,join,profile:profile?.label||null,colour:role?profile.wires[role][1]:null,seriesColours:kind==='local-series'?[profile.wires.linkA[1],profile.wires.linkB[1]]:null,net:connectivity.canonical(wire.from)};
  conductors.set(wire.id,physical);attach(wire.from,wire.id);attach(wire.to,wire.id);
 }
 const solderPoints=new Map();
 for(const [ref,ids] of terminations){
  const {component,terminal}=endpoint(circuit,ref);
  if(component.type!=='pot'||terminal!==component.terminals.case||!ref.endsWith('.case'))continue;
  const wires=ids.map(id=>conductors.get(id));
  solderPoints.set(ref,{ref,kind:'casing-solder',conductors:[...ids],pickupLeads:wires.filter(w=>w.kind==='pickup-ground').map(w=>w.id),localBonds:wires.filter(w=>w.kind==='local-casing-bond').map(w=>w.id),shared:ids.length>1});
 }
 return {conductors,terminations,solderPoints};
}

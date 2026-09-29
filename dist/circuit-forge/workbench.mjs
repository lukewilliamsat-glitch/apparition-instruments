import {endpoint,inspectComponent,net} from '../wiring-generator/model.mjs';
import {pathDetails,circuitChanges} from '../wiring-generator/inspection.mjs';
import {composePhysicalWiring,pickupProfile} from '../wiring-generator/physical.mjs';

export const terminalName=(circuit,ref)=>{const {component,terminal}=endpoint(circuit,ref);return `${component.label} / ${terminal.label}`;};
function componentRole(part){
 const connected=key=>part.terminals.find(t=>t.ref.endsWith('.'+key))?.connections.length>0;
 if(part.type==='pot'&&part.role==='volume')return connected('lug2')?'Its wiper has an external connection toward the selector or output. The resistive track itself is not drawn as a wire.':'Volume control with no external wiper connection.';
 if(part.type==='pot'&&part.role==='tone')return 'The tone control connects through the capacitor network. Its resistive track is not an ideal wire.';
 if(part.type==='capacitor')return 'A capacitor between its two leads; the leads are not directly joined in a conductive trace.';
 if(part.type==='resistor')return 'A resistor between its two leads; this trace does not treat its resistance as a wire.';
 if(part.type==='toggle')return 'The selector joins only the contacts closed in the current position.';
 if(part.type==='humbucker')return 'Pickup leads connect to the circuit, but the pickup coils are not shorted together in a wire trace.';
 if(part.type==='jack')return 'The tip is the output signal and the sleeve is the ground connection.';
 return 'Inspect its terminals to see the external connections in this circuit.';
}
export function selectorReport(circuit){
 const output=net(circuit,'jack.tip');
 const channels=[['Neck','neckVolume.lug2'],['Bridge','bridgeVolume.lug2']].map(([label,ref])=>({label,active:output.has(ref),ref}));
 const closed=circuit.contacts.map(([a,b])=>({a,b,description:`${terminalName(circuit,a)} to ${terminalName(circuit,b)}`}));
 return {channels,closed,description:channels.filter(x=>x.active).map(x=>x.label).join(' and ')+' volume output'+(channels.filter(x=>x.active).length===1?' is':'s are')+' connected to the jack through the selected switch contacts.'};
}
export function changeReport(previous,current){
 if(!previous)return {heading:'Circuit ready',lines:['The supported Les Paul circuit is ready to explore. Choose a component, connection or path.']};
 const lines=[];
 for(const change of circuitChanges(previous,current)){
  const old=previous.connections.find(x=>x.id===change.id),now=current.connections.find(x=>x.id===change.id);
  if(old&&now)lines.push(`${terminalName(previous,old.from)} to ${terminalName(previous,old.to)} changed to ${terminalName(current,now.from)} to ${terminalName(current,now.to)}.`);
  else if(now)lines.push(`Added ${terminalName(current,now.from)} to ${terminalName(current,now.to)}.`);
  else if(old)lines.push(`Removed ${terminalName(previous,old.from)} to ${terminalName(previous,old.to)}.`);
 }
 const before=new Map(previous.components.map(part=>[part.id,part]));
 for(const part of current.components){const old=before.get(part.id);if(!old)lines.push(`Added ${part.label} (${part.value}).`);else if(old.value!==part.value)lines.push(`${part.label} changed from ${old.value} to ${part.value}.`);}
 for(const part of previous.components)if(!current.components.some(x=>x.id===part.id))lines.push(`Removed ${part.label}.`);
 const prior=selectorReport(previous),next=selectorReport(current);
 if(prior.channels.map(x=>x.active).join(',')!==next.channels.map(x=>x.active).join(','))lines.push(`Selector now connects ${next.channels.filter(x=>x.active).map(x=>x.label).join(' and ')} volume output to the jack.`);
 for(const channel of ['neck','bridge'])if(previous.state.pickupProfiles?.[channel]!==current.state.pickupProfiles?.[channel])lines.push(`${channel==='neck'?'Neck':'Bridge'} pickup conductors now use ${pickupProfile(current,channel+'Pickup').label}. Circuit connections are unchanged.`);
 return {heading:lines.length?'What changed':'Circuit unchanged',lines:lines.length?lines:['The selected choices leave the circuit unchanged.']};
}
export function inspectSelection(circuit,selection){
 if(!selection)return null;
 if(selection.kind==='component'){
  const part=inspectComponent(circuit,selection.id);if(!part)return null;
  return {kind:'component',heading:part.label,subtitle:part.value||part.type||'',purpose:componentRole({...part,type:circuit.components.find(x=>x.id===selection.id).type,role:circuit.components.find(x=>x.id===selection.id).role}),terminals:part.terminals.map(t=>({...t,connected:t.connections.length>0})),component:part};
 }
 const physical=composePhysicalWiring(circuit);
 if(selection.kind==='wire'){
  const conductor=physical.conductors.get(selection.id);if(!conductor)return null;
  const profile=conductor.pickup?pickupProfile(circuit,conductor.pickup):null;
  const roleNames={hot:'Hot',linkA:'Series link A',linkB:'Series link B',ground:'Coil ground',shield:'Shield / drain'};
  const attached=conductor.join?physical.terminations.get(conductor.join).filter(id=>id!==conductor.id).map(id=>physical.conductors.get(id).colour||id):[];
  const destination=terminalName(circuit,conductor.to);
  const summary=conductor.kind==='local-series'?`Join ${conductor.seriesColours.join(' + ')} locally and insulate the connection.`:conductor.kind==='local-casing-bond'?'Bond this lug directly to its own casing.':`Physical termination: ${destination}.${attached?.length?' Shared solder point with '+attached.join(', ')+'.':''}`;
  const detail=pathDetails(circuit,conductor.from);
  return {kind:'wire',heading:conductor.seriesColours?.join(' + ')||conductor.colour||selection.id,subtitle:[conductor.pickup&&endpoint(circuit,conductor.from).component.label,profile?.label,conductor.kind==='local-series'?'Local series join':roleNames[conductor.role]].filter(Boolean).join(' · ')||'Physical conductor',physical:`${terminalName(circuit,conductor.from)} → ${destination}`,ref:conductor.from,summary,references:detail.references,connections:detail.wires.map(w=>({id:w.id,from:w.from,to:w.to,description:`${terminalName(circuit,w.from)} to ${terminalName(circuit,w.to)}`})),contacts:detail.contacts};
 }
 let ref=selection.ref,wire;
 if(!ref)return null;
 try{endpoint(circuit,ref);}catch{return null;}
 const detail=pathDetails(circuit,ref),members=new Set(detail.references),output=members.has('jack.tip');
 const connections=detail.wires.map(w=>({id:w.id,from:w.from,to:w.to,description:`${terminalName(circuit,w.from)} to ${terminalName(circuit,w.to)}`}));
 return {kind:selection.kind,heading:terminalName(circuit,ref),subtitle:'Conductive terminal path',physical:physical.terminations.get(ref)?.length>1?'Physical conductors at this solder point: '+physical.terminations.get(ref).map(id=>physical.conductors.get(id).colour||id).join(', '):null,ref,references:detail.references,connections,contacts:detail.contacts.map(([a,b])=>`${terminalName(circuit,a)} to ${terminalName(circuit,b)}`),output,summary:`${connections.length} external ${connections.length===1?'connection':'connections'} and ${detail.contacts.length} closed switch ${detail.contacts.length===1?'contact':'contacts'} in this conductive segment.${output?' This segment reaches the output jack.':''}`};
}
export function selectionHighlight(circuit,selection){
 const info=inspectSelection(circuit,selection);if(!info)return null;
 if(info.kind==='component')return {kind:'component',id:selection.id};
 if(info.kind==='wire')return {kind:'physical-wire',id:selection.id};
 return {kind:'path',refs:info.references};
}

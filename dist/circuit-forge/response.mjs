// Forge adapts its authoritative circuit and control state to the validated
// single-pickup response model. All electrical calculations remain shared.
import {resolveResponseAssumptions} from '../electronics/response/assumptions.mjs';
import {defaults,bleedSummary} from '../electronics/response/circuits.mjs';
import {frequencyResponse} from '../electronics/response/engine.mjs';
import {composeResponse} from '../electronics/response/analysis.mjs';

const number=value=>Number.parseFloat(value);
const component=(c,predicate)=>c.components.find(predicate);
const valueOf=(part,unit)=>{
 if(!part||!part.value)throw Error('Required '+unit+' component is unavailable.');
 const value=number(part.value);if(!Number.isFinite(value))throw Error('Unsupported '+unit+' component value.');
 return value;
};
const capacitance=part=>{
 const raw=part?.value||'',n=valueOf(part,'capacitor');
 if(/pF/i.test(raw))return n/1000;
 if(/nF/i.test(raw))return n;
 if(/µF|uF/i.test(raw))return n*1000;
 throw Error('Unsupported capacitor unit.');
};
export function responseComponent(circuit,partId){
 const part=circuit.components.find(p=>p.id===partId);
 if(!part)return null;
 const bleed=part.type==='capacitor'||part.type==='resistor'?circuit.connections.some(w=>w.network==='auxiliary'&&(w.from.startsWith(partId+'.')||w.to.startsWith(partId+'.'))):false;
 const role=part.role==='volume'?'volume':part.role==='tone'?'tone':bleed?'bleed':null;
 return role?{role,channel:part.channel,label:part.label}:null;
}
export function forgeResponse(circuit,count=201){
 const selected=circuit.state.position;
 if(circuit.state.wiring!=='modern')return {supported:false,reason:'This response model assumes Modern tone wiring. Choose Modern to analyse this circuit; 50s and 60s tone placement are not modelled here.'};
 if(selected==='both')return {supported:false,reason:'Both pickups: interaction requires the coupled pickup model and is not yet available in Signal Lab. Select Neck or Bridge to analyse one channel.'};
 if(!['neck','bridge'].includes(selected))return {supported:false,reason:'The selected pickup is outside this response model.'};
 try{
  const channel=selected,volume=component(circuit,p=>p.channel===channel&&p.role==='volume'),tone=component(circuit,p=>p.channel===channel&&p.role==='tone');
  const capWire=circuit.connections.find(w=>w.id===channel+'ToneCap');
  const toneCap=component(circuit,p=>p.id===capWire?.from.split('.')[0]&&p.type==='capacitor');
  const auxiliary=circuit.connections.filter(w=>w.network==='auxiliary'&&(w.from.startsWith(channel)||w.to.startsWith(channel)));
  const bleedCap=component(circuit,p=>p.channel===channel&&p.type==='capacitor'&&auxiliary.some(w=>w.from.startsWith(p.id+'.')||w.to.startsWith(p.id+'.')));
  const bleedResistor=component(circuit,p=>p.channel===channel&&p.type==='resistor'&&auxiliary.some(w=>w.from.startsWith(p.id+'.')||w.to.startsWith(p.id+'.')));
  const type=!bleedCap?'none':bleedResistor?'duncan':'capacitor';
  if((circuit.state.bleed==='none')!==!bleedCap)throw Error('Treble bleed topology is unavailable.');
  const controls=circuit.state.controlPositions?.[channel];if(!controls)throw Error('Control positions are unavailable.');
  const state={...resolveResponseAssumptions(circuit.state.responseAssumptions,channel),type,volume:controls.volume,tonePosition:controls.tone,volumePot:valueOf(volume,'volume pot'),tonePot:valueOf(tone,'tone pot'),toneCap:capacitance(toneCap),bleedC:bleedCap?capacitance(bleedCap):defaults.bleedC,bleedR:bleedResistor?valueOf(bleedResistor,'bleed resistor'):defaults.bleedR};
  const points=frequencyResponse(state,count),reference=type==='none'?null:frequencyResponse({...state,type:'none'},count);
  const summary=composeResponse({supported:true,channel,state,points,reference},{mode:type==='none'?'live':'ab'}).summary;
  return {supported:true,channel,state,points,reference,summary,bleed:bleedSummary(state),components:{volume:volume.id,tone:tone.id,toneCap:toneCap.id,bleed:[bleedCap?.id,bleedResistor?.id].filter(Boolean)},assumptions:[`Single pickup with a generic illustrative ${state.pickupR} kΩ / ${state.pickupL} H / ${state.pickupC} pF source; manufacturer conductor colour does not set pickup electrical parameters.`,`Modern tone control on the volume input; audio taper assumed for the ${state.volumePot} kΩ volume and ${state.tonePot} kΩ tone pots.`,`${state.loadR} MΩ input load and ${state.cableC} pF cable capacitance. Electrical voltage transfer relative to an ideal pickup source, 20 Hz–20 kHz.`,'Illustrative R/L/C assumptions, not measured pickups. Magnetic/string dynamics, pickup interaction, frequency-dependent pickup losses, exact taper and acoustic sound are not predicted. The physical pickup drawing does not change with source assumptions.']};
 }catch(error){return {supported:false,reason:error.message};}
}

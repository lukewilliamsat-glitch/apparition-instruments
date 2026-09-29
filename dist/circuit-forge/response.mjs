// Forge adapts its authoritative circuit and control state to the validated
// single-pickup response model. All electrical calculations remain shared.
import {defaults,bleedSummary} from '../electronics/response/circuits.mjs';
import {frequencyResponse} from '../electronics/response/engine.mjs';

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
 if(selected==='both')return {supported:false,reason:'Both pickups are selected. This V1 model cannot calculate their combined loading; choose Neck or Bridge to analyse one supported channel.'};
 if(!['neck','bridge'].includes(selected))return {supported:false,reason:'The selected pickup is outside this response model.'};
 if(circuit.state.wiring!=='modern')return {supported:false,reason:'This response model assumes Modern tone wiring. Choose Modern to analyse this circuit; 50s and 60s tone placement are not modelled here.'};
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
  const state={...defaults,type,volume:controls.volume,tonePosition:controls.tone,volumePot:valueOf(volume,'volume pot'),tonePot:valueOf(tone,'tone pot'),toneCap:capacitance(toneCap),bleedC:bleedCap?capacitance(bleedCap):defaults.bleedC,bleedR:bleedResistor?valueOf(bleedResistor,'bleed resistor'):defaults.bleedR};
  const points=frequencyResponse(state,count),reference=type==='none'?null:frequencyResponse({...state,type:'none'},count);
  const peak=points.find(p=>p.frequency>=5000)||points.at(-1),compare=reference&&reference.find(p=>p.frequency>=5000),difference=compare?peak.current-compare.current:null;
  const summary=state.volume===0?'Volume 0 mutes the modelled output.':reference?`At ${state.volume.toFixed(1)} / 10 volume, the selected network ${Math.abs(difference)<.1?'has less than 0.1 dB difference from':difference>0?'retains more output at roughly 5 kHz than':'has less output at roughly 5 kHz than'} the no-bleed reference${Math.abs(difference)<.1?'':` (${Math.abs(difference).toFixed(1)} dB)`}.`:`At ${state.volume.toFixed(1)} / 10 volume, no treble bleed is fitted. The model includes the tone control at ${state.tonePosition.toFixed(1)} / 10.`;
  return {supported:true,channel,state,points,reference,summary,bleed:bleedSummary(state),components:{volume:volume.id,tone:tone.id,toneCap:toneCap.id,bleed:[bleedCap?.id,bleedResistor?.id].filter(Boolean)},assumptions:[`Single pickup with a generic ${state.pickupR} kΩ / ${state.pickupL} H / ${state.pickupC} pF source; manufacturer conductor colour does not set pickup electrical parameters.`,`Modern tone control on the volume input; audio taper assumed for the ${state.volumePot} kΩ volume and ${state.tonePot} kΩ tone pots.`,`${state.loadR} MΩ input load and ${state.cableC} pF cable capacitance. Electrical voltage transfer relative to an ideal pickup source, 20 Hz–20 kHz.`,'Pickup interaction, exact taper, measured pickup values and acoustic sound are not predicted.']};
 }catch(error){return {supported:false,reason:error.message};}
}

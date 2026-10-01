// Reusable adapter: the Wiring Engine owns graphs, Signal Lab owns response.
import {makeCircuit} from '../../wiring-generator/model.mjs';
import {defaultResponseAssumptions} from '../response/assumptions.mjs';
import {normaliseInstrument,generatorConfiguration,instrumentCapabilities} from './configuration.mjs';
export function instrumentCircuitState(input){
 const instrument=normaliseInstrument(input),config=generatorConfiguration(instrument),controlPositions={},responseAssumptions=defaultResponseAssumptions();
 responseAssumptions.channels={};Object.assign(responseAssumptions,instrument.load);
 for(const p of instrument.pickups){const volume=instrument.controls.find(c=>c.role==='volume'&&c.assignments.includes(p.position)),tone=instrument.controls.find(c=>c.role==='tone'&&c.assignments.includes(p.position));controlPositions[p.position]={volume:volume.position,tone:tone?.position??10};responseAssumptions.channels[p.position]={pickup:p.assumption,volumePot:volume.pot,tonePot:tone?.pot??volume.pot};}
 return {version:2,instrument,configuration:config,controlPositions,responseAssumptions};
}
export function applyInstrumentValues(circuit,input){
 const state=instrumentCircuitState(input),i=state.instrument;
 circuit.state={...circuit.state,controlPositions:state.controlPositions,responseAssumptions:state.responseAssumptions,instrument:i};
 for(const control of i.controls){const id=control.id==='masterTone'?'neckTone':control.id;const part=circuit.components.find(c=>c.id===id);if(part)part.value=control.pot+'kΩ Audio';}
 return circuit;
}
export function makeInstrumentCircuit(input){
 const state=instrumentCircuitState(input),c=state.configuration?makeCircuit(state.configuration):{state:{guitar:'instrument',wiring:state.instrument.wiring,position:String(state.instrument.selector.selection),bleed:'none'},components:[],connections:[],contacts:[]};
 return applyInstrumentValues(c,state.instrument);
}
export function instrumentFromCircuit(circuit){
 const i=structuredClone(circuit.state.instrument);if(!i)return null;
 const config=circuit.state,selected=instrumentCapabilities(i).selected[0];
 if(config.guitar!=='instrument'){
  i.wiring=config.wiring;i.shielding=config.shielding;i.selector.selection=config.guitar==='les-paul'?{bridge:1,both:2,neck:3}[config.position]:Number(config.position);
  for(const p of i.pickups){const a=config.responseAssumptions?.channels[p.position];if(a)p.assumption=a.pickup;if(config.pickupProfiles?.[p.position])p.conductor=config.pickupProfiles[p.position];}
  for(const c of i.controls){const channel=c.assignments.includes(selected)?selected:c.assignments[0],a=config.responseAssumptions?.channels[channel],values=config.controlPositions?.[channel];if(a)c.pot=a[c.role+'Pot'];if(values)c.position=values[c.role];if(c.role==='volume')c.bleed=config.bleed;else c.capacitor=config.guitar==='les-paul'?config[c.assignments[0]+'Cap']:config.neckCap;}
  i.load={cableC:config.responseAssumptions.cableC,loadR:config.responseAssumptions.loadR};
 }
 return normaliseInstrument(i);
}

// Reusable adapter: the Wiring Engine owns graphs, Signal Lab owns response.
import {makeCircuit} from '../../wiring-generator/model.mjs';
import {defaultResponseAssumptions} from '../response/assumptions.mjs';
import {createReference,configureInstrumentDimensions,normaliseInstrument,generatorConfiguration,instrumentCapabilities} from './configuration.mjs';
export function instrumentCircuitState(input){
 const instrument=normaliseInstrument(input),config=generatorConfiguration(instrument),controlPositions={},responseAssumptions=defaultResponseAssumptions();
 responseAssumptions.channels={};Object.assign(responseAssumptions,instrument.load);
 for(const p of instrument.pickups){const volume=instrument.controls.find(c=>c.role==='volume'&&c.assignments.includes(p.position)),tone=instrument.controls.find(c=>c.role==='tone'&&c.assignments.includes(p.position));controlPositions[p.position]={volume:volume.position,tone:tone?.position??10};responseAssumptions.channels[p.position]={pickup:p.assumption,volumePot:volume.pot,tonePot:tone?.pot??volume.pot};}
 return {version:2,instrument,configuration:config,controlPositions,responseAssumptions};
}
export function applyInstrumentValues(circuit,input){
 return applyState(circuit,instrumentCircuitState(input));
}
function applyState(circuit,state){
 const i=state.instrument;
 circuit.state={...circuit.state,controlPositions:state.controlPositions,responseAssumptions:state.responseAssumptions,instrument:i};
 for(const control of i.controls){const id=control.id==='masterTone'?'neckTone':control.id;const part=circuit.components.find(c=>c.id===id);if(part)part.value=control.pot+'kΩ Audio';}
 return circuit;
}
export function makeInstrumentCircuit(input){
 const state=instrumentCircuitState(input),c=state.configuration?makeCircuit(state.configuration):{state:{guitar:'instrument',wiring:state.instrument.wiring,position:String(state.instrument.selector.selection),bleed:'none'},components:[],connections:[],contacts:[]};
 return applyState(c,state);
}
export function instrumentFromCircuit(circuit){
 const i=structuredClone(circuit.state.instrument);if(!i)return null;
 const config=circuit.state,selected=instrumentCapabilities(i).selected[0];
 if(config.guitar!=='instrument'){
  if(config.switching)i.switching=structuredClone(config.switching);else delete i.switching;
  i.wiring=config.wiring;i.shielding=config.shielding;i.selector.selection=['les-paul','sg'].includes(config.guitar)?{bridge:1,both:2,neck:3}[config.position]:Number(config.position);
  for(const p of i.pickups){const a=config.responseAssumptions?.channels[p.position];if(a)p.assumption=a.pickup;if(config.pickupProfiles?.[p.position]&&(p.conductor||config.pickupProfiles[p.position]!=='generic'))p.conductor=config.pickupProfiles[p.position];}
  for(const c of i.controls){const channel=c.assignments.includes(selected)?selected:c.assignments[0],a=config.responseAssumptions?.channels[channel],values=config.controlPositions?.[channel];if(a)c.pot=a[c.role+'Pot'];if(values)c.position=values[c.role];if(c.role==='volume')c.bleed=config.volumeBleeds?.[c.assignments[0]]??config.bleed;else c.capacitor=['les-paul','sg'].includes(config.guitar)?config[c.assignments[0]+'Cap']:config.neckCap;}
  i.load={cableC:config.responseAssumptions.cableC,loadR:config.responseAssumptions.loadR};
 }
 return normaliseInstrument(i);
}

// Inverse adapter for raw Generator links; shared instrument authority owns defaults.
export function instrumentFromGeneratorCircuit(circuit){
 if(!['hss','les-paul','sg','tele','strat','prs-se'].includes(circuit.state.guitar))throw Error('No instrument adapter for this generator circuit.');
 const config=circuit.state,hss=config.guitar==='hss',i=hss?configureInstrumentDimensions(createReference('hss'),{controlLayout:config.controlLayout}):['les-paul','sg'].includes(config.guitar)?configureInstrumentDimensions(createReference('les-paul'),{family:config.guitar}):createReference(config.guitar==='prs-se'?'prs-hh':config.guitar);
 i.selector.selection=['les-paul','sg'].includes(config.guitar)?{bridge:1,both:2,neck:3}[config.position]:Number(config.position);i.wiring=config.wiring;i.shielding=config.shielding;
 if(config.switching)i.switching=structuredClone(config.switching);
 for(const control of i.controls){const part=circuit.components.find(p=>p.id===(control.id==='masterTone'?'neckTone':control.id));control.pot=parseFloat(part.value);if(control.role==='tone')control.capacitor=['les-paul','sg'].includes(config.guitar)?config[control.assignments[0]+'Cap']:config.neckCap;else control.bleed=config.volumeBleeds?.[control.assignments[0]]??config.bleed;}
 for(const pickup of i.pickups){if(config.pickupProfiles?.[pickup.position])pickup.conductor=config.pickupProfiles[pickup.position];const a=config.responseAssumptions?.channels?.[pickup.position];if(a)pickup.assumption=a.pickup;}
 for(const control of i.controls){const positions=config.controlPositions?.[control.assignments[0]];if(positions)control.position=positions[control.role];}
 if(config.responseAssumptions)i.load={cableC:config.responseAssumptions.cableC,loadR:config.responseAssumptions.loadR};
 return normaliseInstrument(i);
}

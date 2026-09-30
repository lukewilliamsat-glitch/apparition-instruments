import assert from 'node:assert/strict';
import {forgeCircuit} from '../dist/circuit-forge/model.mjs';
import {forgeResponse} from '../dist/circuit-forge/response.mjs';
import {composeResponse,captureResponse,referenceDescription} from '../dist/electronics/response/analysis.mjs';
import {defaultResponseAssumptions,componentPresets,pickupPresets} from '../dist/electronics/response/assumptions.mjs';
import {frequencyResponse} from '../dist/electronics/response/engine.mjs';
const a=defaultResponseAssumptions(),get=(a,channel='neck',cap='0.022')=>forgeResponse(forgeCircuit({position:channel,neckCap:cap,bridgeCap:cap},undefined,a).circuit);
const base=get(a),frozen=captureResponse(base),points=JSON.stringify(frozen.points);
for(const key of Object.keys(componentPresets))for(const value of componentPresets[key]){
 const changed=structuredClone(a);if(['volumePot','tonePot'].includes(key))changed.channels.neck[key]=value;else changed[key]=value;
 const report=get(changed),c=composeResponse(report,{mode:'frozen',frozen,previous:base});
 assert.deepEqual(report.points,frequencyResponse(report.state,201));assert.equal(report.state[key],value);
 if(value!==base.state[key]){assert(c.comparedChanges.some(x=>x.key===key));assert.notDeepEqual(report.points,base.points);assert.match(c.explanation.why,/loading|load|Pot|pot|capacitance/);}
 const ab=composeResponse(report);assert.equal(ab.baseline.state[key],value);
 if(['volumePot','tonePot'].includes(key))assert.equal(get(changed,'bridge').state[key],500);
}
for(const preset of Object.keys(pickupPresets)){const changed=structuredClone(a);changed.channels.neck.pickup=preset;const report=get(changed);for(const key of ['pickupR','pickupL','pickupC'])assert.equal(report.state[key],pickupPresets[preset][key]);if(preset!=='generic'){const c=composeResponse(report,{mode:'frozen',frozen});assert.match(c.explanation.why,/Pickup/);assert.notDeepEqual(report.points,base.points);}assert.equal(get(changed,'bridge').state.pickupL,4.5);}
for(const cap of ['0.010','0.015','0.022','0.033','0.047'])assert.equal(get(a,'neck',cap).state.toneCap,Number(cap)*1000);
assert.equal(JSON.stringify(frozen.points),points);assert.match(referenceDescription(frozen),/Pots 500\/500 kΩ.*Cable 500 pF.*Input 1 MΩ.*Pickup 8.2 kΩ \/ 4.5 H/);
const modified=structuredClone(a);modified.channels.neck.volumePot=250;const circuit=forgeCircuit({position:'neck'},undefined,modified);assert.equal(circuit.circuit.components.find(x=>x.id==='neckVolume').value,'250kΩ Audio');assert.equal(circuit.kitURL,null,'unsupported commercial assumptions do not produce an inaccurate kit handoff');
assert.equal(forgeResponse(forgeCircuit({position:'both'},undefined,modified).circuit).supported,false);
assert.throws(()=>{const invalid=structuredClone(a);invalid.channels.neck.pickup='manufacturer';get(invalid);});
console.log('V2.1: engine parity, pots, caps, cable/load, explicit pickup presets, channel isolation, frozen metadata and causal derivation PASS');

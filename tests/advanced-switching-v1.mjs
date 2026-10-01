import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {dpdtContacts,dpdtTerminals,bridgeSplitModifier} from '../dist/electronics/switching/devices.mjs';
import {humbuckerCoilState} from '../dist/electronics/switching/coils.mjs';
import {createReference,configureInstrumentDimensions,instrumentCapabilities,normaliseInstrument} from '../dist/electronics/instrument/configuration.mjs';
import {makeInstrumentCircuit} from '../dist/electronics/instrument/circuit.mjs';
import {makeCircuit,net,validateCircuit} from '../dist/wiring-generator/model.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
import {explainSelection} from '../dist/wiring-generator/explanation.mjs';
import {inspectSelection} from '../dist/circuit-forge/workbench.mjs';
import {circuitResponse} from '../dist/electronics/response/circuit.mjs';
import {captureCircuitState,wiringHandoff,readCircuitState} from '../dist/electronics/state/circuit-state.mjs';
import {projectFromCircuit,shareProjectURL,readProject,createProjectStore} from '../dist/electronics/state/project.mjs';
for(const state of ['down','up']){
 const contacts=dpdtContacts('test',state),fixture={connections:[],contacts};assert.equal(Object.keys(dpdtTerminals).length,6);
 for(const pole of ['A','B']){const found=net(fixture,'test.'+pole+'C');assert.equal(found.size,2);assert(found.has('test.'+pole+(state==='down'?'1':'2')));assert(!found.has('test.'+pole+(state==='down'?'2':'1')));assert(!found.has('test.'+(pole==='A'?'B':'A')+'C'));}
}
assert.throws(()=>dpdtContacts('test','middle'));
const active=[['bridge'],['bridge','middle'],['middle'],['middle','neck'],['neck']];let states=0;
for(const controlLayout of ['1V1T','1V2T'])for(let position=1;position<=5;position++)for(const pushpull of ['down','up']){
 const i=configureInstrumentDimensions(createReference('hss'),{controlLayout});i.switching=[bridgeSplitModifier(pushpull)];i.selector.selection=position;i.label='PRIVATE GUITAR';i.extensions={notes:'PRIVATE NOTES'};
 const c=makeInstrumentCircuit(i),snapshot=JSON.stringify(c);assert(validateCircuit(c));
 const device=c.components.find(p=>p.id==='bridgeSplit'),host=c.components.find(p=>p.id==='masterVolume');assert.equal(host.type,'pot');assert.equal(host.associatedSwitch,device.id);assert.equal(device.mechanicalHost,host.id);assert.equal(device.type,'dpdt');assert.deepEqual(device.usedPoles,['A']);
 assert.deepEqual(c.contacts.filter(pair=>pair[0].startsWith('bridgeSplit.')),dpdtContacts('bridgeSplit',pushpull));assert(!c.connections.some(w=>w.from.startsWith('bridgeSplit.B')||w.to.startsWith('bridgeSplit.B')));
 const input=net(c,'masterVolume.lug3'),ground=net(c,'jack.sleeve'),output=net(c,'jack.tip');assert(output.has('masterVolume.lug2'));assert(!output.has('jack.sleeve'));assert(!input.has('jack.sleeve'));assert(ground.has('masterVolume.lug1'));assert(ground.has('bridgePickup.shield'));assert(ground.has('bridgeSplit.A2'));
 for(const pickup of i.pickups){assert.equal(input.has(pickup.position+'Pickup.hot'),active[position-1].includes(pickup.position));assert(ground.has(pickup.position+'Pickup.ground'));}
 const winding=humbuckerCoilState(c);assert.equal(winding.selected,position<=2);assert.equal(winding.mode,pushpull==='down'?'full-series':'coil-A');assert.equal(winding.coils[0].participating,true);assert.equal(winding.coils[1].participating,pushpull==='down');assert.equal(winding.coils[1].shunted,pushpull==='up');assert.equal(winding.coils[0].contributes,position<=2);assert.equal(winding.coils[1].contributes,position<=2&&pushpull==='down');assert.equal(ground.has('bridgePickup.linkA'),pushpull==='up');assert(net(c,'bridgePickup.linkA').has('bridgePickup.linkB'));
 assert.equal(net(c,'bridgePickup.hot').has('bridgePickup.linkA'),false,'Passive coil is not an ideal wire');
 if(controlLayout==='1V2T'){assert.equal(input.has('neckTone.lug1'),active[position-1].includes('neck'));assert.equal(input.has('middleTone.lug1'),position<=4);}else{assert(input.has('toneCap.a'));assert(!c.components.some(p=>p.id==='middleTone'));}
 const other=makeInstrumentCircuit({...i,switching:[bridgeSplitModifier(pushpull==='down'?'up':'down')]});assert.deepEqual(c.connections,other.connections,'Same soldered circuit; only contacts change');assert.deepEqual(c.contacts.filter(pair=>pair[0].startsWith('selector.')),other.contacts.filter(pair=>pair[0].startsWith('selector.')));
 const report=circuitResponse(c,21);assert.equal(report.supported,[3,5].includes(position)||position===1&&pushpull==='down');if(position===1&&pushpull==='up')assert.match(report.reason,/coil-level/);
 const caps=instrumentCapabilities(i);assert(caps.canGenerateWiring&&caps.canCoilSplit);assert(!caps.canAutoSplit);assert(!caps.canBuildKit);
 const explanation=explainSelection(c,'component','bridgeSplit');assert.match(explanation.purpose,/Pole B is unused/);assert.match(explanation.valueNote,pushpull==='down'?/Both coils remain in series/:/Coil B is shunted/);assert.equal(explanation.contacts.length,2);
 const inspected=inspectSelection(c,{kind:'component',id:'bridgePickup'});assert.match(inspected.purpose,pushpull==='up'?/Coil B: shunted/:position<=2?/Coil B: contributes/:/Coil B: not selected/);
 for(const mode of ['build','trace','explain']){const svg=drawCircuit(c,{mode});assert(svg.includes('data-component="bridgeSplit"'));for(const pin of Object.keys(dpdtTerminals))assert(svg.includes('data-terminal="bridgeSplit.'+pin+'"'));if(mode==='build')assert(!svg.includes('data-contact-state="closed"'));else{assert(svg.includes('data-contact-from="bridgeSplit.AC"'));assert(svg.includes(`data-coil-state="${pushpull==='up'?'shunted':position<=2?'active':'inactive'}"`));}assert.equal(JSON.stringify(c),snapshot);}
 const state=captureCircuitState(c);assert.deepEqual(captureCircuitState(makeCircuit(state.configuration)).instrument.switching,i.switching,'Raw Generator state reconstructs switching authority');assert.deepEqual(readCircuitState(new URL(wiringHandoff(c),'https://fixture.test').search).state,state);
 const project=projectFromCircuit(c,{name:'PRIVATE PROJECT',extensions:{history:'PRIVATE HISTORY'}}),map=new Map(),store=createProjectStore({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});assert.deepEqual(store.restore(store.save(project)),project);
 const share=shareProjectURL(project);assert.equal(share,shareProjectURL(project));assert(!decodeURIComponent(share).includes('PRIVATE'));const restored=readProject(new URL(share,'https://fixture.test').search).project;assert.deepEqual(restored.electronics.instrument.switching,i.switching);assert.equal(humbuckerCoilState(makeInstrumentCircuit(restored.electronics.instrument)).mode,winding.mode);states++;
}
// Structural proof: changing actual contacts changes coil state without a UI flag.
const i=createReference('hss');i.switching=[bridgeSplitModifier('up')];const changed=makeInstrumentCircuit(i);changed.contacts=changed.contacts.filter(pair=>!pair[0].startsWith('bridgeSplit.')).concat(dpdtContacts('bridgeSplit','down'));assert.equal(humbuckerCoilState(changed).mode,'full-series');
for(const mutate of [i=>i.switching[0].pickup='neck',i=>i.pickups[2].coilAccess='two-conductor',i=>i.switching[0].function='phase',i=>i.switching.push(bridgeSplitModifier()),i=>i.switching[0].device='superswitch',i=>i.switching[0].activeCoil='B',i=>i.switching[0].host='middleTone',i=>i.autoSplit=true]){const i=createReference('hss');i.switching=[bridgeSplitModifier()];mutate(i);assert.throws(()=>normaliseInstrument(i));}
const legacyGraphs=[];for(const guitar of ['tele','strat','les-paul','sg'])for(const wiring of ['modern','50s','60s']){if(['tele','strat'].includes(guitar)&&wiring!=='modern')continue;for(const position of guitar==='strat'?['1','2','3','4','5']:guitar==='tele'?['1','2','3']:['neck','both','bridge']){const c=makeCircuit({guitar,wiring,position});legacyGraphs.push({state:c.state,parts:c.components.map(({assignments,...p})=>p),connections:c.connections,contacts:c.contacts});}}
assert.equal(createHash('sha256').update(JSON.stringify(legacyGraphs)).digest('hex'),'a26ff9c1f46dcb49044e7f6c451619618bbcaeea1388e2301d343dbb513f5afe');
console.log(`Advanced switching: DPDT independence, ${states} HSS states, coil paths/shunts, outputs/grounds/tones, modes, response boundaries, persistence/privacy/handoffs and legacy electrical equivalence PASS`);

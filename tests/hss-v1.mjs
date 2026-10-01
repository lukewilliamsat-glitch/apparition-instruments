import assert from 'node:assert/strict';
import {createReference,configureInstrumentDimensions,normaliseInstrument,instrumentCapabilities,generatorConfiguration,validateInstrument} from '../dist/electronics/instrument/configuration.mjs';
import {makeInstrumentCircuit} from '../dist/electronics/instrument/circuit.mjs';
import {makeCircuit,net,validateCircuit} from '../dist/wiring-generator/model.mjs';
import {createHash} from 'node:crypto';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
import {selectorContext,explainSelection} from '../dist/wiring-generator/explanation.mjs';
import {selectorReport} from '../dist/circuit-forge/workbench.mjs';
import {circuitResponse} from '../dist/electronics/response/circuit.mjs';
import {captureCircuitState,wiringHandoff,kitHandoff,readCircuitState} from '../dist/electronics/state/circuit-state.mjs';
import {projectFromCircuit,shareProjectURL,readProject,createProjectStore} from '../dist/electronics/state/project.mjs';
const active=[['bridge'],['bridge','middle'],['middle'],['middle','neck'],['neck']];
let diagrams=0;
for(const controlLayout of ['1V2T','1V1T'])for(let position=1;position<=5;position++){
 const i=configureInstrumentDimensions(createReference('hss'),{controlLayout});i.selector.selection=position;i.label='PRIVATE GUITAR';i.extensions={note:'PRIVATE NOTE'};
 i.controls.find(c=>c.role==='volume').pot=300;i.controls.find(c=>c.role==='volume').position=4;
 for(const t of i.controls.filter(c=>c.role==='tone')){t.pot=1000;t.capacitor='0.015';t.position=6;}
 const original=JSON.stringify(i),c=makeInstrumentCircuit(i);assert(validateCircuit(c));
 const input=net(c,'masterVolume.lug3'),output=net(c,'jack.tip'),ground=net(c,'jack.sleeve');
 for(const pickup of i.pickups){assert.equal(input.has(pickup.position+'Pickup.hot'),active[position-1].includes(pickup.position));assert(ground.has(pickup.position+'Pickup.ground'));}
 assert(output.has('masterVolume.lug2'));assert(!input.has('jack.sleeve'));assert(ground.has('masterVolume.lug1'));assert(ground.has('bridgePickup.shield'));
 assert.equal(c.components.find(p=>p.id==='bridgePickup').type,'humbucker');assert.equal(c.components.find(p=>p.id==='bridgePickup').coilMode,'full-series');
 const link=net(c,'bridgePickup.linkA');assert(link.has('bridgePickup.linkB'));assert.equal(link.size,2);assert(!link.has('jack.sleeve'));assert.equal(c.connections.find(w=>w.id==='bridgeSeries').insulate,true);
 if(controlLayout==='1V2T'){
  assert.deepEqual(c.controlAssignments.middleTone,['middle','bridge']);
  assert.equal(input.has('neckTone.lug1'),active[position-1].includes('neck'));
  assert.equal(input.has('middleTone.lug1'),active[position-1].some(p=>['middle','bridge'].includes(p)));
  assert(net(c,'neckTone.lug2').has('toneCap.a'));assert(net(c,'middleTone.lug2').has('toneCap.a'));assert(ground.has('toneCap.b'));
 }else{assert(!c.components.some(p=>p.id==='middleTone'));assert(!c.connections.some(w=>w.id==='toneCommon'||w.id==='middleToneCap'));assert(input.has('toneCap.a'));assert(net(c,'toneCap.b').has('neckTone.lug2'));assert(ground.has('neckTone.lug1'));}
 const caps=instrumentCapabilities(i);assert(caps.canGenerateGraph&&caps.canTrace&&caps.canExplain);assert.equal(caps.canBuildKit,false);assert.equal(kitHandoff(c).url,null);
 assert.equal(selectorContext(c).active.length,active[position-1].length);assert.equal(selectorReport(c).channels.filter(p=>p.active).length,active[position-1].length);
 assert.match(explainSelection(c,'component','selector').purpose,/full-series.*Positions 1 and 2/);
 const report=circuitResponse(c,31);assert.equal(report.supported,[1,3,5].includes(position));
 if(report.supported){assert.equal(report.channel,active[position-1][0]);assert.equal(report.state.volumePot,300);assert.equal(report.state.tonePot,1000);assert.equal(report.state.toneCap,15);assert.equal(report.state.volume,4);assert.equal(report.state.tonePosition,6);assert.equal(report.points.length,31);}else assert.match(report.reason,/coupled/);
 for(const mode of ['build','trace','explain']){const svg=drawCircuit(c,{mode});assert(svg.startsWith('<svg'));assert(svg.includes('data-component="bridgePickup"'));assert(svg.includes(`data-selector-position="${position}"`));if(mode==='build')assert(!svg.includes('data-contact-state="closed"'));else assert(svg.includes('data-contact-state="closed"'));diagrams++;}
 const state=captureCircuitState(c),handoff=readCircuitState(new URL(wiringHandoff(c),'https://fixture.test').search).state;assert.deepEqual(handoff,state);assert.equal(generatorConfiguration(i).controlLayout,controlLayout);
 const project=projectFromCircuit(c,{name:'PRIVATE PROJECT',extensions:{note:'PRIVATE HISTORY'}}),map=new Map(),store=createProjectStore({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});assert.deepEqual(store.restore(store.save(project)),project);
 const shared=shareProjectURL(project);assert.equal(shared,shareProjectURL(project));assert(!decodeURIComponent(shared).includes('PRIVATE'));const reconstructed=readProject(new URL(shared,'https://fixture.test').search).project.electronics.instrument;assert.equal(reconstructed.controlLayout,controlLayout);assert.deepEqual(reconstructed.controls,state.instrument.controls);assert.equal(JSON.stringify(i),original);
}
for(const modification of ['coil-split','partial-split','series','parallel','phase-reversal']){const i=createReference('hss');i.pickups[2].modification=modification;assert.equal(instrumentCapabilities(i).canGenerateWiring,false);assert.equal(makeInstrumentCircuit(i).components.length,0);}
for(const change of [i=>i.selector.family='superswitch',i=>i.selector.autoSplit=true,i=>i.autoSplit=true,i=>i.pickups[2].coilSelection='north',i=>i.switching={pushpull:true}]){const i=createReference('hss');change(i);assert.equal(validateInstrument(i).valid,false);}
const coloured=createReference('hss');coloured.pickups[2].conductor='duncan';assert.equal(instrumentCapabilities(coloured).canGenerateWiring,false);
const custom=createReference('hss');custom.controls.find(c=>c.id==='middleTone').assignments=['middle'];assert.equal(instrumentCapabilities(custom).canGenerateWiring,false,'Historical descriptive HSS stays descriptive, never substituted');
const legacyGraphs=[];
for(const guitar of ['tele','strat','les-paul','sg'])for(const wiring of ['modern','50s','60s']){if(['tele','strat'].includes(guitar)&&wiring!=='modern')continue;for(const position of guitar==='strat'?['1','2','3','4','5']:guitar==='tele'?['1','2','3']:['neck','both','bridge']){
 const value={guitar,wiring,position},a=makeCircuit(value);
 const graph=c=>({state:c.state,parts:c.components.map(({assignments,...p})=>p),connections:c.connections,contacts:c.contacts});legacyGraphs.push(graph(a));
}}
// Frozen at canonical 784a560: all existing graph coordinates, terminals, wires and contacts.
assert.equal(createHash('sha256').update(JSON.stringify(legacyGraphs)).digest('hex'),'a26ff9c1f46dcb49044e7f6c451619618bbcaeea1388e2301d343dbb513f5afe');
console.log(`HSS V1: 10 selector/layout graphs, ${diagrams} mode diagrams, tone loading, full-series, response boundaries, projects/privacy/handoffs and legacy graph equivalence PASS`);

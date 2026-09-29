import assert from 'node:assert/strict';
import {forgeCircuit,terminalPath} from '../dist/circuit-forge/model.mjs';
import {composePhysicalWiring,pickupProfile} from '../dist/wiring-generator/physical.mjs';
import {routeDiagram,routeSemantics} from '../dist/wiring-generator/routing.mjs';
import {trueJunctions,visualCrossings} from '../dist/wiring-generator/diagram-semantics.mjs';
import {inspectSelection,selectionHighlight,changeReport} from '../dist/circuit-forge/workbench.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';

const generic=forgeCircuit().circuit;
const mixed=forgeCircuit({neckProfile:'duncan',bridgeProfile:'dimarzio'}).circuit;
const graph=c=>JSON.stringify([c.components,c.connections,c.contacts]);
assert.equal(graph(generic),graph(mixed),'manufacturer choice cannot alter electrical topology');
assert(changeReport(generic,mixed).lines.some(line=>line.includes('Neck pickup conductors')));
assert.equal(pickupProfile(mixed,'neckPickup').wires.hot[1],'BLACK');
assert.equal(pickupProfile(mixed,'bridgePickup').wires.hot[1],'RED');
const p=composePhysicalWiring(mixed),routes=routeDiagram(mixed);
for(const ch of ['neck','bridge']){
 const hot=p.conductors.get(ch+'Hot'),series=p.conductors.get(ch+'Series');
 assert.equal(hot.kind,'pickup-hot');assert.equal(hot.to,ch+'Volume.lug3');
 assert.deepEqual(routes.get(hot.id).at(-1),[398,ch==='neck'?382:862]);
 assert.equal(series.kind,'local-series');assert.equal(series.to,ch+'Pickup.linkB');
 assert.equal(series.seriesColours.length,2);
 for(const id of [ch+'Ground',ch+'Shield']){assert.equal(p.conductors.get(id).join,ch+'Volume.case');assert(terminalPath(mixed,p.conductors.get(id).from).includes('jack.sleeve'));const points=routes.get(id);const length=points.slice(1).reduce((sum,q,i)=>sum+Math.abs(q[0]-points[i][0])+Math.abs(q[1]-points[i][1]),0);assert(length<300,`${id} terminates locally, without a long ground tour`);}
 assert.notEqual(p.conductors.get(ch+'Ground').id,p.conductors.get(ch+'Shield').id);
 assert(p.terminations.get(ch+'Volume.case').includes(ch+'Ground'));
 assert(p.terminations.get(ch+'Volume.case').includes(ch+'Shield'));
 assert.equal(p.conductors.get(ch+'VolumeGround').kind,'local-casing-bond');
 assert(routes.get(ch+'VolumeGround').length<=4);
 assert.equal(p.conductors.get(ch+'Cases').kind,'ground-bus');
 assert(trueJunctions(mixed).some(j=>j.ref===ch+'Volume.case'));
}
assert(terminalPath(mixed,'jack.sleeve').includes('bridgeGround.ground'));
assert(!terminalPath(mixed,'jack.sleeve').includes('jack.tip'));
assert.deepEqual([...routes],[...routeDiagram(structuredClone(mixed))]);
assert.deepEqual([...p.conductors],[...composePhysicalWiring(structuredClone(mixed)).conductors]);
for(const x of visualCrossings(mixed))assert.notEqual(routeSemantics(mixed).get(x.wires[0]).net,routeSemantics(mixed).get(x.wires[1]).net);
const wire=inspectSelection(mixed,{kind:'wire',id:'neckGround'});
assert.match(wire.summary,/Shared solder point with BARE/);
assert.deepEqual(selectionHighlight(mixed,{kind:'wire',id:'neckGround'}),{kind:'physical-wire',id:'neckGround'});
assert.match(inspectSelection(mixed,{kind:'terminal',ref:'neckVolume.case'}).physical,/GREEN.*BARE/);
const svg=drawCircuit(mixed);assert.match(svg,/data-physical-kind="pickup-hot" data-conductor="BLACK"/);
assert.match(svg,/data-physical-kind="pickup-hot" data-conductor="RED"/);
for(const id of ['generic','duncan','dimarzio','gibson','tonerider','warman','fender']){
 const c=forgeCircuit({neckProfile:id}).circuit;assert.equal(graph(c),graph(generic));
}
assert.equal(pickupProfile(forgeCircuit({neckProfile:'fender'}).circuit,'neckPickup').status,'requires-model');
console.log('Shared physical composition, per-pickup profiles and electrical invariance PASS');

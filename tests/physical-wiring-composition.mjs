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
 const solder=p.solderPoints.get(ch+'Volume.case');assert.equal(solder.kind,'casing-solder');
 assert(solder.shared&&solder.pickupLeads.includes(ch+'Ground')&&solder.pickupLeads.includes(ch+'Shield'));
 assert(solder.localBonds.includes(ch+'VolumeGround'));
 assert.equal(p.conductors.get(ch+'VolumeGround').kind,'local-casing-bond');
 assert(routes.get(ch+'VolumeGround').length<=4);
 assert.equal(p.conductors.get(ch+'Cases').kind,'ground-bus');
 assert(trueJunctions(mixed).some(j=>j.ref===ch+'Volume.case'));
}
assert(terminalPath(mixed,'jack.sleeve').includes('bridgeGround.ground'));
assert.deepEqual(routes.get('commonGround').map(([x,y])=>[x,y]),[[870,322],[980,322],[980,802],[870,802]]);
assert.equal(p.conductors.get('commonGround').kind,'ground-bus');
assert.equal(p.solderPoints.has('jack.sleeve'),false);
assert(!terminalPath(mixed,'jack.sleeve').includes('jack.tip'));
assert.deepEqual([...routes],[...routeDiagram(structuredClone(mixed))]);
assert.deepEqual([...p.conductors],[...composePhysicalWiring(structuredClone(mixed)).conductors]);
for(const x of visualCrossings(mixed))assert.notEqual(routeSemantics(mixed).get(x.wires[0]).net,routeSemantics(mixed).get(x.wires[1]).net);
const wire=inspectSelection(mixed,{kind:'wire',id:'neckGround'});
assert.match(wire.summary,/Shared solder point with BARE/);
assert.equal(wire.physicalData.termination,'Casing solder point');
assert.equal(wire.physicalData.manufacturer,pickupProfile(mixed,'neckPickup').label);
const neck=inspectSelection(mixed,{kind:'component',id:'neckPickup'});
assert.deepEqual(neck.physicalWiring.map(w=>w.colour),['BLACK','WHITE + RED','GREEN','BARE']);
assert.equal(neck.physicalWiring.find(w=>w.role==='Series link').termination,'Insulated join');
assert.equal(inspectSelection(mixed,{kind:'component',id:'bridgePickup'}).physicalWiring[0].colour,'RED');
assert.deepEqual(selectionHighlight(mixed,{kind:'wire',id:'neckGround'}),{kind:'physical-wire',id:'neckGround'});
assert.match(inspectSelection(mixed,{kind:'terminal',ref:'neckVolume.case'}).physical,/GREEN.*BARE/);
const svg=drawCircuit(mixed);assert.match(svg,/data-physical-kind="pickup-hot" data-conductor="BLACK"/);
assert.match(svg,/data-solder-point="neckVolume.case" data-solder-conductors="[^"]*neckGround neckShield/);
assert.match(svg,/data-local-bonds="neckVolumeGround"/);
assert.match(drawCircuit(mixed,{selection:selectionHighlight(mixed,{kind:'wire',id:'neckGround'})}),/data-wire="neckGround"[^>]*data-view-state="selected"/);
assert.match(drawCircuit(mixed,{selection:{kind:'path',refs:[...terminalPath(mixed,'jack.sleeve') ]}}),/data-wire="neckGround"[^>]*data-view-state="traced"/);
assert.match(svg,/data-physical-kind="pickup-hot" data-conductor="RED"/);
const colourOf=(svg,id)=>svg.match(new RegExp(`data-wire="${id}"[^>]*>[\\s\\S]*?<path class="wire-line[^>]*stroke="([^"]+)"`))?.[1];
for(const [neck,bridge,neckColour,bridgeColour] of [
 ['generic','generic','#303b43','#303b43'],['duncan','generic','#202020','#303b43'],
 ['generic','duncan','#303b43','#202020'],['duncan','dimarzio','#202020','#b91c1c'],
 ['warman','gibson','#426d48','#b91c1c']
]){
 const c=forgeCircuit({neckProfile:neck,bridgeProfile:bridge}).circuit,svg=drawCircuit(c);
 assert.equal(graph(c),graph(generic));assert.equal(colourOf(svg,'neckHot'),neckColour);
 assert.equal(colourOf(svg,'bridgeHot'),bridgeColour);
 assert.match(svg,new RegExp(`data-pickup-profile="${pickupProfile(c,'neckPickup').label}`));
 assert.match(svg,new RegExp(`data-pickup-profile="${pickupProfile(c,'bridgePickup').label}`));
}
for(const ch of ['neck','bridge']){
 const points=routes.get(ch+'Cases');assert.equal(points.length,2,'direct casing-to-casing physical bus');
 assert.equal(points[0][1],points[1][1]);
 const hotPoints=routes.get(ch+'Hot');assert.equal(hotPoints.length,4,'hot takes a direct terminal-first approach');
}
for(const id of ['generic','duncan','dimarzio','gibson','tonerider','warman','fender']){
 const c=forgeCircuit({neckProfile:id}).circuit;assert.equal(graph(c),graph(generic));
}
assert.equal(pickupProfile(forgeCircuit({neckProfile:'fender'}).circuit,'neckPickup').status,'requires-model');
console.log('Shared physical composition, per-pickup profiles and electrical invariance PASS');

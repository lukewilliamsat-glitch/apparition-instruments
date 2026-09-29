import assert from 'node:assert/strict';
import {makeCircuit} from '../dist/wiring-generator/model.mjs';
import {routeDiagram,routeSemantics} from '../dist/wiring-generator/routing.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
import {forgeDiagram} from '../dist/circuit-forge/presentation.mjs';
import {trueJunctions,visualCrossings} from '../dist/wiring-generator/diagram-semantics.mjs';
import {composePhysicalWiring} from '../dist/wiring-generator/physical.mjs';

const circuit=makeCircuit({bleed:'duncan'}),routes=routeDiagram(circuit),semantics=routeSemantics(circuit);
assert.deepEqual([...routes],[...routeDiagram(structuredClone(circuit))]);
for(const [id,points] of routes)for(let i=1;i<points.length;i++){
 const a=points[i-1],b=points[i];
 assert(a[0]===b[0]||a[1]===b[1],`${id} is orthogonal`);
 assert.notDeepEqual(a,b,`${id} has no duplicate waypoint`);
 if(i>1){const prev=points[i-2];assert(!(prev[0]===a[0]&&a[0]===b[0]||prev[1]===a[1]&&a[1]===b[1]),`${id} has no redundant collinear waypoint`);}
}
assert.deepEqual(routes.get('toggleJoin'),[[1115,530],[1115,590],[1155,590],[1155,530]],'selector leads have one clean snapped departure');

const junctions=trueJunctions(circuit),crossings=visualCrossings(circuit);
assert(junctions.some(j=>j.ref==='neckVolume.case'&&j.wires.length>=3),'ground branch is an explicit graph junction');
assert(junctions.some(j=>j.ref==='bridgeVolume.case'&&j.wires.length>=3));
assert(junctions.every(j=>j.wires.length>=3),'ordinary two-wire continuations are not marked as branches');
assert(crossings.length>0);
assert(crossings.every(x=>semantics.get(x.wires[0]).net!==semantics.get(x.wires[1]).net),'crossing markers never represent one conductive net');
assert(crossings.every(x=>!junctions.some(j=>j.x===x.x&&j.y===x.y)),'a visual crossing does not become a junction');
const svg=drawCircuit(circuit,{exporting:true}),forge=forgeDiagram(circuit);
const solder=composePhysicalWiring(circuit).solderPoints;
assert(svg.includes('data-solder-point="neckVolume.case" data-solder-conductors='));
assert.equal((svg.match(/data-junction="/g)||[]).length,junctions.filter(j=>!solder.has(j.ref)).length);
assert.equal((svg.match(/class="forge-crossing"/g)||[]).length,crossings.length);
assert.equal((forge.match(/class="forge-crossing"/g)||[]).length,crossings.length,'both tools use the shared crossing renderer');
assert(svg.includes('r="5" fill="#f5f5f5"/><path d="M'),'compact interruption is shared');
assert(!forge.includes('r="8" fill="#f5f5f5"'),'oversized Forge-only hop is retired');
const auxiliary=drawCircuit(circuit,{filter:'auxiliary'});
assert(auxiliary.includes('data-crossing-wires="neckGround neckBleedIn" data-crossing-wire="neckGround" data-view-state="muted"'),'a crossing follows its overpassing wire, even when the lower wire is active');
assert(auxiliary.includes('data-crossing-wires="bridgeBleedOut shieldEarth" data-crossing-wire="bridgeBleedOut" data-view-state="active"'),'an active overpassing wire retains its hop');
assert(auxiliary.includes('.forge-crossing[data-view-state=muted] path{stroke:#777;opacity:.25}'),'inactive hop fades while its opaque gap retains non-conductive meaning');
console.log('Shared composition, graph junctions and compact crossing presentation PASS');

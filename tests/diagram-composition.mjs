import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {makeCircuit,endpoint} from '../dist/wiring-generator/model.mjs';
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
const join=routes.get('toggleJoin'),wire=circuit.connections.find(w=>w.id==='toggleJoin'),a=endpoint(circuit,wire.from),b=endpoint(circuit,wire.to);assert.equal(join.length,4);assert.deepEqual(join[0],[a.x,a.y]);assert.deepEqual(join[3],[b.x,b.y]);assert.equal(join[1][0],a.x);assert.equal(join[2][0],b.x);assert.equal(join[1][1],join[2][1]);assert(Math.abs(join[1][1]-a.y)>=14,'selector lead clears its terminal');

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
const win=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}}),doc=new win.DOMParser().parseFromString(auxiliary,'image/svg+xml'),root=doc.documentElement;win.document.body.append(root);const style=win.document.createElement('style');style.textContent=root.querySelector('style').textContent;win.document.head.append(style);
for(const marker of root.querySelectorAll('.forge-crossing')){const over=root.querySelector(`[data-wire="${marker.dataset.crossingWire}"]`);assert.equal(marker.dataset.viewState,over.dataset.viewState);assert.equal(win.getComputedStyle(marker.querySelector('circle')).fill,'#f3f1eb');assert(['','1'].includes(win.getComputedStyle(marker).opacity),'Clearance is never disabled with its hop');if(marker.dataset.viewState==='muted')assert.equal(Number(win.getComputedStyle(marker.querySelector('path')).opacity),.18);}win.close();
console.log('Shared composition, graph junctions and compact crossing presentation PASS');

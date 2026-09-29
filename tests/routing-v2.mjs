import assert from 'node:assert/strict';
import {routeDiagram,routeSemantics,componentBounds} from '../dist/wiring-generator/routing.mjs';
import {makeCircuit,net} from '../dist/wiring-generator/model.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';

const part=(id,x,y)=>({id,type:'ground',x,y,terminals:{t:{x:0,y:0}}});
const fixture={components:[part('a',100,200),part('b',500,200),part('c',100,220),part('d',500,220)],contacts:[],connections:[
 {id:'hot',from:'a.t',to:'b.t',category:'signal',route:[]},
 {id:'earth',from:'c.t',to:'d.t',category:'ground',route:[]}
]};
const segments=points=>points.slice(1).map((p,i)=>[points[i],p]);
const horizontal=points=>segments(points).filter(([a,b])=>a[1]===b[1]&&Math.abs(b[0]-a[0])>100);
const routes=routeDiagram(fixture);
const first=horizontal(routes.get('hot')),second=horizontal(routes.get('earth'));
assert(first.length&&second.length);
for(const [a,b] of first)for(const [c,d] of second)
 if(Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0]))-Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]))>100)
  assert(Math.abs(a[1]-c[1])>=20,'unrelated parallel paths have a clear lane');
assert.deepEqual([...routes],[...routeDiagram(structuredClone(fixture))],'identical state has stable routes');
const roles=routeSemantics(fixture);assert.equal(roles.get('hot').role,'signal');assert.equal(roles.get('earth').role,'ground');
assert.notEqual(roles.get('hot').net,roles.get('earth').net);
const changed=structuredClone(fixture);changed.connections[0].route=[[160,120]];
assert.notEqual(routeDiagram(changed),routes,'route hint changes invalidate route cache');

const circuit=makeCircuit({bleed:'duncan',position:'both'});
const semantics=routeSemantics(circuit);
assert.equal(semantics.get('neckBleedIn').role,'auxiliary');
assert.equal(semantics.get('neckToneFeed').role,'tone');
assert.equal(semantics.get('jackGround').role,'ground');
assert.equal(semantics.get('jackSignal').role,'signal');
assert.equal(semantics.get('toggleJoin').role,'switch');
assert.notEqual(semantics.get('jackSignal').net,semantics.get('jackGround').net);
assert(!net(circuit,'jack.tip').has('jack.sleeve'));
const svg=drawCircuit(circuit,{exporting:true});
assert(svg.includes('data-route-role="auxiliary"'));
assert(svg.includes('data-route-role="ground"'));
assert(svg.includes('data-route-net="'));
for(const points of routeDiagram(circuit).values())for(const [a,b] of segments(points))assert(a[0]===b[0]||a[1]===b[1]);
// At least one route from a non-endpoint fixture must still go around the body.
const obstacle={components:[part('a',100,350),part('b',500,350),{id:'block',type:'pot',x:300,y:260,terminals:{t:{x:0,y:0}}}],contacts:[],connections:[{id:'around',from:'a.t',to:'b.t',category:'signal',route:[]}]};
const box=componentBounds(obstacle.components[2]);
for(const [a,b] of segments(routeDiagram(obstacle).get('around'))){
 const hits=a[0]===b[0]?a[0]>=box.l&&a[0]<=box.r&&Math.max(a[1],b[1])>box.t&&Math.min(a[1],b[1])<box.b:a[1]>=box.t&&a[1]<=box.b&&Math.max(a[0],b[0])>box.l&&Math.min(a[0],b[0])<box.r;
 assert(!hits,'route avoids component body');
}
console.log('Shared router V2 lane spacing, semantics, determinism, obstacle and conductive isolation PASS');

import assert from 'node:assert/strict';
import {makeCircuit,endpoint,net} from '../dist/wiring-generator/model.mjs';
import {routeDiagram,routeSemantics} from '../dist/wiring-generator/routing.mjs';

const circuit=makeCircuit({bleed:'duncan'}),routes=routeDiagram(circuit),roles=routeSemantics(circuit);
const point=(id,index)=>routes.get(id)[index];
for(const channel of ['neck','bridge']){
 const y=channel==='neck'?382:862;
 const departures=[['ToneFeed',400],['BleedIn',400],['Output',440]];
 for(const [suffix,x] of departures){const id=channel+suffix,p=routes.get(id);
  const escape=p.findIndex(([px,py],i)=>i>0&&px===x&&py>=y+88);
  assert(escape>0,`${id} leaves the component before turning`);
  for(let i=1;i<=escape;i++)assert.equal(p[i][0],x,`${id} retains its own escape lane`);
 }
 assert.equal(point(channel+'ToneFeed',1)[0],point(channel+'BleedIn',1)[0],'same terminal shares a justified initial lane');
 assert.equal(point(channel+'VolumeGround',0)[0],482,'grounded lug begins at its own terminal');
}
for(const suffix of ['ToneFeed','BleedIn','Output']){
 const a=routes.get('neck'+suffix),b=routes.get('bridge'+suffix);
 assert.equal(a[1][0],b[1][0],`${suffix} equivalent local topology keeps the same exit lane`);
 assert(a[1][1]>=382&&b[1][1]>=862,`${suffix} both channels depart outward`);
}
let micro=0,nearVolumeMicro=0;
let routeLength=0;
for(const points of routes.values())for(let i=2;i<points.length-2;i++){
 const [a,b]=[points[i-1],points[i]],length=Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);
 if(length>=20)continue;micro++;
 if(['neckVolume','bridgeVolume'].some(id=>{const p=circuit.components.find(c=>c.id===id);return Math.abs(b[0]-p.x)<170&&Math.abs(b[1]-p.y)<270;}))nearVolumeMicro++;
}
for(const points of routes.values())for(let i=1;i<points.length;i++)routeLength+=Math.abs(points[i][0]-points[i-1][0])+Math.abs(points[i][1]-points[i-1][1]);
assert(micro<=25&&nearVolumeMicro<=5,`short jogs: ${micro} total, ${nearVolumeMicro} near volume controls`);
assert(routeLength<=19500,`avoid a long detour while improving local routing: ${routeLength}`);
for(let i=0;i<circuit.connections.length;i++)for(let j=i+1;j<circuit.connections.length;j++){
 const a=circuit.connections[i],b=circuit.connections[j];if(roles.get(a.id).net===roles.get(b.id).net)continue;
 const first=routes.get(a.id),second=routes.get(b.id);
 for(let x=1;x<first.length;x++)for(let y=1;y<second.length;y++){
  const [p,q]=[first[x-1],first[x]],[r,s]=[second[y-1],second[y]];
  const shared=p[1]===q[1]&&r[1]===s[1]&&p[1]===r[1]?Math.min(Math.max(p[0],q[0]),Math.max(r[0],s[0]))-Math.max(Math.min(p[0],q[0]),Math.min(r[0],s[0])):p[0]===q[0]&&r[0]===s[0]&&p[0]===r[0]?Math.min(Math.max(p[1],q[1]),Math.max(r[1],s[1]))-Math.max(Math.min(p[1],q[1]),Math.min(r[1],s[1])):0;
  assert(shared<=0,`${a.id} and ${b.id} must not share a visual segment across different nets`);
 }
}
// The routing improvement must never merge electrical nets or reclassify them.
assert(!net(circuit,'jack.tip').has('jack.sleeve'));
assert.notEqual(roles.get('jackSignal').net,roles.get('jackGround').net);
assert.equal(roles.get('neckBleedIn').role,'auxiliary');
assert.deepEqual([...routes],[...routeDiagram(structuredClone(circuit))],'same state produces the same paths');
const revised=structuredClone(circuit);revised.connections.find(w=>w.id==='neckToneFeed').route=[[600,500]];
assert.notEqual(routeDiagram(revised),routes,'route hint changes invalidate cached result');
for(const [id,points] of routes){
 const wire=circuit.connections.find(w=>w.id===id),from=endpoint(circuit,wire.from),to=endpoint(circuit,wire.to);
 assert.deepEqual(points[0],[from.x,from.y]);assert.deepEqual(points.at(-1),[to.x,to.y]);
 for(let i=1;i<points.length;i++)assert(points[i][0]===points[i-1][0]||points[i][1]===points[i-1][1],`${id} remains orthogonal`);
}
console.log('Routing V3 terminal escape, equivalent fan-out, short-jog budget and graph isolation PASS');

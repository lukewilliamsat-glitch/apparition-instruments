import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeCircuit,endpoint,net} from '../dist/wiring-generator/model.mjs';
import {routeDiagram} from '../dist/wiring-generator/routing.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
import {circuitForKit} from '../dist/les-paul-kits/diagram.mjs';
import {lesPaul,priceKit} from '../dist/les-paul-kits/config.mjs';
const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/pass01-topology.json',import.meta.url)));
for(const old of baseline){
 const c=makeCircuit(old.state);
 assert.deepEqual(c.connections.map(w=>[w.id,w.from,w.to,w.category]),old.connections);
 assert.deepEqual(c.contacts,old.contacts);
 assert.deepEqual(c.components.map(p=>[p.id,p.type,Object.keys(p.terminals)]),old.components);
 const routes=routeDiagram(c);
 for(const w of c.connections){const a=endpoint(c,w.from),b=endpoint(c,w.to),points=routes.get(w.id);
  assert.deepEqual(points[0],[a.x,a.y]);assert.deepEqual(points.at(-1),[b.x,b.y]);
  for(let i=1;i<points.length;i++)assert(points[i-1][0]===points[i][0]||points[i-1][1]===points[i][1],w.id+' must remain orthogonal');
  const own=net({...c,contacts:[]},w.from);
  for(const p of c.components)for(const k of Object.keys(p.terminals)){const ref=p.id+'.'+k;if(own.has(ref))continue;const t=endpoint(c,ref);for(let i=1;i<points.length;i++){const [x,y]=points[i-1],[u,v]=points[i];assert(!((x===u&&t.x===x&&t.y>=Math.min(y,v)&&t.y<=Math.max(y,v))||(y===v&&t.y===y&&t.x>=Math.min(x,u)&&t.x<=Math.max(x,u))),old.state.guitar+'/'+w.id+' crosses '+ref);}}
 }
}
for(const bleed of Object.keys(lesPaul.bleed)){
 const c=circuitForKit({wiring:'modern',bleed,jack:'none',selector:'switchcraft'}),before=JSON.stringify(c),full=drawCircuit(c,{exporting:true}),kit=drawCircuit(c,{view:'kit',exporting:true});
 assert.equal(JSON.stringify(c),before,'presentation cannot mutate circuit');
 const paths=s=>[...s.matchAll(/ d="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(paths(full),paths(kit));
 assert(c.components.find(p=>p.id==='jack').existing);assert(!c.components.find(p=>p.id==='selector').existing);
 assert(full.includes('solder-joint'));assert(full.includes('junction'));assert(kit.includes('data-view="kit"'));
 if(['duncan','premium','overkill'].includes(bleed))for(const ch of ['neck','bridge']){
  assert(net(c,ch+'Volume.lug3').has(ch+'BleedCap.a'));assert(net(c,ch+'Volume.lug2').has(ch+'BleedCap.b'));
  assert(net(c,ch+'BleedCap.a').has(ch+'BleedResistor.a'));assert(net(c,ch+'BleedCap.b').has(ch+'BleedResistor.b'));
 }
}
assert.equal(priceKit({}).total,5999);assert.equal(priceKit({wiring:'modern',matching:'precision',bleed:'premium',jack:'pureTone',selector:'switchcraft'}).total,10898);
console.log('Pass 02: 106 unchanged netlists, exact routed endpoints, orthogonal paths, immutable presentation views, parallel premium bleeds and preserved prices.');

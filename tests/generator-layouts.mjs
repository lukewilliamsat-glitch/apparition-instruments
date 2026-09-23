import assert from 'node:assert/strict';
import {makeCircuit,net,endpoint,kitLink} from '../dist/wiring-generator/model.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
import {circuitForKit} from '../dist/les-paul-kits/diagram.mjs';
function clearance(c){for(const w of c.connections){const a=endpoint(c,w.from),b=endpoint(c,w.to),ps=[[a.x,a.y],...w.route,[b.x,b.y]],own=net({...c,contacts:[]},w.from);for(let i=1;i<ps.length;i++){const [x,y]=ps[i-1],[u,v]=ps[i];assert(x===u||y===v);for(const part of c.components)for(const key of Object.keys(part.terminals)){const ref=part.id+'.'+key;if(own.has(ref))continue;const p=endpoint(c,ref);assert(!((x===u&&p.x===x&&p.y>=Math.min(y,v)&&p.y<=Math.max(y,v))||(y===v&&p.y===y&&p.x>=Math.min(x,u)&&p.x<=Math.max(x,u))),`${c.state.guitar}/${w.id} crosses ${ref}`);}}}}
const expected={strat:[['bridge'],['bridge','middle'],['middle'],['middle','neck'],['neck']],tele:[['bridge'],['bridge','neck'],['neck']],prs:[['bridge'],['bridge','neck'],['bridge','neck'],['bridge','neck'],['neck']]};
let count=0;
for(const guitar of Object.keys(expected))for(const [i,active] of expected[guitar].entries())for(const bleed of ['none','prs','cap','duncan']){
 const c=makeCircuit({guitar,position:String(i+1),bleed}),input=net(c,'masterVolume.lug3'),ground=net(c,'jack.sleeve');
 for(const p of c.components.filter(p=>['singlecoil','humbucker'].includes(p.type))){assert.equal(input.has(p.id+'.hot'),active.includes(p.channel));assert(ground.has(p.id+'.ground'));assert(!ground.has(p.id+'.hot'));}
 if(guitar==='strat'){assert.equal(input.has('neckTone.lug1'),i>=3);assert.equal(input.has('middleTone.lug1'),[1,2,3].includes(i));assert(net(c,'toneCap.a').has('neckTone.lug2'));assert(net(c,'toneCap.a').has('middleTone.lug2'));assert(ground.has('toneCap.b'));}
 if(guitar==='prs'){assert.equal(ground.has('neckPickup.linkA'),[1,3].includes(i));assert.equal(net(c,'bridgePickup.hot').has('bridgePickup.linkA'),i===3);}
 assert.equal(kitLink(c),null);assert(!net(c,'jack.tip').has('jack.sleeve'));clearance(c);assert(!/undefined|NaN/.test(drawCircuit(c)));count++;
}
for(const bleed of ['none','prs','cap','duncan','premium','overkill']){const c=circuitForKit({wiring:'modern',bleed});clearance(c);if(['premium','overkill'].includes(bleed))for(const ch of ['neck','bridge']){assert(net(c,ch+'Volume.lug3').has(ch+'BleedCap.a'));assert(net(c,ch+'Volume.lug2').has(ch+'BleedCap.b'));assert(net(c,ch+'BleedCap.a').has(ch+'BleedResistor.a'));assert(net(c,ch+'BleedCap.b').has(ch+'BleedResistor.b'));}}
console.log(`${count} new layout configurations passed: pickup selection, PRS coil shunts, Strat tone assignments, grounds, physical terminal clearance and kit adapter.`);

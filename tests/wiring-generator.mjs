import assert from 'node:assert/strict';
import {makeCircuit,configuration,endpoint,net,inspectComponent,kitLink} from '../dist/wiring-generator/model.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
import {configurationFromURL} from '../dist/les-paul-kits/config.mjs';
let count=0;
for(const wiring of ['modern','50s','60s'])for(const bleed of wiring==='50s'?['none']:['none','prs','cap','duncan'])for(const position of ['neck','both','bridge'])for(const shielding of ['yes','no']){
 const c=makeCircuit({wiring,bleed,position,shielding,colours:'duncan',neckCap:'0.033',bridgeCap:'0.047'}),ground=net(c,'jack.sleeve'),output=net(c,'jack.tip');count++;
 assert(!output.has('jack.sleeve'));assert.equal(output.has('neckVolume.lug2'),position!=='bridge');assert.equal(output.has('bridgeVolume.lug2'),position!=='neck');
 for(const ch of ['neck','bridge']){
  assert(ground.has(ch+'Volume.lug1'));assert(ground.has(ch+'Tone.'+(wiring==='modern'?'lug1':'lug2')));assert(!ground.has(ch+'Pickup.hot'));
  assert.deepEqual([...net(c,ch+'Pickup.linkA')].sort(),[ch+'Pickup.linkA',ch+'Pickup.linkB'].sort());
  const feed=c.connections.find(w=>w.id===ch+'ToneFeed'),cap=c.connections.find(w=>w.id===ch+'ToneCap');assert.equal(feed.from,ch+'Volume.'+(wiring==='50s'?'lug2':'lug3'));assert.equal(cap.to,ch+'Tone.'+(wiring==='modern'?'lug2':'lug1'));
  assert.equal(c.components.some(p=>p.id===ch+'BleedCap'),bleed!=='none');assert.equal(c.components.some(p=>p.id===ch+'BleedResistor'),bleed==='duncan');
  if(bleed==='duncan'){assert(net(c,ch+'BleedCap.a').has(ch+'BleedResistor.a'));assert(net(c,ch+'BleedCap.b').has(ch+'BleedResistor.b'));}
  const inspection=inspectComponent(c,ch+'Volume');assert(inspection.terminals.find(t=>t.ref.endsWith('lug3')).connections.some(x=>x.includes('HUMBUCKER')));
 }
 // No routed segment may pass through a terminal from an unrelated net.
 for(const w of c.connections){const a=endpoint(c,w.from),b=endpoint(c,w.to),points=[[a.x,a.y],...w.route,[b.x,b.y]],sameNet=net(c,w.from);
  for(const comp of c.components)for(const key of Object.keys(comp.terminals)){const ref=comp.id+'.'+key;if(sameNet.has(ref))continue;const p=endpoint(c,ref);
   for(let i=1;i<points.length;i++){const [x1,y1]=points[i-1],[x2,y2]=points[i];assert(x1===x2||y1===y2,'Non-orthogonal route '+w.id);const crosses=(x1===x2&&p.x===x1&&p.y>=Math.min(y1,y2)&&p.y<=Math.max(y1,y2))||(y1===y2&&p.y===y1&&p.x>=Math.min(x1,x2)&&p.x<=Math.max(x1,x2));assert(!crosses,`${w.id} crosses unrelated ${ref}`);}
  }
 }
 const svg=drawCircuit(c,{exporting:true});assert(!svg.includes('undefined'));assert(!svg.includes('tabindex='));assert(svg.includes('MONO OUTPUT JACK'));
 const target=configurationFromURL(new URL(kitLink(c),'https://example.org').search);assert.equal(target.wiring,wiring);assert.equal(target.bleed,bleed);assert.equal(target.caps,'mixed');assert.equal(target.jack,'epiphone');assert.equal(target.selector,'epiphone');
}
assert.throws(()=>configuration({wiring:'50s',bleed:'duncan'}),/not offered/);assert.throws(()=>configuration({pickup:'HSS'}),/Unsupported/);assert.throws(()=>configuration({coilSplit:true}),/Unsupported/);assert.equal(kitLink(makeCircuit({guitar:'sg'})),null);
const generic=makeCircuit({colours:'generic'}),duncan=makeCircuit({colours:'duncan'});assert.deepEqual(generic.connections,duncan.connections);assert.deepEqual(generic.contacts,duncan.contacts);
console.log(`${count} generator configurations passed: terminal topology, selected toggle continuity, ground isolation, tone connections, parallel treble bleeds, route clearance, inspection data, SVG exports and kit handoff.`);

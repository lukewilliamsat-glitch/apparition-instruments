import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeInstrumentCircuit} from '../dist/electronics/instrument/circuit.mjs';
import {createReference} from '../dist/electronics/instrument/configuration.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
import {bladeMechanism,visuals} from '../dist/electronics/presentation/component-artwork.mjs';
import {generateHub,hubIllustrations} from '../scripts/generate-component-illustrations.mjs';
const html=readFileSync('dist/luthier-hub/index.html','utf8');assert.equal(generateHub(html),html,'Hub snapshots cannot drift from shared physical artwork');assert.equal(Object.keys(hubIllustrations()).length,5);
assert.equal(readFileSync('dist/wiring-generator/components.mjs','utf8').split('\n').filter(l=>l.startsWith('export')).length,1);
for(const id of ['tele','strat','hss']){
 const i=createReference(id),angles=[];let stable;
 const count=id==='tele'?3:5;
 for(let p=1;p<=count;p++){i.selector.selection=p;const c=makeInstrumentCircuit(i),before=JSON.stringify(c),part=c.components.find(p=>p.id==='selector'),contacts=c.contacts.filter(pair=>pair[0].startsWith('selector.')),projected={...part,closedContacts:contacts,showState:true,displaySelectorPosition:true};
  const m=bladeMechanism(projected);angles.push(m.angle);
  for(const mode of ['build','trace','explain']){const svg=drawCircuit(c,{mode});for(const token of ['blade-frame','blade-mounting-ear','blade-spindle','blade-lever','blade-pivot-arm','blade-wafer','blade-contact-bank','blade-lug','common-lug','lug-hole'])assert(svg.includes(token),id+' '+mode+' '+token);
   assert.equal((svg.match(/data-pole="[AB]"/g)||[]).length,2);assert.equal((svg.match(/data-contact-terminal="selector\./g)||[]).length,8);
   if(mode==='build'){stable??=svg;assert.equal(svg,stable);assert(!svg.includes('data-wiper-from'));assert(!svg.includes('data-selector-position'));}
   else for(const [from,to] of contacts){assert(svg.includes(`data-wiper-from="${from}" data-wiper-to="${to}"`));}
  }assert.equal(JSON.stringify(c),before);
 }
 assert.equal(new Set(angles).size,count);assert(angles.every((a,n)=>!n||a>angles[n-1]));if(count===5){assert.equal(angles[1],(angles[0]+angles[2])/2);assert.equal(angles[3],(angles[2]+angles[4])/2);}
}
for(const type of ['singlecoil','humbucker','pot','pushpull','capacitor','resistor','network','jack','toggle','blade3','blade5'])assert.equal(typeof visuals[type],'function');
const css=readFileSync('dist/luthier-hub/hub-v4.css','utf8');assert(css.includes('prefers-reduced-motion:reduce'));assert(css.includes('focus-visible'));assert(!html.includes('data-selector-position='));assert.equal((html.match(/data-shared-artwork=/g)||[]).length,5);
console.log('Experience Foundation: shared art/snapshots, all 13 blade states, physical frame/lugs/banks, exact contact projections, monotonic intermediate geometry, fixed Build and source integrity PASS');

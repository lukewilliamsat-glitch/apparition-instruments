import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {Window} from 'happy-dom';
import {makeCircuit} from '../dist/wiring-generator/model.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
import {bladeMechanism} from '../dist/wiring-generator/components.mjs';
import {composeWorkbench} from '../dist/wiring-generator/composition.mjs';
import {bridgeSplitModifier,toneSplitModifier} from '../dist/electronics/switching/devices.mjs';
const win=new Window({settings:{disableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
const parse=svg=>new win.DOMParser().parseFromString(svg.replace(/<style>[\s\S]*?<\/style>/,''),'image/svg+xml');
let states=0;
for(const guitar of ['tele','strat','hss']){
 const angles=new Set();
 for(const position of guitar==='tele'?['1','2','3']:['1','2','3','4','5']){
  const c=makeCircuit({guitar,position}),snapshot=JSON.stringify(c),part=c.components.find(p=>p.id==='selector'),contacts=c.contacts.filter(pair=>pair.every(ref=>ref.startsWith('selector.')));
  const projection=bladeMechanism({...part,closedContacts:contacts});angles.add(projection.angle);
  assert.equal(bladeMechanism({...part,position:'unrelated',closedContacts:contacts}).angle,projection.angle,'Contact truth, not selector metadata, drives geometry');
  assert.deepEqual(bladeMechanism({...part,closedContacts:contacts.map(pair=>[...pair].reverse())}),projection,'Contact orientation independent');
  for(const mode of ['build','trace','explain']){
   const doc=parse(drawCircuit(c,{mode})),banks=[...doc.querySelectorAll('.blade-contact-bank')];assert.equal(banks.length,2);
   assert.equal(doc.querySelector('.blade-lever-assembly').getAttribute('transform'),mode==='build'?null:`rotate(${projection.angle} 110 55)`);
   const wipers=[...doc.querySelectorAll('[data-wiper-from]')].map(p=>[p.getAttribute('data-wiper-from'),p.getAttribute('data-wiper-to')].sort().join('|')).sort();
   assert.deepEqual(wipers,mode==='build'?[]:contacts.map(pair=>[...pair].sort().join('|')).sort());
   for(const bank of banks){const pole=bank.getAttribute('data-pole'),expected=projection.banks.find(b=>b.pole===pole).throws;
    assert.equal(bank.getAttribute('data-wiper-throws'),mode==='build'?'hardware':expected.join(' '));
    assert.equal([...doc.querySelectorAll('.blade-bank-label')].find(label=>label.textContent.startsWith('POLE '+pole)).textContent.includes('BRIDGED'),mode!=='build'&&expected.length>1);
   }
   const engaged=new Set(contacts.flat());for(const lug of doc.querySelectorAll('[data-contact-terminal]'))assert.equal(lug.getAttribute('data-physical-contact'),mode==='build'?'hardware':engaged.has(lug.getAttribute('data-contact-terminal'))?'closed':'open');
   assert.equal(doc.querySelectorAll('.blade-contact-halo').length,0);
   if(guitar!=='tele'&&['2','4'].includes(position)){assert.equal(contacts.length,4);if(mode!=='build')assert.equal(doc.querySelectorAll('.blade-wiper').length,4);}
  }
  assert.equal(JSON.stringify(c),snapshot);states++;
 }
 assert.equal(angles.size,guitar==='tele'?3:5,'Every mechanical selector state is distinct');
}
for(const guitar of ['hss','les-paul','sg'])for(const state of ['down','up']){
 const switching=guitar==='hss'?[bridgeSplitModifier(state)]:[toneSplitModifier('neck',state),toneSplitModifier('bridge',state)];
 const source=makeCircuit({guitar,switching}),snapshot=JSON.stringify(source),projected=composeWorkbench(source);
 assert.deepEqual(projected.contacts,source.contacts);assert.deepEqual(projected.connections,source.connections);assert.deepEqual(projected.elements,source.elements);
 for(const p of projected.components.filter(p=>p.type==='dpdt')){
  const host=projected.components.find(h=>h.id===p.mechanicalHost);assert.equal(p.x,host.x);assert(p.y+102<host.y+28);
  assert.deepEqual(Object.keys(p.terminals).sort(),['A1','A2','AC','B1','B2','BC']);
  assert(source.contacts.some(pair=>pair.includes(p.id+'.AC')&&pair.includes(p.id+'.A'+(state==='up'?'2':'1'))));
  assert(!source.connections.some(w=>[w.from,w.to].some(ref=>ref.startsWith(p.id+'.B'))),'Unused pole has no external wiring');
 }
 const doc=parse(drawCircuit(source,{mode:'trace'}));assert([...doc.querySelectorAll('.dpdt-hardware')].every(p=>p.getAttribute('data-actuator-state')===state));assert([...doc.querySelectorAll('.dpdt-caption')].every(p=>p.textContent==='B: UNUSED'));
 assert.equal(JSON.stringify(source),snapshot);
}
const html=readFileSync('dist/luthier-hub/index.html','utf8'),base=execFileSync('git',['show','d271e78cd55b06c2e8897d48004911cd563cf141:dist/luthier-hub/index.html'],{encoding:'utf8'});
const stripHero=s=>s.replace(/<head[\s\S]*?<\/head>/,'HEAD (validated by SEO and shared-shell contracts)').replace('<link rel="stylesheet" href="/customer-ui.css">','').replace(/<body class="([^"]*)">/,(_,classes)=>{const c=classes.split(' ').filter(v=>v!=='site-ui'&&!v.startsWith('ui-')).join(' ');return c?'<body class="'+c+'">':'<body>';}).replace(/<figure class="hub-hero-art[^\"]*">[\s\S]*?<\/figure>/,'HERO').replace(/<nav aria-label="Main navigation">[\s\S]*?<\/nav>/,'PRIMARY NAV').replace(/<nav id="mobile-nav"[\s\S]*?<\/nav>/,'MOBILE NAV').replace(/<div class="footer-links">[\s\S]*?<\/div>/,'FOOTER UTILITIES');assert.equal(stripHero(html),stripHero(base),'Every byte outside hero and authorised navigation/customer-UI shell projection remains unchanged');
win.document.write(html);const hero=win.document.querySelector('.hero-v41');assert(hero);assert.equal(hero.querySelectorAll('[data-study-part]').length,5);assert(!hero.querySelector('.study-trace,.study-grid,[data-wire],[data-contact-from]'));
for(const [index,id] of ['pickup','control','selector','capacitor','output'].entries()){const p=hero.querySelector(`[data-study-part="${id}"]`);assert(p.querySelector('.hub-study-label').textContent.includes('0'+(index+1)+' / '+id.toUpperCase()));assert(p.querySelector('svg[aria-hidden=true][focusable=false]'));}
const css=readFileSync('dist/luthier-hub/hub-v4.css','utf8');for(const width of [320,390,768,1024,1400,1920]){win.happyDOM.setWindowSize({width,height:900});assert(hero.querySelectorAll('.hub-study-label').length===5);assert(css.includes('.hero-v41 .hub-study-label{font:11px'));assert(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));assert(css.includes('@media(max-width:390px)'));assert(css.includes('@media(max-width:1024px) and (min-width:769px)'));}
await win.happyDOM.close();console.log(`Switch visuals V4: ${states} distinct blade states, both banks/exact contact-derived wipers and closed lugs, intermediate bridges, three modes; HSS and dual LP/SG UP/DOWN identities, above-pot projection, unused pole/source integrity; hero/storefront-shell byte boundary and five non-connected responsive studies PASS`);

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {makeCircuit,endpoint,net} from '../dist/wiring-generator/model.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
import {routeDiagram} from '../dist/wiring-generator/routing.mjs';
import {forgeDiagram} from '../dist/circuit-forge/presentation.mjs';
import {graphGeometry} from '../dist/treble-bleed-designer/graph.mjs';
import {trueJunctions,visualCrossings} from '../dist/wiring-generator/diagram-semantics.mjs';
const win=new Window({settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
for(const guitar of ['tele','strat','les-paul','sg'])for(const wiring of guitar==='tele'||guitar==='strat'?['modern']:['modern','50s','60s'])for(const position of guitar==='tele'?['1','2','3']:guitar==='strat'?['1','2','3','4','5']:['neck','both','bridge']){
 const c=makeCircuit({guitar,wiring,position}),before=JSON.stringify(c),routes=routeDiagram(c);
 for(const w of c.connections){const a=endpoint(c,w.from),b=endpoint(c,w.to),r=routes.get(w.id);assert.deepEqual(r[0],[a.x,a.y]);assert.deepEqual(r.at(-1),[b.x,b.y]);for(let i=1;i<r.length;i++)assert(r[i][0]===r[i-1][0]||r[i][1]===r[i-1][1]);}
 const svg=new win.DOMParser().parseFromString(drawCircuit(c),'image/svg+xml').documentElement;
 for(const p of c.components)for(const key of Object.keys(p.terminals)){const t=svg.querySelector('circle[data-terminal="'+p.id+'.'+key+'"]');assert(t);assert.equal(t.getAttribute('tabindex'),'0');assert(t.getAttribute('aria-label').includes(key));}
 for(const j of trueJunctions(c))assert(svg.querySelector('[data-junction="'+j.ref+'"],[data-solder-point="'+j.ref+'"]'));
 for(const crossing of visualCrossings(c))assert(svg.querySelector('[data-crossing-wire="'+crossing.wires[0]+'"]')||svg.querySelector('[data-crossing-wire="'+crossing.wires[1]+'"]'));
 if(['tele','strat'].includes(guitar)){
  const contacts=[...svg.querySelectorAll('[data-contact-state="closed"]')];assert.deepEqual(contacts.map(n=>[n.dataset.contactFrom,n.dataset.contactTo]),c.contacts);assert.equal(svg.querySelectorAll('.blade-terminal-label').length,8);assert(svg.textContent.includes(guitar==='tele'?'3-WAY':'5-WAY'));assert.equal((forgeDiagram(c).match(/data-contact-state="closed"/g)||[]).length,c.contacts.length);assert(!forgeDiagram(c).includes('class="forge-closed-contact"'));
  const selected=c.contacts[0][0];const traced=new win.DOMParser().parseFromString(drawCircuit(c,{selection:{kind:'path',refs:[...net(c,selected)]}}),'image/svg+xml');assert(traced.querySelector('.terminal-traced'));assert(traced.querySelector('[data-view-state="traced"]'));
 }
 for(const filter of ['all','signal','ground','tone','switching'])assert(drawCircuit(c,{filter}).includes('data-wire='));assert.equal(JSON.stringify(c),before);
}
const css=readFileSync('dist/treble-bleed-designer/designer.css','utf8');assert(css.includes('.designer-layout>#designer-import-note,.designer-layout>#designer-source-circuit{grid-column:1/-1'));assert(css.includes('.designer-layout>#designer-inputs{grid-column:1}'));assert(css.includes('.designer-layout>.response-panel{grid-column:2}'));assert(css.includes('max-width:1900px'));assert(css.includes('box-sizing:border-box;width:100%'));assert(css.includes('grid-template-columns:minmax(0,1fr)'));
for(const width of [320,390,768,1024,1400,1920]){const padding=width<=600?16:width<=900?width*.05:Math.max(16,Math.min(58,width*.03)),inner=Math.min(width,1900)-padding*2,gap=Math.max(24,Math.min(50,width*.03)),graphWidth=width<=900?inner:inner-360-gap;assert(graphWidth>=280);const g=graphGeometry([{frequency:20,current:0},{frequency:20000,current:-20}],graphWidth);assert(g.w>0);assert(g.x(20000)<=graphWidth);assert(g.height>=335);if(width>=1400)assert(graphWidth>850);console.log(width+'px responsive geometry: PASS');}
await win.happyDOM.close();console.log('Shared renderer: terminals, contact states, all reference positions, trace, immutable topology, route endpoints, junctions/crossovers PASS');

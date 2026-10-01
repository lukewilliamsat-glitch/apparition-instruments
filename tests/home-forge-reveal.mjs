import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {forgeCircuit} from '../dist/circuit-forge/model.mjs';
import {forgeDiagram} from '../dist/circuit-forge/presentation.mjs';
import {forgeResponse} from '../dist/circuit-forge/response.mjs';
import {responseGraph} from '../dist/circuit-forge/response-view.mjs';
import {chapterForProgress} from '../dist/forge-reveal.mjs';

const html=readFileSync('dist/index.html','utf8'),asset=readFileSync('dist/assets/signal-forge-full.svg','utf8'),css=readFileSync('dist/homepage.css','utf8');
const circuit=forgeCircuit({position:'neck'}).circuit;
// The accepted homepage preview is a published visual checkpoint. Generator
// export semantics can evolve without regenerating this accepted composition.
assert.equal(createHash('sha256').update(asset).digest('hex'),'9e90ed1617a095dbe1dcc60566af5f3356673d1d6f98d83721f7c02019f8da2f');
assert(html.includes('id="signal-forge"')&&html.includes('forge-reveal.mjs?rev=signal-forge-identity-v1'));
assert(html.includes('homepage.css?rev=signal-forge-mobile-v1')&&html.includes('signal-forge-full.svg?rev=signal-forge-identity-v1'));
for(const chapter of [0,1,2,3])assert(html.includes(`data-forge-chapter="${chapter}"`));
assert(html.includes('href="/circuit-forge/"')&&html.includes('href="/wiring-generator/"'));
assert(html.includes('class="ethos section"')&&html.includes('class="product-list"'));
assert.deepEqual([-.1,0,.24,.25,.5,.75,1,2].map(chapterForProgress),[0,0,0,1,2,3,3,3]);
assert(css.includes('prefers-reduced-motion:reduce')&&css.includes('.forge-reveal:not(.is-animated)'));
assert(!html.includes('forge-reveal-continuation')&&!css.includes('forge-reveal-continuation'),'Analyse has no decorative conductor');
assert(css.includes('.forge-crossing:not([data-home-trace]) path{stroke:#777;opacity:.25}'));

async function inspect(reduced){
 const win=new Window({url:'https://apparitioninstruments.co.uk/'});win.document.write(html);
 const motion={matches:reduced,addEventListener(){}};
 Object.assign(globalThis,{window:win,document:win.document,DOMParser:win.DOMParser,matchMedia:query=>query.includes('min-width')?{matches:true,addEventListener(){}}:motion,addEventListener:win.addEventListener.bind(win),requestAnimationFrame:callback=>callback(),fetch:async()=>({ok:true,text:async()=>asset})});
 win.IntersectionObserver=class{constructor(callback){this.callback=callback}observe(){this.callback([{isIntersecting:true}])}};globalThis.IntersectionObserver=win.IntersectionObserver;
 await import(`../dist/forge-reveal.mjs?test=${reduced}`);
 for(let i=0;i<10&&!win.document.querySelector('.forge-reveal.has-circuit');i++)await new Promise(resolve=>setTimeout(resolve,0));
 await new Promise(resolve=>setTimeout(resolve,0));
 const section=win.document.querySelector('#signal-forge');assert(section.classList.contains('has-circuit'));
 const svg=section.querySelector('#forge-reveal-circuit svg');assert(svg);
 assert.equal(svg.querySelectorAll('.wire[data-home-trace]').length,3);
 for(const hop of svg.querySelectorAll('.forge-crossing'))assert.equal(hop.hasAttribute('data-home-trace'),!!svg.querySelector(`.wire[data-home-trace][data-wire="${hop.getAttribute('data-crossing-wire')}"]`));
 assert.equal(svg.querySelectorAll('[data-home-trace] .wire-line[pathLength="1"]').length,3);
 assert(svg.querySelector('[data-component="neckVolume"][data-home-inspect]'));
 assert(svg.querySelector('[data-terminal="neckVolume.lug2"][data-home-inspect]'));
 assert(circuit.contacts.some(([a,b])=>a==='selector.neck'&&b==='selector.outN'));
 const report=forgeResponse(circuit);assert(report.supported&&!report.reference);
 assert(section.querySelector('.forge-reveal-inspect small').textContent.includes('selector.neck')===false);
 assert(section.querySelector('.forge-reveal-inspect small').textContent.includes('Neck input'));
 assert(section.querySelector('.forge-reveal-inspect-path').textContent.includes('Selector → Output jack'));
 assert(section.querySelector('.forge-reveal-response-context').textContent.includes('Modelled electrical response across 20 Hz–20 kHz.'));
 assert(section.querySelector('.forge-reveal-response-state').textContent.includes('Modern wiring · Neck pickup'));
 assert.equal(section.querySelector('#forge-reveal-response .response-current').getAttribute('d'),responseGraph(report).querySelector('.response-current').getAttribute('d'));
 assert.equal(section.querySelector('#forge-reveal-response .response-current').getAttribute('pathLength'),'1');
 assert.equal(section.classList.contains('is-animated'),!reduced);
 if(reduced)assert.equal(section.dataset.stage,'3');
 else{
  Object.defineProperty(section,'offsetHeight',{value:3000});Object.defineProperty(globalThis,'innerHeight',{value:1000,configurable:true});
  for(const [top,stage] of [[0,'0'],[-600,'1'],[-1100,'2'],[-1700,'3']]){
   section.getBoundingClientRect=()=>({top});win.dispatchEvent(new win.Event('scroll'));
   assert.equal(section.dataset.stage,stage);
  }
 }
 assert.equal(section.querySelector('.forge-reveal-primary').getAttribute('href'),'/circuit-forge/');
 win.close();
}
await inspect(false);await inspect(true);
console.log('Homepage Forge narrative, shared circuit, response authority, static and reduced-motion states PASS');

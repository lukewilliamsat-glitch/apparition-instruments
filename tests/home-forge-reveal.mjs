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
assert.equal(asset,forgeDiagram(circuit).replace('viewBox="0 0 1320 1275"','viewBox="0 75 1320 1200"'));
assert(html.includes('id="signal-forge"')&&html.includes('forge-reveal.mjs'));
for(const chapter of [0,1,2,3])assert(html.includes(`data-forge-chapter="${chapter}"`));
assert(html.includes('href="/circuit-forge/"')&&html.includes('href="/wiring-generator/"'));
assert(html.includes('class="ethos section"')&&html.includes('class="product-list"'));
assert.deepEqual([-.1,0,.24,.25,.5,.75,1,2].map(chapterForProgress),[0,0,0,1,2,3,3,3]);
assert(css.includes('prefers-reduced-motion:reduce')&&css.includes('.forge-reveal:not(.is-animated)'));

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
 assert.equal(svg.querySelectorAll('[data-home-trace]').length,3);
 assert(svg.querySelector('[data-component="neckVolume"][data-home-inspect]'));
 assert(svg.querySelector('[data-terminal="neckVolume.lug2"][data-home-inspect]'));
 assert(circuit.contacts.some(([a,b])=>a==='selector.neck'&&b==='selector.outN'));
 const report=forgeResponse(circuit);assert(report.supported&&!report.reference);
 assert.equal(section.querySelector('#forge-reveal-response .response-current').getAttribute('d'),responseGraph(report).querySelector('.response-current').getAttribute('d'));
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

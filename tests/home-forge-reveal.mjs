import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {conventionalSignalStudy} from '../dist/electronics/presentation/educational-truth.mjs';
import {execFileSync} from 'node:child_process';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
import {homepageCircuit,homepageSpecificationKey} from '../dist/electronics/presentation/homepage-state.mjs';
import {forgeResponse} from '../dist/circuit-forge/response.mjs';
import {responseGraph} from '../dist/circuit-forge/response-view.mjs';
import {chapterForProgress} from '../dist/forge-reveal.mjs';

const html=readFileSync('dist/index.html','utf8'),asset=readFileSync('dist/assets/signal-forge-full.svg','utf8'),css=readFileSync('dist/homepage.css','utf8');
const circuit=homepageCircuit(),study=conventionalSignalStudy(circuit);
// Generated output follows the current graph and presentation authority.
const expected=drawCircuit(homepageCircuit(),{exporting:true,mode:'trace',palette:'editorial',surface:'dark'}).replace('<svg ','<svg data-homepage-specification="'+homepageSpecificationKey(homepageCircuit()).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')+'" ');
assert.equal(asset,expected);
assert(html.includes('id="signal-forge"')&&html.includes('forge-reveal.mjs?rev=signal-forge-identity-v1'));
assert(html.includes('homepage.css?rev=signal-forge-mobile-v1')&&html.includes('signal-forge-full.svg?rev=platform-qa-v1'));
for(const chapter of [0,1,2,3])assert(html.includes(`data-forge-chapter="${chapter}"`));
assert(html.includes('href="/circuit-forge/"')&&html.includes('href="/wiring-generator/"'));
assert(html.includes('class="ethos section"')&&html.includes('class="product-list"'));
assert.deepEqual([-.1,0,.24,.25,.5,.75,1,2].map(chapterForProgress),[0,0,0,1,2,3,3,3]);
assert(css.includes('prefers-reduced-motion:reduce')&&css.includes('.forge-reveal:not(.is-animated)'));
assert(!html.includes('forge-reveal-continuation')&&!css.includes('forge-reveal-continuation'),'Analyse has no decorative conductor');
assert(css.includes('.forge-crossing:not([data-home-trace]) path{stroke:#8d7a55;opacity:.48}'));

async function inspect(reduced){
 const win=new Window({url:'https://apparitioninstruments.co.uk/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});win.document.write(html);
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
 assert(svg.querySelector('[data-component="masterVolume"][data-home-inspect]'));
 assert(svg.querySelector('[data-terminal="masterVolume.lug2"][data-home-inspect]'));
 assert(circuit.contacts.some(pair=>pair.includes('selector.AC')&&pair.includes('selector.A3')));assert.equal(study.signal[1],'masterVolume.lug3');assert.equal(study.loading[0],'masterVolume.lug3');const tip=svg.querySelector('[data-terminal="jack.tip"]'),sleeve=svg.querySelector('[data-terminal="jack.sleeve"]');assert.notEqual(tip.getAttribute('cx'),sleeve.getAttribute('cx'));const routed=svg.querySelector('[data-wire="jackSignal"] .wire-line').getAttribute('d').match(/-?\d+(?:\.\d+)?/g).slice(-2).map(Number);assert.deepEqual(routed,[Number(tip.getAttribute('cx')),Number(tip.getAttribute('cy'))]);assert.equal(svg.querySelectorAll('.signal-travel').length,3);for(const travel of svg.querySelectorAll('.signal-travel'))assert.equal(travel.getAttribute('d'),travel.parentElement.querySelector('.wire-line').getAttribute('d'));
 const report=forgeResponse(circuit);assert(report.supported&&!report.reference);
 assert(section.querySelector('.forge-reveal-inspect small').textContent.includes('selector.neck')===false);
 assert(section.querySelector('.forge-reveal-inspect small').textContent.includes('signal-input lug 3'));
 assert(section.querySelector('.forge-reveal-inspect-path').textContent.includes('Wiper 2 → Output jack TIP'));
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

// Lock the accepted experience, not merely the presence of a static SVG.
const baselineCSS=execFileSync('git',['show','2d8cf37:dist/homepage.css'],{encoding:'utf8'});assert(css.startsWith(baselineCSS),'Known-good composition/scroll/reveal CSS restored verbatim');
const baselineHTML=execFileSync('git',['show','2d8cf37:dist/index.html'],{encoding:'utf8'}),sectionPattern=/<section class="forge-reveal"[\s\S]*?<\/section>/;assert.equal(html.match(sectionPattern)[0],baselineHTML.match(sectionPattern)[0],'Known-good section markup restored verbatim');
const controller=readFileSync('dist/forge-reveal.mjs','utf8'),generator=readFileSync('scripts/generate-signal-forge-preview.mjs','utf8');assert(!controller.includes('homepage-editorial')&&!generator.includes('homepageEditorial'));assert(controller.includes("addEventListener('scroll',schedule")&&controller.includes('section.dataset.stage=String(next)'));assert(css.includes('height:300svh')&&css.includes('position:sticky;top:0;height:100svh'));assert(html.includes('id="forge-reveal-response"')&&html.includes('class="forge-reveal-inspect"'));assert(css.includes('@keyframes home-signal-travel')&&css.includes('.signal-travel{animation:none!important;display:none}'));console.log('Known-good staged experience regression contract and corrected electrical anchors PASS');

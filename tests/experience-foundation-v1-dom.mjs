import {bridgeSplitModifier} from '../dist/electronics/switching/devices.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {installDOMEnvironment} from './fixtures/dom-environment.mjs';
import {installCatalogueFixture} from './fixtures/catalogue-fixture.mjs';
import {createReference} from '../dist/electronics/instrument/configuration.mjs';
import {makeInstrumentCircuit} from '../dist/electronics/instrument/circuit.mjs';
import {projectFromCircuit,projectURL,readProject} from '../dist/electronics/state/project.mjs';
const i=createReference('hss');i.switching=[bridgeSplitModifier()];
const project=projectFromCircuit(makeInstrumentCircuit(i));
const win=new Window({url:'https://fixture.test'+projectURL('/circuit-forge/',project),settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});win.happyDOM.setWindowSize({width:390,height:844});installDOMEnvironment(win);installCatalogueFixture();
document.write(readFileSync('dist/circuit-forge/index.html','utf8'));
for(const path of ['dist/circuit-forge/forge.css','dist/wiring-generator/workbench.css','dist/electronics/ui/state-console.css','dist/circuit-forge/experience-foundation.css']){const s=document.createElement('style');s.textContent=readFileSync(path,'utf8').replaceAll('@media(','@media (');document.head.append(s);}
const $=s=>document.querySelector(s),viewport=$('#forge-viewport'),mount=$('#forge-diagram');let width=370;
Object.defineProperties(viewport,{clientWidth:{get:()=>width},clientHeight:{get:()=>420}});
await import('../dist/circuit-forge/app.mjs?experience-foundation');
for(const w of [320,360,390,412,768,1024,1400,1920]){
 width=w-20;win.happyDOM.setWindowSize({width:w,height:844});win.dispatchEvent(new Event('resize'));
 assert(mount.querySelector('svg'));assert(!$('#forge-mode-physical').hidden);
 if(w<=850){
  for(const n of [document.body,$('#main'),$('.forge-layout'),$('.forge-workbench')]){const style=win.getComputedStyle(n);assert.equal(style.overflow,'visible',n.className+' must not clip or own a hidden scroll area');assert.equal(style.height,'auto',n.className+' must remain in document flow');}
  assert.equal(win.getComputedStyle($('.forge-source-context')).display,'block');assert.equal(win.getComputedStyle($('.forge-source-context')).order,'5');assert.equal(win.getComputedStyle($('.forge-workspace-modes')).order,'0');assert.equal(win.getComputedStyle($('#forge-workbench-identity')).order,'1');assert.equal(win.getComputedStyle($('#forge-circuit-state')).order,'2');
  assert.equal(win.getComputedStyle(viewport).minHeight,'320px');assert.equal(win.getComputedStyle(viewport).overflow,'auto');assert.equal(win.getComputedStyle(viewport).touchAction,'pan-y');
  assert($('#forge-configure-sheet .forge-controls'));assert(!$('#forge-configure-sheet').open);assert(!$('.forge-layout>.forge-controls'));
  const original=mount.querySelector('svg'),left=viewport.scrollLeft,top=viewport.scrollTop;
  $('[data-mobile-open="configure"]').focus();$('[data-mobile-open="configure"]').click();assert($('#forge-configure-sheet').open);assert.equal(document.activeElement.dataset.mobileClose,'configure');
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!$('#forge-configure-sheet').open);assert.equal(document.activeElement.dataset.mobileOpen,'configure');assert.equal(mount.querySelector('svg'),original);assert.equal(viewport.scrollLeft,left);assert.equal(viewport.scrollTop,top);
  $('[data-mobile-open="inspector"]').click();assert($('#forge-inspector-sheet').open);$('[data-mobile-close="inspector"]').click();assert(!$('#forge-inspector-sheet').open);
 }
 for(const mode of ['build','trace','explain']){$('[data-forge-presentation="'+mode+'"]').click();assert.equal(mount.querySelector('svg').dataset.presentation,mode);if(w<=850&&mode!=='trace')assert.equal(win.getComputedStyle($('#forge-explore')).display,'none');assert.equal($('[data-forge-presentation="'+mode+'"]').getAttribute('aria-pressed'),'true');}
 for(const p of ['1','2','3','4','5']){document.querySelector('[data-state-device="selector"] [data-state-value="'+p+'"]').click();assert.equal(readProject(location.search).project.electronics.instrument.selector.selection,Number(p));}
 for(const state of ['up','down']){document.querySelector('[data-state-device="bridgeSplit"] [data-state-value="'+state+'"]').click();assert.equal(readProject(location.search).project.electronics.instrument.switching[0].position,state);}
 const svg=mount.querySelector('svg');$('#forge-fit').click();$('#forge-zoom-in').click();assert.equal(mount.querySelector('svg'),svg);assert.equal($('#forge-zoom-value').textContent,'150%');assert(viewport.classList.contains('is-magnified'));
 if(w<=850){viewport.setPointerCapture=()=>{};viewport.scrollLeft=100;viewport.scrollTop=100;
 const retained=readProject(location.search).project.electronics;
 viewport.dispatchEvent(new PointerEvent('pointerdown',{clientX:100,clientY:100,pointerId:10,pointerType:'touch',bubbles:true}));viewport.dispatchEvent(new PointerEvent('pointermove',{clientX:60,clientY:70,pointerId:10,pointerType:'touch',bubbles:true}));viewport.dispatchEvent(new PointerEvent('pointerup',{pointerId:10,pointerType:'touch',bubbles:true}));
 assert.equal(viewport.scrollLeft,140);assert.equal(viewport.scrollTop,130);assert.equal(mount.querySelector('svg'),svg);assert.deepEqual(readProject(location.search).project.electronics,retained);
 viewport.dispatchEvent(new PointerEvent('pointerdown',{clientX:100,clientY:100,pointerId:11,pointerType:'touch',bubbles:true}));viewport.dispatchEvent(new PointerEvent('pointerdown',{clientX:200,clientY:100,pointerId:12,pointerType:'touch',bubbles:true}));viewport.dispatchEvent(new PointerEvent('pointermove',{clientX:250,clientY:100,pointerId:12,pointerType:'touch',bubbles:true}));assert.equal($('#forge-zoom-value').textContent,'225%');for(const id of [11,12])viewport.dispatchEvent(new PointerEvent('pointercancel',{pointerId:id,pointerType:'touch',bubbles:true}));assert.equal(mount.querySelector('svg'),svg);
 }$('#forge-fit').click();assert.equal(mount.querySelector('svg'),svg);assert(!viewport.classList.contains('is-magnified'));
 const state=readProject(location.search).project.electronics; $('[data-forge-mode="signal"]').click();assert(!$('#forge-response-lab').hidden);assert($('#forge-mode-physical').hidden);$('[data-forge-mode="physical"]').click();assert.deepEqual(readProject(location.search).project.electronics,state);assert(mount.querySelector('svg'));
}
assert.equal(document.querySelectorAll('#forge-workbench-identity').length,1);assert.match($('#forge-workbench-identity').textContent,/HSS.*1V2T.*5-WAY/);
await win.happyDOM.close();console.log('Experience Foundation: actual CSS cascade permits page-flow canvas, eight widths, modal focus/escape, selector/split/modes, unchanged zoom SVG and Signal Lab state PASS; real-device acceptance pending');

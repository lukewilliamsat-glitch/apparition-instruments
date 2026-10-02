import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Window} from 'happy-dom';
import {installDOMEnvironment} from './fixtures/dom-environment.mjs';
import {installCatalogueFixture} from './fixtures/catalogue-fixture.mjs';
import {createReference,configureInstrumentDimensions} from '../dist/electronics/instrument/configuration.mjs';
import {toneSplitModifier,bridgeSplitModifier,prsSplitModifier} from '../dist/electronics/switching/devices.mjs';
import {makeInstrumentCircuit} from '../dist/electronics/instrument/circuit.mjs';
import {projectFromCircuit,projectURL,readProject} from '../dist/electronics/state/project.mjs';
const scenario=process.argv[2];if(!scenario){for(const s of ['forge-lp','generator-lp','forge-hss','generator-hss','forge-prs','generator-prs']){const p=spawnSync(process.execPath,[new URL(import.meta.url).pathname,s],{encoding:'utf8',timeout:90000});assert.equal(p.status,0,s+'\n'+p.stdout+p.stderr);console.log(p.stdout.trim());}process.exit(0);}
const tool=scenario.startsWith('forge')?'circuit-forge':'wiring-generator',kind=scenario.split('-')[1],i=kind==='lp'?createReference():createReference(kind==='prs'?'prs-hh':'hss');
i.switching=kind==='lp'?[toneSplitModifier('neck','up'),toneSplitModifier('bridge','down')]:kind==='hss'?[bridgeSplitModifier('up')]:[prsSplitModifier('up')];
for(const p of i.pickups)if(p.type==='humbucker')p.conductor='duncan';for(const v of i.controls)if(v.role==='volume')v.bleed=v.id==='neckVolume'?'duncan':'prs';
const project=projectFromCircuit(makeInstrumentCircuit(i),{name:'Private fixture'}),url=new URL('https://fixture.test'+projectURL('/'+tool+'/',project));
const win=new Window({url:url.href,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});installDOMEnvironment(win);document.write(readFileSync('dist/'+tool+'/index.html','utf8'));await installCatalogueFixture();win.happyDOM.setWindowSize({width:390,height:844});await import('../dist/'+tool+'/app.mjs?capability='+scenario);await new Promise(r=>setTimeout(r,10));
const $=s=>document.querySelector(s),prefix=tool==='circuit-forge'?'forge':'generator',mount=$('#'+prefix+'-'+(prefix==='forge'?'diagram':'mount'));assert(mount.querySelector('svg'),'diagram '+($('#generator-status')?.textContent||$('#forge-status')?.textContent));const state=()=>readProject(location.search).project.electronics.instrument;
assert.deepEqual(state().controls.filter(c=>c.role==='volume').map(c=>c.bleed),i.controls.filter(c=>c.role==='volume').map(c=>c.bleed));assert.equal(state().switching.length,i.switching.length);assert.equal(state().switching.find(m=>m.id===i.switching[0].id).position,i.switching[0].position);assert(state().pickups.filter(p=>p.type==='humbucker').every(p=>p.conductor==='duncan'));
const change=(node,value)=>{assert(node);node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));};
if(prefix==='forge'){
 if(kind==='lp'){change($('#forge-setting-neck-volume-treble-bleed'),'cap');assert.equal(state().controls.find(c=>c.id==='neckVolume').bleed,'cap');assert.equal(state().controls.find(c=>c.id==='bridgeVolume').bleed,'prs');change($('#forge-setting-wiring-style'),'50s');assert.equal(state().wiring,'50s');assert.equal(state().controls.find(c=>c.id==='neckVolume').bleed,'cap');}
 assert.equal($('#forge-capability-status').children[0].textContent,'Wiring available');assert.equal($('#forge-capability-status').children[2].textContent,'Kit unavailable');
}else if(kind==='lp'){
 change($('#generator-form').elements.neckBleed,'cap');assert.equal(state().controls.find(c=>c.id==='neckVolume').bleed,'cap');assert.equal(state().controls.find(c=>c.id==='bridgeVolume').bleed,'prs');change($('#generator-form').elements.wiring,'50s');assert.equal(state().wiring,'50s');assert.equal(state().controls.find(c=>c.id==='neckVolume').bleed,'cap');
}
const device=kind==='lp'?'neckSplit':kind==='prs'?'prsSplit':'bridgeSplit';$(`#${prefix}-circuit-state [data-state-device="${device}"] [data-state-value="down"]`).click();assert.equal(state().switching.find(m=>m.id===device).position,'down');assert(mount.querySelector('svg'));
for(const mode of ['build','trace','explain']){const button=$(prefix==='forge'?`[data-forge-presentation="${mode}"]`:`[data-mode="${mode}"]`);button.click();assert(mount.querySelector('svg'));assert.equal(state().switching.find(m=>m.id===device).position,'down');}
const before=mount.querySelector('svg');$(prefix==='forge'?'#forge-zoom-in':'#zoom-in').click();assert.equal(mount.querySelector('svg'),before);$(prefix==='forge'?'#forge-fit':'#zoom-fit').click();assert.equal(mount.querySelector('svg'),before);
const link=$(prefix==='forge'?'#forge-view-wiring':'#generator-source-circuit');assert.deepEqual(readProject(new URL(link.href).search).project.electronics.instrument.controls,state().controls);assert.deepEqual(readProject(new URL(link.href).search).project.electronics.instrument.switching,state().switching);
await win.happyDOM.close();console.log(scenario+': composition, colours, independent state, modes, zoom and handoff PASS');

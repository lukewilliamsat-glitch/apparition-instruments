import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Window} from 'happy-dom';
import {configureInstrumentDimensions,createReference} from '../dist/electronics/instrument/configuration.mjs';
import {makeInstrumentCircuit} from '../dist/electronics/instrument/circuit.mjs';
import {projectFromCircuit,projectURL,readProject} from '../dist/electronics/state/project.mjs';
const scenario=process.argv[2];if(!scenario){for(const s of ['forge-1V2T','forge-1V1T','generator-1V2T','generator-1V1T','generator-invalid']){const r=spawnSync(process.execPath,[new URL(import.meta.url).pathname,s],{encoding:'utf8',timeout:60000});assert.equal(r.status,0,r.stdout+'\n'+r.stderr);console.log(r.stdout.trim());}process.exit(0);}
const isForge=scenario.startsWith('forge'),layout=scenario.endsWith('invalid')?'1V2T':scenario.split('-')[1];const session=new Map();globalThis.sessionStorage={getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,v)};const project=projectFromCircuit(makeInstrumentCircuit(configureInstrumentDimensions(createReference('hss'),{controlLayout:layout})),{name:'Private fixture'}),tool=isForge?'circuit-forge':'wiring-generator';
const fixtureURL=new URL('https://fixture.test'+projectURL('/'+tool+'/',project));if(scenario.endsWith('invalid'))fixtureURL.searchParams.set('g',JSON.stringify({guitar:'hss',autoSplit:true}));
const win=new Window({url:fixtureURL.href,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});win.happyDOM.setWindowSize({width:1400,height:900});
for(const key of ['window','document','location','history','localStorage','navigator','CSS','Event','MouseEvent','KeyboardEvent','Node','HTMLElement','CustomEvent'])Object.defineProperty(globalThis,key,{value:key==='window'?win:win[key],configurable:true,writable:true});globalThis.matchMedia=win.matchMedia.bind(win);globalThis.requestAnimationFrame=win.requestAnimationFrame.bind(win);globalThis.fetch=async()=>{throw Error('Network forbidden in V3.1 fixtures');};document.write(readFileSync('dist/'+tool+'/index.html','utf8'));
const $=s=>document.querySelector(s),prefix=isForge?'forge':'generator',mount=$('#'+prefix+'-'+(isForge?'diagram':'mount')),viewport=$('#'+prefix+'-viewport');let vw=838,vh=620;Object.defineProperties(viewport,{clientWidth:{get:()=>vw},clientHeight:{get:()=>vh}});
let proto=win.HTMLElement.prototype;while(!Object.getOwnPropertyDescriptor(proto,'innerHTML'))proto=Object.getPrototypeOf(proto);const html=Object.getOwnPropertyDescriptor(proto,'innerHTML');Object.defineProperty(proto,'innerHTML',{...html,set(value){if(this===mount&&String(value).startsWith('<svg')){const svg=new win.DOMParser().parseFromString(String(value).replace(/<style>[\s\S]*?<\/style>/,''),'image/svg+xml').documentElement;this.replaceChildren(document.importNode(svg,true));}else html.set.call(this,value);}});
await import('../dist/'+tool+'/app.mjs?v31='+scenario);await new Promise(r=>setTimeout(r,10));if(scenario.endsWith('invalid')){assert(!mount.querySelector('svg'));assert.match($('#generator-status').textContent,/Unsupported generator option/);assert($('#export-svg').disabled);await win.happyDOM.close();console.log('HSS invalid advanced Generator state: safely rejected PASS');process.exit(0);}
assert(mount.querySelector('svg'));assert.equal(readProject(location.search).project.electronics.instrument.controlLayout,layout);const initial=readProject(location.search).project.electronics,link=isForge?'#forge-view-wiring':'#generator-source-circuit',source=$(link).href;
const fit=isForge?'#forge-fit':'#zoom-fit',plus=isForge?'#forge-zoom-in':'#zoom-in',output=isForge?'#forge-zoom-value':'#zoom-level';
for(const width of [320,390,768,1024,1400,1920]){vw=width<=850?width-20:width<=1300?width-300:width-600;vh=width<=850?400:620;win.happyDOM.setWindowSize({width,height:900});win.dispatchEvent(new Event('resize'));$(fit).click();const fitted=parseFloat(mount.style.width);assert(fitted>0&&fitted<=vw);const box=mount.querySelector('svg').getAttribute('viewBox').split(' ').map(Number);assert(fitted*box[3]/box[2]<=vh+1);assert.equal($(output).textContent,'100%');const svg=mount.querySelector('svg');$(plus).click();assert(parseFloat(mount.style.width)>fitted);assert.equal(mount.querySelector('svg'),svg,'zoom must not redraw the diagram');viewport.dispatchEvent(new KeyboardEvent('keydown',{key:'0',bubbles:true}));assert.equal($(output).textContent,'100%');assert.equal(mount.querySelector('svg'),svg);assert.equal(viewport.scrollLeft,0);assert.equal(viewport.scrollTop,0);assert.deepEqual(readProject(location.search).project.electronics,initial);assert.equal($(link).href,source);assert.equal(mount.querySelectorAll('svg').length,1);}

assert.equal(mount.querySelectorAll('[data-component="middleTone"]').length,layout==='1V2T'?1:0);
assert(mount.querySelector('[data-component="bridgePickup"]'));
const modeButtons=isForge?'[data-forge-presentation]':'[data-mode]';
for(const p of [1,2,3,4,5]){
 if(isForge)document.querySelector('#forge-controls input[name="position"][value="'+p+'"]').click();
 else{const field=$('#generator-form').elements.position;field.value=String(p);field.dispatchEvent(new Event('change',{bubbles:true}));}
 assert.equal(readProject(location.search).project.electronics.instrument.selector.selection,p,isForge?'Forge':$('#generator-status').textContent);
 assert.equal(readProject(new URL($(link).href).search).project.electronics.instrument.selector.selection,p);
 const currentMode=mount.querySelector('svg').dataset.presentation;
 assert.equal(!!mount.querySelector('[data-selector-position="'+p+'"]'),currentMode!=='build','Build retains fixed hardware; Trace/Explain show the active mechanism');
 if(isForge)assert.equal($('#forge-response-lab').classList.contains('is-unsupported'),[2,4].includes(p));
 for(const button of document.querySelectorAll(modeButtons)){
  button.click();assert.equal(mount.querySelectorAll('svg').length,1);
  mount.querySelector('[data-component="bridgePickup"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  if((isForge?button.dataset.forgePresentation:button.dataset.mode)==='explain')assert.match((isForge?$('#forge-inspection'):$('#inspection-content')).textContent,/full-series/);
 }
}
if(isForge){
 assert($('#forge-control-layout').closest('label'));assert.match($('#forge-instrument-summary').textContent,layout==='1V2T'?/middle.*bridge/:/master Tone/);
 $('#forge-control-layout').value=layout==='1V2T'?'1V1T':'1V2T';$('#forge-control-layout').dispatchEvent(new Event('change',{bubbles:true}));
 assert.equal(readProject(location.search).project.electronics.instrument.controlLayout,layout==='1V2T'?'1V1T':'1V2T');
 assert.equal(mount.querySelectorAll('[data-component="middleTone"]').length,layout==='1V2T'?0:1);
 assert($('#forge-kit').hidden);
}else{
 assert.equal($('#hss-control-layout').hidden,false);assert.equal($('#generator-form').elements.controlLayout.value,layout);
 const field=$('#generator-form').elements.controlLayout;field.value=layout==='1V2T'?'1V1T':'1V2T';field.dispatchEvent(new Event('change',{bubbles:true}));
 assert.equal(readProject(new URL($('#generator-source-circuit').href).search).project.electronics.instrument.controlLayout,field.value);
 assert($('#build-kit').hidden);assert.equal($('#generator-form').elements.colours.disabled,true);
}
await win.happyDOM.close();console.log('HSS '+scenario+' DOM: six viewport contracts, five positions, modes/keyboard, state and layout handoffs PASS; rendered QA deferred');process.exit(0);

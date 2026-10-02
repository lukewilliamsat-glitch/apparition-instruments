import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Window} from 'happy-dom';
import {forgeCircuit} from '../dist/circuit-forge/model.mjs';
import {defaultResponseAssumptions} from '../dist/electronics/response/assumptions.mjs';
import {captureCircuitState,circuitStateURL,designerHandoff,wiringHandoff,readCircuitState,readDesignerHandoff} from '../dist/electronics/state/circuit-state.mjs';
const scenario=process.argv[2];
if(!scenario){for(const s of ['forge','forge-invalid','designer','designer-invalid','generator','generator-invalid']){const r=spawnSync(process.execPath,[new URL(import.meta.url).pathname,s],{encoding:'utf8',timeout:45000});assert.equal(r.status,0,s+'\n'+r.stdout+'\n'+r.stderr);console.log(r.stdout.trim());}process.exit(0);}
const a=defaultResponseAssumptions();a.channels.neck={pickup:'high',volumePot:250,tonePot:1000};a.cableC=800;a.loadR=.5;
const source=forgeCircuit({position:'neck',neckProfile:'duncan',bridgeProfile:'dimarzio',bleed:'prs',neckCap:'0.010'},{neck:{volume:3.2,tone:4},bridge:{volume:8,tone:9}},a).circuit;
const snapshot=captureCircuitState(source),tool=scenario.startsWith('forge')?'circuit-forge':scenario.startsWith('designer')?'treble-bleed-designer':'wiring-generator';
const path=scenario==='designer-invalid'?'/treble-bleed-designer/?sf=broken&sr=broken':scenario==='generator-invalid'?'/wiring-generator/?sf=broken&g='+encodeURIComponent(JSON.stringify({position:'neck',neckCap:'0.047'})):scenario==='forge-invalid'?'/circuit-forge/?sf=broken':scenario==='forge'?circuitStateURL('/circuit-forge/',snapshot):scenario==='designer'?designerHandoff(source).url:wiringHandoff(source);
const win=new Window({url:'https://example.test'+path,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});
for(const key of ['window','document','location','history','localStorage','navigator','CSS','Event','MouseEvent','Node','HTMLElement','CustomEvent'])Object.defineProperty(globalThis,key,{value:key==='window'?win:win[key],configurable:true,writable:true});
globalThis.matchMedia=win.matchMedia.bind(win);globalThis.fetch=async()=>{throw Error('Network disabled in fixture');};
win.document.write(readFileSync('dist/'+tool+'/index.html','utf8'));
const $=s=>document.querySelector(s),click=s=>$(s).click(),change=(id,value)=>{$('#'+id).value=value;$('#'+id).dispatchEvent(new win.Event('change',{bubbles:true}));},input=(id,value)=>{$('#'+id).value=String(value);$('#'+id).dispatchEvent(new win.Event('input',{bubbles:true}));};
await import('../dist/'+tool+'/app.mjs?integration='+scenario);
if(scenario==='forge'){
 const form=$('#forge-controls');assert.equal(form.elements.neckProfile.value,'duncan');assert.equal(form.elements.bridgeProfile.value,'dimarzio');assert.match($('#forge-shared-summary').textContent,/Volume 3.2.*250\/1000 kΩ.*800 pF/);assert.match($('#forge-import-note').textContent,/imported/);
 click('[data-forge-mode="signal"]');assert.equal($('#forge-lab-pickup').value,'high');assert.equal($('#forge-lab-volumePot').value,'250');assert.equal($('#forge-response-volume-value').textContent,'3.2 / 10');assert.equal($('#forge-kit').hidden,true);assert.match($('#forge-kit-limit').textContent,/not currently available/);
 const svg=$('#forge-response-graph svg');click('[data-response-mode="frozen"]');click('#forge-freeze');const frozen=$('#forge-frozen-description').textContent,path=svg.querySelector('.response-reference').getAttribute('d');
 change('forge-lab-cableC','1200');input('forge-response-volume',5);input('forge-inspect-frequency',650);assert.match($('#forge-inspection-readout').textContent,/Reference.*Δ/);assert.equal(svg.querySelector('.response-reference').getAttribute('d'),path);
 click('[data-forge-mode="physical"]');click('[data-forge-mode="signal"]');assert.equal($('#forge-frozen-description').textContent,frozen);assert.equal($('#forge-lab-cableC').value,'1200');assert.equal($('#forge-response-volume-value').textContent,'5.0 / 10');
 const d=readDesignerHandoff(new URL($('#forge-design-bleed').href).search);assert.equal(d.response.volume,5);assert.equal(d.response.cableC,1200);
 const w=readCircuitState(new URL($('#forge-view-wiring').href).search);assert.equal(w.state.controlPositions.neck.volume,5);assert.equal(w.state.responseAssumptions.cableC,1200);
 click('[data-lab-pickup="bridge"]');assert.equal($('#forge-response-volume-value').textContent,'8.0 / 10');assert.equal($('#forge-lab-pickup').value,'generic');click('[data-lab-pickup="neck"]');assert.equal($('#forge-lab-pickup').value,'high');
 click('[data-response-mode="ab"]');assert.match($('.forge-response-reference').textContent,/same Volume 5.0/);
 for(const size of [{width:320,height:700},{width:390,height:844},{width:768,height:1024},{width:1400,height:900}]){win.happyDOM.setWindowSize(size);assert.equal($('#forge-lab-cableC').value,'1200');assert.equal($('#forge-frozen-description').textContent,frozen);assert($('#forge-view-wiring').href.includes('sf='));}
 form.reset();await new Promise(r=>setTimeout(r,5));assert.equal(form.elements.position.value,'both');assert.equal(form.elements.neckCap.value,'0.022');click('[data-lab-pickup="neck"]');assert.equal($('#forge-lab-volumePot').value,'500');assert.equal($('#forge-lab-cableC').value,'500');assert.equal($('#forge-response-volume-value').textContent,'7.0 / 10');assert.equal($('#forge-kit').hidden,false);
 const css=readFileSync('dist/circuit-forge/forge.css','utf8');assert(css.includes('.forge-context-actions a[hidden]'));assert(css.includes('overflow-wrap:anywhere'));assert(css.includes('min-height:44px'));assert.equal($('#forge-lab-pickup').getAttribute('aria-label'),'Pickup model');assert.match($('.forge-model-group').textContent,/not manufacturer-measured/);
}else if(scenario==='forge-invalid'){
 assert.match($('#forge-import-note').textContent,/Normal defaults/);assert.equal($('#forge-controls').elements.position.value,'both');
}else if(scenario==='designer-invalid'){assert.equal($('#designer-inputs').elements.volumePot.value,'500');assert.match($('#designer-import-note').textContent,/Normal defaults/);
}else if(scenario==='generator-invalid'){assert.equal($('#generator-form').elements.position.value,'both');assert.equal($('#generator-form').elements.neckCap.value,'0.022');assert.match($('#generator-status').textContent,/Normal defaults/);
}else if(scenario==='designer'){
 const form=$('#designer-inputs');assert.equal(form.elements.volumePot.value,'250');assert.equal(form.elements.pickupL.value,'7');assert.equal(form.elements.toneCap.value,'0.01');assert.equal(form.elements.bleedC.value,'0.18');assert.equal(form.elements.cableC.value,'800');assert.equal($('#designer-source-circuit').hidden,false);assert.match($('#designer-import-note').textContent,/full Volume/);
 assert.deepEqual(readCircuitState(new URL($('#designer-source-circuit').href).search).state,snapshot);
 form.reset();assert.equal(form.elements.volumePot.value,'500');assert.equal(form.elements.cableC.value,'500');assert.equal(form.elements.toneCap.value,'0.022');assert.equal($('#designer-source-circuit').hidden,true);
}else{
 const form=$('#generator-form');assert.equal(form.elements.neckCap.value,'0.010');assert.equal(form.elements.position.value,'neck');assert.match($('#generator-shared-summary').textContent,/250\/1000 kΩ/);assert.match($('#colour-legend').textContent,/NECK.*Seymour.*BRIDGE.*DiMarzio/s);assert.equal($('#build-kit').hidden,true);assert.match($('#generator-import-note').textContent,/retained for return/);
 assert.equal($('#build-guide-steps').children.length,0,'Guided entry hides future connections');const checklist=[...document.querySelectorAll('#guided-build button')].find(b=>b.textContent==='View full connection checklist');assert(checklist);checklist.click();assert($('#build-guide-steps').children.length);assert($('#connection-list').children.length);assert($('#build-parts').children.length);const check=$('#build-guide-steps input');check.checked=true;check.dispatchEvent(new win.Event('change',{bubbles:true}));assert.match($('#build-progress').textContent,/1 \/ /);$('#connection-list button').click();assert.match($('#inspection-description').textContent,/→/);for(const width of [320,390,768,1400]){win.happyDOM.setWindowSize({width,height:800});assert.equal(check.checked,true);}const notes=document.querySelector('.wiring-notes');const originalOpen=notes.open;win.dispatchEvent(new win.Event('beforeprint'));assert.equal(notes.open,true);win.dispatchEvent(new win.Event('afterprint'));assert.equal(notes.open,originalOpen);assert.equal(check.checked,true);
 const returned=readCircuitState(new URL($('#generator-source-circuit').href).search);assert.deepEqual(returned.state,snapshot);
 form.elements.position.value='bridge';form.elements.position.dispatchEvent(new win.Event('change',{bubbles:true}));assert.equal(readCircuitState(new URL($('#generator-source-circuit').href).search).state.configuration.position,'bridge');assert.equal(readCircuitState(win.location.search).state.responseAssumptions.cableC,800);
 form.reset();await new Promise(r=>setTimeout(r,5));assert.equal(form.elements.neckCap.value,'0.022');assert.equal($('#generator-source-circuit').hidden,true);assert.equal($('#build-kit').hidden,false);
}
if(scenario.startsWith('designer')){await Promise.allSettled([import('../dist/components/catalogue.mjs'),import('../dist/commerce.mjs')]);await new Promise(r=>setTimeout(r,10));}
await win.happyDOM.close();console.log('Integration DOM '+scenario+': PASS');process.exit(0);

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Window} from 'happy-dom';

const scenarios=['base','price-base','defaults','permissions','stock','zero-stock','stock-default','price-difference','zero-code'];
if(!process.argv[2]){
 for(const scenario of scenarios){const result=spawnSync(process.execPath,[new URL(import.meta.url).pathname,scenario],{encoding:'utf8'});if(result.status!==0)throw new Error(scenario+' DOM runtime failed:\n'+result.stderr+'\n'+result.stdout);console.log(result.stdout.trim());}
 process.exit(0);
}
const scenario=process.argv[2];
const window=new Window({url:'https://example.test/les-paul-kits/'});
window.happyDOM.settings.disableJavaScriptEvaluation=true;
window.happyDOM.settings.disableCSSFileLoading=true;
window.happyDOM.settings.disableJavaScriptFileLoading=true;
for(const key of ['window','document','localStorage','location','history','navigator','CSS','RadioNodeList','CustomEvent','Event','Node','HTMLElement'])Object.defineProperty(globalThis,key,{value:key==='window'?window:window[key],configurable:true,writable:true});
document.write(readFileSync(new URL('../dist/les-paul-kits/index.html',import.meta.url),'utf8'));
const {createComponentStore}=await import('../dist/admin/data.mjs');
const {createAssemblyStore}=await import('../dist/admin/assemblies.mjs');
const components=createComponentStore(localStorage),assemblies=createAssemblyStore(localStorage);
let records=components.list(),kit=assemblies.list().find(a=>a.id==='kit-les-paul');
function edit(id,patch){const record=components.list().find(item=>item.id===id);components.save({...record,...patch},id);}
for(const id of ['pot-short-cts-a','pot-short-alpha-a','pot-long-alpha-a','pot-long-cts-a','sbe-200','cde-022','cde-047','bleed-prs','switch-epiphone','jack-epiphone'])edit(id,{active:true,inKits:true,stock:10});
edit('pot-short-alpha-a',{kitPrice:0});edit('pot-long-alpha-a',{kitPrice:0});
kit.kitDefinition.permittedComponentIds=[...new Set([...kit.kitDefinition.permittedComponentIds,'pot-short-alpha-a','pot-long-alpha-a'])];
kit.kitDefinition.basePrice=7100;
if(scenario==='price-base')kit.kitDefinition.basePrice=7350;
kit.kitDefinition.defaults.wiring='modern';
kit.kitDefinition.defaults.componentIds.neckCapacitor='sbe-200';
kit.kitDefinition.defaults.componentIds.bridgeCapacitor='cde-022';
if(scenario==='defaults'){
 kit.kitDefinition.builderOptions.find(g=>g.key==='pots').defaultValue='Alpha';
 kit.kitDefinition.builderOptions.find(g=>g.key==='shaft').defaultValue='long';
 kit.kitDefinition.defaults.componentIds.neckCapacitor='cde-022';
 kit.kitDefinition.defaults.componentIds.bridgeCapacitor='cde-022';
 kit.kitDefinition.defaults.componentIds.trebleBleed='bleed-prs';
 kit.kitDefinition.defaults.componentIds.selector='switch-epiphone';
 kit.kitDefinition.defaults.componentIds.jack='jack-epiphone';
}
if(scenario==='permissions'){kit.kitDefinition.defaults.componentIds.bridgeCapacitor='sbe-200';kit.kitDefinition.permittedComponentIds=kit.kitDefinition.permittedComponentIds.filter(id=>!['cde-022','bleed-prs','switch-epiphone','jack-epiphone'].includes(id));}
if(scenario==='stock')edit('pot-short-alpha-a',{stock:3});
if(scenario==='zero-stock')edit('bleed-prs',{stock:0});
if(scenario==='stock-default'){edit('cde-047',{stock:0});kit.kitDefinition.defaults.componentIds.bridgeCapacitor='cde-047';}
if(scenario==='price-difference')edit('pot-short-cts-a',{kitPrice:800});
if(scenario==='zero-code'){
 const id='test-brand-x-short';const component=components.list().find(item=>item.id==='pot-short-alpha-a');components.save({...component,id,sku:id,name:'Test Brand X A500K Short',productTitle:'Test Brand X A500K Short',manufacturer:'Test Brand X',stock:12,kitPrice:300,specs:{...component.specs,Shaft:'Short'}},null);
 kit.kitDefinition.permittedComponentIds.push(id);
}
assemblies.save(kit,kit.id);
const errors=[];window.addEventListener('error',event=>errors.push(event.error||event.message));
await import('../dist/les-paul-kits/kits.mjs');
assert.deepEqual(errors,[],'no exception in actual Builder entry');
const $=selector=>document.querySelector(selector);
assert.notEqual($('#kit-price').textContent,'Calculating…');
assert.equal($('#kit-price').textContent,$('#builder-total').textContent);
assert.equal($('#kit-price').textContent,scenario==='defaults'?'£88.00':scenario==='price-base'?'£73.50':'£71.00');
const selected=name=>$('#kit-options').elements.namedItem(name).value;
const change=(name,value)=>{const control=$(`#kit-options [name="${name}"][value="${value}"]`);assert(control,'missing customer choice '+name+'='+value);control.checked=true;control.dispatchEvent(new Event('change',{bubbles:true}));};
if(scenario==='defaults'){
 assert.equal(selected('pots'),'Alpha');assert.equal(selected('shaft'),'long');assert.equal(selected('neckCap'),'cde-022');assert.equal(selected('bridgeCap'),'cde-022');assert.equal(selected('bleed'),'bleed-prs');assert.equal(selected('selector'),'switch-epiphone');assert.equal(selected('jack'),'jack-epiphone');
}else if(scenario==='permissions'){
 for(const [name,id] of [['neckCap','cde-022'],['bleed','bleed-prs'],['selector','switch-epiphone'],['jack','jack-epiphone']])assert.equal($(`#kit-options [name="${name}"][value="${id}"]`),null,'unpermitted '+id+' cannot be a customer option');
}else if(scenario==='stock'){
 assert.match($('[name="pots"][value="Alpha"]').closest('.choice-with-info').textContent,/Out of stock/);
 change('pots','Alpha');assert.match($('#copy-status').textContent,/Out of stock/i);assert.equal($('#add-to-basket').disabled,true);assert.match($('#kit-options').textContent,/Out of stock/);change('pots','CTS');assert.equal($('#add-to-basket').disabled,false);
 const {lesPaul}=await import('../dist/les-paul-kits/config.mjs');lesPaul.capacitors['cde-022'].component.stock=1;change('caps','cde-022');assert.equal($('#add-to-basket').disabled,true,'two capacitors require stock of at least two');change('caps','mixed');assert.equal($('#add-to-basket').disabled,false);
}else if(scenario==='zero-stock'){
 const option=$('[name="bleed"][value="bleed-prs"]');assert(option);assert.match(option.closest('.choice-with-info').textContent,/Out of stock/);change('bleed','bleed-prs');assert.equal($('#add-to-basket').disabled,true);change('bleed','none');assert.equal($('#add-to-basket').disabled,false);
}else if(scenario==='stock-default'){
 assert.equal(selected('bridgeCap'),'cde-047');assert.equal($('#add-to-basket').disabled,true);assert.match($('#copy-status').textContent,/Out of stock/);$('#kit-options [name="bridgeCap"]').value='cde-022';$('#kit-options [name="bridgeCap"]').dispatchEvent(new Event('change',{bubbles:true}));assert.equal($('#add-to-basket').disabled,false);
}else if(scenario==='price-difference'){
 change('pots','Alpha');assert.equal($('#kit-price').textContent,'£63.00');$('#add-to-basket').click();const record=JSON.parse(localStorage.getItem('apparition.basket.v1')).items[0].record;assert.equal(record.pricing.total,6300);assert.equal(record.pricing.lines.find(line=>line.key==='pots').price,-800);
}else if(scenario==='zero-code'){
 assert($('[name="pots"][value="Test Brand X"]'));change('pots','Test Brand X');assert.match($('#summary-pots').textContent,/Test Brand X/);assert.equal($('#add-to-basket').disabled,false);
}else if(scenario==='base'){
 assert.equal($('#add-to-basket').disabled,false);
 assert.equal(selected('caps'),'mixed');assert.equal(selected('neckCap'),'sbe-200');assert.equal(selected('bridgeCap'),'cde-022');
 change('pots','Alpha');assert.match($('#summary-pots').textContent,/Alpha/);assert.match($('#base-includes').textContent,/Alpha/);
 change('pots','CTS');assert.match($('#summary-pots').textContent,/CTS/);assert.match($('#base-includes').textContent,/CTS/);
 $('#add-to-basket').click();const saved=JSON.parse(localStorage.getItem('apparition.basket.v1')).items[0].record;
 assert.equal(saved.pricing.total,7100);assert.equal(saved.pricing.total,Number($('#kit-price').textContent.replace(/[^0-9]/g,'')));assert.equal(saved.kitDefinitionId,'kit-les-paul');
 assert.equal(saved.resolvedComponents.potentiometers.componentId,'pot-short-cts-a');assert.equal(saved.resolvedComponents.neckToneCapacitor.componentId,'sbe-200');assert.equal(saved.resolvedComponents.bridgeToneCapacitor.componentId,'cde-022');assert.match(saved.included,/CTS/);
 const {addKit}=await import('../dist/commerce.mjs');assert.throws(()=>addKit({...saved.configuration,jack:'jack-no-longer-permitted'}),/unavailable/i);
}
await window.happyDOM.abort();
console.log('Builder DOM '+scenario+': initial render, customer controls and resolved state passed.');

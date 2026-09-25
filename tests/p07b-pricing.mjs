import assert from 'node:assert/strict';
import {createComponentStore} from '../dist/admin/data.mjs';
import {createAssemblyStore} from '../dist/admin/assemblies.mjs';
import {createLocalComponentRepository,setComponentRepository} from '../dist/admin/component-repository.mjs';
import {createLocalAssemblyRepository,setAssemblyRepository} from '../dist/admin/assembly-repository.mjs';
const map=new Map(),storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};
const components=createComponentStore(storage),assemblies=createAssemblyStore(storage);
for(const id of ['pot-short-alpha-a','cde-022','cde-047','bleed-prs']){const item=components.list().find(x=>x.id===id);components.save({...item,active:true,inKits:true,stock:20,kitPrice:id==='bleed-prs'?400:0},id);}
const kit=assemblies.list().find(x=>x.id==='kit-les-paul');kit.kitDefinition.basePrice=3999;kit.kitDefinition.defaults.configurationPricing.matching.precision=999;kit.kitDefinition.defaults.pots='Alpha';kit.kitDefinition.builderOptions.find(x=>x.key==='pots').defaultValue='Alpha';kit.kitDefinition.permittedComponentIds=[...new Set([...kit.kitDefinition.permittedComponentIds,'pot-short-alpha-a','cde-022','cde-047','bleed-prs'])];assemblies.save(kit,kit.id);
globalThis.window={localStorage:storage};setComponentRepository(createLocalComponentRepository(storage));setAssemblyRepository(createLocalAssemblyRepository(storage));
const {resolveLesPaulKit,kitRecord}=await import('../dist/les-paul-kits/config.mjs');
const config={wiring:'modern',pots:'Alpha',shaft:'short',matching:'precision',caps:'mixed',neckCap:'cde-022',bridgeCap:'cde-047',bleed:'bleed-prs',jack:'none',selector:'none'};
const result=resolveLesPaulKit(config);assert.equal(result.pricing.lines.find(x=>x.key==='matching').price,999);assert.equal(result.pricing.lines.find(x=>x.key==='bleed').price,800);assert.equal(result.pricing.total,5798);assert.equal(kitRecord(config).pricing.basePrice,3999);
const {configuredKitDefinitions}=await import('../dist/wiring-kits/kit-data.mjs');
const changed=structuredClone(kit);changed.kitDefinition.defaults.configurationPricing.matching.precision=849;
assert.equal(configuredKitDefinitions(components.list(),changed)['les-paul'].matching.precision.price,849,'Builder price follows Kit Definition');
assert.throws(()=>configuredKitDefinitions(components.list(),{...changed,kitDefinition:{...changed.kitDefinition,defaults:{...changed.kitDefinition.defaults,configurationPricing:undefined}}}),/matching prices are unavailable/);
console.log('P07B canonical Builder matching price, 5798p configuration, basePrice field and missing-price fail-closed PASS');

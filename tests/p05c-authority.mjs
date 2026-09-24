import assert from 'node:assert/strict';
import {createPublicAssemblyRepository,createAdminAssemblyRepository} from '../dist/backend/assembly-data.mjs';
import {lesPaulKitAssembly} from '../dist/admin/assemblies.mjs';
import {configuredKitDefinitions} from '../dist/wiring-kits/kit-data.mjs';
import {initialComponents} from '../dist/admin/data.mjs';

const source=structuredClone(lesPaulKitAssembly),id=source.id,definition=source.kitDefinition;
definition.basePrice=3999;definition.defaults.pots='Alpha';definition.defaults.shaft='short';
definition.defaults.componentIds.potentiometers='pot-short-alpha-a';
definition.builderOptions.find(group=>group.key==='pots').defaultValue='Alpha';
definition.permittedComponentIds=[...new Set([...definition.permittedComponentIds,'pot-short-alpha-a','pot-long-alpha-a'])];
source.bom=[{componentId:'pot-short-cts-a',quantity:4},{componentId:'cde-022',quantity:1},{componentId:'cde-047',quantity:1}];
const tables={
 assemblies:[{id,sku:source.sku,name:source.name,category:source.category,kind:'wiring-kit',active:true}],
 assembly_bom:source.bom.map((row,position)=>({assembly_id:id,position,component_id:row.componentId,quantity:row.quantity})),
 kit_definitions:[{assembly_id:id,family:definition.family,base_price:3999,show_on_wiring_kits:true,builder_enabled:true,default_wiring_style:definition.defaults.wiring,defaults:definition.defaults,builder_options:definition.builderOptions,component_resolvers:definition.componentResolvers}],
 kit_definition_internal:[{assembly_id:id,metadata:definition.metadata}],
 kit_permitted_components:definition.permittedComponentIds.map(component_id=>({assembly_id:id,component_id}))
};
const view=()=>tables.assemblies.filter(a=>a.active).map(a=>({id:a.id,sku:a.sku,name:a.name,category:a.category,slug:definition.family,base_price:tables.kit_definitions[0].base_price,show_on_wiring_kits:tables.kit_definitions[0].show_on_wiring_kits,builder_enabled:tables.kit_definitions[0].builder_enabled,default_wiring_style:definition.defaults.wiring,defaults:tables.kit_definitions[0].defaults,builder_options:tables.kit_definitions[0].builder_options,component_resolvers:tables.kit_definitions[0].component_resolvers}));
const response=(rows,ok=true)=>({ok,status:ok?200:403,json:async()=>structuredClone(rows)});
const publicCalls=[],publicRepository=createPublicAssemblyRepository({config:{url:'https://test.supabase.co',publishableKey:'sb_publishable_test'},request:async(url,options)=>{publicCalls.push({url,options});return response(url.includes('catalogue_wiring_kits')?view():tables.kit_permitted_components);}});
const publicKit=await publicRepository.get(id);
assert.equal(publicKit.kitDefinition.basePrice,3999);
assert.equal(publicKit.kitDefinition.defaults.componentIds.potentiometers,'pot-short-alpha-a');
assert.equal(publicKit.kitDefinition.permittedComponentIds.length,definition.permittedComponentIds.length);
assert(publicCalls.every(call=>call.options.headers.apikey==='sb_publishable_test'&&!call.options.headers.Authorization));
const records=initialComponents().map(c=>({...c,active:true,inKits:true,stock:20}));
const configured=configuredKitDefinitions(records,publicKit)['les-paul'];
assert.equal(configured.basePrice,3999);assert.equal(configured.defaults.pots,'Alpha');assert.equal(configured.defaults.shaft,'short');
const transport={async send(table,{method='GET',query='',body}={}){
 if(table==='components')return response(initialComponents().map(component=>({id:component.id})));
 if(method==='GET')return response(tables[table]);
 let rows=tables[table],affected=[];
 if(method==='PATCH'){affected=rows.filter(row=>row.id===id||row.assembly_id===id);for(const row of affected)Object.assign(row,structuredClone(body));}
 if(method==='DELETE'){affected=rows.filter(row=>row.assembly_id===id);tables[table]=rows.filter(row=>row.assembly_id!==id);}
 if(method==='POST'){affected=structuredClone(Array.isArray(body)?body:[body]);rows.push(...affected);}
 return response(affected);
}};
const admin=createAdminAssemblyRepository(transport),before=await admin.get(id);
assert.deepEqual(before.bom,source.bom);assert.deepEqual(before.kitDefinition.metadata,definition.metadata);
const modified=structuredClone(before);modified.kitDefinition.basePrice=4123;modified.kitDefinition.showOnWiringKits=false;
const saved=await admin.save(modified,id);
assert.equal(saved.active,true);assert.equal(saved.kitDefinition.basePrice,4123);assert.equal(saved.kitDefinition.showOnWiringKits,false);
assert.deepEqual(saved.bom,source.bom);assert.deepEqual(saved.kitDefinition.permittedComponentIds,definition.permittedComponentIds);
assert.equal((await publicRepository.get(id)).kitDefinition.basePrice,4123);
assert.equal((await publicRepository.get(id)).kitDefinition.showOnWiringKits,false);
await assert.rejects(admin.save({...modified,id:'other'},'other'),/Creating or changing/);
await assert.rejects(createPublicAssemblyRepository({request:async()=>response([],false)}).list(),/No local configuration was substituted/);
const rejected=createAdminAssemblyRepository({send:async(table,options)=>table==='kit_definitions'&&options.method==='PATCH'?response([],false):transport.send(table,options)});
await assert.rejects(rejected.save(saved,id),/stays inactive/);
assert.equal(tables.assemblies[0].active,false,'failed shared writes cannot leave a public partial kit');
assert.deepEqual(await publicRepository.list(),[],'failed shared writes never use browser-local fallback');
console.log('P05C public Builder, authenticated Admin Assembly/BOM edits, visibility, no local fallback passed.');

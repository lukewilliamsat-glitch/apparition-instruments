import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';

// Reuses the accepted P07B builder fixture with exact catalogue and kit settings.
export async function seededKitRequest(base,query){
 const from=p=>import(pathToFileURL(resolve(base,'dist',p)));
 const [{createComponentStore},{createAssemblyStore},{createLocalComponentRepository,setComponentRepository},
  {createLocalAssemblyRepository,setAssemblyRepository}]=await Promise.all([
  from('admin/data.mjs'),from('admin/assemblies.mjs'),from('admin/component-repository.mjs'),from('admin/assembly-repository.mjs')
 ]);
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(k,v)=>data.set(k,v)};
 const components=createComponentStore(storage),assemblies=createAssemblyStore(storage);
 const ids=['pot-short-alpha-a','cde-022','cde-047','bleed-prs'];
 for(const id of ids){
  const item=components.list().find(x=>x.id===id);
  components.save({...item,active:true,inKits:true,stock:20,kitPrice:id==='bleed-prs'?400:0},id);
 }
 const kit=assemblies.list().find(x=>x.id==='kit-les-paul'),def=kit.kitDefinition;
 def.basePrice=3999;def.defaults.configurationPricing.matching.precision=999;def.defaults.pots='Alpha';
 def.builderOptions.find(x=>x.key==='pots').defaultValue='Alpha';
 def.permittedComponentIds=[...new Set([...def.permittedComponentIds,...ids])];
 assemblies.save(kit,kit.id);
 globalThis.window={localStorage:storage};
 setComponentRepository(createLocalComponentRepository(storage));setAssemblyRepository(createLocalAssemblyRepository(storage));
 const {kitRecord}=await from('les-paul-kits/config.mjs');
 const record=kitRecord({wiring:'modern',pots:'Alpha',shaft:'short',matching:'precision',caps:'mixed',
  neckCap:'cde-022',bridgeCap:'cde-047',bleed:'bleed-prs',jack:'none',selector:'none'});
 assert.equal(record.pricing.total,5798);
 for(const row of record.components.filter(x=>x.componentId!==null)){
  const c=row.component;
  await query(`insert into public.components(id,sku,name,manufacturer,category,specs,active,in_kits,kit_price)
   values($1,$2,$3,$4,$5,$6,true,true,$7)`,[c.id,c.sku,c.name,c.manufacturer,
    ({potentiometers:'potentiometers',neckToneCapacitor:'capacitors',bridgeToneCapacitor:'capacitors',trebleBleeds:'treble-bleeds'})[row.role],
    c.specification,c.kitPrice]);
  await query('insert into public.inventory(component_id,quantity) values($1,20)',[c.id]);
 }
 await query("insert into public.assemblies(id,sku,name,category,kind,active) values($1,$2,$3,$4,'wiring-kit',true)",[kit.id,kit.sku,kit.name,kit.category]);
 await query(`insert into public.kit_definitions(assembly_id,family,base_price,builder_enabled,default_wiring_style,defaults,builder_options,component_resolvers)
  values($1,'les-paul',$2,true,'modern',$3,$4,$5)`,[kit.id,def.basePrice,def.defaults,JSON.stringify(def.builderOptions),JSON.stringify(def.componentResolvers)]);
 for(const id of ids)await query('insert into public.kit_permitted_components values($1,$2)',[kit.id,id]);
 return {requestId:randomUUID(),checkoutMode:'stripe',deliveryMethod:'standard',
  items:[{product:'les-paul',quantity:1,record}]};
}

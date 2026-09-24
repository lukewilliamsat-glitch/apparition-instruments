import {publicBackendConfig} from './public-config.mjs';
import {normaliseKitDefinition} from '../admin/assemblies.mjs';

// P05C: browser-local Assembly records are audit evidence, never production fallback.
const path=(config,table,query='')=>config.url+'/rest/v1/'+table+query;
const filter=id=>'?assembly_id=eq.'+encodeURIComponent(id);
async function decode(response,label){
 if(!response.ok)throw new Error(label+' is unavailable ('+response.status+'). No local configuration was substituted.');
 const rows=await response.json();if(!Array.isArray(rows))throw new Error('Invalid '+label+' response.');return rows;
}
function assemble(a,definition,bom,permitted,metadata={}){
 return {id:a.id,sku:a.sku,name:a.name,category:a.category,kind:a.kind||'wiring-kit',active:a.active,
  bom:bom.map(row=>({componentId:row.component_id,quantity:row.quantity})),
  kitDefinition:{family:definition.family,basePrice:definition.base_price,
   showOnWiringKits:definition.show_on_wiring_kits,builderEnabled:definition.builder_enabled,
   defaults:definition.defaults,builderOptions:definition.builder_options,
   componentResolvers:definition.component_resolvers,permittedComponentIds:permitted.map(row=>row.component_id),metadata}};
}

export function createPublicAssemblyRepository({config=publicBackendConfig,request=globalThis.fetch}={}){
 if(typeof request!=='function')throw new Error('Public Assembly request transport required.');
 const read=async(table)=>decode(await request(path(config,table,'?select=*'),{headers:{apikey:config.publishableKey,Accept:'application/json'}}),'Public '+table);
 const list=async()=>{
  const [kits,permitted]=await Promise.all([read('catalogue_wiring_kits'),read('kit_permitted_components')]);
  return kits.map(row=>assemble({...row,active:true,kind:'wiring-kit'},
   {...row,family:row.slug},[],permitted.filter(item=>item.assembly_id===row.id)));
 };
 return Object.freeze({list,async get(id){return (await list()).find(item=>item.id===id)||null;}});
}

export function createAdminAssemblyRepository(transport){
 if(typeof transport?.send!=='function')throw new Error('Authenticated Admin Assembly transport required.');
 const read=async table=>decode(await transport.send(table,{query:'?select=*'}),'Admin '+table);
 const write=async(table,method,query,body,expected)=>{
  const response=await transport.send(table,{method,query,body,prefer:'return=representation'});
  const rows=await decode(response,'Admin '+table+' save');
  if(rows.length!==expected)throw new Error('Admin '+table+' save affected '+rows.length+' records, expected '+expected+'. Configuration may be incomplete; review Admin before retrying.');
  return rows;
 };
 const list=async()=>{
  const [assemblies,bom,definitions,internal,permitted]=await Promise.all([
   read('assemblies'),read('assembly_bom'),read('kit_definitions'),read('kit_definition_internal'),read('kit_permitted_components')]);
  return assemblies.map(assembly=>{
   const rows=bom.filter(row=>row.assembly_id===assembly.id).sort((a,b)=>a.position-b.position),definition=definitions.find(item=>item.assembly_id===assembly.id);
   if(assembly.kind==='wiring-kit'){
    const extra=internal.find(item=>item.assembly_id===assembly.id);
    if(!definition||!extra)throw new Error('Shared Kit Definition is incomplete. No local data was substituted.');
    return assemble(assembly,definition,rows,permitted.filter(item=>item.assembly_id===assembly.id),extra.metadata);
   }
   return {id:assembly.id,sku:assembly.sku,name:assembly.name,category:assembly.category,
    kind:assembly.kind,active:assembly.active,bom:rows.map(row=>({componentId:row.component_id,quantity:row.quantity}))};
  });
 };
 const get=async id=>(await list()).find(item=>item.id===id)||null;
 return Object.freeze({list,get,
  async save(input,id){
   // P05C migrates an existing operational family. New families are a later pass.
   if(!id||id!=='kit-les-paul'||input?.kind!=='wiring-kit')throw new Error('Creating or changing Wiring Kit families is not available in this pass.');
   const before=await get(id);if(!before)throw new Error('Shared Assembly no longer exists. Refresh Admin.');
   const name=String(input.name??'').trim(),sku=String(input.sku??'').trim(),category=String(input.category??'').trim();
   if(!name||!sku||!category||name.length>300||sku.length>80||category.length>100)throw new Error('Enter a valid Assembly name, SKU and category.');
   if(!Array.isArray(input.bom)||input.bom.some(row=>!row.componentId||!Number.isSafeInteger(Number(row.quantity))||Number(row.quantity)<1))throw new Error('BOM rows need a Component and positive whole quantity.');
   const kit=normaliseKitDefinition(input.kitDefinition);
   if(kit.family!==before.kitDefinition.family)throw new Error('Existing Kit family identity must remain stable.');
   const bom=input.bom.map((row,position)=>({assembly_id:id,position,component_id:row.componentId,quantity:Number(row.quantity)}));
   const permissions=kit.permittedComponentIds.map(component_id=>({assembly_id:id,component_id}));
   const known=new Set((await decode(await transport.send('components',{query:'?select=id'}),'Admin Component IDs')).map(row=>row.id));
   const references=[...bom.map(row=>row.component_id),...permissions.map(row=>row.component_id),...Object.values(kit.defaults.componentIds||{}).filter(Boolean),...kit.componentResolvers.flatMap(resolver=>resolver.mappings.map(mapping=>mapping.componentId).filter(Boolean))];
   const missing=[...new Set(references.filter(componentId=>!known.has(componentId)))];
   if(missing.length)throw new Error('Unresolved shared Component IDs: '+missing.join(', ')+'. No Assembly data was changed.');
   // Keep public configuration unavailable while multi-table REST writes complete.
   if(before.active)await write('assemblies','PATCH','?id=eq.'+encodeURIComponent(id),{active:false},1);
   try{
    await write('kit_definitions','PATCH',filter(id),{base_price:kit.basePrice,show_on_wiring_kits:kit.showOnWiringKits,
     builder_enabled:kit.builderEnabled,default_wiring_style:kit.defaults.wiring,defaults:kit.defaults,
     builder_options:kit.builderOptions,component_resolvers:kit.componentResolvers,updated_at:new Date().toISOString()},1);
    await write('kit_definition_internal','PATCH',filter(id),{metadata:kit.metadata},1);
    if(JSON.stringify(input.bom.map(row=>({componentId:row.componentId,quantity:Number(row.quantity)})))!==JSON.stringify(before.bom)){
     await write('assembly_bom','DELETE',filter(id),undefined,before.bom.length);
     if(bom.length)await write('assembly_bom','POST','',bom,bom.length);
    }
    if(JSON.stringify(kit.permittedComponentIds)!==JSON.stringify(before.kitDefinition.permittedComponentIds)){
     await write('kit_permitted_components','DELETE',filter(id),undefined,before.kitDefinition.permittedComponentIds.length);
     if(permissions.length)await write('kit_permitted_components','POST','',permissions,permissions.length);
    }
    await write('assemblies','PATCH','?id=eq.'+encodeURIComponent(id),{name,sku,category,active:!!input.active,updated_at:new Date().toISOString()},1);
   }catch(error){throw new Error(error.message+' The Assembly stays inactive until a verified Admin save restores it.');}
   return get(id);
  },
  async remove(){throw new Error('Deleting the operational Kit Definition is unavailable during P05C.');}
 });
}

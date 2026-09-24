// Dry-run mapper for P05B/P05C. No network or storage writes and no seed fallback.
// Import must use an explicit export of the user's actual browser-local records.
export function planLocalImport(componentEnvelope,assemblyEnvelope){
 if(componentEnvelope?.version!==1||!Array.isArray(componentEnvelope.items)||
    assemblyEnvelope?.version!==3||!Array.isArray(assemblyEnvelope.items))throw new Error('Explicit, readable Component v1 and Assembly v3 exports are required.');
 const unique=(rows,label)=>{const ids=new Set(),skus=new Set();for(const row of rows){if(!row.id||!row.sku||ids.has(row.id)||skus.has(row.sku.toLowerCase()))throw new Error('Duplicate or missing '+label+' identity.');ids.add(row.id);skus.add(row.sku.toLowerCase());}return ids;};
 const componentIds=unique(componentEnvelope.items,'Component');unique(assemblyEnvelope.items,'Assembly');
 const checkId=id=>{if(!componentIds.has(id))throw new Error('Unresolved Component ID: '+id);return id;};
 const components=componentEnvelope.items.map(c=>({id:c.id,sku:c.sku,name:c.name,category:c.category,manufacturer:c.manufacturer||'',description:c.description||'',specs:structuredClone(c.specs||{}),product_content:{productTitle:c.productTitle||'',shortDescription:c.shortDescription||'',fullDescription:c.fullDescription||'',productSpecifications:structuredClone(c.productSpecifications||[])},active:!!c.active,individually:!!c.individually,in_kits:!!c.inKits,sale_price:c.salePrice??null,kit_price:c.kitPrice??null,kit_price_quantity:c.kitPriceQuantity??null,image:structuredClone(c.image??null)}));
 const inventory=componentEnvelope.items.map(c=>({component_id:c.id,quantity:c.stock,stock_unit:c.stockUnit||'item'}));
 const componentInternal=componentEnvelope.items.map(c=>({component_id:c.id,internal_unit_cost:c.internalUnitCost??null}));
 const assemblies=assemblyEnvelope.items.map(a=>({id:a.id,sku:a.sku,name:a.name,category:a.category,kind:a.kind,active:!!a.active}));
 const assemblyBom=assemblyEnvelope.items.flatMap(a=>a.bom.map((row,position)=>({assembly_id:a.id,position,component_id:checkId(row.componentId),quantity:row.quantity})));
 const kitDefinitions=[],kitPermittedComponents=[],kitDefinitionInternal=[];
 for(const a of assemblyEnvelope.items.filter(a=>a.kind==='wiring-kit')){
  const d=a.kitDefinition;if(!d?.family)throw new Error('Missing Kit Definition for '+a.id);
  kitDefinitions.push({assembly_id:a.id,family:d.family,base_price:d.basePrice,show_on_wiring_kits:!!d.showOnWiringKits,builder_enabled:!!d.builderEnabled,default_wiring_style:d.defaults?.wiring,defaults:structuredClone(d.defaults),builder_options:structuredClone(d.builderOptions||[]),component_resolvers:structuredClone(d.componentResolvers||[])});
  kitDefinitionInternal.push({assembly_id:a.id,metadata:structuredClone(d.metadata||{})});
  for(const id of d.permittedComponentIds||[])kitPermittedComponents.push({assembly_id:a.id,component_id:checkId(id)});
  for(const id of Object.values(d.defaults?.componentIds||{}).filter(Boolean))checkId(id);
  for(const id of (d.componentResolvers||[]).flatMap(r=>r.mappings||[]).map(m=>m.componentId).filter(Boolean))checkId(id);
 }
 return {components,componentInternal,inventory,assemblies,assemblyBom,kitDefinitions,kitDefinitionInternal,kitPermittedComponents};
}

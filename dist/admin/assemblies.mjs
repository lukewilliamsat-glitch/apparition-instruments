// Development-local assembly records reference component IDs. No component stock is copied or written.
import {kitBindings} from './kit-bindings.mjs';
import {lesPaul} from '../wiring-kits/kit-seed.mjs';
export const assemblyStorageKey='apparition.admin.assemblies.v1';
export const lesPaulKitDefinitionId='kit-les-paul';
const componentDefaults={potentiometers:'pot-short-cts-a',neckCapacitor:'sbe-200',bridgeCapacitor:'cde-047',trebleBleed:null,jack:null,selector:null};
export const lesPaulKitAssembly={
 id:lesPaulKitDefinitionId,name:lesPaul.name,sku:'KIT-LP-STYLE',category:'Wiring Kit',kind:'wiring-kit',active:true,
 bom:[{componentId:'pot-short-cts-a',quantity:4},{componentId:'sbe-200',quantity:1},{componentId:'cde-047',quantity:1}],
 kitDefinition:{family:'les-paul',showOnWiringKits:true,builderEnabled:true,permittedComponentIds:Object.keys(kitBindings),defaults:{...structuredClone(lesPaul.defaults),componentIds:componentDefaults},metadata:{wiringOptions:Object.keys(lesPaul.wiring),matchingOptions:Object.keys(lesPaul.matching)}}
};
const clean=(value,max=300)=>String(value??'').trim().slice(0,max);
const uniqueIds=value=>{if(!Array.isArray(value))throw new Error('Permitted components must be a list of Component IDs.');const ids=[...new Set(value.map(id=>clean(id,120)).filter(Boolean))];if(ids.length!==value.length)throw new Error('Permitted Component IDs must be unique and non-empty.');return ids;};
export function normaliseKitDefinition(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid wiring kit definition.');
 const family=clean(value.family,100);if(!family)throw new Error('Enter a kit family.');
 const permittedComponentIds=uniqueIds(value.permittedComponentIds);const supplied=value.defaults;
 if(!supplied||typeof supplied!=='object'||Array.isArray(supplied))throw new Error('Invalid default specification.');
 const componentIds={};for(const role of Object.keys(componentDefaults)){const id=supplied.componentIds?.[role];componentIds[role]=id==null||id===''?null:clean(id,120);if(componentIds[role]&&!permittedComponentIds.includes(componentIds[role]))throw new Error('Each default Component must also be permitted for this kit.');}
 const defaults={...structuredClone(supplied),wiring:clean(supplied.wiring,80),componentIds};if(!defaults.wiring)throw new Error('Choose a default wiring style.');
 const metadata=value.metadata&&typeof value.metadata==='object'&&!Array.isArray(value.metadata)?structuredClone(value.metadata):{};
 return {family,showOnWiringKits:!!value.showOnWiringKits,builderEnabled:!!value.builderEnabled,permittedComponentIds,defaults,metadata};
}
function validateRecord(a,ids,skus){if(!a.id||ids.has(a.id)||!a.sku||skus.has(a.sku.toLowerCase())||!a.name||!Array.isArray(a.bom))throw new Error();ids.add(a.id);skus.add(a.sku.toLowerCase());if(a.kind==='wiring-kit')normaliseKitDefinition(a.kitDefinition);}
export function createAssemblyStore(storage){
 function list(){let raw;try{raw=storage.getItem(assemblyStorageKey);}catch{throw new Error('Browser storage is unavailable.');}try{if(raw===null)return structuredClone(write([lesPaulKitAssembly]));const data=JSON.parse(raw);if(![1,2].includes(data.version)||!Array.isArray(data.items))throw new Error();const ids=new Set(),skus=new Set();for(const a of data.items)validateRecord(a,ids,skus);const items=structuredClone(data.items);if(!items.some(a=>a.id===lesPaulKitDefinitionId||a.kind==='wiring-kit'&&a.kitDefinition?.family==='les-paul'))items.push(structuredClone(lesPaulKitAssembly));if(data.version!==2||items.length!==data.items.length)write(items);return items;}catch{throw new Error('Saved assemblies could not be read. No data was reset.');}}
 function write(items){try{storage.setItem(assemblyStorageKey,JSON.stringify({version:2,items}));}catch{throw new Error('Assemblies could not be saved. Browser storage may be full or disabled.');}return items;}
 function save(input,id=null){const items=list(),index=items.findIndex(a=>a.id===id);if(id&&index<0)throw new Error('Assembly no longer exists.');const name=String(input.name??'').trim(),sku=String(input.sku??'').trim(),category=String(input.category??'').trim();if(!name||!sku||!category)throw new Error('Enter an assembly name, SKU and category.');if(name.length>300||sku.length>80||category.length>100)throw new Error('Assembly name, SKU or category is too long.');if(items.some(a=>a.id!==id&&a.sku.toLowerCase()===sku.toLowerCase()))throw new Error('That assembly SKU already exists.');if(!Array.isArray(input.bom))throw new Error('Invalid bill of materials.');const bom=input.bom.map(row=>{const quantity=Number(row.quantity);if(!row.componentId||typeof row.quantity==='boolean'||!Number.isSafeInteger(quantity)||quantity<=0)throw new Error('Each BOM row needs a component and a positive whole-number quantity.');return {componentId:String(row.componentId),quantity};});const kind=input.kind==='wiring-kit'?'wiring-kit':'assembly',record={id:id||crypto.randomUUID(),name,sku,category,kind,active:!!input.active,bom};if(kind==='wiring-kit')record.kitDefinition=normaliseKitDefinition(input.kitDefinition);if(index<0)items.push(record);else items[index]=record;write(items);return structuredClone(record);}
 function remove(id){const items=list();if(!items.some(a=>a.id===id))throw new Error('Assembly no longer exists.');write(items.filter(a=>a.id!==id));}
 return {list,save,remove};
}

export function kitReferenceStatus(assembly,components){
 const ids=new Set(components.map(component=>component.id)),definition=assembly?.kind==='wiring-kit'?assembly.kitDefinition:null;if(!definition)return {valid:[],missing:[],warnings:[]};
 const referenced=[...definition.permittedComponentIds,...Object.values(definition.defaults.componentIds||{}).filter(Boolean)],valid=[...new Set(referenced.filter(id=>ids.has(id)))],missing=[...new Set(referenced.filter(id=>!ids.has(id)))];return {valid,missing,warnings:missing.map(id=>'Missing Component reference: '+id+'.')};
}

// Calculated on demand from central inventory. Duplicate component rows are combined.
export function aggregateRequirements(bom,{fractional=false}={}){
 const warnings=[],required=new Map();
 if(!Array.isArray(bom))return {required,warnings:['Invalid bill of materials.']};

 for(const [index,row] of bom.entries()){
  const quantity=Number(row?.quantity);
  if(!row?.componentId||typeof row.quantity==='boolean'||!(fractional?Number.isFinite(quantity)&&quantity<=Number.MAX_SAFE_INTEGER:Number.isSafeInteger(quantity))||quantity<=0){warnings.push('BOM row '+(index+1)+(fractional?' needs a component and a positive quantity.':' needs a component and a positive whole-number quantity.'));continue;}
  const total=(required.get(row.componentId)||0)+quantity;if(!(fractional?Number.isFinite(total)&&total<=Number.MAX_SAFE_INTEGER:Number.isSafeInteger(total))){warnings.push('Total quantity is too large for component '+row.componentId+'.');continue;}required.set(row.componentId,total);
 }
 return {required,warnings};
}

export function calculateBuildable(bom,inventory){
 const {required,warnings}=aggregateRequirements(bom);
 const capacities=[];
 for(const [id,requiredQuantity] of required){
  const component=inventory.find(p=>p.id===id);
  if(!component){warnings.push('Missing component: '+id+'.');continue;}
  if(!component.active){warnings.push('Inactive component: '+component.name+'.');continue;}
  if(!Number.isSafeInteger(component.stock)||component.stock<0){warnings.push('Invalid stock for '+component.name+'.');continue;}
  capacities.push({id,name:component.name,requiredQuantity,stock:component.stock,capacity:Math.floor(component.stock/requiredQuantity)});
 }
 if(warnings.length||!capacities.length)return {quantity:null,limiting:[],warnings};
 const quantity=Math.min(...capacities.map(p=>p.capacity));return {quantity,limiting:capacities.filter(p=>p.capacity===quantity),warnings:[]};
}

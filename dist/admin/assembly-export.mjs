// P05C private capture bridge. Read the actual browser record byte-for-byte.
// Do not call createAssemblyStore().list(): it can seed or upgrade local data.
import {assemblyStorageKey,lesPaulKitDefinitionId} from './assemblies.mjs';

const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function validateAssemblyExport(raw){
 if(typeof raw!=='string')throw new Error('No saved Assembly record exists in this browser. Open Admin in the browser/profile holding your current Kit Definition. Nothing was changed.');
 let data;try{data=JSON.parse(raw);}catch{throw new Error('Saved Assembly data is unreadable. It has been preserved unchanged.');}
 if(!object(data)||![1,2,3].includes(data.version)||!Array.isArray(data.items)||!data.items.length)throw new Error('A nonempty Assembly v1–v3 record is required. Nothing was changed.');
 const ids=new Set(),skus=new Set(),families=new Set(),kitDefinitions=[];
 let bomRows=0;
 for(const [index,item] of data.items.entries()){
  const label='Assembly '+(index+1);
  if(!object(item)||typeof item.id!=='string'||!item.id.trim()||typeof item.sku!=='string'||!item.sku.trim()||typeof item.name!=='string'||!item.name.trim()||!Array.isArray(item.bom)||typeof item.active!=='boolean')throw new Error(label+' has missing or invalid identity, status or BOM. Nothing was changed.');
  const sku=item.sku.toLowerCase();if(ids.has(item.id)||skus.has(sku))throw new Error(label+' has a duplicate ID or SKU. Nothing was changed.');ids.add(item.id);skus.add(sku);
  for(const row of item.bom){if(!object(row)||typeof row.componentId!=='string'||!row.componentId.trim()||!Number.isSafeInteger(row.quantity)||row.quantity<1)throw new Error(label+' has an invalid BOM row. Nothing was changed.');bomRows++;}
  if(item.kind==='wiring-kit'){
   const kit=item.kitDefinition;
   if(!object(kit)||typeof kit.family!=='string'||!kit.family.trim()||families.has(kit.family)||kit.basePrice!=null&&(!Number.isSafeInteger(kit.basePrice)||kit.basePrice<0)||typeof kit.showOnWiringKits!=='boolean'||typeof kit.builderEnabled!=='boolean'||!Array.isArray(kit.permittedComponentIds)||!object(kit.defaults))throw new Error(label+' has an invalid or duplicate Kit Definition. Nothing was changed.');
   families.add(kit.family);kitDefinitions.push({assemblyId:item.id,family:kit.family,name:item.name,basePrice:kit.basePrice??null});
  }else if(item.kind!=='assembly'&&item.kind!==undefined){throw new Error(label+' has an unsupported kind. Nothing was changed.');}
 }
 return {assemblyCount:data.items.length,kitDefinitionCount:kitDefinitions.length,bomRows,storedVersion:data.version,kitDefinitions,lesPaulFound:kitDefinitions.some(item=>item.assemblyId===lesPaulKitDefinitionId||item.family==='les-paul')};
}

export function prepareAssemblyExport(storage,{now=()=>new Date().toISOString()}={}){
 let raw;try{raw=storage.getItem(assemblyStorageKey);}catch{throw new Error('Browser Assembly storage could not be read. Nothing was changed.');}
 const summary=validateAssemblyExport(raw);
 return {summary,payload:{format:'apparition-assembly-kit-export-v1',exportedAt:now(),storageKey:assemblyStorageKey,raw}};
}

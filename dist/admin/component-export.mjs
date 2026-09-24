// P05B bridge: read the real browser record without seeding, upgrading or writing it.
// This file is a private handoff for review, never an automatic or public import.
import {storageKey,categories} from './data.mjs';
import {validateImage} from './images.mjs';

const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const money=(value,label)=>{if(value!==undefined&&value!==null&&(!Number.isSafeInteger(value)||value<0))throw new Error('Invalid '+label+'.');};

export function validateComponentExport(raw){
 if(typeof raw!=='string')throw new Error('No saved Component record exists in this browser. Open Admin in the browser/profile holding your current records.');
 let envelope;try{envelope=JSON.parse(raw);}catch{throw new Error('Saved Component data is unreadable; it has not been changed.');}
 if(!record(envelope)||envelope.version!==1||!Array.isArray(envelope.items)||!envelope.items.length)throw new Error('A nonempty Component v1 record is required. No data has been changed.');
 const ids=new Set(),skus=new Set(),embeddedImages=[],objectImages=[];
 for(const [index,item] of envelope.items.entries()){
  const label='Component '+(index+1);
  if(!record(item)||typeof item.id!=='string'||!item.id.trim()||typeof item.sku!=='string'||!item.sku.trim()||typeof item.name!=='string'||!item.name.trim()||!categories[item.category])throw new Error(label+' has missing or invalid identity, name or category.');
  const sku=item.sku.toLowerCase();if(ids.has(item.id)||skus.has(sku))throw new Error(label+' has a duplicate ID or SKU.');ids.add(item.id);skus.add(sku);
  if(!Number.isSafeInteger(item.stock)||item.stock<0)throw new Error(label+' has invalid stock.');
  if(item.stockUnit!=null&&!['item','m','g'].includes(item.stockUnit))throw new Error(label+' has an invalid stock unit.');
  if(!record(item.specs)||Object.values(item.specs).some(v=>typeof v!=='string'))throw new Error(label+' has malformed technical specifications.');
  if(item.productSpecifications!=null&&(!Array.isArray(item.productSpecifications)||item.productSpecifications.some(row=>!record(row)||typeof row.label!=='string'||typeof row.value!=='string')))throw new Error(label+' has malformed product specifications.');
  for(const flag of ['active','individually','inKits'])if(typeof item[flag]!=='boolean')throw new Error(label+' has a missing or invalid '+flag+' flag.');
  for(const price of ['salePrice','kitPrice','internalUnitCost'])money(item[price],label+' '+price);
  money(item.price,label+' legacy price');
  if(item.kitPriceQuantity!=null&&(!Number.isSafeInteger(item.kitPriceQuantity)||item.kitPriceQuantity<1))throw new Error(label+' has an invalid kit price quantity.');
  try{validateImage(item.image);}catch{throw new Error(label+' has an invalid image reference.');}
  if(typeof item.image==='string'&&item.image.startsWith('data:'))embeddedImages.push(item.id);
  if(record(item.image)&&item.image.kind==='object')objectImages.push(item.id);
 }
 // Inventory is embedded in each Component, so every inventory ID is present by construction.
 return {componentCount:envelope.items.length,inventoryCount:envelope.items.length,embeddedImages,objectImages};
}

export function prepareComponentExport(storage,{now=()=>new Date().toISOString()}={}){
 let raw;try{raw=storage.getItem(storageKey);}catch{throw new Error('Browser storage could not be read. Nothing has been changed.');}
 const summary=validateComponentExport(raw);
 return {summary,payload:{format:'apparition-component-inventory-export-v1',exportedAt:now(),storageKey,raw}};
}

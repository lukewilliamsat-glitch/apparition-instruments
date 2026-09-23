import {kitDefinitions as original} from './kit-seed.mjs';
import {currentComponents} from '../admin/data.mjs';
import {kitBindings} from '../admin/kit-bindings.mjs';
export function configuredKitDefinitions(records){
 const definitions=structuredClone(original),kit=definitions['les-paul'];
 for(const [id,binding] of Object.entries(kitBindings)){
  const item=records.find(p=>p.id===id),option=kit[binding.group][binding.option];
  option.enabled=!!(item?.active&&item.inKits&&item.category===binding.category);
  option.price=option.enabled&&Number.isSafeInteger(item.kitPrice)?item.kitPrice:NaN;
  if(item){if(binding.group!=='shaft')option.label=item.productTitle||item.name;if(item.description)option.description=item.description;option.componentId=id;option.component={id:item.id,sku:item.sku,name:item.name,productTitle:item.productTitle||item.name,manufacturer:item.manufacturer,specification:structuredClone(item.specs||{})};}
 }
 kit.pots.CTS.enabled=Object.values(kit.shaft).some(o=>o.enabled);
 return definitions;
}
export const kitDefinitions=configuredKitDefinitions(currentComponents());
export const lesPaul=kitDefinitions['les-paul'];
export const formatKitPrice=pence=>Number.isFinite(pence)?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(pence/100):'Price unavailable';
export const upgradeLabel=pence=>Number.isFinite(pence)?pence===0?'Included':'+'+formatKitPrice(pence):'Price not set';

import {currentComponents} from '../admin/data.mjs';
export function storefrontProduct(p){
 const populated=value=>typeof value==='string'&&value.trim()?value:'';
 return {...p,name:populated(p.productTitle)||p.name,price:p.salePrice??NaN,
  cardDescription:populated(p.shortDescription)||populated(p.fullDescription)||p.description||'',
  displaySpecifications:p.productSpecifications?.length?p.productSpecifications:Object.entries({...p.manufacturer?{Manufacturer:p.manufacturer}:{},...p.specs}).map(([label,value])=>({label,value}))};
}
export const catalogue=currentComponents().filter(p=>p.active&&p.individually).map(storefrontProduct);
export const productById=id=>catalogue.find(p=>p.id===id);
export const money=pence=>Number.isFinite(pence)?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(pence/100):'Price not set';

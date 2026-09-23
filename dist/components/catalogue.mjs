import {componentRepository} from '../admin/component-repository.mjs';
export function storefrontProduct(p){
 const populated=value=>typeof value==='string'&&value.trim()?value:'';
 return {...p,name:populated(p.productTitle)||p.name,price:p.salePrice??NaN,
  cardDescription:populated(p.shortDescription)||populated(p.fullDescription)||p.description||'',
  displaySpecifications:p.productSpecifications?.length?p.productSpecifications:Object.entries({...p.manufacturer?{Manufacturer:p.manufacturer}:{},...p.specs}).map(([label,value])=>({label,value}))};
}
export let catalogue=[];
let loading=null;
export async function refreshCatalogue(repository=componentRepository()){
 if(!loading)loading=repository.list().then(records=>{catalogue.splice(0,catalogue.length,...records.filter(p=>p.active&&p.individually).map(storefrontProduct));return catalogue;}).finally(()=>{loading=null;});
 return loading;
}
await refreshCatalogue();
export const productById=id=>catalogue.find(p=>p.id===id);
export const money=pence=>Number.isFinite(pence)?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(pence/100):'Price not set';

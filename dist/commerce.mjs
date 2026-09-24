import {createKitSnapshot,validateKitSnapshot} from './les-paul-kits/snapshot.mjs';
import {productById} from './components/catalogue.mjs';
const STORAGE_KEY='apparition.basket.v1';
export const MAX_QUANTITY=99;
export function readBasket(){
 let raw;try{raw=localStorage.getItem(STORAGE_KEY);}catch{throw new Error('This browser cannot read your basket. Please allow site storage and try again.');}
 if(!raw)return [];
 let data;try{data=JSON.parse(raw);}catch{throw new Error('The saved basket could not be read. Please reset the basket below to start again.');}
 if(data?.version!==1||!Array.isArray(data.items))throw new Error('The saved basket could not be read. Please reset the basket below to start again.');
 const seen=new Set();
 return data.items.slice(0,50).filter(item=>{
  if(!item||typeof item.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(item.id)||seen.has(item.id)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>MAX_QUANTITY||!['les-paul','component'].includes(item.product)||(item.product==='component'&&!productById(item.sku)))return false;
  seen.add(item.id);return true;
 }).map(item=>item.product==='les-paul'?{id:item.id,product:'les-paul',quantity:item.quantity,configuration:structuredClone((item.record||{}).configuration||item.configuration),record:item.record?validateKitSnapshot(item.record):{...createKitSnapshot(item.configuration),legacyReconstructed:true}}:{id:item.id,product:'component',sku:item.sku,quantity:item.quantity});
}
function save(items){
 items=items.map(item=>item.product==='les-paul'?{...item,record:validateKitSnapshot(item.record)}:item);
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,items}));}catch{throw new Error('Your basket could not be saved. Allow site storage or free some browser storage, then try again.');}
 window.dispatchEvent(new CustomEvent('apparition:basket-changed'));
 return items;
}
export function resetBasket(){return save([]);}
export function addKit(value,editId=null,drawing={}){
 const record=createKitSnapshot(value,drawing),configuration=record.configuration,items=readBasket();
 if(editId){const item=items.find(x=>x.id===editId&&x.product==='les-paul');if(!item)throw new Error('This kit is no longer in your basket. Reload the configurator to add a new kit.');item.configuration=configuration;item.record=record;save(items);return item.id;}
 const equivalent=items.find(x=>x.product==='les-paul'&&JSON.stringify({...x.record,createdAt:null})===JSON.stringify({...record,createdAt:null}));
 if(equivalent){if(equivalent.quantity>=MAX_QUANTITY)throw new Error('The maximum quantity for one configuration is 99.');equivalent.quantity++;save(items);return equivalent.id;}
 if(items.length>=50)throw new Error('Your basket holds 50 configurations. Remove a kit before adding another.');
 const id=globalThis.crypto?.randomUUID?.()||`kit-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
 items.push({id,product:'les-paul',quantity:1,configuration,record});save(items);return id;
}
export function changeQuantity(id,quantity){if(!Number.isInteger(quantity)||quantity<1||quantity>MAX_QUANTITY)throw new Error('Enter a whole quantity between 1 and 99.');const items=readBasket(),item=items.find(x=>x.id===id);if(!item)throw new Error('This kit is no longer in your basket. Please reload the page.');if(item.product==='component')checkStock(productById(item.sku),quantity);item.quantity=quantity;return save(items);}
export function removeKit(id){return save(readBasket().filter(x=>x.id!==id));}
export function basketCount(items=readBasket()){return items.reduce((n,item)=>n+item.quantity,0);}

function checkStock(product,quantity){if(!product)throw new Error('This component is no longer listed.');if(!Number.isFinite(product.price))throw new Error('This component does not have a sale price yet.');if(product.stock!==null&&quantity>product.stock)throw new Error(product.stock===0?'This component is out of stock.':`Only ${product.stock} are listed in stock. Your basket quantity cannot exceed this.`);}
export function addComponent(sku){
 const product=productById(sku),items=readBasket(),existing=items.find(x=>x.product==='component'&&x.sku===sku),quantity=(existing?.quantity||0)+1;
 checkStock(product,quantity);if(quantity>MAX_QUANTITY)throw new Error('The maximum quantity per component is 99.');
 if(existing){existing.quantity=quantity;save(items);return existing.id;}
 if(items.length>=50)throw new Error('Your basket holds 50 different items. Remove an item before adding another.');
 const id=globalThis.crypto?.randomUUID?.()||`part-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
 items.push({id,product:'component',sku,quantity:1});save(items);return id;
}

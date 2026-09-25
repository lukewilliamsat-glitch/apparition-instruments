import {validateKitSnapshot} from '../../les-paul-kits/snapshot.mjs';
export const orderStorageKey='apparition.admin.orders.v1';
export const channels={WEBSITE:'Website',EBAY:'eBay',MANUAL:'Manual'};
export const statuses={PENDING:'Pending',DRAFT:'Draft',AWAITING_PAYMENT:'Awaiting payment',PAID:'Paid',IN_PRODUCTION:'In production',READY_TO_DISPATCH:'Ready to dispatch',DISPATCHED:'Dispatched',CANCELLED:'Cancelled'};
const copy=x=>structuredClone(x);
const text=(v,n=300)=>String(v??'').trim().slice(0,n);
function money(v){if(!Number.isSafeInteger(v)||v<0)throw new Error('Prices must be non-negative GBP amounts in whole pence.');return v;}
function qty(v){if(!Number.isSafeInteger(v)||v<1||v>9999)throw new Error('Quantity must be a whole number from 1 to 9999.');return v;}
function kitSnapshot(record){const r=validateKitSnapshot(record);if(r.schemaVersion!==3||!r.components?.length||!r.diagram?.circuit)throw new Error('This older kit has no complete component snapshot. Open it in the Kit Builder and save it again before creating an order.');return r;}
export function componentOrderItem(component,quantity=1,unitPrice=component?.salePrice){
 if(!component?.id||!component.active||!component.individually)throw new Error('Choose an active individually available component.');
 const snapshot={componentId:component.id,sku:component.sku,name:component.productTitle||component.name,internalName:component.name,manufacturer:component.manufacturer||'',category:component.category,specification:copy(component.specs||{}),productSpecifications:copy(component.productSpecifications||[]),description:component.fullDescription||component.description||'',shortDescription:component.shortDescription||''};
 return normaliseItem({type:'component',productId:component.id,name:snapshot.name,quantity,unitPrice,snapshot});
}
export function kitOrderItem(record,quantity=1){const snapshot=kitSnapshot(record);return normaliseItem({type:'kit',productId:snapshot.kitType,name:snapshot.kitName,quantity,unitPrice:snapshot.pricing.total,snapshot});}
function normaliseItem(item){
 if(!item||!['kit','component'].includes(item.type)||!item.productId||!item.name||!item.snapshot)throw new Error('Each order item needs its product and saved specification.');
 const quantity=qty(item.quantity),unitPrice=money(item.unitPrice),lineTotal=money(unitPrice*quantity);
 const snapshot=item.type==='kit'?kitSnapshot(item.snapshot):copy(item.snapshot);
 if(item.type==='kit'&&unitPrice!==snapshot.pricing.total)throw new Error('Kit price must match its saved configuration.');
 if(item.type==='component'&&(!snapshot.componentId||!snapshot.name))throw new Error('Component snapshot is incomplete.');
 return {type:item.type,productId:text(item.productId,100),name:text(item.name),quantity,unitPrice,lineTotal,currency:'GBP',snapshot};
}
function orderInput(input){
 if(!channels[input.channel]||!statuses[input.status])throw new Error('Choose a sales channel and status.');
 if(!Array.isArray(input.items)||!input.items.length||input.items.length>100)throw new Error('Add between 1 and 100 items to the order.');
 const items=input.items.map(normaliseItem),subtotal=money(items.reduce((n,i)=>n+i.lineTotal,0)),deliveryPrice=money(input.deliveryPrice),total=money(subtotal+deliveryPrice);
 const customer=Object.fromEntries(['name','email','phone'].map(k=>[k,text(input.customer?.[k])]));
 const delivery=Object.fromEntries(['recipient','line1','line2','city','region','postcode','country','method'].map(k=>[k,text(input.delivery?.[k])]));
 if(!customer.name)throw new Error('Enter the customer name.');
 return {channel:input.channel,status:input.status,customer,delivery,items,currency:'GBP',pricing:{subtotal,delivery:deliveryPrice,total},externalReference:text(input.externalReference),notes:text(input.notes,2000)};
}
// Replace this storage adapter later. Records use JSON-safe, storage-independent snapshots.
// All writes share a browser lock, so two tabs cannot allocate the same local reference.
export function createOrderStore(storage,{lock,now=()=>new Date().toISOString(),uuid=()=>crypto.randomUUID()}={}){
 function read(){
  let raw;try{raw=storage.getItem(orderStorageKey);}catch{throw new Error('Order storage is unavailable. No order was saved.');}
  if(raw===null)return {version:1,nextNumber:10001,orders:[]};
  try{const data=JSON.parse(raw),ids=new Set(),refs=new Set(),requests=new Set();
   if(data.version!==1||!Number.isSafeInteger(data.nextNumber)||data.nextNumber<10001||!Array.isArray(data.orders))throw new Error();
   for(const o of data.orders){if(o.schemaVersion!==1||!o.id||ids.has(o.id)||!/^AI-\d+$/.test(o.reference)||refs.has(o.reference)||Number(o.reference.slice(3))>=data.nextNumber||!o.requestId||requests.has(o.requestId)||!Number.isFinite(Date.parse(o.createdAt))||!Array.isArray(o.statusHistory)||!o.statusHistory.length)throw new Error();const checked=orderInput({...o,deliveryPrice:o.pricing.delivery});if(JSON.stringify(checked.items)!==JSON.stringify(o.items)||JSON.stringify(checked.pricing)!==JSON.stringify(o.pricing))throw new Error();ids.add(o.id);refs.add(o.reference);requests.add(o.requestId);}
   return data;
  }catch{throw new Error('Saved orders could not be read. No records or reference counters were reset.');}
 }
 function write(data){try{storage.setItem(orderStorageKey,JSON.stringify(data));}catch{throw new Error('Order could not be saved. Browser storage may be full or disabled. No success has been recorded.');}}
 async function exclusive(fn){if(!lock)throw new Error('Safe order saving requires browser lock support. Use a current browser on the published HTTPS site.');return lock(orderStorageKey,fn);}
 return {
  list:()=>copy(read().orders),
  get:id=>copy(read().orders.find(o=>o.id===id)||null),
  create:async(input,requestId)=>exclusive(()=>{
   if(typeof requestId!=='string'||!requestId||requestId.length>100)throw new Error('Missing order creation identifier.');
   const data=read(),existing=data.orders.find(o=>o.requestId===requestId);if(existing)return copy(existing);
   const details=orderInput(input);if(!Number.isSafeInteger(data.nextNumber+1))throw new Error('Order reference limit reached.');
   const stamp=now(),record={schemaVersion:1,id:uuid(),reference:'AI-'+data.nextNumber,requestId,createdAt:stamp,updatedAt:stamp,...details,statusHistory:[{status:details.status,at:stamp}]};
   if(data.orders.some(o=>o.id===record.id))throw new Error('Order identifier collision. Try again.');
   data.orders.push(record);data.nextNumber++;write(data);return copy(record);
  }),
  setStatus:async(id,status)=>exclusive(()=>{if(!statuses[status])throw new Error('Choose a valid order status.');const data=read(),record=data.orders.find(o=>o.id===id);if(!record)throw new Error('Order no longer exists.');if(record.status!==status){record.status=status;record.updatedAt=now();record.statusHistory.push({status,at:record.updatedAt});write(data);}return copy(record);})
 };
}
export function browserOrderStore(){return createOrderStore(window.localStorage,{lock:navigator.locks?(key,action)=>navigator.locks.request(key,action):null});}

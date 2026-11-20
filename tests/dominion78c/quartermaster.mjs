import {identifier,whole,instant,unique} from './contracts.mjs';
const measures=(v,name)=>{if(!Array.isArray(v)||v.length!==3)throw new Error('Missing '+name);return v.map(n=>whole(n,name,1,100000));};
const rotated=d=>[...d].sort((a,b)=>b-a);
const fits=(a,b)=>rotated(a).every((n,i)=>n<=rotated(b)[i]);
export const royalMailDomesticFormats=Object.freeze([
 Object.freeze({id:'letter',mm:Object.freeze([240,165,5]),grams:100}),
 Object.freeze({id:'large-letter',mm:Object.freeze([353,250,25]),grams:750}),
 Object.freeze({id:'small-parcel',mm:Object.freeze([450,350,160]),grams:2000}),
]);
export function packingPlan({orderId,items,packedContentsMm,country,packaging,packagingStock}) {
 identifier(orderId,'order ID');
 if(!Array.isArray(items)||!items.length||items.length>100||!unique(items,x=>identifier(x.lineId,'order line ID')))throw new Error('Invalid picking lines');
 if(!Array.isArray(packaging)||packaging.length>1000||!unique(packaging,x=>identifier(x.id,'packaging ID')))throw new Error('Invalid packaging catalogue');
 const pick=items.map(x=>({lineId:x.lineId,sku:identifier(x.sku,'SKU'),quantity:whole(x.quantity,'quantity',1,10000),unitGrams:whole(x.unitGrams,'unit grams',1,25000)}));
 const grams=whole(pick.reduce((sum,x)=>sum+x.quantity*x.unitGrams,0),'aggregate weight',1);
 const measured=measures(packedContentsMm,'combined contents dimensions');
 const choices=packaging.flatMap(p=>{
   identifier(p.supplierId,'supplier ID');identifier(p.purchaseReference,'purchase evidence');
   const inside=measures(p.innerMm,'packaging interior'), outside=measures(p.outerMm,'packaging exterior');
   if(!inside.every((v,i)=>v<=outside[i]))throw new Error('Exterior is smaller than interior');
   const gross=grams+whole(p.tareGrams,'packaging tare',0,25000);
   const cost=whole(p.unitCostMinor,'unit packaging cost');
   if(!fits(measured,inside)||whole(packagingStock(p.id)??0,'available packaging')===0)return [];
   const formats=country==='GB'?royalMailDomesticFormats.filter(f=>gross<=f.grams&&fits(outside,f.mm)).map(f=>f.id):[];
   return [{id:p.id,grossGrams:gross,outerMm:outside,packageCostMinor:cost,supplierId:p.supplierId,purchaseReference:p.purchaseReference,formats}];
 }).sort((a,b)=>a.packageCostMinor-b.packageCostMinor||a.grossGrams-b.grossGrams||a.id.localeCompare(b.id));
 return {orderId,stage:'pick',country,pick,choices};
}
// Fixture-only register; injection of production adapters is deliberately absent.
export function packingLedger(seed={}) {
 const stock=new Map(Object.entries(seed).map(([k,v])=>[identifier(k),whole(v,'packaging quantity')]));
 const byOrder=new Map(), replay=new Map(), tracking=new Map();
 const copy=x=>structuredClone(x);
 function record({id,plan,packageId,picked,at}) {
  identifier(id);identifier(plan.orderId);identifier(packageId);at=instant(at);
  if(!Array.isArray(picked)||picked.length!==plan.pick.length||!unique(picked,x=>x.lineId))throw new Error('Picking checklist incomplete');
  const chosen=plan.choices.find(x=>x.id===packageId);
  if(!chosen||!plan.pick.every(x=>picked.some(p=>p.lineId===x.lineId&&p.quantity===x.quantity)))throw new Error('Picking checklist incomplete');
  const proof=JSON.stringify([plan.orderId,chosen,at,picked.slice().sort((a,b)=>a.lineId.localeCompare(b.lineId)).map(x=>[x.lineId,x.quantity])]);
  if(replay.has(id)){
   const row=replay.get(id);
   if(row.proof!==proof)throw Error('Packing operation conflict');
   return copy(byOrder.get(row.orderId));
  }
  if(byOrder.has(plan.orderId))throw Error('Order already packed');
  if(!stock.get(chosen.id))throw Error('Packaging stock unavailable');
  const row={orderId:plan.orderId,stage:'packed',pack:copy(chosen),packedAt:at,tracking:null,eclipse:{category:'packaging',actualCostMinor:chosen.packageCostMinor,evidenceReference:chosen.purchaseReference,currency:'GBP'}};
  stock.set(chosen.id,stock.get(chosen.id)-1);byOrder.set(row.orderId,row);replay.set(id,{proof,orderId:row.orderId});
  return copy(row);
 }
 function attachTracking({orderId,carrier,reference,at}) {
  const row=byOrder.get(identifier(orderId));
  if(!row)throw Error('Pack before recording tracking');
  const entry={carrier:identifier(carrier).toUpperCase(),reference:identifier(reference).toUpperCase(),at:instant(at)};
  if(entry.at<row.packedAt)throw Error('Tracking time precedes packing');
  const key=JSON.stringify([entry.carrier,entry.reference]);
  if(tracking.has(key)&&tracking.get(key)!==orderId)throw Error('Tracking already assigned');
  if(row.tracking&&JSON.stringify(row.tracking)!==JSON.stringify(entry))throw Error('Tracking correction requires review');
  tracking.set(key,orderId);row.tracking=entry;
  return copy(row);
 }
 return {record,attachTracking,remaining:id=>stock.get(id)??0};
}
export function dispatchReview(packed,{format,weighedGrams,measuredOuterMm}) {
 if(packed?.stage!=='packed')throw Error('Pack before dispatch review');
 const size=measures(measuredOuterMm,'measured exterior');
 const grams=whole(weighedGrams,'measured gross weight',1,25000);
 const choice=royalMailDomesticFormats.find(x=>x.id===format);
 if(!choice||!packed.pack.formats.includes(format))throw Error('Format was not available when packed');
 return {orderId:packed.orderId,format,grams,outerMm:size,eligible:grams<=choice.grams&&fits(size,choice.mm),tracking:structuredClone(packed.tracking),dispatched:false};
}
export function roundLabel({title,reference,detail=''}) {
 identifier(reference,'label reference');
 if(typeof title!=='string'||!title.trim()||title.length>32||typeof detail!=='string'||detail.length>32)throw Error('Label text too long');
 const escape=x=>x.replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]));
 if(reference.length>24)throw Error('Label reference too long');
 return '<!doctype html><meta charset="utf-8"><title>50 mm label proof</title><style>@page{size:50mm 50mm;margin:0}body{margin:0;color:#000;background:#fff}svg{display:block;width:50mm;height:50mm}</style><svg viewBox="0 0 50 50" aria-label="Printable label" role="img" xmlns="http://www.w3.org/2000/svg"><g text-anchor="middle" font-family="system-ui" font-size="2.4"><text x="25" y="20">'+escape(title)+'</text><text x="25" y="25" font-size="3.1" font-weight="700">'+escape(reference)+'</text><text x="25" y="30">'+escape(detail)+'</text></g></svg>';
}

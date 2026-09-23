// Purchased content is read exclusively from the immutable order snapshot.
export function assemblyLines(order){return order.items.map((item,index)=>({item,index})).filter(x=>x.item.type==='kit');}
export function buildContext(order,itemIndex=null,unit=1){
 if(!order)throw new Error('Order not found in this browser.');
 const lines=assemblyLines(order),index=itemIndex===null?lines[0]?.index:Number(itemIndex),item=order.items[index];unit=Number(unit);
 if(!Number.isInteger(index)||item?.type!=='kit')throw new Error('This order item does not require a configured-kit Build Sheet.');
 if(!Number.isInteger(unit)||unit<1||unit>item.quantity)throw new Error('Choose a kit unit within the ordered quantity.');
 if(!item.snapshot?.configuration||!item.snapshot?.specification)throw new Error('The saved order does not contain a complete kit specification.');
 return {key:order.id+':'+index+':'+unit,orderId:order.id,itemIndex:index,unit,quantity:item.quantity,reference:order.reference,createdAt:order.createdAt,channel:order.channel,orderStatus:order.status,customer:order.customer.name||'Not supplied',kitName:item.snapshot.kitName||item.name,snapshot:structuredClone(item.snapshot)};
}
export function buildSheetURL(orderId,itemIndex=null,unit=1){const q=new URLSearchParams({order:orderId,unit:String(unit)});if(itemIndex!==null)q.set('item',String(itemIndex));return '/admin/orders/build-sheet/?'+q;}

import {aggregateRequirements} from '../../assemblies.mjs';
export function pickList(context){
 const parts=context.snapshot.components;if(!Array.isArray(parts))throw new Error('This saved kit has no component pick data. Manual picking verification required.');
 return parts.flatMap((p,index)=>{
  if(!p.supplied||p.quantity===0)return [];
  if(!Number.isSafeInteger(p.quantity)||p.quantity<1)throw new Error('Invalid saved component quantity. Manual picking verification required.');
  const spec=p.component?.specification||{};
  return [{id:'part-'+index,role:p.role,componentId:p.componentId||null,quantity:p.quantity,name:p.name,sku:p.component?.sku||'',specification:Object.entries(spec).map(([k,v])=>k+': '+v).join(' · ')}];
 });
}
export function captureBOM(assembly,inventory,multiplier){
 if(!assembly?.active||!Number.isSafeInteger(multiplier)||multiplier<1)throw new Error('Choose an active assembly with a valid quantity.');
 const {required,warnings}=aggregateRequirements(assembly.bom);
 if(warnings.length||!required.size)throw new Error('This assembly BOM is empty or invalid. Check it in Products / Assemblies.');
 const parts=[];
 for(const [id,qty] of required){const p=inventory.find(x=>x.id===id),quantity=qty*multiplier;
  if(!p?.active||!Number.isSafeInteger(quantity))throw new Error('BOM component is missing, inactive or has an invalid quantity: '+id);
  parts.push({id,componentId:id,sku:p.sku||'',name:p.name,quantity,specification:Object.entries(p.specs||{}).map(([k,v])=>k+': '+v).join(' · ')});
 }
 return {assemblyId:assembly.id,name:assembly.name,sku:assembly.sku,capturedAt:new Date().toISOString(),quantity:multiplier,bom:structuredClone(assembly.bom),parts};
}

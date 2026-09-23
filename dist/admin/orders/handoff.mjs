import {componentOrderItem,kitOrderItem} from './model.mjs';
export function basketOrderItems(basket,inventory){
 if(!Array.isArray(basket)||!basket.length)throw new Error('This browser’s basket is empty. Add components or configure a kit first.');
 return basket.map(item=>{
  if(item.product==='les-paul')return kitOrderItem(item.record,item.quantity);
  if(item.product==='component')return componentOrderItem(inventory.find(p=>p.id===item.sku),item.quantity);
  throw new Error('The basket contains an unsupported item. Review it before creating an order.');
 });
}

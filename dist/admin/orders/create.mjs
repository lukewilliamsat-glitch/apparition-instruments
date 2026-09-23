import {browserOrderStore,channels,statuses,componentOrderItem,kitOrderItem} from './model.mjs';
import {basketOrderItems} from './handoff.mjs';
import {createComponentStore,parseGBP,priceInput} from '../data.mjs';
import {readBasket} from '../../commerce.mjs';
import {el,money,showItem} from './view.mjs';
const query=new URLSearchParams(location.search);
if(query.get('new')==='1')setup();
function setup(){
 const $=s=>document.querySelector(s),form=$('#create-order-form'),field=k=>form.elements.namedItem(k);
 let inventory=[],kits=[],rows=[],dirty=false,busy=false,requestId=crypto.randomUUID();
 const message=e=>{$('#create-order-error').textContent=e.message||String(e);};
 for(const [id,label] of Object.entries(channels)){const o=el('option',label);o.value=id;field('channel').append(o);}field('channel').value=query.has('basket')?'WEBSITE':'MANUAL';
 for(const [id,label] of Object.entries(statuses)){const o=el('option',label);o.value=id;field('status').append(o);}field('status').value='DRAFT';
 function currentBasket(){
  const items=readBasket(),raw=localStorage.getItem('apparition.basket.v1');
  if(raw&&JSON.parse(raw).items.length!==items.length)throw new Error('Some saved basket items are no longer available or could not be read. Review the basket before importing; nothing was imported.');
  return items;
 }
 function refresh(){
  inventory=createComponentStore(localStorage).list();kits=[];
  const cp=$('#component-picker'),kp=$('#kit-picker');cp.replaceChildren(el('option','Choose component'));cp.firstChild.value='';
  for(const item of inventory.filter(p=>p.active&&p.individually)){const o=el('option',(item.productTitle||item.name)+' · '+(Number.isSafeInteger(item.salePrice)?money(item.salePrice):'Enter agreed price'));o.value=item.id;cp.append(o);}
  kp.replaceChildren(el('option','Choose saved kit'));kp.firstChild.value='';
  try{kits=currentBasket().filter(p=>p.product==='les-paul');for(const item of kits){const o=el('option',(item.record.kitName||'Les Paul kit')+' · '+item.record.specification.wiring+' · '+money(item.record.pricing.total));o.value=item.id;kp.append(o);}}catch(e){message(e);}
 }
 function rowFrom(item){return {item:structuredClone(item),quantity:String(item.quantity),price:priceInput(item.unitPrice)};}
 function asItem(row){const quantity=Number(row.quantity),unitPrice=parseGBP(row.price);if(row.component)return componentOrderItem(row.component,quantity,unitPrice);if(row.item.type==='kit')return kitOrderItem(row.item.snapshot,quantity);if(!Number.isSafeInteger(unitPrice))throw new Error('Enter an agreed price for every component.');return {...structuredClone(row.item),quantity,unitPrice,lineTotal:quantity*unitPrice};}
 function total(){try{
  const items=rows.map(asItem),delivery=parseGBP(field('deliveryPrice').value);if(!items.length){$('#create-order-total').textContent='Add at least one item.';return;}
  if(items.some(i=>!Number.isSafeInteger(i.quantity)||i.quantity<1||i.quantity>9999)||delivery===null)throw new Error();
  const subtotal=items.reduce((n,i)=>n+i.unitPrice*i.quantity,0);if(!Number.isSafeInteger(subtotal+delivery))throw new Error();
  $('#create-order-total').textContent='Subtotal '+money(subtotal)+' · Delivery '+money(delivery)+' · Order total '+money(subtotal+delivery);
 }catch{$('#create-order-total').textContent='Complete valid quantities, prices and postage to calculate the total.';}}
 function render(){const root=$('#create-order-items');root.replaceChildren();rows.forEach((row,index)=>{
  const box=el('article',undefined,'create-item'),name=row.component?(row.component.productTitle||row.component.name):row.item.name;box.append(el('h3',name));
  const controls=el('div',undefined,'order-row-controls'),ql=el('label','Quantity'),quantity=el('input');quantity.type='number';quantity.min='1';quantity.max='9999';quantity.step='1';quantity.required=true;quantity.value=row.quantity;quantity.setAttribute('aria-label','Quantity for '+name);quantity.addEventListener('input',()=>{row.quantity=quantity.value;dirty=true;total();});ql.append(quantity);controls.append(ql);
  const pl=el('label',row.item?.type==='kit'?'Saved kit price (£)':'Agreed unit price (£)'),price=el('input');price.type='number';price.min='0';price.step='.01';price.required=true;price.value=row.price;price.readOnly=row.item?.type==='kit';price.setAttribute('aria-label','Unit price for '+name);price.addEventListener('input',()=>{row.price=price.value;dirty=true;total();});pl.append(price);controls.append(pl);
  const remove=el('button','Remove');remove.type='button';remove.setAttribute('aria-label','Remove '+name);remove.addEventListener('click',()=>{rows.splice(index,1);dirty=true;render();$('#import-order-basket').focus();});controls.append(remove);box.append(controls);
  if(row.item?.type==='kit'){const details=el('details');details.append(el('summary','Review saved kit specification'),showItem(row.item));box.append(details);}
  root.append(box);
 });total();}
 $('#add-order-component').addEventListener('click',()=>{try{const c=inventory.find(p=>p.id===$('#component-picker').value);if(!c)throw new Error('Choose a component first.');rows.push({component:structuredClone(c),quantity:'1',price:priceInput(c.salePrice)});dirty=true;render();}catch(e){message(e);}});
 $('#add-order-kit').addEventListener('click',()=>{try{const k=kits.find(p=>p.id===$('#kit-picker').value);if(!k)throw new Error('Choose a saved kit first.');rows.push(rowFrom(kitOrderItem(k.record,1)));dirty=true;render();}catch(e){message(e);}});
 function importBasket(){try{const imported=basketOrderItems(currentBasket(),createComponentStore(localStorage).list());if(rows.length&&!window.confirm('Replace the current order items with this browser’s basket?'))return;rows=imported.map(rowFrom);dirty=true;render();$('#create-order-error').textContent='Basket copied. Review quantities, prices and customer details before creating the order.';}catch(e){message(e);}}
 $('#import-order-basket').addEventListener('click',importBasket);$('#refresh-order-choices').addEventListener('click',()=>{try{refresh();}catch(e){message(e);}});
 form.addEventListener('input',()=>{dirty=true;total();});form.addEventListener('change',()=>{dirty=true;});
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 document.addEventListener('click',e=>{const link=e.target.closest('a');if(dirty&&link&&link.target!=='_blank'&&link.origin===location.origin){if(!window.confirm('Leave without saving this order?'))e.preventDefault();else dirty=false;}});
 form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;$('#save-order').disabled=true;
 try{
  const deliveryPrice=parseGBP(field('deliveryPrice').value);if(deliveryPrice===null)throw new Error('Enter delivery/postage, including 0 if free.');
  const input={channel:field('channel').value,status:field('status').value,customer:{name:field('customerName').value,email:field('email').value,phone:field('phone').value},delivery:Object.fromEntries(['recipient','line1','line2','city','region','postcode','country','method'].map(k=>[k,field(k).value])),deliveryPrice,externalReference:field('externalReference').value,notes:field('notes').value,items:rows.map(asItem)};
  const record=await browserOrderStore().create(input,requestId);dirty=false;location.assign('/admin/orders/?id='+encodeURIComponent(record.id));
 }catch(error){message(error);busy=false;$('#save-order').disabled=false;}
 });
 try{refresh();if(query.has('basket'))importBasket();else render();}catch(e){message(e);}
}

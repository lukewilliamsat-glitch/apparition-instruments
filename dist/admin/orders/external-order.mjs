import {el,money} from './view.mjs?v=external-v1';
import {deploymentPath} from '../../deployment.mjs';

export function poundsToPence(value){
 if(!/^\d+(?:\.\d{1,2})?$/.test(String(value)))throw new Error('Enter GBP amounts with at most two decimal places.');
 const [whole,fraction='']=String(value).split('.');const amount=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(amount)||amount>1000000000)throw new Error('Amount exceeds the supported range.');return amount;
}
export async function mountExternalOrderForm({repository,document=globalThis.document,navigate=url=>{location.href=url;},uuid=()=>crypto.randomUUID()}={}){
 const $=selector=>document.querySelector(selector),form=$('#create-order-form'),picker=$('#external-product-picker'),add=$('#external-add-line'),save=$('#save-order'),error=$('#create-order-error');
 $('#order-editor').hidden=false;const now=new Date();form.elements.orderDate.value=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 let products=[],lines=[],busy=false,requestId=uuid(),lastPayload=null;
 const totals=()=>{try{const subtotal=lines.reduce((sum,line)=>sum+poundsToPence(line.price)*Number(line.quantity),0),postage=poundsToPence(form.elements.postage.value);$('#create-order-total').textContent='Items '+money(subtotal)+' + postage '+money(postage)+' = '+money(subtotal+postage);}catch{$('#create-order-total').textContent='Enter valid quantities and prices to calculate the total.';}};
 const render=()=>{const root=$('#create-order-items');root.replaceChildren();lines.forEach((line,index)=>{
  const article=el('article',undefined,'create-item');article.append(el('h3',line.product.name+' · '+line.product.sku));const controls=el('div',undefined,'order-row-controls');
  for(const [key,label,type,min,max,step] of [['quantity','Quantity','number','1','99','1'],['price','Agreed unit price (£)','number','0','10000000','0.01']]){const field=el('label',label),input=el('input');input.type=type;input.required=true;input.min=min;input.max=max;input.step=step;input.value=line[key];input.setAttribute('aria-label',label+' for '+line.product.sku);input.addEventListener('input',()=>{line[key]=input.value;totals();});field.append(input);controls.append(field);}
  const remove=el('button','Remove');remove.type='button';remove.addEventListener('click',()=>{lines.splice(index,1);render();});controls.append(remove);article.append(controls);root.append(article);
 });add.disabled=busy||!products.length||lines.length>=10;save.disabled=busy||!lines.length;totals();};
 add.addEventListener('click',()=>{if(busy||lines.length>=10)return;const product=products[Number(picker.value)];if(!product)return;lines.push({product,quantity:'1',price:product.price==null?'':(product.price/100).toFixed(2)});render();});
 form.elements.postage.addEventListener('input',totals);
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!form.reportValidity())return;error.textContent='';
  try{
   if(!lines.length)throw new Error('Add at least one existing product.');
   const payload={channel:form.elements.channel.value,externalReference:form.elements.externalReference.value.trim(),orderDate:form.elements.orderDate.value,customerName:form.elements.customerName.value.trim(),postagePence:poundsToPence(form.elements.postage.value),notes:form.elements.notes.value.trim(),items:lines.map(line=>{const quantity=Number(line.quantity);if(!Number.isInteger(quantity)||quantity<1||quantity>99)throw new Error('Quantity must be 1–99.');return {type:line.product.type,productId:line.product.id,quantity,unitPricePence:poundsToPence(line.price)};})};
   if(!payload.externalReference||!payload.customerName)throw new Error('Enter the external reference and customer name.');
   if(lastPayload!==null&&lastPayload!==JSON.stringify(payload))requestId=uuid();lastPayload=JSON.stringify(payload);
   busy=true;for(const input of form.querySelectorAll('input,select,textarea,button'))input.disabled=true;save.textContent='Saving external sale…';
   const result=await repository.createExternal({requestId,...payload});navigate(deploymentPath('/admin/orders/?id='+encodeURIComponent(result.id)));
  }catch(caught){error.textContent=caught.message;busy=false;for(const input of form.querySelectorAll('input,select,textarea,button'))input.disabled=false;save.textContent='Save external sale and deduct stock';render();}
 });
 try{products=await repository.externalProducts();picker.replaceChildren();products.forEach((product,index)=>{const option=el('option',product.name+' · '+product.sku+' · '+product.available+' available');option.value=String(index);picker.append(option);});picker.disabled=!products.length;if(!products.length)error.textContent='No eligible existing products are available.';render();}catch(caught){error.textContent=caught.message;}
}

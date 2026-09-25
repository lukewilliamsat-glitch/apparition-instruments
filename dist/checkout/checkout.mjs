import {readBasket,resetBasket} from '../commerce.mjs';
import {el,itemCard,totalCard,emptyBasket,errorBasket} from '../basket-ui.mjs';
import {createGuestOrderRepository} from '../backend/order-data.mjs';
const content=document.querySelector('#checkout-content'),repository=createGuestOrderRepository();
let requestId=crypto.randomUUID(),submitted=false;
function orderForm(items){
 const form=el('form','checkout-order-form'),title=el('h2','','Submit an order request'),note=el('p','','Your order will be recorded as Pending and Unpaid. No payment is taken and no stock is reserved or deducted. Delivery is currently £0; Apparition will confirm delivery and payment arrangements separately.');
 form.append(title,note);
 const field=(name,label,type='text',autocomplete='')=>{const wrapper=el('label','',label),input=el('input');input.name=name;input.type=type;input.required=true;input.maxLength=name==='email'?254:200;if(autocomplete)input.autocomplete=autocomplete;wrapper.append(input);form.append(wrapper);return input;};
 field('name','Customer name','text','name');field('email','Email address','email','email');field('line1','Delivery address line 1','text','shipping address-line1');field('postcode','Postcode','text','shipping postal-code');field('country','Country','text','shipping country-name').value='United Kingdom';
 const button=el('button','button','Submit order request'),status=el('p','status-message');button.type='submit';status.setAttribute('role','status');form.append(button,status);
 form.addEventListener('submit',async event=>{event.preventDefault();if(submitted||button.disabled)return;button.disabled=true;status.textContent='Saving your order…';
  try{
   const current=readBasket();if(JSON.stringify(current)!==JSON.stringify(items))throw new Error('Your basket changed. Review it and reload before submitting.');
   const response=await repository.create({requestId,customer:{name:form.elements.name.value.trim(),email:form.elements.email.value.trim()},delivery:{line1:form.elements.line1.value.trim(),postcode:form.elements.postcode.value.trim(),country:form.elements.country.value.trim()},items:current.map(item=>({product:item.product,quantity:item.quantity,record:item.record}))});
   submitted=true;status.textContent='Order request '+response.reference+' saved. Status: Pending. Payment: Unpaid. Keep this reference for Apparition.';
  }catch(error){status.textContent=error.message;button.disabled=false;}
 });return form;
}
function render(){if(submitted)return;try{const items=readBasket();content.replaceChildren();if(!items.length){content.append(emptyBasket());return;}const layout=el('div','basket-layout'),list=el('div','basket-items');items.forEach(item=>list.append(itemCard(item)));layout.append(list,totalCard(items,true));content.append(layout);if(items.some(item=>item.product!=='les-paul'||item.record?.legacyReconstructed)){content.append(el('p','status-message','Order submission currently supports configured kits with complete saved snapshots only. Remove other items or review and resave older kits in the Builder.'));return;}content.append(orderForm(items));}catch(error){content.replaceChildren(errorBasket(error.message,()=>{try{resetBasket();}catch(e){content.prepend(el('p','status-message',e.message));}}));}}
window.addEventListener('storage',render);window.addEventListener('apparition:basket-changed',render);window.addEventListener('pageshow',render);render();

import {readBasket,resetBasket} from '../commerce.mjs';
import {el,itemCard,totalCard,emptyBasket,errorBasket} from '../basket-ui.mjs';
import {createSecureCheckoutRepository} from '../backend/order-data.mjs';
import {publicBackendConfig} from '../backend/public-config.mjs';
import {productById} from '../components/catalogue.mjs';
const content=document.querySelector('#checkout-content'),repository=createSecureCheckoutRepository();
let requestId=crypto.randomUUID(),shipping=null;
async function loadShipping(){
 const response=await fetch(publicBackendConfig.url+'/rest/v1/commerce_shipping?country=eq.GB&select=*',{headers:{apikey:publicBackendConfig.publishableKey}});
 if(!response.ok)throw new Error('UK delivery prices are unavailable. Please retry later.');
 const rows=await response.json(),rule=rows?.[0];
 if(!Number.isSafeInteger(rule?.standard_delivery_pence)||!Number.isSafeInteger(rule?.free_delivery_threshold_pence))throw new Error('UK delivery prices are unavailable. Please retry later.');
 shipping=rule;render();
}
function orderForm(items){
 const form=el('form','checkout-order-form'),title=el('h2','','Secure checkout'),note=el('p','','Stripe will collect your email, name, payment details and UK delivery address. Your order remains Pending and Unpaid until payment is independently confirmed.');
 const subtotal=items.reduce((sum,item)=>sum+(item.product==='component'?productById(item.sku).price:item.record.pricing.total)*item.quantity,0),delivery=subtotal>=shipping.free_delivery_threshold_pence?0:shipping.standard_delivery_pence;
 const button=el('button','button','Proceed to Secure Checkout'),status=el('p','status-message');button.type='submit';status.setAttribute('role','status');form.append(title,note,button,status);
 form.addEventListener('submit',async event=>{event.preventDefault();if(button.disabled)return;button.disabled=true;status.textContent='Preparing secure checkout…';
  try{
   const current=readBasket();if(JSON.stringify(current)!==JSON.stringify(items))throw new Error('Your basket changed. Review it and reload before submitting.');
   const result=await repository.create({requestId,items:current.map(item=>item.product==='component'?{product:'component',sku:item.sku,quantity:item.quantity}:{product:item.product,quantity:item.quantity,record:item.record})});
   if(result.totalPence!==subtotal+delivery)throw new Error('The current checkout price differs from your basket. Refresh and review your kit.');
   window.location.assign(result.url);
  }catch(error){status.textContent=error.message;button.disabled=false;}
 });return form;
}
function render(){try{
 const items=readBasket();content.replaceChildren();const outcome=new URLSearchParams(location.search).get('checkout');
 if(outcome==='success')content.append(el('p','status-message',"Thanks. We're confirming your payment. Your order is not marked Paid until Stripe confirmation is processed."));
 if(outcome==='cancel')content.append(el('p','status-message','Checkout was cancelled. Your basket is still here; your Order remains Pending and Unpaid.'));
 if(!items.length){content.append(emptyBasket());return;}
 const layout=el('div','basket-layout'),list=el('div','basket-items');items.forEach(item=>list.append(itemCard(item)));layout.append(list,totalCard(items,true,shipping));content.append(layout);
 if(items.some(item=>item.product==='les-paul'&&item.record?.legacyReconstructed)){content.append(el('p','status-message','Review and resave older kit configurations in the Builder before secure checkout.'));return;}
 if(!shipping){content.append(el('p','status-message','Loading current UK delivery pricing…'));return;}
 content.append(orderForm(items));
 }catch(error){content.replaceChildren(errorBasket(error.message,()=>{try{resetBasket();}catch(e){content.prepend(el('p','status-message',e.message));}}));}}
window.addEventListener('storage',render);window.addEventListener('apparition:basket-changed',render);window.addEventListener('pageshow',render);render();loadShipping().catch(error=>{content.append(el('p','status-message',error.message));});

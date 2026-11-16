import {commerce67Activation} from '../commercial/commerce67-activation.mjs';
import {basketIntents,createQuoteReader,paintQuote} from '../commercial/commerce67-client.mjs';
import {readBasket,changeQuantity,removeKit,resetBasket} from '../commerce.mjs?build=0f4b82d6f618ecc7e661c3b3ff13ca1b58b66ca4';
import {el,itemCard,totalCard,emptyBasket,errorBasket} from '../basket-ui.mjs?build=0f4b82d6f618ecc7e661c3b3ff13ca1b58b66ca4';
const offers=createQuoteReader();
const content=document.querySelector('#basket-content'),status=document.querySelector('#basket-status');
window.apparitionStoreState||={state:'UNAVAILABLE',customer_message:'Checking current store availability…'};
function showError(error){status.textContent=error.message;}
function render(){
 const activeId=document.activeElement?.id;
 try{const items=readBasket();offers.cancel();content.replaceChildren();if(!items.length){content.append(emptyBasket());return;}const layout=el('div','basket-layout'),list=el('div','basket-items');
 for(const item of items)list.append(itemCard(item,{editable:true,onQuantity(id,value,input){try{changeQuantity(id,value);status.textContent='Quantity updated.';}catch(error){input.value=item.quantity;showError(error);}},onRemove(id){try{removeKit(id);status.textContent='Item removed from your basket.';const next=content.querySelector('.basket-actions a')||content.querySelector('a');next?.focus();}catch(error){showError(error);}}}));
 const summary=totalCard(items),intents=commerce67Activation.storefront?basketIntents(items):null;
 if(intents&&window.apparitionStoreState?.state==='OPEN'){
  const check=el('button','','Check current offers'),quote=el('div','');check.type='button';quote.setAttribute('aria-live','polite');
  check.addEventListener('click',async()=>{check.disabled=true;quote.textContent='Checking current offers…';
   try{const result=await offers.load(intents,null);if(summary.isConnected)paintQuote(quote,result);}
   catch(e){if(summary.isConnected&&e.name!=='AbortError')quote.textContent=e.message;}
   finally{check.disabled=false;}});
  summary.append(check,quote);
 }
 layout.append(list,summary);content.append(layout);if(activeId)document.getElementById(activeId)?.focus();
 }catch(error){content.replaceChildren(errorBasket(error.message,()=>{try{resetBasket();status.textContent='Saved basket reset.';}catch(e){showError(e);}}));}
}
window.addEventListener('apparition:store-status',render);window.addEventListener('storage',render);window.addEventListener('apparition:basket-changed',render);window.addEventListener('pageshow',render);render();

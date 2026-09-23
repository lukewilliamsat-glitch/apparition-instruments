import {readBasket,changeQuantity,removeKit,resetBasket} from '../commerce.mjs';
import {el,itemCard,totalCard,emptyBasket,errorBasket} from '../basket-ui.mjs';
const content=document.querySelector('#basket-content'),status=document.querySelector('#basket-status');
function showError(error){status.textContent=error.message;}
function render(){
 const activeId=document.activeElement?.id;
 try{const items=readBasket();content.replaceChildren();if(!items.length){content.append(emptyBasket());return;}const layout=el('div','basket-layout'),list=el('div','basket-items');
 for(const item of items)list.append(itemCard(item,{editable:true,onQuantity(id,value,input){try{changeQuantity(id,value);status.textContent='Quantity updated.';}catch(error){input.value=item.quantity;showError(error);}},onRemove(id){try{removeKit(id);status.textContent='Item removed from your basket.';const next=content.querySelector('.basket-actions a')||content.querySelector('a');next?.focus();}catch(error){showError(error);}}}));
 layout.append(list,totalCard(items));content.append(layout);if(activeId)document.getElementById(activeId)?.focus();
 }catch(error){content.replaceChildren(errorBasket(error.message,()=>{try{resetBasket();status.textContent='Saved basket reset.';}catch(e){showError(e);}}));}
}
window.addEventListener('storage',render);window.addEventListener('apparition:basket-changed',render);window.addEventListener('pageshow',render);render();

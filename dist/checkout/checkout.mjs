import {readBasket,resetBasket} from '../commerce.mjs';
import {el,itemCard,totalCard,emptyBasket,errorBasket} from '../basket-ui.mjs';
const content=document.querySelector('#checkout-content');
function render(){try{const items=readBasket();content.replaceChildren();if(!items.length){content.append(emptyBasket());return;}const layout=el('div','basket-layout'),list=el('div','basket-items');items.forEach(item=>list.append(itemCard(item)));layout.append(list,totalCard(items,true));content.append(layout);}catch(error){content.replaceChildren(errorBasket(error.message,()=>{try{resetBasket();}catch(e){content.prepend(el('p','status-message',e.message));}}));}}
window.addEventListener('storage',render);window.addEventListener('apparition:basket-changed',render);window.addEventListener('pageshow',render);render();

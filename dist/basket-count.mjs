import {readSavedBasket} from './basket-storage.mjs';
// Empty baskets need no product catalogue or kit configuration. Non-empty
// baskets still use commerce's full eligibility and snapshot validation.
export function createBasketCounter({storage,onCount,loadCommerce=()=>import('./commerce.mjs')}){
 let revision=0;
 return async()=>{const current=++revision;let count;try{const saved=readSavedBasket(storage);count=saved.items.length?(await loadCommerce()).basketCount():0;}catch{count='—';}if(current===revision)onCount(count);};
}

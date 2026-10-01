// Storage envelope only. Product eligibility, pricing and snapshots stay in commerce.
export const basketStorageKey='apparition.basket.v1';
export function readSavedBasket(storage=globalThis.localStorage){
 let raw;try{raw=storage.getItem(basketStorageKey);}catch{throw new Error('This browser cannot read your basket. Please allow site storage and try again.');}
 if(!raw)return {version:1,items:[]};
 let data;try{data=JSON.parse(raw);}catch{throw new Error('The saved basket could not be read. Please reset the basket below to start again.');}
 if(data?.version!==1||!Array.isArray(data.items))throw new Error('The saved basket could not be read. Please reset the basket below to start again.');
 return data;
}

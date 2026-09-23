import {createComponentStore} from './data.mjs';

// Provider-neutral asynchronous boundary for component catalogue and inventory data.
// The local implementation deliberately preserves the existing storage key and JSON format.
export function createLocalComponentRepository(storage){
 const store=createComponentStore(storage);
 return Object.freeze({
  async list(){return store.list();},
  async save(input,originalId=null){return store.save(input,originalId);},
  async changeStock(id,value,mode='set'){return store.changeStock(id,value,mode);}
 });
}

let browserRepository;
export function componentRepository(){
 if(typeof window==='undefined'||!window.localStorage){
  const memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
  return createLocalComponentRepository(storage);
 }
 if(browserRepository)return browserRepository;
 browserRepository=createLocalComponentRepository(window.localStorage);
 return browserRepository;
}

export function setComponentRepository(repository){
 for(const method of ['list','save','changeStock'])if(typeof repository?.[method]!=='function')throw new Error('Invalid component repository.');
 browserRepository=repository;
}

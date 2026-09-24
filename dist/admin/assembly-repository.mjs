import {createAssemblyStore} from './assemblies.mjs';

// Async Assembly / Kit Definition contract. The adapter keeps the existing
// browser-local records and storage key; a shared provider can replace it later.
export function createLocalAssemblyRepository(storage){
 const store=createAssemblyStore(storage);
 return Object.freeze({
  async list(){return store.list();},
  async get(id){return store.list().find(item=>item.id===id)||null;}
 });
}

let browserRepository;
export function assemblyRepository(){
 if(browserRepository)return browserRepository;
 if(typeof window==='undefined'){
  const records=new Map(),storage={getItem:key=>records.get(key)??null,setItem:(key,value)=>records.set(key,value)};
  return createLocalAssemblyRepository(storage);
 }
 return browserRepository=createLocalAssemblyRepository(window.localStorage);
}

export function setAssemblyRepository(repository){
 for(const method of ['list','get'])if(typeof repository?.[method]!=='function')throw new Error('Invalid Assembly repository.');
 browserRepository=repository;
}

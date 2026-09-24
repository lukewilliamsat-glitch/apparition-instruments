import {createAssemblyStore} from './assemblies.mjs';
import {createPublicAssemblyRepository} from '../backend/assembly-data.mjs';

// Local adapter is retained for migration diagnostics and isolated tests only.
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
 return browserRepository=createPublicAssemblyRepository();
}

export function setAssemblyRepository(repository){
 if(repository===null){browserRepository=null;return;}
 for(const method of ['list','get'])if(typeof repository?.[method]!=='function')throw new Error('Invalid Assembly repository.');
 browserRepository=repository;
}

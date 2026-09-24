import {createLocalComponentRepository} from '../admin/component-repository.mjs';
import {createLocalAssemblyRepository} from '../admin/assembly-repository.mjs';
import {publicBackendConfig} from './public-config.mjs';

// P05A only: explicit selection; existing pages continue to select local providers.
// Backend mutations require real Admin Auth and the controlled P05B/P05C cutover.
export function createRepositoryProviders({source='local',storage,config=publicBackendConfig,request=globalThis.fetch}={}){
 if(source==='local'){
  if(!storage)throw new Error('A browser storage adapter is required.');
  return Object.freeze({components:createLocalComponentRepository(storage),assemblies:createLocalAssemblyRepository(storage)});
 }
 if(source!=='supabase')throw new Error('Unknown repository provider.');
 const api=createPublicCatalogueClient(config,request);
 const blocked=async()=>{throw new Error('Shared Admin writes require authorised backend access.');};
 return Object.freeze({
  components:Object.freeze({list:()=>api.listComponents(),save:blocked,changeStock:blocked}),
  assemblies:Object.freeze({list:()=>api.listWiringKits(),get:async id=>(await api.listWiringKits()).find(item=>item.id===id)||null})
 });
}

export function createPublicCatalogueClient(config=publicBackendConfig,request=globalThis.fetch){
 const {url,publishableKey}=config||{};
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url||'')||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey||'')||typeof request!=='function')throw new Error('Invalid public Supabase configuration.');
 const read=async view=>{
  const response=await request(url+'/rest/v1/'+view+'?select=*',{headers:{apikey:publishableKey,Accept:'application/json'}});
  if(!response.ok)throw new Error('Public catalogue could not be loaded.');
  const rows=await response.json();if(!Array.isArray(rows))throw new Error('Invalid catalogue response.');
  return rows;
 };
 return Object.freeze({listComponents:()=>read('catalogue_components'),listWiringKits:()=>read('catalogue_wiring_kits')});
}

// P05B will use this transport inside its Admin Component/Inventory repository.
// It carries the real user's refreshed Auth token; the publishable key never bypasses RLS.
export function createAuthenticatedRepositoryTransport(auth,{config=publicBackendConfig,request=globalThis.fetch}={}){
 if(!auth||typeof auth.accessToken!=='function'||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config?.url||'')||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config?.publishableKey||'')||typeof request!=='function')throw new Error('Invalid authenticated repository transport.');
 return Object.freeze({async send(table,{method='GET',query='',body}={}){
  if(!['components','component_internal','inventory'].includes(table))throw new Error('Unsupported Admin repository resource.');
  const token=await auth.accessToken();
  return request(config.url+'/rest/v1/'+table+query,{method,headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},...body===undefined?{}:{body:JSON.stringify(body)}});
 }});
}

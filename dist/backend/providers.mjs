import {createLocalComponentRepository} from '../admin/component-repository.mjs';
import {createLocalAssemblyRepository} from '../admin/assembly-repository.mjs';
import {publicBackendConfig} from './public-config.mjs';
import {createPublicComponentRepository} from './component-data.mjs';
import {createPublicAssemblyRepository} from './assembly-data.mjs';

// The local provider remains available for isolated tests and migration diagnostics.
export function createRepositoryProviders({source='local',storage,config=publicBackendConfig,request=globalThis.fetch}={}){
 if(source==='local'){
  if(!storage)throw new Error('A browser storage adapter is required.');
  return Object.freeze({components:createLocalComponentRepository(storage),assemblies:createLocalAssemblyRepository(storage)});
 }
 if(source!=='supabase')throw new Error('Unknown repository provider.');
 return Object.freeze({
  components:createPublicComponentRepository({config,request}),
  assemblies:createPublicAssemblyRepository({config,request})
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

// Shared Admin repositories use this transport with the current Auth token.
// It carries the real user's refreshed Auth token; the publishable key never bypasses RLS.
export function createAuthenticatedRepositoryTransport(auth,{config=publicBackendConfig,request=globalThis.fetch}={}){
 if(!auth||typeof auth.accessToken!=='function'||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config?.url||'')||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config?.publishableKey||'')||typeof request!=='function')throw new Error('Invalid authenticated repository transport.');
 return Object.freeze({async send(table,{method='GET',query='',body,prefer}={}){
  if(!['components','component_internal','inventory','assemblies','assembly_bom','kit_definitions','kit_definition_internal','kit_permitted_components','orders','rpc/delete_unused_component'].includes(table))throw new Error('Unsupported Admin repository resource.');
  const token=await auth.accessToken();
  return request(config.url+'/rest/v1/'+table+query,{method,headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json',...prefer?{Prefer:prefer}:{}},...body===undefined?{}:{body:JSON.stringify(body)}});
 }});
}

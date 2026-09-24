import {createKitFamilyRepository} from './family-repository.mjs';

// Shared customer Builder loading lifecycle. Family adapters keep their own
// electrical rules and resolved configuration; the Assembly owns product data.
export async function startKitBuilder(slug,{repository=createKitFamilyRepository(),status=document.querySelector('#builder-status'),main=document.querySelector('.kit-main')}={}){
 if(main)main.hidden=true;
 const fail=message=>{if(status){status.hidden=false;status.textContent=message;}return {status:'unavailable',message};};
 try{
  if(!slug)return fail('Choose a supported Wiring Kit before opening the Builder.');
  const family=await repository.builder(slug);
  if(!family)return fail('This Wiring Kit Builder is not currently available.');
  const implementation=await family.adapter.load();
  if(typeof implementation?.resolve!=='function'||typeof implementation?.mount!=='function')return fail('This Wiring Kit Builder is not ready yet.');
  const context={id:family.id,family:family.family,slug:family.slug,title:family.title,assembly:family.assembly,definition:family.assembly.kitDefinition,capabilities:family.capabilities,resolve:implementation.resolve};
  await implementation.mount(context);
  if(main)main.hidden=false;
  if(status)status.hidden=true;
  return {status:'ready',context};
 }catch(error){return fail('This Wiring Kit Builder could not be loaded. '+error.message);}
}

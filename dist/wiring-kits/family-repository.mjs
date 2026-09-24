import {assemblyRepository} from '../admin/assembly-repository.mjs';

// A supported family describes capability and presentation, never physical products.
// Later families add an adapter here, while their Assembly records own customer identity.
export const familyAdapters=Object.freeze({
 'les-paul':Object.freeze({
  route:'/les-paul-kits/',
  collection:'Gibson / Epiphone',
  capabilities:Object.freeze({optionGroups:['wiring','pots','shaft','matching','caps','bleed','jack','selector'],diagram:true,basket:true}),
  async load(){const domain=await import('../les-paul-kits/config.mjs');return {resolve:domain.resolveLesPaulKit,mount:async context=>{if(domain.lesPaul.id!==context.id)throw new Error('Kit Definition changed during Builder loading.');await import('../les-paul-kits/kits.mjs');}};}
 })
});

// Existing family IDs are stable slugs; no extra persisted identifier is required.
const slugOf=record=>record.kitDefinition?.family;
const validSlug=value=>typeof value==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
function supported(record,adapters){
 const family=record?.kitDefinition?.family,slug=slugOf(record),adapter=adapters[family];
 if(record?.kind!=='wiring-kit'||!record.id||!validSlug(family)||!validSlug(slug)||!adapter||typeof adapter.load!=='function'||!adapter.capabilities)return null;
 return {id:record.id,family,slug,title:record.name,collection:adapter.collection||'Wiring Kits',route:adapter.route||'/wiring-kits/build/?family='+encodeURIComponent(slug),active:record.active===true,showOnWiringKits:record.kitDefinition.showOnWiringKits===true,builderEnabled:record.kitDefinition.builderEnabled===true,capabilities:adapter.capabilities,assembly:record,adapter};
}

export function createKitFamilyRepository(repository=assemblyRepository(),adapters=familyAdapters){
 if(typeof repository?.list!=='function')throw new Error('Invalid Assembly repository.');
 const families=async()=>{const records=await repository.list();if(!Array.isArray(records))throw new Error('Wiring Kit Definitions could not be loaded.');const result=records.map(record=>supported(record,adapters)).filter(Boolean),slugs=new Set();for(const family of result){if(slugs.has(family.slug))throw new Error('Duplicate Wiring Kit family slug: '+family.slug);slugs.add(family.slug);}return result;};
 const get=async idOrSlug=>(await families()).find(item=>item.id===idOrSlug||item.slug===idOrSlug)||null;
 return Object.freeze({
  async list(){return families();},
  get,
  async visible(){return (await families()).filter(item=>item.active&&item.showOnWiringKits);},
  async builders(){return (await families()).filter(item=>item.active&&item.builderEnabled);},
  async builder(idOrSlug){const family=await get(idOrSlug);return family?.active&&family.builderEnabled?family:null;}
 });
}

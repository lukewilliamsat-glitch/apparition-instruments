// Complete synthetic public-page dependency graph, using the same known-valid
// stable seed identifiers/specifications as B33. Names/prices/images are fixtures.
import {initialComponents} from '../../dist/admin/data.mjs';
import {lesPaulKitAssembly} from '../../dist/admin/assemblies.mjs';
import {workload,sha} from './fixtures.mjs';
export function browserWorkload(count,size,unique){
 const f=workload(count,size,unique),seed=initialComponents(),base=[...seed.filter(p=>p.category==='potentiometers').slice(0,4),...seed.filter(p=>p.category==='capacitors').slice(0,5),...seed.filter(p=>p.category==='treble-bleeds').slice(0,5)],entries={};
 for(let i=0;i<f.rows.length;i++){const row=f.rows[i],entry=f.manifest.entries[row.id];if(i<base.length){row.id=base[i].id;row.category=base[i].category;row.specs=structuredClone(base[i].specs);}entries[row.id]=entry;}
 f.manifest.entries=Object.fromEntries(Object.entries(entries).sort(([a],[b])=>a<b?-1:a>b?1:0));f.manifest.revision=sha(JSON.stringify(f.manifest.entries));return f;
}
export function fixtureKitRows(){const k=lesPaulKitAssembly.kitDefinition;return [{id:lesPaulKitAssembly.id,sku:'FIXTURE-KIT',name:'Synthetic wiring kit',category:'kits',slug:'les-paul',base_price:1000,show_on_wiring_kits:true,builder_enabled:true,default_wiring_style:'modern',defaults:k.defaults,builder_options:k.builderOptions,component_resolvers:k.componentResolvers}];}
export const fixtureKitPermissions=f=>f.rows.map(r=>({assembly_id:lesPaulKitAssembly.id,component_id:r.id}));

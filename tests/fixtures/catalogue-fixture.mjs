import {createComponentStore} from '../../dist/admin/data.mjs';
import {createAssemblyStore} from '../../dist/admin/assemblies.mjs';
import {createLocalComponentRepository,setComponentRepository} from '../../dist/admin/component-repository.mjs';
import {createLocalAssemblyRepository,setAssemblyRepository} from '../../dist/admin/assembly-repository.mjs';
// Explicit in-memory business fixtures. No network or production stock involved.
export function installCatalogueFixture(storage){
 if(!storage){const rows=new Map();storage={getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)};}
 if(typeof window==='undefined')globalThis.window={localStorage:storage};
 const components=createComponentStore(storage),assemblies=createAssemblyStore(storage);
 for(const item of components.list()){components.save({...item,active:true,inKits:true,kitPrice:Number.isSafeInteger(item.kitPrice)?item.kitPrice:100},item.id);components.changeStock(item.id,50);}
 const kit=assemblies.list().find(x=>x.id==='kit-les-paul');kit.kitDefinition.permittedComponentIds=components.list().map(x=>x.id);assemblies.save(kit,kit.id);
 setComponentRepository(createLocalComponentRepository(storage));setAssemblyRepository(createLocalAssemblyRepository(storage));return storage;
}

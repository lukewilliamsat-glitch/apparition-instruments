import assert from 'node:assert/strict';
import {createComponentStore} from '../dist/admin/data.mjs';
import {createAssemblyStore,lesPaulKitDefinitionId} from '../dist/admin/assemblies.mjs';
import {extendPotentiometerDefinition} from '../dist/wiring-kits/kit-component-discovery.mjs';

const memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)},components=createComponentStore(storage),assemblies=createAssemblyStore(storage);components.list();
components.save({sku:'test-brand-x-short',name:'Test Brand X A500K Short Shaft',manufacturer:'Test Brand X',category:'potentiometers',description:'Synthetic runtime proof',stock:1,active:true,individually:false,inKits:true,specs:{Resistance:'500K',Taper:'Audio',Shaft:'Short',Type:'Standard'},salePrice:null,kitPrice:250,internalUnitCost:null,stockUnit:'item',kitPriceQuantity:4,image:null},null);
let assembly=assemblies.list().find(item=>item.id===lesPaulKitDefinitionId);assembly.kitDefinition=extendPotentiometerDefinition(assembly.kitDefinition,components.list());assembly.kitDefinition.permittedComponentIds.push('test-brand-x-short');assembly.kitDefinition.basePrice=7345;assembly.kitDefinition.defaults.wiring='modern';for(const group of assembly.kitDefinition.builderOptions){if(group.key==='pots')group.defaultValue='Test Brand X';if(group.key==='shaft')group.defaultValue='short';}assemblies.save(assembly,assembly.id);

globalThis.localStorage=storage;globalThis.window={localStorage:storage};
const {createLocalComponentRepository,setComponentRepository}=await import('../dist/admin/component-repository.mjs');
setComponentRepository(createLocalComponentRepository(storage));
const {createLocalAssemblyRepository,setAssemblyRepository}=await import('../dist/admin/assembly-repository.mjs');
setAssemblyRepository(createLocalAssemblyRepository(storage));
const config=await import('../dist/les-paul-kits/config.mjs?zero-code-runtime');
assert(config.options.pots.includes('Test Brand X'),'actual Builder option list must include a discovered brand');assert.equal(config.defaults.pots,'Test Brand X');assert.equal(config.defaults.shaft,'short');assert.equal(config.defaults.wiring,'modern');assert.equal(config.lesPaul.basePrice,7345);assert.equal(config.lesPaul.pots['Test Brand X'].enabled,true);assert.equal(config.resolvedPotentiometer({pots:'Test Brand X',shaft:'short'}).component.id,'test-brand-x-short');assert.equal(config.kitRecord({pots:'Test Brand X',shaft:'short'}).resolvedComponents.potentiometers.componentId,'test-brand-x-short');
console.log('Actual customer config entry consumed zero-code Test Brand X, Admin defaults, base price and canonical Component ID.');

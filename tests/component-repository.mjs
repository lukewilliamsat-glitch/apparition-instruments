import assert from 'node:assert/strict';
import {storageKey} from '../dist/admin/data.mjs';
import {createLocalComponentRepository} from '../dist/admin/component-repository.mjs';
import {catalogue,refreshCatalogue} from '../dist/components/catalogue.mjs';
import {loadConfiguredKitDefinitions} from '../dist/wiring-kits/kit-data.mjs';

const memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
const repository=createLocalComponentRepository(storage);
const firstLoad=repository.list();assert(firstLoad instanceof Promise,'Repository reads must be asynchronous.');
let records=await firstLoad,component=records.find(item=>item.id==='bleed-duncan');
const image='data:image/png;base64,iVBORw0KGgo=';
await repository.save({...component,active:false,individually:false,inKits:false,salePrice:1234,kitPrice:567,internalUnitCost:89,image},component.id);
await repository.changeStock(component.id,12);await repository.changeStock(component.id,-2,'adjust');

const reloaded=createLocalComponentRepository(storage);records=await reloaded.list();component=records.find(item=>item.id==='bleed-duncan');
assert.deepEqual({active:component.active,individually:component.individually,inKits:component.inKits,salePrice:component.salePrice,kitPrice:component.kitPrice,internalUnitCost:component.internalUnitCost,stock:component.stock,image:component.image},{active:false,individually:false,inKits:false,salePrice:1234,kitPrice:567,internalUnitCost:89,stock:10,image});
assert.equal(JSON.parse(memory.get(storageKey)).version,1,'Existing storage envelope must remain version 1.');

await refreshCatalogue(reloaded);assert(!catalogue.some(item=>item.id===component.id),'Storefront must receive refreshed eligibility.');
await repository.save({...component,active:true,individually:true,inKits:true},component.id);await refreshCatalogue(repository);
assert.equal(catalogue.find(item=>item.id===component.id).price,1234,'Storefront must receive current pricing.');
const kits=await loadConfiguredKitDefinitions(repository);assert.equal(kits['les-paul'].bleed.duncan.enabled,true);assert.equal(kits['les-paul'].bleed.duncan.price,567);

const corrupt=new Map([[storageKey,'{"version":1,"items":']]),badStorage={getItem:key=>corrupt.get(key)??null,setItem:(key,value)=>corrupt.set(key,value)};
await assert.rejects(()=>createLocalComponentRepository(badStorage).list(),/preserved; no data was reset/);
assert.equal(corrupt.get(storageKey),'{"version":1,"items":','Unreadable data must not be overwritten.');
console.log('Async component repository: legacy load, edits, inventory, flags, pricing, images, storefront refresh, kit eligibility and corrupt-data preservation passed.');

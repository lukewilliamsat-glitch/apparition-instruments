import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPublicComponentRepository,createAdminComponentRepository} from '../dist/backend/component-data.mjs';
import {componentRepository,setComponentRepository} from '../dist/admin/component-repository.mjs';
import {configuredKitDefinitions} from '../dist/wiring-kits/kit-data.mjs';
import {lesPaulKitAssembly} from '../dist/admin/assemblies.mjs';

const migration=readFileSync(new URL('../supabase/migrations/20260924183910_p05b_public_component_availability.sql',import.meta.url),'utf8');
assert.match(migration,/security_invoker = true/);
assert.match(migration,/c\.active and \(c\.individually or c\.in_kits\)/);
assert.match(migration,/grant select \(component_id, quantity\).*to anon/);
assert.doesNotMatch(migration,/grant (insert|update|delete|all).*to anon/i);
assert.doesNotMatch(migration,/internal_unit_cost|supplier_details|private_notes/);

const source={id:'pot-short-cts-a',sku:'pot-short-cts-a',name:'CTS Short',category:'potentiometers',manufacturer:'CTS',description:'',specs:{Shaft:'Short'},product_content:{productTitle:'',shortDescription:'',fullDescription:'',productSpecifications:[]},active:true,individually:true,in_kits:true,sale_price:699,kit_price:299,kit_price_quantity:1,image:null};
const publicCalls=[];
const publicRepo=createPublicComponentRepository({request:async(url,options)=>{publicCalls.push({url,options});return {ok:true,json:async()=>[{...source,stock:4}]};}});
const publicRows=await publicRepo.list();
assert.equal(publicRows[0].salePrice,699);assert.equal(publicRows[0].stock,4);
assert.equal(publicRows[0].internalUnitCost,null);
assert.ok(publicCalls[0].url.includes('/catalogue_components?select=*'));
assert.ok(!JSON.stringify(publicCalls).includes('service_role'));
await assert.rejects(publicRepo.save({}),/authorised backend/);
await assert.rejects(createPublicComponentRepository({request:async()=>{throw new Error('offline');}}).list(),/offline/);

const components=[{...source}],inventory=[{component_id:source.id,quantity:4,stock_unit:'item'}],internal=[{component_id:source.id,internal_unit_cost:499}];
const traffic=[];
const transport={async send(table,{method='GET',query='',body,prefer}={}){
 traffic.push({table,method,query,prefer});const rows={components,inventory,component_internal:internal}[table];
 if(method==='GET')return {ok:true,json:async()=>structuredClone(query.includes('component_id=eq.')?rows.filter(row=>row.component_id===decodeURIComponent(query.split('component_id=eq.')[1].split('&')[0])):rows)};
 const id=query.includes('component_id=eq.')?decodeURIComponent(query.split('component_id=eq.')[1].split('&')[0]):decodeURIComponent(query.split('id=eq.')[1]?.split('&')[0]||'');
 if(method==='PATCH'){
  const row=rows.find(row=>(row.component_id||row.id)===id);
  if(!row||query.includes('quantity=eq.')&&Number(query.split('quantity=eq.')[1])!==row.quantity)return {ok:true,json:async()=>[]};
  Object.assign(row,body);return {ok:true,json:async()=>[structuredClone(row)]};
 }
 if(method==='POST'){
  const key=body.component_id||body.id,existing=rows.find(row=>(row.component_id||row.id)===key);
  if(existing&&prefer?.includes('merge-duplicates'))Object.assign(existing,body);
  else if(existing)return {ok:false,status:409,json:async()=>[]};
  else rows.push(structuredClone(body));
  return {ok:true,json:async()=>[structuredClone(existing||body)]};
 }
 throw new Error('Unexpected request');
}};
const admin=createAdminComponentRepository(transport);
assert.deepEqual((await admin.list()).map(item=>[item.id,item.stock,item.internalUnitCost]),[[source.id,4,499]]);
await admin.changeStock(source.id,2,'adjust');assert.equal(inventory[0].quantity,6);
const edited=(await admin.list())[0];
await admin.save({...edited,active:false,inKits:false,salePrice:799,kitPrice:399,internalUnitCost:450,stock:5},edited.id);
assert.equal(components[0].sale_price,799);assert.equal(components[0].kit_price,399);
assert.equal(components[0].active,false);assert.equal(components[0].in_kits,false);
assert.equal(internal[0].internal_unit_cost,450);assert.equal(inventory[0].quantity,5);
assert.ok(traffic.some(call=>call.table==='inventory'&&call.method==='PATCH'&&call.query.includes('quantity=eq.')));
assert.ok(traffic.some(call=>call.table==='components'&&call.method==='PATCH'&&call.prefer==='return=representation'));
await assert.rejects(admin.changeStock(source.id,-10,'adjust'),/Stock cannot be below zero/);

const newItem={...edited,id:'new-pot',sku:'new-pot',name:'New Pot',stock:2,active:true,inKits:true};
await admin.save(newItem);assert.equal(components.find(row=>row.id==='new-pot').active,true);
assert.equal(inventory.find(row=>row.component_id==='new-pot').quantity,2);
assert.equal(internal.find(row=>row.component_id==='new-pot').internal_unit_cost,499);
assert.ok(traffic.some(call=>call.table==='components'&&call.method==='POST'));

const localFake={getItem(){throw new Error('Local Component access is forbidden');},setItem(){throw new Error('Local writes are forbidden');}};
const previousWindow=globalThis.window,previousFetch=globalThis.fetch;
globalThis.fetch=async()=>({ok:true,json:async()=>[{...source,stock:4}]});
globalThis.window={localStorage:localFake};setComponentRepository(publicRepo);
assert.equal((await componentRepository().list())[0].stock,4);
setComponentRepository(null);
assert.equal((await componentRepository().list())[0].stock,4);
globalThis.window=previousWindow;
globalThis.fetch=previousFetch;
const configured=configuredKitDefinitions([{
 ...edited,active:true,inKits:true,stock:4
}],lesPaulKitAssembly);
assert.ok(configured['les-paul'].records.some(row=>row.id===source.id&&row.stock===4));
console.log('P05B: public boundary, Admin Component/Inventory reads and writes, no local fallback, Builder stock and RLS migration invariants passed.');

import {publicBackendConfig} from './public-config.mjs';
import {normaliseComponentInput} from '../admin/data.mjs';

// P05B: Supabase is the sole production Component and Inventory authority.
const endpoint=(config,table,query='')=>config.url+'/rest/v1/'+table+query;
const idQuery=id=>'?component_id=eq.'+encodeURIComponent(id);
const decode=async(response,label)=>{
 if(!response.ok)throw new Error(label+' is unavailable ('+response.status+'). No browser-local data was used.');
 const rows=await response.json();
 if(!Array.isArray(rows))throw new Error('Invalid '+label+' response.');
 return rows;
};
const content=record=>({productTitle:record.productTitle??'',shortDescription:record.shortDescription??'',fullDescription:record.fullDescription??'',productSpecifications:record.productSpecifications??[]});
export function componentFromRow(row,inventory={},internal={}){
 const product=row.product_content||{};
 return {id:row.id,sku:row.sku,name:row.name,category:row.category,manufacturer:row.manufacturer,
  description:row.description,specs:row.specs,productTitle:product.productTitle??'',shortDescription:product.shortDescription??'',
  fullDescription:product.fullDescription??'',productSpecifications:product.productSpecifications??[],
  active:row.active??true,individually:row.individually,inKits:row.in_kits,salePrice:row.sale_price,
  kitPrice:row.kit_price,kitPriceQuantity:row.kit_price_quantity,image:row.image,
  stock:inventory.quantity,stockUnit:inventory.stock_unit??'item',internalUnitCost:internal.internal_unit_cost??null};
}
export function createPublicComponentRepository({config=publicBackendConfig,request=globalThis.fetch}={}){
 const blocked=async()=>{throw new Error('Shared Admin writes require authorised backend access.');};
 return Object.freeze({
  async list(){
   const response=await request(endpoint(config,'catalogue_components','?select=*'),{headers:{apikey:config.publishableKey,Accept:'application/json'}});
   return (await decode(response,'Public Component catalogue')).map(row=>{
    if(!Number.isSafeInteger(row.stock)||row.stock<0)throw new Error('Public availability data is invalid.');
    return componentFromRow({...row,active:true},{quantity:row.stock});
   });
  },save:blocked,changeStock:blocked
 });
}
export function createAdminComponentRepository(transport){
 if(typeof transport?.send!=='function')throw new Error('Authenticated Admin transport required.');
 const read=async(table,query='?select=*')=>decode(await transport.send(table,{query}),'Admin '+table);
 const write=async(table,method,query,body,prefer='return=representation')=>{
  const response=await transport.send(table,{method,query,body,prefer});
  const rows=await decode(response,'Admin '+table+' save');
  if(rows.length!==1)throw new Error('Admin '+table+' save did not affect exactly one record. Refresh before retrying.');
  return rows[0];
 };
 const list=async()=>{
  const [components,inventory,internals]=await Promise.all([read('components'),read('inventory'),read('component_internal')]);
  const stock=new Map(inventory.map(row=>[row.component_id,row])),privateRows=new Map(internals.map(row=>[row.component_id,row]));
  return components.map(row=>{
   if(!stock.has(row.id))throw new Error('Component '+row.id+' has no Inventory record. No local data was substituted.');
   const item=componentFromRow(row,stock.get(row.id),privateRows.get(row.id));
   if(!Number.isSafeInteger(item.stock)||item.stock<0)throw new Error('Invalid shared stock quantity.');
   return item;
  });
 };
 const changeStock=async(id,value,mode='set')=>{
  if(!['set','adjust'].includes(mode))throw new Error('Invalid stock action.');
  const amount=Number(value);
  if(value===''||value===null||typeof value==='boolean'||!Number.isSafeInteger(amount))throw new Error('Quantity must be a whole number.');
  const before=(await read('inventory',idQuery(id)+'&select=*'))[0];
  if(!before)throw new Error('Component Inventory not found.');
  const next=mode==='adjust'?before.quantity+amount:amount;
  if(!Number.isSafeInteger(next)||next<0)throw new Error('Stock cannot be below zero or exceed the supported whole-number range.');
  await write('inventory','PATCH',idQuery(id)+'&quantity=eq.'+before.quantity,{quantity:next});
  return (await list()).find(item=>item.id===id);
 };
 return Object.freeze({list,changeStock,async remove(id){
  if(typeof id!=='string'||!id.trim())throw new Error('Choose a Component to delete.');
  const response=await transport.send('rpc/delete_unused_component',{method:'POST',body:{p_component_id:id}});
  if(!response.ok)throw new Error('Component deletion is unavailable ('+response.status+'). No data was removed.');
  const result=await response.json();
  if(result?.deleted===true)return result;
  if(Array.isArray(result?.dependencies)&&result.dependencies.length){
   const reasons=result.dependencies.map(item=>item.assembly+' — '+item.reason);
   throw new Error('Cannot delete this Component. Used by: '+reasons.join('; ')+'. Remove or change those dependencies first.');
  }
  throw new Error(result?.reason||'Component was not deleted. Refresh Admin.');
 },async save(input,originalId=null){
  const items=await list(),record=normaliseComponentInput(input,items,originalId),old=items.find(item=>item.id===originalId);
  const component={id:record.id,sku:record.sku,name:record.name,category:record.category,
   manufacturer:record.manufacturer,description:record.description,specs:record.specs,
   product_content:content(record),active:record.active,individually:record.individually,
   in_kits:record.inKits,sale_price:record.salePrice,kit_price:record.kitPrice,
   kit_price_quantity:record.kitPriceQuantity??null,image:record.image};
  if(!old){
   // A new Component stays invisible until both private cost and Inventory exist.
   await write('components','POST','', {...component,active:false});
   try{
    await write('component_internal','POST','',{component_id:record.id,internal_unit_cost:record.internalUnitCost??null});
    await write('inventory','POST','',{component_id:record.id,quantity:record.stock,stock_unit:record.stockUnit??'item'});
   }catch(error){
    try{await write('components','DELETE','?id=eq.'+encodeURIComponent(record.id));}
    catch{throw new Error('New Component setup failed; an incomplete inactive record may remain in shared data. Contact Admin before retrying.');}
    throw error;
   }
  }else{
   await write('component_internal','POST','',{component_id:record.id,internal_unit_cost:record.internalUnitCost??null},'resolution=merge-duplicates,return=representation');
   if(record.stock!==old.stock||record.stockUnit!==old.stockUnit){
    await write('inventory','PATCH',idQuery(record.id)+'&quantity=eq.'+old.stock,{quantity:record.stock,stock_unit:record.stockUnit??'item'});
   }
  }
  const updated=await write('components','PATCH','?id=eq.'+encodeURIComponent(record.id),component);
  return componentFromRow(updated,{quantity:record.stock,stock_unit:record.stockUnit??'item'},{internal_unit_cost:record.internalUnitCost??null});
 }});
}

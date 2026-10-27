import {createAdminAuth} from '../admin/admin-auth.mjs';
import {createAuthenticatedRepositoryTransport} from '../backend/providers.mjs?v=p10g';
import {boundedJSON} from '../admin/command/bounded-json.mjs';
// Explicit, image-free read of existing columns. No private costs or new backend resource.
export function createOfferReferenceReader({auth,request=globalThis.fetch,config}={}){
 let controller=null,used=false,disposed=false;
 return {async read(category=''){
  if(used||disposed)throw Error('This catalogue lookup has already been attempted. Choose an explicit reload to try again.');
  if(category&&!/^[a-z0-9-]{1,60}$/.test(category))throw Error('Invalid component category.');used=true;controller=new AbortController();const signal=controller.signal,timer=setTimeout(()=>controller.abort(),5000);let bytes=0,requests=0;
  try{
   const boundedRequest=(url,options)=>request(url,{...options,signal,cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'}),currentAuth=auth||createAdminAuth({...config?{config}:{},request:boundedRequest});
   const transport=createAuthenticatedRepositoryTransport({accessToken:()=>currentAuth.accessToken({signal,bounded:true,onBytes:n=>{bytes+=n;}})},{...config?{config}:{},request:boundedRequest});
   const read=async(table,query,max)=>{requests++;return boundedJSON(await transport.send(table,{query}),max,{signal,onBytes:n=>{bytes+=n;}});};
   const rows=await read('components','?select=id,sku,name,category,sale_price&active=eq.true&individually=eq.true&sale_price=gt.0&order=id&limit=201'+(category?'&category=eq.'+encodeURIComponent(category):''),98304);
   if(!Array.isArray(rows)||rows.length>200)throw Error('This view exceeds 200 products. Select a narrower category and explicitly reload.');
   const seen=new Set();for(const row of rows){if(Object.keys(row).some(k=>!['id','sku','name','category','sale_price'].includes(k))||typeof row.id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(row.id)||seen.has(row.id)||typeof row.name!=='string'||row.name.length>500||!Number.isSafeInteger(row.sale_price)||row.sale_price<=0||row.sale_price>1000000000)throw Error('Catalogue reference does not match the expected price projection.');seen.add(row.id);}
   const inventory=rows.length?await read('inventory','?select=component_id,quantity&component_id=in.('+rows.map(row=>encodeURIComponent(row.id)).join(',')+')&limit=201',32768):[];
   if(!Array.isArray(inventory)||inventory.length>rows.length)throw Error('Unexpected inventory reference projection.');const stock=new Map();for(const row of inventory){if(Object.keys(row).some(k=>!['component_id','quantity'].includes(k))||!seen.has(row.component_id)||stock.has(row.component_id)||!Number.isSafeInteger(row.quantity)||row.quantity<0)throw Error('Invalid inventory reference.');stock.set(row.component_id,row.quantity);}
   if(disposed||signal.aborted)throw Error('Catalogue lookup cancelled.');
   return {products:rows.map(row=>({id:row.id,sku:row.sku,name:row.name,category:row.category,unitPriceMinor:row.sale_price,currency:'GBP',stock:stock.get(row.id)??null})),observedAt:new Date().toISOString(),bytes,requests};
  }finally{clearTimeout(timer);controller=null;}
 },dispose(){disposed=true;controller?.abort();}};
}

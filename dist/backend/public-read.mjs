// Public projections are explicit. Never use this transport for authenticated data.
export const componentColumns='id,sku,name,category,manufacturer,description,specs,product_content,individually,in_kits,sale_price,kit_price,image,kit_price_quantity,stock';
export const kitColumns='id,sku,name,category,slug,base_price,show_on_wiring_kits,builder_enabled,default_wiring_style,defaults,builder_options,component_resolvers';
export const optionColumns='option_set,option_key,label,aliases,active,sort_order';
export const productColumns=componentColumns.split(',').filter(key=>!['in_kits','kit_price','kit_price_quantity'].includes(key)).join(',');
const pending=new WeakMap();
// Only concurrent identical reads coalesce. Settled reads always fetch fresh data.
export async function readPublicRows({config,request=globalThis.fetch},table,query,label='Public '+table){
 if(!['catalogue_components','catalogue_wiring_kits','catalogue_options','kit_permitted_components'].includes(table))throw Error('Unsupported public catalogue resource.');
 if(typeof request!=='function')throw Error('Public request transport required.');
 let reads=pending.get(request);if(!reads){reads=new Map();pending.set(request,reads);}
 const url=config.url+'/rest/v1/'+table+query,key=config.publishableKey+' '+url;
 let load=reads.get(key);if(!load){load=(async()=>{const response=await request(url,{headers:{apikey:config.publishableKey,Accept:'application/json'}});return {ok:response.ok,status:response.status,rows:response.ok?await response.json():null};})();reads.set(key,load);load.finally(()=>{if(reads.get(key)===load)reads.delete(key);}).catch(()=>{});}
 const result=await load;if(!result.ok)throw Error(label+' is unavailable ('+result.status+'). No browser-local data was used. No local configuration was substituted.');
 if(!Array.isArray(result.rows))throw Error('Invalid '+label+' response.');
 // Isolate mutable repository consumers even when the HTTP request was shared.
 return structuredClone(result.rows);
}

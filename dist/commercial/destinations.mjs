import {publicBackendConfig} from '../backend/public-config.mjs';
// One persistent authority: commercial_destinations. No source-controlled URL copies.
export const commercialDestinations=Object.freeze({version:2,destinations:Object.freeze([])});
const host='(?:www\\.)?ebay\\.(?:co\\.uk|com)';
const allowed=new RegExp('^https://'+host+'/(?:itm|str)/[A-Za-z0-9_%-]+(?:/?[A-Za-z0-9_./%?=&+-]*)?$');
export function ebayURL(value){
 if(typeof value!=='string'||value.length>2000||!allowed.test(value)||/%(?:0[ad]|5c|23)/i.test(value))return null;
 try{const u=new URL(value);return !u.port&&!u.username&&!u.password&&!u.hash?u.href:null;}catch{return null;}
}
export function validateDestination(row){
 const {scope,scope_key,destination_type='EBAY',url,label='',enabled=false,paused_only=false}=row;
 if(!['PRODUCT','SKU','FAMILY','CATEGORY','STOREFRONT'].includes(scope)||typeof scope_key!=='string'||!scope_key.length||scope_key.length>160||/[\x00-\x1f\x7f]/.test(scope_key)||(scope==='STOREFRONT'&&scope_key!=='*'))throw Error('Choose a valid destination scope.');
 const safe=ebayURL(url);if(destination_type!=='EBAY'||!safe)throw Error('Enter a verified HTTPS eBay item or shop URL.');
 if(typeof label!=='string'||label.length>100||typeof enabled!=='boolean'||typeof paused_only!=='boolean')throw Error('Invalid destination options.');
 return {scope,scope_key,destination_type,url:safe,label,enabled,paused_only};
}
export async function readCommercialDestinations({config=publicBackendConfig,request=globalThis.fetch}={}){
 const r=await request(config.url+'/rest/v1/rpc/public_commercial_destinations',{method:'POST',cache:'no-store',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:'{}'});
 if(!r.ok)throw Error('Commercial destinations unavailable.');const rows=await r.json();if(!Array.isArray(rows))throw Error('Invalid destination projection.');
 return {version:2,destinations:rows.map(row=>validateDestination({...row,enabled:true}))};
}

import {commercialDestinations,ebayURL} from './destinations.mjs';
export {ebayURL};
export const commercialSurface=path=>/^\/(products\/[^/]+|components(?:\/[^/]+)?)\/$/.test(path);
export function commercialDestination(path,store,configuration=commercialDestinations,product=null){
 if(!commercialSurface(path))return {kind:'BROWSE',url:path};
 let rows=configuration.destinations||[];
 // Read old empty V1 snapshots safely; authoring uses the persistent V2 registry.
 if(!Array.isArray(rows))rows=Object.entries(rows).map(([key,v])=>({scope:'CATEGORY',scope_key:key,destination_type:'EBAY',url:v.ebay,enabled:v.enabled!==false,paused_only:false,label:v.label||''}));
 const category=product?.category||path.match(/^\/components\/([^/]+)\/$/)?.[1];
 const matches=[['PRODUCT',product?.id],['SKU',product?.sku],['FAMILY',category],['CATEGORY',path],['STOREFRONT','*']];
 let external=null;
 if(['OPEN','ORDERS_PAUSED'].includes(store?.state))for(const [scope,key] of matches){
  const row=rows.find(r=>r.scope===scope&&r.scope_key===key&&r.enabled!==false&&(!r.paused_only||store.state==='ORDERS_PAUSED')&&r.destination_type==='EBAY'&&ebayURL(r.url));
  if(row){external={url:ebayURL(row.url),label:row.label||'Available on eBay'};break;}
 }
 if(store?.state==='OPEN')return {kind:'WEBSITE',url:path,...external?{external}:{}};
 if(external)return {kind:'EBAY',url:external.url,label:external.label};
 return {kind:'BROWSE',url:path};
}
export function mountCommercialHandoff(document,store,configuration=commercialDestinations,product=null){
 document.querySelector('[data-commercial-handoff]')?.remove();const result=commercialDestination(document.location?.pathname||'/',store,configuration,product),external=result.kind==='EBAY'?result:result.external;if(!external)return result;
 const main=document.querySelector('main');if(!main)return result;const p=document.createElement('p');p.dataset.commercialHandoff='';const a=document.createElement('a');a.className='text-link';a.href=external.url;a.textContent=external.label+' (external marketplace)';a.target='_blank';a.rel='noopener noreferrer';p.append(a);main.append(p);return result;
}

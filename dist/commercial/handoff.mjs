import {commercialDestinations} from './destinations.mjs';
export function ebayURL(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.hash&&['www.ebay.co.uk','ebay.co.uk','www.ebay.com','ebay.com'].includes(url.hostname)&&/^\/(itm|str)\//.test(url.pathname)?url.href:null;}catch{return null;}}
export function commercialDestination(path,store,configuration=commercialDestinations){
 if(!/^\/(products\/[^/]+|components(?:\/[^/]+)?)\/$/.test(path))return {kind:'BROWSE',url:path};
 const configured=configuration.destinations?.[path],external=ebayURL(configured?.ebay);
 if(store?.state==='OPEN'&&configured?.preference!=='EBAY')return {kind:'WEBSITE',url:path};
 if(external&&['OPEN','ORDERS_PAUSED'].includes(store?.state))return {kind:'EBAY',url:external};
 return {kind:'BROWSE',url:path};
}
export function mountCommercialHandoff(document,store,configuration=commercialDestinations){
 document.querySelector('[data-commercial-handoff]')?.remove();const result=commercialDestination(document.location?.pathname||'/',store,configuration);if(result.kind!=='EBAY')return result;
 const main=document.querySelector('main');if(!main)return result;const p=document.createElement('p');p.dataset.commercialHandoff='';const a=document.createElement('a');a.className='text-link';a.href=result.url;a.textContent='Available on eBay (external marketplace)';a.target='_blank';a.rel='noopener noreferrer';p.append(a);main.append(p);return result;
}

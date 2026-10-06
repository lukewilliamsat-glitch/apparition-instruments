import {pageRoute} from './pages.mjs';
// Navigation intent only. No auth, business actions or document mutation.
export function websiteDestination(value,current,base='https://apparitioninstruments.co.uk/'){
 const url=new URL(value,base),site=new URL(base);if(!['https:','mailto:','tel:'].includes(url.protocol))throw Error('Unsafe destination blocked.');
 if(url.origin!==site.origin||/^\/(?:account|admin|basket|checkout|auth|api)(?:\/|$)/.test(url.pathname))return {kind:'external',href:url.href};
 const route=pageRoute(url.href,base);if(route===current&&url.hash)return {kind:'anchor',id:decodeURIComponent(url.hash.slice(1))};return {kind:'document',route};
}

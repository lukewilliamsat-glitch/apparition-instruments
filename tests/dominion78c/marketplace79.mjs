import { Buffer } from 'node:buffer';
import { identifier, instant, whole } from './contracts.mjs';
import { ebayReads, fixtureReader, readWindow, reconcile } from './marketplace.mjs';

const scopeUri = s => 'https://api.ebay.com/oauth/api_scope/' + s;
const oauthScopes = new Set(Object.values(ebayReads).map(x => x.scope));
const origins = {
 orders: 'https://api.ebay.com', transactions: 'https://apiz.ebay.com',
 token: 'https://api.ebay.com/identity/v1/oauth2/token'
};
const overlapMs = 5 * 60_000;
const safeToken = t => typeof t === 'string' && /^[!-~]{1,8192}$/.test(t);

export function requestShape({method,endpoint,offset,limit,from,to,requiresSignature}){
 const kind=Object.keys(ebayReads).find(k=>ebayReads[k].path===endpoint);
 if(!kind||method!=='GET'||ebayReads[kind].requiresUkSignature!==requiresSignature)throw Error('Only the two approved eBay reads are supported');
 const [start,end]=readWindow({from,to});
 const url=new URL(endpoint,origins[kind]);
 url.search=new URLSearchParams({limit:String(whole(limit,'limit',1,100)),offset:String(whole(offset,'offset',0,2000)),
  filter:(kind==='orders'?'lastmodifieddate':'transactionDate')+':['+start+'..'+end+']'});
 return {url:url.href,scope:ebayReads[kind].scope,requiresSignature};
}

// Server-only. Credential stores, network and signing are injected. No default network,
 // no credential exposure to the UI and no fallback to an unsigned Finance call.
export function makeEbayGateway({vault,request,sign,now=()=>Date.now()}){
 if(typeof vault?.load!=='function'||typeof request!=='function')throw Error('Secure credential store and bounded transport required');
 const tokens=new Map(), inflight=new Map();
 async function token(account,scope){
  identifier(account,'account');
  if(!oauthScopes.has(scope))throw Error('Scope outside read contract');
  const k=JSON.stringify([account,scope]);
  if(tokens.get(k)?.expires>now()+60000)return tokens.get(k).access;
  if(inflight.has(k))return inflight.get(k);
  const work=(async()=>{
   const x=await vault.load(account);
   if(!x||x.account!==account||!x.grantedScopes?.includes(scope)||!safeToken(x.refreshToken)||!/^[A-Za-z0-9._-]{1,128}$/.test(x.clientId??'')||!safeToken(x.clientSecret))
    throw Error('Seller consent or private credentials unavailable');
   const response=await request({url:origins.token,method:'POST',redirect:'error',timeoutMs:7000,maxBytes:15000,
    headers:{Authorization:'Basic '+Buffer.from(x.clientId+':'+x.clientSecret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'refresh_token',refresh_token:x.refreshToken,scope:scopeUri(scope)}).toString()});
   const body=response?.body;
   if(response?.status!==200||!safeToken(body?.access_token)||!/^bearer$/i.test(body.token_type??''))throw Error('eBay token refresh requires review');
   const expires=now()+whole(body.expires_in,'token lifetime',120,86400)*1000;
   tokens.set(k,{expires,access:body.access_token});
   return body.access_token;
  })();
  inflight.set(k,work);
  try{return await work;}finally{inflight.delete(k);}
 }
 return async function transport(args){
  const {url,scope,requiresSignature}=requestShape(args);
  if(requiresSignature&&typeof sign!=='function')throw Error('UK Finances signing adapter required');
  const headers={Authorization:'Bearer '+await token(args.account,scope),Accept:'application/json','X-EBAY-C-MARKETPLACE-ID':'EBAY_GB'};
  if(requiresSignature){
   const signed=await sign({method:'GET',url,account:args.account});
   for(const h of ['signature','signature-input','x-ebay-signature-key']){
    if(!signed||typeof signed[h]!=='string'||!signed[h]||signed[h].length>12000||/[\r\n]/.test(signed[h]))throw Error('Missing or invalid finance signature header');
    headers[h]=signed[h];
   }
  }
  const requestArgs={url,method:'GET',redirect:'error',timeoutMs:7000,maxBytes:750000,headers};
  const response=await request(requestArgs);
  if(response?.status===401)tokens.delete(JSON.stringify([args.account,scope]));
  return response;
 };
}

// One bounded poll per operation. The repository must atomically persist both the sanitised
// evidence and next watermark, rejecting a stale revision. The overlap is intentionally replayed.
export async function importWindow({kind,account,initialFrom,until,read,repository,manualOrders=[],listingMappings=[]}){
 identifier(account,'account');
 if(!Object.hasOwn(ebayReads,kind)||typeof read!=='function'||typeof repository?.checkpoint!=='function'||typeof repository?.commit!=='function')throw Error('Invalid intake contract');
 const marker=await repository.checkpoint(account,kind);
 if(!marker||!Number.isSafeInteger(marker.revision)||marker.revision<0)throw Error('Invalid saved import revision');
 const to=instant(until,'cutoff'), start=instant(initialFrom,'initial boundary');
 const last=marker.through===null?null:instant(marker.through,'previous cutoff');
 if(last&&to<=last)throw Error('Import cutoff did not advance');
 const from=last?new Date(Math.max(Date.parse(start),Date.parse(last)-overlapMs)).toISOString():start;
 readWindow({from,to});
 const incoming=await read(kind,{account,from,to,scopes:[ebayReads[kind].scope],signerReady:kind==='transactions'});
 if(!Array.isArray(incoming)||incoming.length>2000||incoming.some(x=>x.account!==account))throw Error('Read escaped its account or row bound');
 const existing=await repository.correlatedOrders(account,incoming);
 if(!Array.isArray(existing)||existing.length>2000||existing.some(x=>x.account!==account))throw Error('Reconciliation escaped its account or row bound');
 const linked=reconcile({orders:kind==='orders'?incoming:existing,transactions:kind==='transactions'?incoming:[],manualOrders,listingMappings});
 const staged=kind==='orders'?linked.staged.map(o=>({...o,needsStockReview:o.decision==='review'||o.cancelled||o.lines.some(l=>!l.verifiedSku),
  stockMutation:false,shipping:o.shipping??null})):linked.financialEvidence;
 const review=kind==='transactions'?linked.review.filter(x=>x.kind==='finance-review'):linked.review;
 const record={account,kind,expectedRevision:marker.revision,through:to,evidence:staged,review};
 await repository.commit(record);
 return {kind,account,through:to,review:review.length,staged:staged.length};
}

export function createReadAdapter(args){return fixtureReader(args);}

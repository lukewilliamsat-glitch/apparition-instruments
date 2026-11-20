import {identifier,whole,currency,minor,instant,unique,providerRef} from './contracts.mjs';
export const ebayReads=Object.freeze({
 orders:Object.freeze({path:'/sell/fulfillment/v1/order',scope:'sell.fulfillment.readonly',requiresUkSignature:false}),
 transactions:Object.freeze({path:'/sell/finances/v1/transaction',scope:'sell.finances',requiresUkSignature:true})
});
const retryable=new Set([429,502,503,504]);
const windowLimit=31*86400000;
const keyFor=(account,reference)=>providerRef({provider:'ebay',account,reference});
const price=m=>({currency:currency(m?.currency),minor:minor(m?.value,m?.currency)});
export function readWindow({from,to}){
 const s=instant(from,'from'),e=instant(to,'to');
 if(e<s||Date.parse(e)-Date.parse(s)>windowLimit)throw Error('Unexpected read window');
 return [s,e];
}
// Uses an injected transport only. No default client, host, token, signer, or callback URL.
export function fixtureReader({transport,wait=()=>Promise.resolve(),limit=50,maxPages=10}) {
 whole(limit,'page size',1,100);whole(maxPages,'page bound',1,20);
 if(typeof transport!=='function')throw Error('Read transport required');
 return async function read(kind,{account,from,to,signerReady=false,scopes=[]}){
  identifier(account,'account alias');
  const spec=Object.hasOwn(ebayReads,kind)?ebayReads[kind]:undefined; if(!spec)throw Error('Unsupported read');
  if(!Array.isArray(scopes)||!scopes.includes(spec.scope))throw Error('Required read scope missing');
  if(spec.requiresUkSignature&&!signerReady)throw Error('UK Finances signer required');
  const [start,end]=readWindow({from,to});
  const all=[];
  for(let page=0;page<maxPages;page++){
   const offset=page*limit;
   const request={method:'GET',endpoint:spec.path,account,from:start,to:end,offset,limit,filterField:kind==='orders'?'lastmodifieddate':'transactionDate',requiresSignature:spec.requiresUkSignature};
   let response;
   for(let attempt=0;attempt<3;attempt++){
    response=await transport(request);
    if(response?.status===200)break;
    if(!retryable.has(response?.status)||attempt===2)throw Error('Provider read did not complete');
    const backoff=response.retryAfterSeconds===undefined ? 1<<attempt : whole(response.retryAfterSeconds,'retry interval',0,30);
    await wait(backoff*1000);
   }
   const body=response.body,rows=body?.[kind==='orders'?'orders':'transactions'];
   if(!Array.isArray(rows)||rows.length>limit||body.offset!==offset)throw Error('Unexpected page shape');
   for(const row of rows) all.push(kind==='orders'?normalizeOrder(account,row):normalizeFinancial(account,row));
   // Never follow a provider response URL or redirect; only increment bounded numeric offsets.
   if(!body.next)return all;
   if(!rows.length)throw Error('Empty continuation');
  }
  throw Error('Page budget exhausted; no partial result returned');
 };
}
export function normalizeOrder(account,x) {
 const reference=identifier(x.orderId,'provider order');
 const {currency,minor}=price(x.pricingSummary?.total);
 if(minor<0)throw Error('Negative order total');
 if(!Array.isArray(x.lineItems)||!x.lineItems.length||x.lineItems.length>100||!unique(x.lineItems,l=>identifier(l.lineItemId,'line ID')))throw Error('Invalid marketplace lines');
 const lines=x.lineItems.map(l=>({lineRef:identifier(l.lineItemId),listingRef:identifier(l.legacyItemId,'listing ID'),sku:l.sku==null?null:identifier(l.sku,'SKU'),quantity:whole(l.quantity,'quantity',1,10000)}));
 const cancellation=['CANCELED','CANCELLED','CANCEL_CLOSED_WITH_REFUND'].includes(x.cancelStatus?.cancelState);
 return {key:keyFor(account,reference),provider:'ebay',account,reference,updatedAt:instant(x.lastModifiedDate),
  currency,totalMinor:minor,cancelled:cancellation,
  lines:lines.sort((a,b)=>a.lineRef.localeCompare(b.lineRef))};
}
export function normalizeFinancial(account,x){
 const id=identifier(x.transactionId,'transaction ID');
 const orderReference=x.orderId?identifier(x.orderId,'provider order'):null;
 const amount=price(x.amount);
 const rawKind=identifier(x.transactionType,'transaction kind');
 const kind=({SALE:'sale',REFUND:'refund',NON_SALE_CHARGE:'fee',CREDIT:'credit'})[rawKind]??'unclassified';
 const direction=x.bookingEntry==='DEBIT'?'debit':x.bookingEntry==='CREDIT'?'credit':null;
 if(!direction)throw Error('Unknown booking direction');
 return {id,key:keyFor(account,id),account,orderReference,kind,rawKind,direction,currency:amount.currency,amountMinor:Math.abs(amount.minor),at:instant(x.transactionDate)};
}
export function reconcile({orders,transactions,manualOrders,listingMappings}){
 const imported=new Map(),fin=new Map(),links=new Map(),mappings=new Map(),orderCurrency=new Map(),review=[];
 for(const row of manualOrders){
  const local=identifier(row.orderId,'manual order ID');const k=keyFor(row.account,row.reference);
  if(!links.has(k))links.set(k,new Set());links.get(k).add(local);
 }
 for(const m of listingMappings){
  const k=keyFor(m.account,m.listingRef);
  if(mappings.has(k)&&mappings.get(k)!==m.componentSku)throw Error('Ambiguous listing mapping');
  mappings.set(k,identifier(m.componentSku,'component SKU'));
 }
 for(const o of orders){
  const old=imported.get(o.key);
  if(old&&old.updatedAt===o.updatedAt&&JSON.stringify(old)!==JSON.stringify(o))throw Error('Conflicting order revision');
  if(!old||old.updatedAt<o.updatedAt)imported.set(o.key,o);
 }
 const staged=[...imported.values()].map(o=>{
  orderCurrency.set(o.key,o.currency);
  const candidates=[...(links.get(o.key)||[])];
  if(candidates.length>1)review.push({kind:'ambiguous-manual-link',reference:o.reference});
  const mapped=o.lines.map(line=>{
   const sku=mappings.get(keyFor(o.account,line.listingRef))??null;
   const mismatch=sku&&line.sku&&sku!==line.sku;
   if(!sku||mismatch)review.push({kind:mismatch?'provider-sku-conflict':'unmapped-listing',reference:line.listingRef});
   return {...line,verifiedSku:mismatch?null:sku};
  });
  return {...o,lines:mapped,existingOrderId:candidates.length===1?candidates[0]:null,decision:candidates.length>1?'review':candidates.length===1?'link-candidate':'import-candidate'};
 });
 for(const t of transactions){
  const old=fin.get(t.key);
  if(old&&JSON.stringify(old)!==JSON.stringify(t))throw Error('Conflicting finance transaction');
  fin.set(t.key,t);
 }
 const financialEvidence=[...fin.values()].map(t=>{
  const k=t.orderReference?keyFor(t.account,t.orderReference):null;
  const existing=k?[...(links.get(k)||[])]:[];
  const hasOrder=k&&(imported.has(k)||existing.length===1);
  const reviewNeeded=!hasOrder||existing.length>1||(orderCurrency.has(k)&&orderCurrency.get(k)!==t.currency)||t.kind==='unclassified';
  if(reviewNeeded)review.push({kind:'finance-review',reference:t.id});
  return {...t,matchedOrderReference:reviewNeeded?null:t.orderReference,manualOrderId:!reviewNeeded&&existing.length===1?existing[0]:null,reviewNeeded};
 });
 return {staged,financialEvidence,review}; // no order, stock or finance writes
}

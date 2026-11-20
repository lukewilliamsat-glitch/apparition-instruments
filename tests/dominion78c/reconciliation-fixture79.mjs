import { createReadAdapter, importWindow } from './marketplace79.mjs';
// Synthetic provider input, but the external-order mapping is read from actual Orders in the isolated database.
export async function marketplaceWalkthrough(q){
 const existing=(await q("select id,external_reference from public.orders where sales_channel='EBAY' and external_reference='F79-EBAY-PAID' limit 2")).rows;
 if(existing.length!==1)throw Error('Expected one explicitly identified fixture order');
 const account='fixture-ebay', stages=new Map(), markers=new Map(), issues=[];
 const dates={initialFrom:'2026-11-19T10:00:00.000Z',until:'2026-11-19T10:15:00.000Z'};
 const price=value=>({currency:'GBP',value});
 const order={orderId:existing[0].external_reference,lastModifiedDate:dates.until,
  pricingSummary:{total:price('11.50'),deliveryCost:price('1.50')},
  lineItems:[{lineItemId:'l1',legacyItemId:'f7901',sku:'F79-CAP',quantity:2},{lineItemId:'l2',legacyItemId:'f7902',quantity:1}]};
 const tx={transactionId:'f79-refund-1',orderId:order.orderId,transactionType:'REFUND',bookingEntry:'DEBIT',amount:price('1.50'),transactionDate:dates.until};
 const read=createReadAdapter({transport:async r=>({status:200,body:r.filterField==='lastmodifieddate'?
  {offset:r.offset,orders:[order,order]}:{offset:r.offset,transactions:[tx,tx,{...tx,transactionId:'f79-fee-1',transactionType:'NON_SALE_CHARGE',amount:price('0.65')}]}})});
 const repository={checkpoint:async(a,k)=>markers.get(a+':'+k)??{revision:0,through:null},
  correlatedOrders:async()=>stages.get('orders')??[],
  commit:async x=>{
   const k=x.account+':'+x.kind;const revision=markers.get(k)?.revision??0;
   if(revision!==x.expectedRevision)throw Error('Stale fixture watermark');
   stages.set(x.kind,x.evidence);issues.push(...x.review);
   markers.set(k,{revision:revision+1,through:x.through});
  }};
 const settings={...dates,account,read,repository,
  manualOrders:[{account,reference:existing[0].external_reference,orderId:existing[0].id}],
  listingMappings:[{account,listingRef:'f7901',componentSku:'F79-CAP'}]};
 await importWindow({...settings,kind:'orders'});await importWindow({...settings,kind:'transactions'});
 return {orders:stages.get('orders'),finance:stages.get('transactions'),review:issues};
}

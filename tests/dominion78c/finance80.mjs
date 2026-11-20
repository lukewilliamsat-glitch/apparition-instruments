import {identifier,whole} from './contracts.mjs';

const operations=['packaging','shipping','other'];
export function prepareFulfilmentRevision({current,orderId,evidence,adjustment=null}){
 identifier(orderId,'saved order');
 if(evidence?.orderId!==orderId||evidence.currency!=='GBP'||evidence.readyForDispatchReview!==true||
    typeof current?.orderBasisHash!=='string'||!current.document||current.orderId!==orderId||current.orderBasisMatches!==true)
  throw Error('Current order finance and completed packing evidence are required');
 whole(current.revision,'revision',0);
 const revised=structuredClone(current.document);
 const costs=revised.costs??{};
 const previous=structuredClone(costs);
 const work=[['packaging',evidence.packagingActualMinor,'Packed material '+identifier(String(evidence.packageStockMovement),'stock movement')+'; receipt '+String(evidence.purchaseReference)]];
 if(evidence.postageActualMinor!==null&&evidence.postageActualMinor!==undefined)
  work.push(['shipping',evidence.postageActualMinor,'Recorded postage '+evidence.postageReceipt]);
 if(adjustment)work.push(['other',adjustment.minor,'Reviewed fulfilment cost '+adjustment.reference]);
 let changes=0;
 for(const [kind,raw,source] of work){
  if(!operations.includes(kind)||typeof raw!=='number'||source.length>160||/[\u0000-\u001f\u007f]/u.test(source))throw Error('Invalid fulfilment receipt');
  const minor=whole(raw,kind+' cost',0,10000000);
  if(kind==='shipping'&&(!evidence.postageReceipt||typeof evidence.postageReceipt!=='string')||
     kind==='other'&&(!adjustment?.reference||typeof adjustment.reference!=='string'))
   throw Error('Actual costs require a receipt or review reference');
  const old=previous[kind];
  if(old?.state==='confirmed'){
   if(old.minor!==minor||old.source!==source)throw Error('Existing '+kind+' evidence needs an explicit correction review');
   continue;
  }
  if(kind==='packaging'&&revised.fulfilmentSnapshot)
   throw Error('Existing packaging snapshot needs an explicit correction review');
  costs[kind]={minor,state:'confirmed',source};
  changes++;
 }
 revised.costs=costs;
 return {document:revised,expectedRevision:current.revision,orderBasisHash:current.orderBasisHash,
  estimatedPostageMinor:evidence.postageEstimatedMinor??null,changed:changes>0};
}

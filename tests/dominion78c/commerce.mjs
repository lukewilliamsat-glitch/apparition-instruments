import {identifier,currency,whole,instant,providerRef,requirements} from './contracts.mjs';
const key=(a,r)=>providerRef({provider:'stripe',account:a,reference:r});
const normal=(kind,a,r)=>JSON.stringify([kind,key(a,r)]);
// Sandbox-only event policy and interface. The provided repository MUST serialise by order and
// commit provider evidence, status, disposition, and idempotency keys as one transaction.
export function applyCommerceEvent({verified,order,lookup,markerAt}){
 if(verified?.verified!==true)throw Error('Provider verification required');
 const {id,type,account,reference,money}=verified;
 identifier(order.id,'saved order ID');identifier(reference,'provider reference');identifier(account,'provider account');
 const eventKey=normal('event',account,id), providerAt=instant(verified.occurredAt,'event time');
 if(account!==order.paymentAccount||reference!==order.paymentReference||identifier(verified.orderId)!==order.id)throw Error('Order reconciliation mismatch');
 if(!['awaiting','cancelled','paid','part-refunded','refunded'].includes(order.state))throw Error('Invalid order state');
 const captureAmount=whole(order.expectedMinor,'saved order amount',1);
 const mk=base=>({eventKey,providerAt,recordedAt:instant(markerAt),...base});
 const txKey=normal(type,account,identifier(verified.transactionId,'transaction ID'));
 const expectedCurrency=currency(order.currency);
 const amount=money==null?null:whole(money.minor,'provider amount',0);
 if((type==='payment'||type==='refund')&&(amount===null||currency(money.currency)!==expectedCurrency))throw Error('Currency reconciliation mismatch');
 const fingerprint=JSON.stringify([type,account,reference,order.id,txKey,amount,money?.currency??null]);
 const prior=lookup(eventKey);
 if(prior){if(prior.fingerprint!==fingerprint)throw Error('Conflicting event replay');return mk({result:'duplicate-event',fingerprint});}
 const priorTx=lookup(txKey);
 if(priorTx){if(priorTx.fingerprint!==fingerprint)throw Error('Conflicting transaction replay');return mk({result:'duplicate-transaction',fingerprint,after:null});}
 const p=mk({transactionKey:txKey,fingerprint,after:null,stock:null,evidence:null});
 if(type==='payment'){
   if(amount!==captureAmount)throw Error('Saved order amount mismatch');
   if(order.state==='cancelled')return {...p,result:'review-late-payment',evidence:{amountMinor:amount,currency:expectedCurrency,providerTransaction:verified.transactionId}};
   if(order.state!=='awaiting')throw Error('Order already paid or refunded');
   return {...p,result:'paid',after:{state:'paid',capturedMinor:amount,refundedMinor:0},stock:{action:'consume',savedRequirements:requirements(order.savedItems)}};
 }
 if(type==='cancel'){
   if(order.state==='cancelled')return {...p,result:'already-cancelled'};
   if(order.state!=='awaiting')return {...p,result:'review-cancellation-after-payment'};
   return {...p,result:'cancelled',after:{state:'cancelled'},stock:{action:'release-unconsumed'}};
 }
 if(type==='refund'){
   if(!['paid','part-refunded'].includes(order.state))throw Error('Refund requires a paid order');
   const refunded=whole(order.refundedMinor,'prior refunds')+whole(amount,'refund amount',1);
   if(refunded>whole(order.capturedMinor,'captured amount',1))throw Error('Refund exceeds captured amount');
   return {...p,result:'refunded',after:{state:refunded===order.capturedMinor?'refunded':'part-refunded',refundedMinor:refunded},
    stock:{action:'review-return',restocked:false},evidence:{amountMinor:amount,currency:expectedCurrency,providerTransaction:verified.transactionId}};
 }
 throw Error('Unsupported provider event');
}
export async function processVerifiedEvent({envelope,verifyEnvelope,withOrderTransaction,now}){
 const verified=await verifyEnvelope(envelope);
 if(verified?.verified!==true)throw Error('Provider verification required');
 return withOrderTransaction(identifier(verified.orderId),async tx=>{
  const plan=applyCommerceEvent({verified,order:await tx.savedOrder(),lookup:key=>tx.replaySnapshot.get(key),markerAt:now()});
  if(plan.result==='duplicate-event')return plan;
  if(plan.stock?.action==='consume')await tx.consumeReservation(plan.stock.savedRequirements);
  else if(plan.stock?.action==='release-unconsumed')await tx.releaseReservation();
  // Refunds request human-reviewed physical return handling; no stock increase on a provider refund.
  await tx.record(plan);
  return plan;
 });
}

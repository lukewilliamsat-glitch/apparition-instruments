import assert from 'node:assert/strict';
import test from 'node:test';
import {instant,minor,requirements,kitAvailability,stockPosition,matchedEligibility} from './contracts.mjs';
import {packingPlan,packingLedger,dispatchReview,roundLabel} from './quartermaster.mjs';
import {fixtureReader,normalizeOrder,normalizeFinancial,reconcile} from './marketplace.mjs';
import {applyCommerceEvent,processVerifiedEvent} from './commerce.mjs';
const now='2026-11-20T10:00:00Z';
const parts=[{componentId:'cap',quantity:1},{componentId:'pot',quantity:2}];
const basket=[{type:'kit',quantity:2,snapshot:{stockRequirements:parts}},{type:'component',quantity:1,productId:'cap'}];
test('Authoritative, immutable saved BOM quantities aggregate by physical component',()=>{
 assert.deepEqual(requirements(basket),[{componentId:'cap',quantity:3},{componentId:'pot',quantity:4}]);
 assert.equal(kitAvailability(basket,k=>({physical:k==='cap'?7:9,reserved:1,allocated:1,qualityHeld:1})).available,1);
 assert.equal(kitAvailability(basket,k=>k==='cap'?{physical:100}:null).available,0);
 assert.equal(stockPosition({physical:2,reserved:3}).shortfall,1);
 assert.throws(()=>requirements([{type:'kit',quantity:1,snapshot:{stockRequirements:[]}}]),/requirements/);
 assert.throws(()=>requirements([{type:'component',quantity:1,productId:'__proto__'}]));
 assert.throws(()=>requirements([{type:'component',quantity:0,productId:'cap'}]));
});
test('Measured sets reject duplicate, incompatible, held and unsuitable measurements',()=>{
 const options={componentId:'pot',toleranceBasisPoints:300,nominalOhm:500000,units:[{id:'one',componentId:'pot',nominalOhm:500000,measuredOhm:499000,quality:'accepted',taper:'audio',shaft:'split'},{id:'two',componentId:'pot',nominalOhm:500000,measuredOhm:501000,quality:'accepted',taper:'audio',shaft:'split'}]};
 assert.equal(matchedEligibility(options),true);
 for(const change of [{id:'one'},{componentId:'another'},{activeSetId:'set'},{quality:'pending'},{shaft:'solid'},{retired:true},{measuredOhm:600000}]){
  assert.equal(matchedEligibility({...options,units:[options.units[0],{...options.units[1],...change}]}),false);
 }
 assert.equal(matchedEligibility({...options,noActiveHold:false}),false);
 assert.equal(matchedEligibility({...options,units:[{...options.units[0],measuredOhm:486000},{...options.units[1],measuredOhm:514000}]}),false);
});
test('Money and offsets are bounded; an impossible calendar date cannot roll into March',()=>{
 assert.equal(minor('10.30','GBP'),1030);assert.equal(minor('-2','GBP'),-200);
 assert.throws(()=>minor('1.001','GBP'));assert.throws(()=>minor('1e2','GBP'));
 assert.throws(()=>instant('2026-02-30T00:00:00Z'));
 assert.equal(instant('2026-11-20T11:00:00+01:00'),'2026-11-20T10:00:00.000Z');
});
const pack={id:'mailer',supplierId:'packs',purchaseReference:'invoice78',innerMm:[170,100,8],outerMm:[180,110,10],tareGrams:20,unitCostMinor:18};
const orderPack={orderId:'o1',items:[{lineId:'1',sku:'cap',quantity:2,unitGrams:21}],packedContentsMm:[30,100,6],country:'GB',packaging:[pack],packagingStock:()=>1};
test('Pick, package, format limits and ECLIPSE cost evidence are actionable without dispatch',()=>{
 const plan=packingPlan(orderPack);
 assert.deepEqual(plan.choices[0].formats,['large-letter','small-parcel']);
 assert.equal(packingPlan({...orderPack,country:'FR'}).choices[0].formats.length,0);
 assert.equal(packingPlan({...orderPack,packedContentsMm:[100,100,30]}).choices.length,0);
 assert.equal(packingPlan({...orderPack,packagingStock:()=>0}).choices.length,0);
 const ledger=packingLedger({mailer:1});
 const entry={id:'req1',plan,packageId:'mailer',picked:[{lineId:'1',quantity:2}],at:now};
 assert.throws(()=>ledger.record({...entry,picked:[]}));assert.equal(ledger.remaining('mailer'),1);
 const out=ledger.record(entry);assert.equal(out.eclipse.evidenceReference,'invoice78');
 assert.equal(out.eclipse.actualCostMinor,18);assert.equal(out.stage,'packed');
 assert.deepEqual(ledger.record(entry),out);assert.equal(ledger.remaining('mailer'),0);
 assert.throws(()=>ledger.record({...entry,id:'extra'}),/already packed/);
 assert.throws(()=>ledger.record({...entry,at:'2026-11-20T10:01:00Z'}),/conflict/);
 assert.equal(ledger.attachTracking({orderId:'o1',carrier:'royal-mail',reference:'abc42',at:now}).tracking.reference,'ABC42');
 assert.throws(()=>ledger.attachTracking({orderId:'o1',carrier:'royal-mail',reference:'abc43',at:now}),/requires review/);
 assert.equal(dispatchReview(out,{format:'large-letter',weighedGrams:65,measuredOuterMm:[182,110,10]}).eligible,true);
 assert.equal(dispatchReview(out,{format:'large-letter',weighedGrams:65,measuredOuterMm:[182,110,26]}).eligible,false);
 const label=roundLabel({title:'Cable <kit>',reference:'CAP-42',detail:'Workshop 50 mm'});
 assert.match(label,/50mm 50mm/);assert.match(label,/&lt;kit&gt;/);assert.doesNotMatch(label,/<script/);
});
const providerOrder={orderId:'ebay1',lastModifiedDate:now,pricingSummary:{total:{currency:'GBP',value:'15.00'}},lineItems:[{lineItemId:'line1',legacyItemId:'1234',quantity:1,sku:'cap1'}],buyer:{email:'private@example.invalid'},fulfillmentStartInstructions:[{shippingStep:{shipTo:{fullName:'Private'}}}]};
const refund={transactionId:'txn1',orderId:'ebay1',transactionType:'REFUND',bookingEntry:'DEBIT',amount:{currency:'GBP',value:'2.00'},transactionDate:now};
const read={account:'seller-fixture',from:now,to:'2026-11-21T10:00:00Z'};
test('Marketplace uses scoped, bounded reads and ignores arbitrary pagination URLs',async()=>{
 const logs=[],waits=[];
 const f=fixtureReader({limit:1,wait:ms=>waits.push(ms),transport:async r=>{
  logs.push(r);
  if(logs.length===1)return {status:429,retryAfterSeconds:2};
  return {status:200,body:{offset:r.offset,orders:[{...providerOrder,orderId:'ebay'+r.offset}],next:r.offset===0?'https://unexpected.invalid/select':null}};
 }});
 await assert.rejects(f('orders',{...read,scopes:[]}),/scope/);
 await assert.rejects(f('transactions',{...read,scopes:['sell.finances']}),/signer/);
 const rows=await f('orders',{...read,scopes:['sell.fulfillment.readonly']});
 assert.deepEqual(logs.map(i=>[i.method,i.offset]),[['GET',0],['GET',0],['GET',1]]);
 assert(logs.every(i=>i.endpoint==='/sell/fulfillment/v1/order'));
 assert.deepEqual(waits,[2000]);assert.equal(rows.length,2);
 assert.doesNotMatch(JSON.stringify(rows),/private|shipTo|email/i);
 const readFin=fixtureReader({transport:async x=>{assert(x.requiresSignature);return {status:200,body:{offset:0,transactions:[refund]}}}});
 assert.equal((await readFin('transactions',{...read,signerReady:true,scopes:['sell.finances']}))[0].kind,'refund');
 const stalled=fixtureReader({limit:1,maxPages:1,transport:async x=>({status:200,body:{offset:x.offset,orders:[providerOrder],next:'yes'}})});
 await assert.rejects(stalled('orders',{...read,scopes:['sell.fulfillment.readonly']}),/budget/);
});
test('Marketplace replays do not duplicate orders, fees or refunds; ambiguity is staged for review',()=>{
 const o=normalizeOrder(read.account,providerOrder), r=normalizeFinancial(read.account,refund);
 const fee=normalizeFinancial(read.account,{...refund,transactionId:'fee1',transactionType:'NON_SALE_CHARGE',amount:{currency:'GBP',value:'0.40'}});
 const input={orders:[o,o],transactions:[r,r,fee],manualOrders:[{account:read.account,reference:o.reference,orderId:'existing'}],listingMappings:[{account:read.account,listingRef:'1234',componentSku:'cap1'}]};
 const out=reconcile(input);
 assert.equal(out.staged.length,1);assert.equal(out.staged[0].existingOrderId,'existing');
 assert.equal(out.staged[0].lines[0].verifiedSku,'cap1');
 assert.deepEqual(out.financialEvidence.map(x=>[x.kind,x.amountMinor,x.manualOrderId]),[['refund',200,'existing'],['fee',40,'existing']]);
 assert.throws(()=>reconcile({...input,transactions:[r,{...r,amountMinor:199}]}),/Conflicting/);
 const ambiguous=reconcile({...input,manualOrders:[...input.manualOrders,{...input.manualOrders[0],orderId:'second'}],listingMappings:[]});
 assert(ambiguous.review.some(x=>x.kind==='ambiguous-manual-link'));
 assert(ambiguous.review.some(x=>x.kind==='unmapped-listing'));
 assert(ambiguous.financialEvidence.every(x=>x.reviewNeeded));
});
const saved={id:'order1',paymentAccount:'fixture',paymentReference:'checkout1',expectedMinor:1500,currency:'GBP',state:'awaiting',savedItems:basket};
const payment={verified:true,id:'evt1',type:'payment',account:'fixture',reference:'checkout1',orderId:'order1',transactionId:'paid1',occurredAt:now,money:{minor:1500,currency:'GBP'}};
test('Commerce does not consume inventory without verified amount, currency and provider correlation',()=>{
 const args={verified:payment,order:saved,lookup:()=>undefined,markerAt:now};
 assert.equal(applyCommerceEvent(args).stock.action,'consume');
 for(const change of [{verified:false},{account:'another'},{orderId:'other'},{money:{minor:1499,currency:'GBP'}},{money:{minor:1500,currency:'EUR'}}]){
  assert.throws(()=>applyCommerceEvent({...args,verified:{...payment,...change}}));
 }
 const out=applyCommerceEvent({...args,order:{...saved,state:'cancelled'}});
 assert.equal(out.result,'review-late-payment');assert.equal(out.stock,null);
});
test('Commerce fixture transaction coalesces concurrent payment events and never restocks a refund',async()=>{
 const replay=new Map(),events=[];let order=structuredClone(saved), applied=0,released=0,serial=Promise.resolve();
 const invoke=envelope=>processVerifiedEvent({envelope,verifyEnvelope:async e=>e,now:()=>now,
  withOrderTransaction:async(_,run)=>{
   const result=serial.then(()=>run({replaySnapshot:replay,savedOrder:()=>order,
    consumeReservation:async req=>{assert.deepEqual(req,requirements(basket));applied++;},
    releaseReservation:async()=>released++,
    record:async e=>{events.push(e);replay.set(e.eventKey,e);if(e.transactionKey)replay.set(e.transactionKey,e);order={...order,...e.after};}
   }));serial=result.catch(()=>{});return result;
  }});
 const result=await Promise.all([invoke(payment),invoke({...payment,id:'evt2'}),invoke(payment)]);
 assert.deepEqual(result.map(x=>x.result),['paid','duplicate-transaction','duplicate-event']);
 assert.equal(applied,1);
 const adjust={...payment,type:'refund',id:'refund-id1',transactionId:'refund-txn1',money:{minor:300,currency:'GBP'}};
 assert.equal((await invoke(adjust)).stock.action,'review-return');
 assert.equal((await invoke(adjust)).result,'duplicate-event');
 assert.equal(order.refundedMinor,300);assert.equal(applied,1);assert.equal(released,0);
 await assert.rejects(invoke({...adjust,id:'refund-id2',transactionId:'refund-txn2',money:{minor:1201,currency:'GBP'}}),/exceeds/);
 const cancel={...payment,id:'cancel-id1',transactionId:'cancel-txn1',money:null,type:'cancel'};
 assert.equal((await invoke(cancel)).result,'review-cancellation-after-payment');
 assert.equal((await invoke({...cancel,id:'cancel2',transactionId:'cancel2',orderId:'order1'})).stock,null);
 assert.equal(applyCommerceEvent({verified:cancel,order:saved,lookup:()=>undefined,markerAt:now}).stock.action,'release-unconsumed');
 assert.equal(events.filter(x=>x.result==='refunded').length,1);
});

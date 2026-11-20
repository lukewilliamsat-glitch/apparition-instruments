import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { requestShape, makeEbayGateway, importWindow, createReadAdapter } from './marketplace79.mjs';
import { prepareSandboxCheckout, reconcileSandboxSession, verifyStripeSandboxEnvelope, sandboxPaymentPolicy } from './stripe79.mjs';
import { workshopLabel } from './quartermaster.mjs';

const at='2026-11-20T10:15:00.000Z', before='2026-11-20T10:00:00.000Z';
const shape={method:'GET',endpoint:'/sell/fulfillment/v1/order',offset:50,limit:50,from:before,to:at,requiresSignature:false,account:'fixture-ebay'};
const gbp=value=>({currency:'GBP',value});
const providerOrder=(updates={})=>({orderId:'F79-EBAY-PAID',lastModifiedDate:at,buyer:{username:'fixture-should-not-expose'},
 pricingSummary:{total:gbp('9.99'),deliveryCost:gbp('1.01')},
 lineItems:[{lineItemId:'L2',legacyItemId:'111',sku:'F79-CAP',quantity:2},{lineItemId:'L1',legacyItemId:'112',quantity:1}],...updates});
const tx=(kind,id)=>({transactionId:id,orderId:'F79-EBAY-PAID',transactionType:kind,bookingEntry:'DEBIT',amount:gbp('1.01'),transactionDate:at});
const routes=({orders=[providerOrder()],transactions=[]}={})=>async request=>({status:200,body:request.filterField==='lastmodifieddate'?{offset:request.offset,orders}:{offset:request.offset,transactions}});

test('Contract-bound eBay reads use fixed hosts, scoped refresh and mandatory UK signing',async()=>{
 const u=new URL(requestShape(shape).url);
 assert.equal(u.hostname,'api.ebay.com');assert.equal(u.searchParams.get('filter'),'lastmodifieddate:['+before+'..'+at+']');
 assert.throws(()=>requestShape({...shape,endpoint:'/sell/fulfillment/v1/order/ref/issue_refund'}),/Only the two/);
 assert.throws(()=>requestShape({...shape,method:'POST'}),/Only the two/);
 const calls=[],signs=[];
 const gateway=makeEbayGateway({vault:{load:async account=>({account,clientId:'FIXTURE-App',clientSecret:'synthetic-secret',refreshToken:'synthetic-refresh',grantedScopes:['sell.fulfillment.readonly','sell.finances']})},
  request:async q=>{calls.push(q);return q.method==='POST'?{status:200,body:{access_token:'access-fixture-only',expires_in:7200,token_type:'Bearer'}}:{status:200,body:{}};},
  sign:async q=>{signs.push(q);return {signature:'signed=fixture','signature-input':'fixture-input','x-ebay-signature-key':'fixture-key'};}});
 await Promise.all([gateway(shape),gateway(shape)]);
 assert.equal(calls.filter(x=>x.method==='POST').length,1);
 const scope=new URLSearchParams(calls[0].body).get('scope');
 assert.equal(scope,'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly');
 assert.ok(calls.every(x=>x.redirect==='error'&&x.timeoutMs<10000&&x.maxBytes<=750000));
 assert.equal(signs.length,0);
 await gateway({...shape,endpoint:'/sell/finances/v1/transaction',requiresSignature:true});
 assert.equal(signs.length,1);assert.equal(new URL(signs[0].url).hostname,'apiz.ebay.com');
 assert.equal(calls.at(-1).headers.signature,'signed=fixture');
 assert.equal(new URLSearchParams(calls.findLast(x=>x.method==='POST').body).get('scope'),'https://api.ebay.com/oauth/api_scope/sell.finances');
 const missing=makeEbayGateway({vault:{load:()=>assert.fail('must fail before credentials')},request:()=>assert.fail('unsigned call')});
 await assert.rejects(missing({...shape,endpoint:'/sell/finances/v1/transaction',requiresSignature:true}),/signing adapter/);
});

test('B/F: incremental import overlaps, deduplicates, reviews combined shipping and never posts stock or financial writes',async()=>{
 const markers=new Map(),staged=new Map(),requests=[];
 const rep={
  checkpoint:async(_a,k)=>markers.get(k)??{revision:0,through:null},
  correlatedOrders:async()=>[...staged.values()].filter(r=>r.lines),
  commit:async x=>{
   assert.equal((markers.get(x.kind)?.revision??0),x.expectedRevision);
   for(const c of x.evidence)staged.set(c.key,c);
   markers.set(x.kind,{revision:x.expectedRevision+1,through:x.through});
  }
 };
 const account='fixture-ebay',cancelled=providerOrder({orderId:'F79-CANCELLED',cancelStatus:{cancelState:'CANCELED',cancelRequests:[{cancelStatus:'CANCEL_CLOSED_NO_REFUND'}]}});
 const data={orders:[providerOrder(),providerOrder(),cancelled],transactions:[tx('REFUND','REF79'),tx('REFUND','REF79'),tx('NON_SALE_CHARGE','FEE79')]};
 const fixture=routes(data),read=createReadAdapter({transport:q=>{requests.push(q);return fixture(q);}});
 const settings={account,initialFrom:before,until:at,read,repository:rep,manualOrders:[{account,reference:'F79-EBAY-PAID',orderId:'manual-fixture-order'}],listingMappings:[{account,listingRef:'111',componentSku:'F79-CAP'}]};
 const result=await importWindow({...settings,kind:'orders'});
 assert.equal(result.staged,2);
 const [p,c]=[...staged.values()];
 assert.equal(p.existingOrderId,'manual-fixture-order');assert.equal(p.shipping.minor,101);assert.equal(p.lines.find(x=>x.lineRef==='L2').quantity,2);
 assert.equal(p.needsStockReview,true);assert.equal(p.stockMutation,false);assert.equal(c.cancelled,true);
 assert.doesNotMatch(JSON.stringify(p),/fixture-should-not-expose/);
 await importWindow({...settings,kind:'orders',until:'2026-11-20T10:20:00.000Z'});
 assert.equal(requests.at(-1).from,'2026-11-20T10:10:00.000Z');assert.equal(staged.size,2);
 await importWindow({...settings,kind:'transactions'});
 assert.equal(staged.size,4);assert.equal([...staged.values()].find(x=>x.kind==='refund').manualOrderId,'manual-fixture-order');
 await assert.rejects(importWindow({...settings,kind:'orders',until:'2026-11-20T10:25:00.000Z',read:async()=>{throw Error('incomplete');}}),/incomplete/);
 assert.equal(markers.get('orders').through,'2026-11-20T10:20:00.000Z');
});

const secret='whsec_dominion79_fixture_signing_key';
const plan=prepareSandboxCheckout({orderId:'fixture-sandbox-order',account:'acct_fixtureSandbox',expectedMinor:1150,currencyCode:'GBP',expiresAt:'2026-11-20T11:15:00.000Z',now:at});
const sid='cs_test_Fixture79Abc';
const intent='pi_Fixture79Abc';
const session=(updates={})=>({object:'checkout.session',id:sid,livemode:false,client_reference_id:plan.orderId,
 metadata:{dominion_binding:plan.binding},amount_total:1150,currency:'gbp',status:'open',payment_status:'unpaid',payment_intent:intent,...updates});
const utc=Math.floor(Date.parse(at)/1000);
const event=(type,o)=>({object:'event',id:'evt_Fixture79Abc',created:utc,livemode:false,account:plan.account,type,data:{object:o}});
const seal=(data,stamp=utc)=>{
 const rawBody=JSON.stringify(data);return {rawBody,signature:'t='+stamp+',v1='+createHmac('sha256',secret).update(stamp+'.'+rawBody).digest('hex'),secret,now:at};
};

test('Stripe sandbox envelopes require exact raw signatures and paid/refund/expiry correlation',()=>{
 const signed=seal(event('checkout.session.completed',session({status:'complete',payment_status:'paid'})));
 const saved={...plan,sessionId:sid,intent};
 const payment=sandboxPaymentPolicy(verifyStripeSandboxEnvelope(signed),saved);
 assert.equal(payment.money.minor,1150);assert.equal(payment.transactionId,intent);
 assert.throws(()=>sandboxPaymentPolicy({...payment},saved),/Verified sandbox/);
 assert.throws(()=>verifyStripeSandboxEnvelope({...signed,rawBody:signed.rawBody+' '}),/signature mismatch/);
 assert.throws(()=>verifyStripeSandboxEnvelope(seal(event('checkout.session.completed',session()),utc-301)),/Stale/);
 assert.throws(()=>verifyStripeSandboxEnvelope(seal({...event('checkout.session.completed',session()),livemode:true})),/sandbox/);
 assert.throws(()=>sandboxPaymentPolicy(verifyStripeSandboxEnvelope(seal(event('checkout.session.completed',session({amount_total:1})))),saved),/saved checkout/);
 const unpaid=verifyStripeSandboxEnvelope(seal(event('checkout.session.completed',session({status:'complete'}))));
 assert.equal(sandboxPaymentPolicy(unpaid,saved),null);
 const exp=verifyStripeSandboxEnvelope(seal(event('checkout.session.expired',session({status:'expired'}))));
 assert.equal(sandboxPaymentPolicy(exp,saved).providerDisposition,'expired-unpaid');
 const ref=verifyStripeSandboxEnvelope(seal(event('refund.updated',{object:'refund',id:'re_Fixture79Abc',status:'succeeded',payment_intent:intent,amount:50,currency:'gbp'})));
 assert.equal(sandboxPaymentPolicy(ref,saved).money.minor,50);
});

test('Lost Stripe session response and failed attachment reuse the same binding; only verified expiry can release',async()=>{
 let row={...plan,mode:'sandbox'},attempt=0, attachFailure=true;
 const keys=[];
 const repository={read:async()=>row,attach:async p=>{assert.equal(p.binding,plan.binding);if(attachFailure){attachFailure=false;return false;}row={...row,sessionId:p.sessionId};return true;}};
 const transport={createOnce:async p=>{keys.push(p.idempotencyKey);if(!attempt++)throw Error('response lost');return session();},get:async()=>session({status:'expired'})};
 const run=()=>reconcileSandboxSession({orderId:plan.orderId,repository,transport,now:()=>at});
 assert.deepEqual(await run(),{state:'review-provider-unavailable',release:false});
 assert.equal((await run()).state,'review-attachment-conflict');assert.equal((await run()).state,'awaiting-provider');
 assert.equal(new Set(keys).size,1);assert.equal(keys.length,3);assert.equal((await run()).state,'verified-expiry');
 row={...row,expectedMinor:5};await assert.rejects(run(),/plan changed/);
});

test('All 50 mm workshop label types stay within the crop and escape user-visible evidence',()=>{
 for(const kind of ['component','batch','set','packaging']){
  const label=workshopLabel({kind,title:'<Workshop & batch>',reference:'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM'});
  assert.match(label,/@page\{size:50mm 50mm/);assert.match(label,/&lt;Workshop &amp; batch&gt;/);assert.match(label,/textLength="38"/);
 }
 assert.throws(()=>workshopLabel({kind:'unknown',title:'a',reference:'a'}),/Unsupported/);
});

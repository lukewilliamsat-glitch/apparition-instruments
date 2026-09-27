import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dispatchPending,handleTransactionalEmail} from '../supabase/functions/transactional-email/index.ts';
import {renderEmailV2} from '../supabase/functions/transactional-email/v2.ts';
import {buildPaidOrderConfirmation} from '../supabase/functions/stripe-webhook/confirmation.ts';
const env={get:key=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'service-secret'}[key])};
const id='11111111-1111-4111-8111-111111111111',orderId='22222222-2222-4222-8222-222222222222';
const paid={reference:'AI-010099',payment_status:'paid',paid_at:'2026-09-27',fulfillment_applied_at:'2026-09-27',status:'pending',customer:{name:'Ada Recipient',email:'persisted@example.test'},delivery:{recipient:'Ada',line1:'1 Road',city:'Nottingham',postcode:'NG1 1AA',country:'GB'},items:[{name:'Test item',quantity:1,unitPrice:1,lineTotal:1}],subtotal_pence:1,delivery_pence:399,total_pence:400,refunded_pence:0};
const schedulerRequest=()=>new Request('https://example.supabase.co/functions/v1/transactional-email/dispatch',{method:'POST',headers:{Authorization:'Bearer vault-token'}});
const manualRequest=()=>new Request('https://example.supabase.co/functions/v1/transactional-email',{method:'POST',headers:{Authorization:'Bearer service-secret'},body:JSON.stringify({deliveryId:id})});
function scenario(kind='in_production',smtpOutcome='sent',eligible=true,dispatchDetails={}){
 let state='pending',attempts=0,claims=0,sends=0;const paths=[];
 const row={id,order_id:orderId,kind,automatic_delivery_eligible:eligible,source_event_id:'event-1'};
 const transport=async(url,init)=>{
  const path=url.split('/rest/v1/')[1];paths.push(path);
  if(path==='rpc/get_transactional_dispatch_token')return Response.json('vault-token');
  if(path.startsWith('order_email_deliveries?select=id&')){
   assert(path.includes('automatic_delivery_eligible=eq.true'));
   return Response.json(state==='pending'&&eligible?[{id}]:[]);
  }
  if(path.startsWith('order_email_deliveries?select=id,order_id'))return Response.json([{...row,state}]);
  if(path==='rpc/claim_order_email_delivery'){if(state!=='pending'||!eligible)return Response.json(null);state='claimed';claims++;return Response.json('33333333-3333-4333-8333-333333333333');}
  if(path.startsWith('orders?'))return Response.json([{...paid,dispatch_details:dispatchDetails,payment_status:kind==='full_refund'?'refunded':'paid',refunded_pence:kind==='full_refund'?400:0}]);
  if(path==='rpc/mark_order_email_attempt'){attempts++;return Response.json(true);}
  if(path==='rpc/finish_order_email_delivery'){state=JSON.parse(init.body).p_state;return Response.json(true);}
  throw Error('Unexpected persistence path '+path);
 };
 const send=async(_env,mail)=>{sends++;assert.equal(mail.to,'persisted@example.test');assert(mail.html.includes('apparition-logo-email.png'));
  if(kind==='in_production')assert(mail.html.includes('in-production-email.png'));
  if(kind==='ready_to_dispatch')assert(mail.html.includes('ready-to-dispatch-email.png'));
  if(kind==='dispatched'){assert(mail.html.includes('dispatched-email.png'));assert.equal(mail.html.includes('TRACK YOUR ORDER'),Boolean(dispatchDetails.tracking_url));}
  if(kind==='full_refund'){assert(mail.html.includes('YOUR REFUND HAS BEEN PROCESSED'));assert(!mail.html.includes('in-production-email.png'));}
  if(smtpOutcome!=='sent')throw Object.assign(Error('SMTP unavailable'),{outcome:smtpOutcome});
 };
 return {run:()=>dispatchPending(schedulerRequest(),env,transport,send),direct:()=>handleTransactionalEmail(manualRequest(),env,transport,send),paths,get state(){return state;},get attempts(){return attempts;},get claims(){return claims;},get sends(){return sends;}};
}
for(const kind of ['in_production','ready_to_dispatch','dispatched','full_refund']){
 const s=scenario(kind);assert.equal((await s.run()).status,200);assert.equal(s.state,'sent');assert.equal(s.attempts,1);assert.equal(s.claims,1);await s.run();await s.direct();assert.equal(s.sends,1,kind+' replay must not resend');
 assert(!s.paths.some(path=>/^rpc\/(?:fulfil|record_verified|.*inventory|.*confirmation)|stripe/i.test(path)));
}
const concurrent=scenario('dispatched');await Promise.all([concurrent.run(),concurrent.run()]);assert.equal(concurrent.claims,1);assert.equal(concurrent.sends,1);
for(const outcome of ['failed','unknown']){const s=scenario('full_refund',outcome);await s.run();assert.equal(s.state,outcome);assert.equal(s.attempts,1);await s.run();assert.equal(s.sends,1,'uncertain/failed SMTP must not auto-retry');}
const historic=scenario('in_production','sent',false);await historic.run();await historic.direct();assert.equal(historic.sends,0);assert.equal(historic.claims,0);
const denied=scenario();const bad=await dispatchPending(new Request(schedulerRequest().url,{method:'POST',headers:{Authorization:'Bearer invalid'}}),env,async(url)=>url.endsWith('get_transactional_dispatch_token')?Response.json('vault-token'):Promise.reject(Error('Unauthorized access')),async()=>{throw Error('Unauthorized SMTP');});assert.equal(bad.status,401);
const tracked=scenario('dispatched','sent',true,{carrier:'Royal Mail',tracking_reference:'FY000000000GB',tracking_url:'https://royalmail.com/track'});await tracked.run();assert.equal(tracked.sends,1);
const bare=renderEmailV2('dispatched',{...paid,dispatch_details:{}});assert(!bare.html.includes('DELIVERY DETAILS'));
const unsafe=renderEmailV2('dispatched',{...paid,dispatch_details:{tracking_url:'javascript:alert(1)'}});assert(!unsafe.html.includes('TRACK YOUR ORDER'));
const confirmed=buildPaidOrderConfirmation(paid);assert(confirmed.html.includes('the-violinist-email.png'));assert(confirmed.text.includes('Total paid £4.00'));assert(confirmed.text.includes('1 Road'));
assert.throws(()=>buildPaidOrderConfirmation({...paid,payment_status:'refunded'}),/paid Order/);
assert.equal(readFileSync('supabase/functions/stripe-webhook/v2.ts','utf8'),readFileSync('supabase/functions/transactional-email/v2.ts','utf8'),'Both Edge bundles must contain the same approved renderer');
const boundary=readFileSync('supabase/migrations/20260927112000_p08b5b_delivery_boundary.sql','utf8');
const activation=readFileSync('supabase/migrations/20260927112500_p08b5b_global_activation.sql','utf8');
assert.match(boundary,/automatic_delivery_eligible boolean not null default false/);
assert.match(boundary,/where singleton=true for share/);
assert.match(boundary,/state<>'pending' or not row_\.automatic_delivery_eligible/);
assert.match(activation,/cron\.unschedule\('ai010010-lifecycle-email-canary'\)/);
assert.match(activation,/state='pending' and automatic_delivery_eligible/);
assert(!/update public\.inventory|update public\.orders\s+set payment_status|insert into public\.order_email_deliveries/i.test(boundary+activation));
console.log('P08B.5B: global V2, historical boundary, scheduler concurrency/replay, SMTP outcomes, confirmation and inventory isolation PASS');

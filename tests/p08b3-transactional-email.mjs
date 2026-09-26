import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderTransactionalMail,deliveryKinds} from '../supabase/functions/transactional-email/render.ts';
import {handleTransactionalEmail} from '../supabase/functions/transactional-email/index.ts';
import {sendOrderMail} from '../supabase/functions/stripe-webhook/smtp.ts';
const id='11111111-1111-4111-8111-111111111111',orderId='22222222-2222-4222-8222-222222222222',claim='33333333-3333-4333-8333-333333333333';
const env={get:key=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'service-only'}[key])};
const order={id:orderId,reference:'AI-010099',payment_status:'paid',customer:{name:'Alice <Customer>',email:'trusted@example.co.uk'},status:'in_production',total_pence:400,refunded_pence:0,items:[{name:'Test Item',quantity:1,lineTotal:1}]};
for(const kind of deliveryKinds){const message=renderTransactionalMail(kind,kind==='full_refund'?{...order,payment_status:'refunded',refunded_pence:400}:order);assert(message.html.includes('AI-010099'));assert(message.text.includes('AI-010099'));assert.equal(message.to,'trusted@example.co.uk');assert(!message.html.includes('<Customer>'));}
assert.match(renderTransactionalMail('full_refund',{...order,payment_status:'refunded',refunded_pence:400}).text,/£4\.00/);
assert.throws(()=>renderTransactionalMail('full_refund',{...order,payment_status:'paid'}));
assert.throws(()=>renderTransactionalMail('unknown',order));
function request(extra={}){return new Request('https://example.invalid/functions/v1/transactional-email',{method:'POST',headers:{Authorization:'Bearer service-only'},body:JSON.stringify({deliveryId:id,...extra})});}
function scenario(kind='in_production',state='pending',smtp=async()=>{}){
 let sends=0,calls=[],claimed=false;const row={id,order_id:orderId,kind,state,source_event_id:'event-1'};
 const transport=async(url,options)=>{const path=url.split('/rest/v1/')[1];calls.push(path);
  if(path.startsWith('order_email_deliveries?'))return Response.json([row]);
  if(path==='rpc/claim_order_email_delivery'){if(claimed)return Response.json(null);claimed=true;return Response.json(claim);}
  if(path.startsWith('orders?'))return Response.json([{...order,payment_status:kind==='full_refund'?'refunded':'paid',refunded_pence:kind==='full_refund'?400:0}]);
  if(path==='rpc/mark_order_email_attempt'||path==='rpc/finish_order_email_delivery')return Response.json(true);
  throw Error('Unexpected write '+path);
 };
 const send=async(...args)=>{sends++;await smtp(...args);};
 return {invoke:(req=request())=>handleTransactionalEmail(req,env,transport,send),calls,get sends(){return sends;}};
}
for(const kind of deliveryKinds){const s=scenario(kind);assert.equal((await s.invoke()).status,200);assert.equal(s.sends,1);assert(s.calls.includes('rpc/finish_order_email_delivery'));assert.equal((await s.invoke()).status,200);assert.equal(s.sends,1);}
const concurrent=scenario();await Promise.all([concurrent.invoke(),concurrent.invoke()]);assert.equal(concurrent.sends,1);
for(const state of ['sent','unknown','claimed','failed']){const s=scenario('dispatched',state);await s.invoke();assert.equal(s.sends,0);}
for(const kind of ['order_confirmed','invalid']){const s=scenario(kind);assert.equal((await s.invoke()).status,404);assert.equal(s.sends,0);}
const injection=scenario();assert.equal((await injection.invoke(request({recipient:'attacker@example.com',subject:'hello'}))).status,400);assert.equal(injection.sends,0);
const unauthorized=scenario();assert.equal((await unauthorized.invoke(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({deliveryId:id})}))).status,401);assert.equal(unauthorized.sends,0);
const failure=scenario('dispatched','pending',async()=>{throw Object.assign(Error('failure'),{outcome:'unknown'});});assert.equal((await failure.invoke()).status,200);assert.equal(failure.sends,1);
const source=readFileSync('supabase/functions/transactional-email/index.ts','utf8');assert(!/stripe-webhook\/index|Deno\.cron|addEventListener|setInterval|create-checkout/.test(source));
assert(!/rpc\/.*inventory|rpc\/.*refund|rpc\/.*fulfilment|stripe\.com|smtp\.diagnostic/i.test(source));
const sql=readFileSync('supabase/migrations/20260926134458_p08b2_delivery_foundation.sql','utf8');assert.match(sql,/unique\(order_id,kind\)/);assert.match(sql,/state<>'pending'/);assert.match(sql,/return null; end if;/);
assert.equal(typeof sendOrderMail,'function');
console.log('P08B.3: rendering, authorization, claim/replay, delivery outcomes, source isolation PASS');

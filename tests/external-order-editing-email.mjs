import assert from 'node:assert/strict';
import {handleExternalDispatch} from '../supabase/functions/transactional-email/external.ts';
import {renderEmailV2,previewFixture} from '../supabase/functions/transactional-email/v2.ts';
const orderId='10000000-0000-4000-8000-000000000001',deliveryId='20000000-0000-4000-8000-000000000001',claimId='30000000-0000-4000-8000-000000000001';
const env={get:k=>({SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'service',SUPABASE_ANON_KEY:'public'}[k])};
const order={id:orderId,reference:'AI-123456',sales_channel:'EBAY',external_reference:'12-TEST',payment_status:'paid',customer:{name:'Buyer',email:'snapshot@example.test'},items:[{name:'Fixture part',quantity:1,unitPrice:100,lineTotal:100}],subtotal_pence:100,delivery_pence:0,total_pence:100,dispatch_details:{carrier:'Royal Mail'}};
const request=(body={},token='admin')=>new Request('https://fixture.invalid/external-dispatch',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({orderId,dispatch:false,send:true,expectedEmail:'snapshot@example.test',...body})});
for(const outcome of ['sent','failed','unknown']){
 let state='pending',sends=0,attempts=0,recipient,finish=[];
 const transport=async(url,init)=>{
  const path=new URL(url).pathname;
  if(path==='/auth/v1/user')return Response.json({id:orderId});
  if(path.includes('/admin_members'))return Response.json([{user_id:orderId}]);
  const data=JSON.parse(init.body||'{}');
  if(path.endsWith('/request_external_dispatch')){assert.equal(init.headers.Authorization,'Bearer admin');assert.equal(data.p_expected_email,'snapshot@example.test');return Response.json(deliveryId);}
  if(path.endsWith('/claim_external_dispatch')){assert.equal(init.headers.Authorization,'Bearer service');if(state!=='pending')return Response.json(null);state='claimed';return Response.json({claim:claimId,order,recipient:'snapshot@example.test',orderId});}
  if(path.endsWith('/mark_order_email_attempt')){attempts++;return Response.json(true);}
  if(path.endsWith('/finish_order_email_delivery')){finish.push(data);state=data.p_state;return Response.json(true);}
  throw Error('Unexpected request '+path);
 };
 const send=async(_env,mail)=>{sends++;recipient=mail.to;assert.match(mail.text,/External eBay order · 12-TEST/);assert.match(mail.html,/Fixture part/);if(outcome!=='sent')throw Object.assign(Error('mock failure'),{outcome});};
 const responses=await Promise.all([handleExternalDispatch(request(),env,transport,send),handleExternalDispatch(request(),env,transport,send)]);
 assert(responses.every(r=>r.status===200));assert.equal(sends,1);assert.equal(attempts,1);assert.equal(recipient,'snapshot@example.test');assert.equal(finish[0].p_state,outcome);
 await handleExternalDispatch(request(),env,transport,send);assert.equal(sends,1);
}
let smtp=0,rpcs=0;
const deny=async(url)=>url.includes('/auth/v1/user')?Response.json({id:orderId}):Response.json([]);
assert.equal((await handleExternalDispatch(request(),env,deny,async()=>smtp++)).status,403);assert.equal(smtp,0);
assert.equal((await handleExternalDispatch(request({},'service'),env,deny,async()=>smtp++)).status,401);
const no=async(url,init)=>{if(url.includes('/auth/v1/user'))return Response.json({id:orderId});if(url.includes('/admin_members'))return Response.json([{user_id:orderId}]);rpcs++;assert(url.endsWith('/request_external_dispatch'));assert.equal(JSON.parse(init.body).p_send,false);return Response.json(null);};
assert.equal((await handleExternalDispatch(request({send:false,dispatch:true}),env,no,async()=>smtp++)).status,200);assert.equal(rpcs,1);assert.equal(smtp,0);
// If persistence fails after SMTP acceptance, later calls cannot claim again.
let claimed=false,ambiguousSends=0;
const ambiguity=async(url)=>{if(url.includes('/auth/v1/user'))return Response.json({id:orderId});if(url.includes('/admin_members'))return Response.json([{user_id:orderId}]);if(url.endsWith('/request_external_dispatch'))return Response.json(deliveryId);if(url.endsWith('/claim_external_dispatch')){if(claimed)return Response.json(null);claimed=true;return Response.json({claim:claimId,order,recipient:'snapshot@example.test',orderId});}if(url.endsWith('/mark_order_email_attempt'))return Response.json(true);return new Response('',{status:503});};
assert.equal((await handleExternalDispatch(request(),env,ambiguity,async()=>ambiguousSends++)).status,503);await handleExternalDispatch(request(),env,ambiguity,async()=>ambiguousSends++);assert.equal(ambiguousSends,1);
const native=renderEmailV2('dispatched',{...order,sales_channel:'WEBSITE'});assert.doesNotMatch(native.text,/External eBay/);assert.equal(previewFixture('dispatched').subject,'Apparition Instruments order AI-PREVIEW dispatched');
console.log('External email PASS: existing template/SMTP, Admin denial, explicit no-send, concurrent/retry suppression, failed/unknown acceptance, audit outcome, persistence ambiguity, native rendering preservation; provider mocked');

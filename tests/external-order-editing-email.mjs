import assert from 'node:assert/strict';
import {handleExternalDispatch} from '../supabase/functions/transactional-email/external.ts';
import {renderEmailV2,previewFixture} from '../supabase/functions/transactional-email/v2.ts';
const orderId='10000000-0000-4000-8000-000000000001',deliveryId='20000000-0000-4000-8000-000000000001',claimId='30000000-0000-4000-8000-000000000001';
const env={get:k=>({SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'service',SUPABASE_ANON_KEY:'public'}[k])};
const order={id:orderId,reference:'AI-123456',sales_channel:'EBAY',external_reference:'12-TEST',payment_status:'paid',customer:{name:'Buyer',email:'buyer@members.ebay.com'},items:[{name:'Fixture part',quantity:1,unitPrice:100,lineTotal:100}],subtotal_pence:100,delivery_pence:0,total_pence:100,dispatch_details:{carrier:'Royal Mail'}};
const request=(body={},token='admin')=>new Request('https://fixture.invalid/external-dispatch',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({orderId,dispatch:false,send:true,expectedEmail:'buyer@members.ebay.com',...body})});
// Legacy sends cannot bypass prepared-message review. Real sending/parity/concurrency
// coverage now lives in email-preview-backend.mjs and executes the new SQL authority.
for(const resend of [false,true]){
 let sends=0,rpcs=0;
 const transport=async(url)=>{if(url.includes('/auth/v1/user'))return Response.json({id:orderId});if(url.includes('/admin_members'))return Response.json([{user_id:orderId}]);rpcs++;throw Error('Legacy send must not reach persistence');};
 const r=await handleExternalDispatch(request(resend?{resend:true,operationId:claimId,previousDelivery:deliveryId,expectedUpdatedAt:'2026-10-08T00:00:00Z',reason:'Explicit resend reason'}:{}),env,transport,async()=>sends++);
 assert.equal(r.status,409);assert.match((await r.json()).message,/preview/);assert.equal(sends,0);assert.equal(rpcs,0);
}
let smtp=0,rpcs=0;
const deny=async(url)=>url.includes('/auth/v1/user')?Response.json({id:orderId}):Response.json([]);
assert.equal((await handleExternalDispatch(request(),env,deny,async()=>smtp++)).status,403);assert.equal(smtp,0);
assert.equal((await handleExternalDispatch(request({},'service'),env,deny,async()=>smtp++)).status,401);
const no=async(url,init)=>{if(url.includes('/auth/v1/user'))return Response.json({id:orderId});if(url.includes('/admin_members'))return Response.json([{user_id:orderId}]);rpcs++;assert(url.endsWith('/request_external_dispatch'));assert.equal(JSON.parse(init.body).p_send,false);return Response.json(null);};
assert.equal((await handleExternalDispatch(request({send:false,dispatch:true}),env,no,async()=>smtp++)).status,200);assert.equal(rpcs,1);assert.equal(smtp,0);
const native=renderEmailV2('dispatched',{...order,sales_channel:'WEBSITE'});assert.doesNotMatch(native.text,/External eBay/);assert.equal(previewFixture('dispatched').subject,'Apparition Instruments order AI-PREVIEW dispatched');
console.log('External legacy endpoint PASS: preview bypass rejected, Admin denial, explicit no-send, no SMTP or ledger claim, native rendering unchanged. Real delivery coverage is in email-preview-backend.mjs.');

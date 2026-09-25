import assert from 'node:assert/strict';
import {receiveStripeWebhook,verifyStripeSignature} from '../supabase/functions/stripe-webhook/index.ts';
const secret='whsec_local_fixture_only',now=1790346000000;
const orderId='e13ed95e-11be-4dac-a7c8-26cd5a79ec21';
const event={id:'evt_0123456789abcdef',type:'checkout.session.completed',livemode:true,
 data:{object:{id:'cs_live_0123456789abcdef',object:'checkout.session',livemode:true,
  payment_status:'paid',status:'complete',mode:'payment',payment_intent:'pi_0123456789abcdef',
  amount_total:5798,currency:'gbp',client_reference_id:'AI-010001',
  metadata:{order_id:orderId,order_reference:'AI-010001'}}}};
const env={get:key=>({STRIPE_WEBHOOK_SECRET:secret,SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'server-only'})[key]};
async function signed(value=event,timestamp=now,signatureSecret=secret){
 const body=JSON.stringify(value),stamp=String(Math.floor(timestamp/1000));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(signatureSecret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const hmac=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(stamp+'.'+body)));
 return new Request('https://example.supabase.co/functions/v1/stripe-webhook',{method:'POST',headers:{'Stripe-Signature':`t=${stamp},v1=${Buffer.from(hmac).toString('hex')}`},body});
}
const calls=[];
const database=async(url,init)=>{calls.push({url,init});return Response.json('paid');};
assert.equal((await receiveStripeWebhook(await signed(),env,database,now)).status,200);
assert.equal(calls.length,1);assert(calls[0].url.endsWith('/rpc/fulfil_paid_stripe_checkout'));
assert.equal(calls[0].init.headers.Authorization,'Bearer server-only');
assert.equal(JSON.parse(calls[0].init.body).p_amount,5798);
assert.equal((await receiveStripeWebhook(await signed({...event,data:{object:{...event.data.object,payment_status:'unpaid'}}}),env,database,now)).status,200);
assert.equal(calls.length,1,'Unpaid session must not call fulfilment');
assert.equal((await receiveStripeWebhook(await signed({...event,livemode:false}),env,database,now)).status,400);
assert.equal((await receiveStripeWebhook(await signed({...event,data:{object:{...event.data.object,livemode:false}}}),env,database,now)).status,400);
assert.equal((await receiveStripeWebhook(await signed({...event,data:{object:{...event.data.object,amount_total:5798,currency:'usd'}}}),env,database,now)).status,400);
assert.equal((await receiveStripeWebhook(await signed(event,now-301000),env,database,now)).status,401);
assert.equal((await receiveStripeWebhook(await signed(event,now,'whsec_wrong_key'),env,database,now)).status,401);
const altered=await signed();const spoof=new Request(altered.url,{method:'POST',headers:altered.headers,body:JSON.stringify({...event,id:'evt_ffffffffffffffff'})});
assert.equal((await receiveStripeWebhook(spoof,env,database,now)).status,401);
assert.equal(await verifyStripeSignature(new TextEncoder().encode(JSON.stringify(event)),(await signed()).headers.get('Stripe-Signature'),secret,now),true);
assert.equal(calls.length,1,'Invalid signature/metadata must not call fulfilment');
assert.equal((await receiveStripeWebhook(await signed(),{get:()=>undefined},database,now)).status,503);
console.log('P07B.2A: raw signature, paid-only, live-only, timestamp, spoof rejection, service-only RPC, missing-secret fail-closed PASS');

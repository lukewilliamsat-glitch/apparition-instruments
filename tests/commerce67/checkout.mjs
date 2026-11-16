import assert from 'node:assert/strict';
import {startCheckout} from '../../supabase/functions/create-checkout/index.ts';
import {receiveStripeWebhook} from '../../supabase/functions/stripe-webhook/index.ts';
const id='e13ed95e-11be-4dac-a7c8-26cd5a79ec21',reference='AI-010001',quoteId='a'.repeat(32);
const env={
 SUPABASE_URL:'https://commerce67.fixture.invalid',SUPABASE_ANON_KEY:'fixture-public',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',
 STRIPE_SECRET_KEY:'rk_live_fixtureExample',COMMERCE67_CHECKOUT_ENABLED:'true',COMMERCE67_RESERVATION_EVENTS:'true',
 STRIPE_WEBHOOK_SECRET:'whsec_fixtureExample',
};
const environment={get:k=>env[k]};
const body={requestId:crypto.randomUUID(),commerceV2:true,quoteId,items:[{kind:'component',id:'caps',quantity:2}],totalPence:1,unitPrice:1};
const input=p=>new Request('https://commerce67.fixture.invalid/checkout',{method:'POST',headers:{Origin:'https://apparitioninstruments.co.uk'},body:JSON.stringify(p)});
const calls=[];
async function call(url,opts){
 calls.push(url);
 if(url.endsWith('assert_store_accepting_orders'))return Response.json({store:{state:'OPEN'}});
 if(url.endsWith('/rpc/commerce67_start_checkout')){
  const p=JSON.parse(opts.body).p_request;
  assert.deepEqual(Object.keys(p).sort(),['code','items','quoteId','requestId']);assert.deepEqual(p.items,body.items);
  return Response.json({id,reference,totalPence:1299});
 }
 if(url.includes('/orders?')&&opts.method!=='PATCH')return Response.json([{id,reference,subtotal_pence:900,delivery_pence:399,total_pence:1299,status:'pending',payment_status:'unpaid',
  items:[{quantity:2,unitPrice:450,name:'Fixture discounted component'}]}]);
 if(url==='https://api.stripe.com/v1/checkout/sessions'){
  assert.equal(opts.body.get('line_items[0][price_data][unit_amount]'),'450');
  assert.equal(opts.body.get('line_items[0][quantity]'),'2');
  assert.equal(opts.body.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'),'399');
  assert.equal(opts.headers['Idempotency-Key'],'apparition-'+id);
  return Response.json({id:'cs_live_123456789',livemode:true,amount_total:1299,currency:'gbp',url:'https://checkout.stripe.com/fixture'});
 }
 if(url.includes('/orders?'))return Response.json([{id}]);
 throw Error('Unexpected mock request');
}
assert.equal((await startCheckout(input(body),environment,call)).status,200);
assert.equal(calls.filter(x=>x.includes('stripe.com')).length,1);
assert.equal((await startCheckout(input(body),{get:k=>k==='COMMERCE67_CHECKOUT_ENABLED'?undefined:env[k]},()=>assert.fail('Disabled checkout cannot fetch'))).status,503);
assert.equal((await startCheckout(input({...body,quoteId:'unspecific'}),environment,()=>assert.fail('Invalid quotes cannot fetch'))).status,400);
const stale=await startCheckout(input(body),environment,(url,opts)=>url.endsWith('commerce67_start_checkout')?
 Response.json({message:'The commerce quote price or total changed'},{status:400}):call(url,opts));
assert.equal(stale.status,409);assert.equal(calls.filter(x=>x.includes('stripe.com')).length,1);
const event={type:'checkout.session.expired',livemode:true,data:{object:{id:'cs_live_123456789',object:'checkout.session',mode:'payment',status:'expired',
 payment_status:'unpaid',livemode:true,client_reference_id:reference,metadata:{order_id:id,order_reference:reference}}}};
const now=Date.now(),ts=Math.floor(now/1000);
async function expired(data,sign=true){
 const raw=JSON.stringify(data),enc=new TextEncoder();
 const key=await crypto.subtle.importKey('raw',enc.encode(env.STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig=Buffer.from(await crypto.subtle.sign('HMAC',key,enc.encode(ts+'.'+raw))).toString('hex');
 return new Request('https://commerce67.fixture.invalid/webhook',{method:'POST',headers:{'Stripe-Signature':'t='+ts+',v1='+(sign?sig:'0'.repeat(64))},body:raw});
}
const web=async(url,opts)=>{assert(url.endsWith('/rpc/commerce67_expire_checkout'));assert.deepEqual(JSON.parse(opts.body),{p_order:id,p_session:'cs_live_123456789',p_reference:reference});return Response.json(true);};
assert.equal((await receiveStripeWebhook(await expired(event),environment,web,now)).status,200);
assert.equal((await receiveStripeWebhook(await expired(event,false),environment,()=>assert.fail('Unsigned expiry'),now)).status,401);
event.data.object.payment_status='paid';
assert.equal((await receiveStripeWebhook(await expired(event),environment,()=>assert.fail('Paid expiry'),now)).status,400);
console.log('Commerce 67 Edge fixtures: authoritative Stripe form, idempotency, stale basket rejection, gated checkout and signed terminal expiry PASS');

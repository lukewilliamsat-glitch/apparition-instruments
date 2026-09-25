import assert from 'node:assert/strict';
import {startCheckout} from '../supabase/functions/create-checkout/index.ts';
import {createSecureCheckoutRepository} from '../dist/backend/order-data.mjs';
const requestId='c13ed95e-11be-4dac-a7c8-26cd5a79ec21',id='e13ed95e-11be-4dac-a7c8-26cd5a79ec21';
const env=new Map([['STRIPE_SECRET_KEY','sk_test_example'],['SUPABASE_URL','https://example.supabase.co'],['SUPABASE_ANON_KEY','public'],['SUPABASE_SERVICE_ROLE_KEY','server-secret']]);
const body={requestId,items:[{product:'les-paul',quantity:1,record:{pricing:{total:1}}}],totalPence:1};
const input=()=>new Request('https://example.supabase.co/functions/v1/create-checkout',{method:'POST',headers:{Origin:'https://apparitioninstruments.co.uk'},body:JSON.stringify(body)});
const order=amount=>({id,reference:'AI-010001',subtotal_pence:amount,delivery_pence:amount>=5000?0:399,total_pence:amount+(amount>=5000?0:399),status:'pending',payment_status:'unpaid',items:[{unitPrice:amount,quantity:1,name:'Les Paul Style Wiring Kit'}]});
async function run(amount){const calls=[];const request=async(url,init)=>{calls.push([url,init]);if(url.endsWith('/rpc/create_guest_kit_order'))return Response.json({id,reference:'AI-010001',totalPence:order(amount).total_pence});if(url.includes('/orders?')&&init.method!=='PATCH')return Response.json([order(amount)]);if(url.includes('api.stripe.com'))return Response.json({id:'cs_test_123',url:'https://checkout.stripe.com/c/pay/cs_test_123'});if(url.includes('/orders?')&&init.method==='PATCH')return Response.json([{id}]);throw Error(url);};const response=await startCheckout(input(),{get:key=>env.get(key)},request);assert.equal(response.status,200);assert.equal((await response.json()).totalPence,order(amount).total_pence);const rpc=JSON.parse(calls[0][1].body).p_request;assert.equal(rpc.checkoutMode,'stripe');assert.equal(rpc.totalPence,undefined,'untrusted extra fields cannot reach the database');const form=new URLSearchParams(calls[2][1].body);assert.equal(form.get('line_items[0][price_data][unit_amount]'),String(amount));assert.equal(form.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'),String(order(amount).delivery_pence));assert.equal(form.get('shipping_address_collection[allowed_countries][0]'),'GB');assert.equal(form.get('client_reference_id'),'AI-010001');assert.equal(calls[2][1].headers['Idempotency-Key'],'apparition-'+id);assert.equal(JSON.parse(calls[3][1].body).stripe_checkout_session_id,'cs_test_123');assert.equal(calls[3][1].headers.Authorization,'Bearer server-secret');}
await run(3999);await run(4999);await run(5000);await run(5798);
const secretless=new Map(env);secretless.delete('STRIPE_SECRET_KEY');assert.equal((await startCheckout(input(),{get:key=>secretless.get(key)},()=>{throw Error('No calls without key');})).status,503);
const liveKey=new Map(env);liveKey.set('STRIPE_SECRET_KEY','sk_live_example');assert.equal((await startCheckout(input(),{get:key=>liveKey.get(key)},()=>{throw Error('No calls with live key');})).status,503);
const result=await createSecureCheckoutRepository({config:{url:'https://example.supabase.co',publishableKey:'public'},request:async(url,init)=>{assert(url.endsWith('/functions/v1/create-checkout'));assert.equal(JSON.parse(init.body).requestId,requestId);return Response.json({url:'https://checkout.stripe.com/c/pay/cs_test_123',reference:'AI-010001',totalPence:5798});}}).create(body);assert.equal(result.totalPence,5798);
const componentOnly={requestId,items:[{product:'component',sku:'ABC-1',quantity:2}]};
const mixed={requestId,items:[...body.items,...componentOnly.items]};
for(const basket of [componentOnly,mixed]){
 let sent;
 const response=await startCheckout(new Request('https://example.supabase.co/functions/v1/create-checkout',{method:'POST',headers:{Origin:'https://apparitioninstruments.co.uk'},body:JSON.stringify(basket)}),{get:key=>env.get(key)},async(url,init)=>{
  if(url.endsWith('/rpc/create_guest_kit_order')){sent=JSON.parse(init.body).p_request;assert.equal(init.headers.Authorization,'Bearer server-secret');return Response.json({id,reference:'AI-010001',totalPence:5798});}
  if(url.includes('/orders?')&&init.method!=='PATCH')return Response.json([order(5798)]);
  if(url.includes('api.stripe.com')){const form=new URLSearchParams(init.body);assert.equal(form.get('name_collection[individual][enabled]'),'true');assert.equal(form.get('success_url'),'https://apparitioninstruments.co.uk/checkout/?checkout=success');return Response.json({id:'cs_test_123',url:'https://checkout.stripe.com/c/pay/cs_test_123'});}
  return Response.json([{id}]);
 });
 assert.equal(response.status,200);assert.deepEqual(sent.items,basket.items);
}
console.log('P07B Edge Function: test key only, authoritative order amount, shipping threshold, UK delivery, session link and browser transport PASS');

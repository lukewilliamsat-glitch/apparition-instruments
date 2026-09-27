import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {startCheckout} from '../supabase/functions/create-checkout/index.ts';
import {listMyOrders} from '../supabase/functions/my-orders/index.ts';
import {createSecureCheckoutRepository} from '../dist/backend/order-data.mjs';
import {createAccountApp} from '../dist/account/app.mjs';

const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const reqId='c13ed95e-11be-4dac-a7c8-26cd5a79ec21',orderId='e13ed95e-11be-4dac-a7c8-26cd5a79ec21';
const tokenA='a'.repeat(80),tokenB='b'.repeat(80);
const env={get:key=>({STRIPE_SECRET_KEY:'rk_live_example',SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server-secret'}[key])};
const bearer=token=>({'Origin':'https://apparitioninstruments.co.uk',Authorization:'Bearer '+token});
const customer=(id,email,confirmed=true)=>({id,email,aud:'authenticated',role:'authenticated',email_confirmed_at:confirmed?'2026-09-27T00:00:00Z':null});
const users=new Map([[tokenA,customer(a,'Alice@example.co.uk')],[tokenB,customer(b,'bob@example.co.uk')],['unverified'.repeat(9),customer(a,'alice@example.co.uk',false)]]);
const rows=[
 {reference:'AI-010010',created_at:'2026-09-25T12:00:00Z',total_pence:400,status:'dispatched',owner:null,email:' ALICE@EXAMPLE.CO.UK '},
 {reference:'AI-010015',created_at:'2026-09-26T12:00:00Z',total_pence:400,status:'pending',owner:null,email:'else@example.co.uk'},
 {reference:'AI-010020',created_at:'2026-09-27T12:00:00Z',total_pence:990,status:'in_production',owner:b,email:'alice@example.co.uk'}
];
let claimed=0,queries=[];
const transport=async(url,init)=>{
 if(url.endsWith('/auth/v1/user'))return users.has(init.headers.Authorization.slice(7))?Response.json(users.get(init.headers.Authorization.slice(7))):new Response(null,{status:401});
 if(url.endsWith('/rpc/claim_verified_email_guest_orders')){
  assert.equal(init.headers.Authorization,'Bearer server-secret');const {p_owner,p_email}=JSON.parse(init.body);
  const verified=[...users.values()].find(u=>u.id===p_owner&&u.email_confirmed_at&&u.email.trim().toLowerCase()===p_email);
  if(!verified)return new Response(null,{status:403});
  let n=0;for(const row of rows)if(row.owner===null&&row.email.trim().toLowerCase()===p_email){row.owner=p_owner;n++;}claimed+=n;return Response.json(n);
 }
 if(url.includes('/rest/v1/orders?')){
  assert.equal(init.headers.Authorization,'Bearer server-secret');const query=new URL(url).searchParams;queries.push(query);
  assert.equal(query.get('select'),'reference,created_at,total_pence,status,payment_status');assert.equal(query.get('payment_status'),'in.(paid,partially_refunded,refunded)');assert(!query.has('email'));assert(!query.has('reference'));assert(!query.has('id'));
  return Response.json(rows.filter(row=>row.owner===query.get('owner_user_id').slice(3)).map(({reference,created_at,total_pence,status})=>({reference,created_at,total_pence,status})));
 }
 throw Error('Unexpected endpoint '+url);
};
const myReq=(token,query='')=>new Request('https://example.supabase.co/functions/v1/my-orders'+query,{headers:token?bearer(token):{Origin:'https://apparitioninstruments.co.uk'}});
assert.equal((await listMyOrders(myReq(null),env,transport)).status,401);
assert.equal((await listMyOrders(myReq('invalid'.repeat(12)),env,transport)).status,401);
assert.equal((await listMyOrders(myReq('unverified'.repeat(9)),env,transport)).status,401);
assert.equal(rows[0].owner,null);
let result=await listMyOrders(myReq(tokenA,'?email=else@example.co.uk&owner_user_id='+b),env,transport);
assert.equal(result.status,200);assert.deepEqual((await result.json()).orders.map(o=>o.reference),['AI-010010']);assert.equal(rows[0].owner,a);assert.equal(rows[1].owner,null);assert.equal(rows[2].owner,b);assert.equal(claimed,1);
result=await listMyOrders(myReq(tokenA),env,transport);assert.equal((await result.json()).orders.length,1);assert.equal(claimed,1);
result=await listMyOrders(myReq(tokenB,'?id='+orderId),env,transport);assert.deepEqual((await result.json()).orders.map(o=>o.reference),['AI-010020']);assert.equal(rows[0].owner,a);
users.set(tokenA,customer(a,'new@example.co.uk'));result=await listMyOrders(myReq(tokenA),env,transport);
assert.deepEqual((await result.json()).orders.map(o=>o.reference),['AI-010010']);assert.equal(rows[0].owner,a);assert.equal(claimed,1);
assert(queries.every(q=>!q.toString().includes('customer')));

const basket={requestId:reqId,items:[{product:'component',sku:'COMP-1',quantity:1}],ownerUserId:b,email:'forged@example.co.uk'};
const order=(owner)=>({id:orderId,reference:'AI-010030',subtotal_pence:100,delivery_pence:399,total_pence:499,status:'pending',payment_status:'unpaid',stripe_checkout_session_id:null,owner_user_id:owner,items:[{type:'component',unitPrice:100,quantity:1,name:'Part'}]});
async function checkout(token,actualOwner){const calls=[];const send=async(url,init)=>{calls.push([url,init]);if(url.endsWith('/auth/v1/user'))return transport(url,init);
 if(url.endsWith('/rpc/create_guest_kit_order'))return Response.json({id:orderId,reference:'AI-010030',totalPence:499});
 if(url.includes('/rest/v1/orders?')&&init.method!=='PATCH')return Response.json([order(actualOwner)]);
 if(url.startsWith('https://api.stripe.com'))return Response.json({id:'cs_live_123456789',url:'https://checkout.stripe.com/c/pay/cs_live_123456789',livemode:true,amount_total:499,currency:'gbp'});
 if(init.method==='PATCH')return Response.json([{id:orderId}]);throw Error(url);};
 const request=new Request('https://example.supabase.co/functions/v1/create-checkout',{method:'POST',headers:token?bearer(token):{Origin:'https://apparitioninstruments.co.uk'},body:JSON.stringify(basket)});
 const response=await startCheckout(request,env,send);return {response,calls};}
let checkoutResult=await checkout(null,null);assert.equal(checkoutResult.response.status,200);
let payload=JSON.parse(checkoutResult.calls[0][1].body).p_request;assert.equal(payload.ownerUserId,undefined);assert.equal(payload.email,undefined);
checkoutResult=await checkout(tokenA,a);assert.equal(checkoutResult.response.status,200);
payload=JSON.parse(checkoutResult.calls[1][1].body).p_request;assert.equal(payload.ownerUserId,a);assert.equal(payload.email,undefined);
checkoutResult=await checkout(tokenA,b);assert.equal(checkoutResult.response.status,409);assert(!checkoutResult.calls.some(([url])=>url.startsWith('https://api.stripe.com')));
checkoutResult=await checkout('invalid'.repeat(12),null);assert.equal(checkoutResult.response.status,401);assert.equal(checkoutResult.calls.length,1);
const rep=createSecureCheckoutRepository({config:{url:'https://example.supabase.co',publishableKey:'public'},request:async(_url,init)=>{assert.equal(init.headers.Authorization,'Bearer '+tokenA);return Response.json({url:'https://checkout.stripe.com/c/pay/cs_live_123456789',reference:'AI-010030',totalPence:499});}});await rep.create(basket,{accessToken:tokenA});

const migration=readFileSync('supabase/migrations/20260927162000_p09c_order_ownership.sql','utf8');
assert(migration.includes('owner_user_id is null'));assert(migration.includes('lower(btrim(customer->>\'email\'))=lower(btrim(trusted_email))'));
assert(migration.includes('email_confirmed_at'));assert(migration.includes('revoke execute on function public.claim_verified_email_guest_orders'));
assert(migration.includes('on delete restrict'));
assert(!migration.includes('create policy')&&!migration.includes('grant select on public.orders'));
const window=new Window();window.document.write(readFileSync('dist/account/index.html','utf8'));
const app=createAccountApp({document:window.document,location:window.location,history:window.history,auth:{onAuthStateChange(){},async getSession(){return {data:{session:{}}}},async getUser(){return {data:{user:{email:'alice@example.co.uk',email_confirmed_at:'now'}}}}},loadOrders:async()=>[{reference:'AI-010010',createdAt:'2026-09-25T12:00:00Z',totalPence:400,status:'dispatched'}]});
await app.start();assert.match(window.document.getElementById('my-orders-list').textContent,/AI-010010/);assert.match(window.document.getElementById('my-orders-list').textContent,/£4\.00/);
window.happyDOM.abort();
const empty=new Window();empty.document.write(readFileSync('dist/account/index.html','utf8'));
await createAccountApp({document:empty.document,location:empty.location,history:empty.history,auth:{onAuthStateChange(){},async getSession(){return {data:{session:{}}}},async getUser(){return {data:{user:{email:'new@example.co.uk',email_confirmed_at:'now'}}}}},loadOrders:async()=>[]}).start();
assert.match(empty.document.getElementById('my-orders-status').textContent,/No paid Orders are available/);empty.happyDOM.abort();
console.log('P09C: verified claim, immutable ownership, cross-user denial, forged parameters, checkout isolation and My Orders PASS');

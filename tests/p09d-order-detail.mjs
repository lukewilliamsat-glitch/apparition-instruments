import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {listMyOrders} from '../supabase/functions/my-orders/index.ts';
import {progress,customerStatus} from '../dist/account/order/model.mjs';
import {renderOrder} from '../dist/account/order/view.mjs';
import {loadOrder,startOrder} from '../dist/account/order/bootstrap.mjs';

const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const tokenA='a'.repeat(80),tokenB='b'.repeat(80);
const env={get:key=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'secret'}[key])};
const row={reference:'AI-010010',owner_user_id:a,created_at:'2026-09-25T10:00:00Z',paid_at:'2026-09-25T11:00:00Z',status:'completed',payment_status:'paid',
 status_history:[{status:'in_production',at:'2026-09-25T12:00:00Z',actor:b},{status:'dispatched',at:'2026-09-27T09:00:00Z'},{type:'dispatch_details',at:'2026-09-27T08:00:00Z'}],
 items:[{name:'Test Item',quantity:1,unitPrice:1,lineTotal:1,sku:'private-sku',snapshot:{specification:{Value:'0.022',SupplierCost:'classified'},cost:999}}],
 customer:{name:'Luke',email:'private@example.co.uk'},delivery:{recipient:'Luke',line1:'Road',postcode:'NG1',country:'GB',internalNote:'private'},
 dispatch_details:{carrier:'Royal Mail',tracking_reference:'FY123GB',tracking_url:'https://example.com/track',secret:'private'},
 subtotal_pence:1,delivery_pence:399,total_pence:400,refunded_pence:0,latest_refund_at:null,stripe_payment_intent_id:'secret'};
let reads=0,claims=0;
const request=async(url,init)=>{
 if(url.endsWith('/auth/v1/user'))return Response.json({id:init.headers.Authorization==='Bearer '+tokenA?a:b,aud:'authenticated',role:'authenticated',email:'luke@example.co.uk',email_confirmed_at:'now'});
 if(url.endsWith('/rpc/claim_verified_email_guest_orders')){claims++;return Response.json(0);}
 if(url.includes('/rest/v1/orders?')){reads++;const q=new URL(url).searchParams;
  assert([a,b].includes(q.get('owner_user_id').slice(3)));assert.equal(init.headers.Authorization,'Bearer secret');
  assert(!q.has('email')&&!q.has('id'));
  return Response.json(q.get('reference')==='eq.AI-010010'&&q.get('owner_user_id')==='eq.'+a?[row]:[]);
 }
 throw Error(url);
};
const detail=(token,reference='AI-010010',extra='')=>listMyOrders(new Request('https://example.supabase.co/functions/v1/my-orders?reference='+reference+extra,{headers:token?{Authorization:'Bearer '+token}:{}}),env,request);
assert.equal((await detail(null)).status,401);
let result=await detail(tokenA);assert.equal(result.status,200);const order=(await result.json()).order;
assert.equal(order.pricing.total,400);assert.equal(order.items[0].options[0].value,'0.022');assert.equal(order.dispatch.trackingUrl,'https://example.com/track');
assert.equal(order.customerEmail,'private@example.co.uk');
for(const secret of ['private-sku','internalNote','stripe_payment_intent_id','snapshot','actor','secret','classified'])assert(!JSON.stringify(order).includes(secret));
assert.equal((await detail(tokenB)).status,404);assert.equal((await detail(tokenA,'AI-010011')).status,404);
assert.equal((await detail(tokenA,'AI-010010','&id='+b+'&user_id='+b+'&email=private@example.co.uk')).status,200);
assert.equal((await detail(tokenA,'AI-010010%26owner_user_id=eq.'+b)).status,404);
assert.equal(reads,4);assert.equal(claims,4);
assert.deepEqual(progress(order).map(x=>x.state),['done','done','done','done']);
assert.equal(progress(order)[1].at,'2026-09-25T12:00:00Z');assert.equal(progress(order)[2].at,null);
assert.equal(customerStatus(order),'Fulfilment complete');
const win=new Window();win.document.write(readFileSync('dist/account/order/index.html','utf8'));
renderOrder(win.document.getElementById('order-detail'),order,win.document);
assert.match(win.document.getElementById('order-detail').textContent,/£4\.00/);
assert.match(win.document.getElementById('order-detail').textContent,/Royal Mail/);
assert.equal(win.document.querySelector('.order-section a').href,'https://example.com/track');
const noTracking={...order,dispatch:{},status:'pending',paymentStatus:'refunded',refundedPence:400};
renderOrder(win.document.getElementById('order-detail'),noTracking,win.document);
assert(!win.document.querySelector('.order-section a'));assert.match(win.document.getElementById('order-detail').textContent,/Refunded/);
assert.equal(progress(noTracking)[0].state,'current');win.happyDOM.abort();
let requested='';await loadOrder('AI-010010',{auth:{getSession:async()=>({data:{session:{access_token:tokenA}}})},config:{url:'https://example.supabase.co',publishableKey:'public'},request:async(url,init)=>{requested=url;assert.equal(init.headers.Authorization,'Bearer '+tokenA);return Response.json({order});}});
assert.match(requested,/reference=AI-010010/);
await assert.rejects(loadOrder('AI-010010',{auth:{getSession:async()=>({data:{session:null}})}}),/Sign in/);
const account=new Window();account.document.write(readFileSync('dist/account/index.html','utf8'));
assert(!account.document.body.textContent.includes('Detailed Order progress is coming soon'));
assert(!account.document.body.textContent.includes('Order history is being developed separately'));
account.happyDOM.abort();
assert(readFileSync('dist/account/app.mjs','utf8').includes('/account/order/?reference='));
console.log('P09D: authenticated owned detail, non-enumerating denial, payload minimization, lifecycle, tracking, totals, account navigation PASS');

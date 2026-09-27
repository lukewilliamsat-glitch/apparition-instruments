import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {listMyOrders} from '../supabase/functions/my-orders/index.ts';
import {loadOrder} from '../dist/account/order/bootstrap.mjs';
import {renderInvoice,invoiceModel} from '../dist/account/order/invoice/app.mjs';
import {renderInvoiceDocument} from '../dist/invoice/document.mjs';
import {loadAdminInvoice} from '../dist/admin/orders/invoice/app.mjs';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',tokenA='a'.repeat(80),tokenB='b'.repeat(80);
const env={get:key=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server-secret'}[key])};
const sample=(reference,owner,payment_status)=>({reference,owner_user_id:owner,payment_status,status:'pending',created_at:'2026-09-27T10:00:00Z',paid_at:payment_status==='unpaid'?null:'2026-09-27T11:00:00Z',
 customer:{name:'Customer',email:'customer@example.co.uk'},delivery:{recipient:'Customer',line1:'Road',postcode:'NG1',country:'GB'},
 items:[{name:'Vintage Pot',quantity:2,unitPrice:250,lineTotal:500,snapshot:{specification:{Shaft:'Short',SupplierCost:'secret'}}}],
 subtotal_pence:500,delivery_pence:399,total_pence:899,refunded_pence:payment_status==='refunded'?899:payment_status==='partially_refunded'?250:0,
 latest_refund_at:['refunded','partially_refunded'].includes(payment_status)?'2026-09-27T12:00:00Z':null,status_history:[],dispatch_details:{}});
const rows=[sample('AI-010001',a,'unpaid'),sample('AI-010002',a,'paid'),sample('AI-010003',a,'partially_refunded'),sample('AI-010004',a,'refunded'),sample('AI-010005',b,'paid'),sample('AI-010006',null,'paid')];
let claims=0,reads=0;
const transport=async(url,init)=>{
 if(url.endsWith('/auth/v1/user'))return Response.json({id:init.headers.Authorization==='Bearer '+tokenA?a:b,email:'customer@example.co.uk',aud:'authenticated',role:'authenticated',email_confirmed_at:'now'});
 if(url.endsWith('/rpc/claim_verified_email_guest_orders')){claims++;const {p_owner}=JSON.parse(init.body);for(const row of rows)if(row.owner_user_id===null&&row.customer.email==='customer@example.co.uk')row.owner_user_id=p_owner;return Response.json(1);}
 if(url.includes('/rest/v1/orders?')){reads++;const q=new URL(url).searchParams,owner=q.get('owner_user_id').slice(3),reference=q.get('reference')?.slice(3);
  assert.equal(q.get('payment_status'),'in.(paid,partially_refunded,refunded)');assert.equal(init.headers.Authorization,'Bearer server-secret');
  return Response.json(rows.filter(row=>row.owner_user_id===owner&&row.payment_status!=='unpaid'&&(!reference||row.reference===reference)));
 }throw Error('Unexpected endpoint '+url);
};
const invoke=(token,reference)=>listMyOrders(new Request('https://example.supabase.co/functions/v1/my-orders'+(reference?'?reference='+reference:''),{headers:token?{Authorization:'Bearer '+token}:{}}),env,transport);
assert.equal((await invoke(null,'AI-010002')).status,401);
assert.equal((await invoke(tokenA,'AI-010001')).status,404);assert.equal(claims,0);
assert.equal((await invoke(tokenA,'AI-010006')).status,404);assert.equal(rows[5].owner_user_id,null);assert.equal(claims,0);
let list=await invoke(tokenA);assert.deepEqual((await list.json()).orders.map(o=>o.reference),['AI-010002','AI-010003','AI-010004','AI-010006']);assert.equal(claims,1);
assert.equal((await invoke(tokenA,'AI-010001')).status,404);assert.equal((await invoke(tokenB,'AI-010002')).status,404);assert.equal(claims,1);
assert.equal((await invoke(tokenA,'AI-010003')).status,200);assert.equal((await invoke(tokenA,'AI-010004')).status,200);
rows[0].payment_status='paid';rows[0].paid_at='2026-09-27T13:00:00Z'; // Signed webhook outcome fixture.
assert.equal((await invoke(tokenA,'AI-010001')).status,200);assert.equal(claims,1);
list=await invoke(tokenA);assert((await list.json()).orders.some(row=>row.reference==='AI-010001'));assert.equal(rows[4].owner_user_id,b);
const auth={getSession:async()=>({data:{session:{access_token:tokenA}}})};
const request=async(url,init)=>listMyOrders(new Request(url,{headers:{Authorization:init.headers.Authorization}}),env,transport);
const config={url:'https://example.supabase.co',publishableKey:'public'};
const unpaid=rows[0].payment_status;rows[0].payment_status='unpaid';
await assert.rejects(loadOrder('AI-010001',{auth,request,config}),/Order not found/);assert.equal(claims,2);
rows[0].payment_status=unpaid;
const order=await loadOrder('AI-010002',{auth,request,config});assert.equal(order.paymentStatus,'paid');
const admin=rows[1],adminRecord={reference:admin.reference,createdAt:admin.created_at,customer:admin.customer,delivery:admin.delivery,items:admin.items,
 paymentStatus:admin.payment_status,refundedPence:admin.refunded_pence,pricing:{subtotal:admin.subtotal_pence,delivery:admin.delivery_pence,total:admin.total_pence}};
const customer=new Window(),staff=new Window();customer.document.write(readFileSync('dist/account/order/invoice/index.html','utf8'));staff.document.write(readFileSync('dist/admin/orders/invoice/index.html','utf8'));
renderInvoice(customer.document.querySelector('#invoice'),order,customer.document);
renderInvoiceDocument(staff.document.querySelector('#invoice'),adminRecord,staff.document);
const adminId='33333333-3333-4333-8333-333333333333';
await loadAdminInvoice({document:staff.document,location:{search:'?id='+adminId},repository:{list:async()=>[{...adminRecord,id:adminId}]}});
const sheet=doc=>doc.querySelector('.sheet').textContent;
assert.equal(sheet(customer.document),sheet(staff.document));assert.match(sheet(customer.document),/Shaft: Short/);assert(!sheet(customer.document).includes('secret'));
assert(!sheet(customer.document).includes('Refunded'));assert.match(sheet(customer.document),/Total paid£8\.99/);
for(const [status,refund,total] of [['partially_refunded',250,'£6.49'],['refunded',899,'£0.00']]){
 const row=sample('AI-010007',a,status),fixture={...adminRecord,paymentStatus:status,refundedPence:refund,latestRefundAt:row.latest_refund_at};
 const customerFixture={...order,paymentStatus:status,refundedPence:refund,latestRefundAt:row.latest_refund_at};
 assert.equal(invoiceModel(customerFixture).refundedPence,refund);
 renderInvoice(customer.document.querySelector('#invoice'),customerFixture,customer.document);
 renderInvoiceDocument(staff.document.querySelector('#invoice'),fixture,staff.document);
 assert.equal(sheet(customer.document),sheet(staff.document));assert.match(sheet(customer.document),new RegExp('Net paid'+total.replace('.','\\.')));
}
assert(readFileSync('dist/admin/orders/invoice/index.html','utf8').includes('data-admin-entry'));
assert(readFileSync('dist/account/order/invoice/app.mjs','utf8').includes('loadOrder'));
assert(reads>0);customer.happyDOM.abort();staff.happyDOM.abort();
console.log('P09H: unpaid invisibility, paid/refund visibility, claim isolation, owner protection, canonical Admin/customer invoices PASS');

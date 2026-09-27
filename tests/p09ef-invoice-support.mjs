import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {invoiceModel,renderInvoice,startInvoice} from '../dist/account/order/invoice/app.mjs';
import {receiveContactEnquiry} from '../supabase/functions/contact-enquiry/index.ts';
import {validateEnquiry,renderEnquiry} from '../supabase/functions/contact-enquiry/mail.ts';
import {createContactController} from '../dist/contact/contact.mjs';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',tokenA='a'.repeat(80),tokenB='b'.repeat(80);
const detail={reference:'AI-010010',createdAt:'2026-09-25T10:00:00Z',paymentStatus:'paid',customerName:'Customer',customerEmail:'customer@example.co.uk',recipient:'Customer',address:['Road','Mansfield','NG1','GB'],
 items:[{name:'Vintage Pot',quantity:2,unitPrice:250,lineTotal:500,options:[{name:'Shaft',value:'Short'}]}],pricing:{subtotal:500,delivery:399,total:899},refundedPence:0,latestRefundAt:null};
assert.equal(invoiceModel(detail).pricing.total,899);
assert.throws(()=>invoiceModel({...detail,pricing:{...detail.pricing,total:999}}),/Saved Order totals/);
assert.throws(()=>invoiceModel({...detail,paymentStatus:'unpaid'}),/historically paid/);
const page=new Window();page.document.write(readFileSync('dist/account/order/invoice/index.html','utf8'));
const root=page.document.querySelector('#invoice');renderInvoice(root,detail,page.document);
assert.match(root.textContent,/£8\.99/);assert.match(root.textContent,/Vintage Pot/);assert.match(root.textContent,/Shaft: Short/);
assert(!root.textContent.includes('private-sku'));
assert.equal(root.querySelector('#refund-total'),null);assert.equal(root.querySelector('#refund-details'),null);assert.equal(root.querySelector('#net-paid'),null);
renderInvoice(root,{...detail,paymentStatus:'refunded',refundedPence:899,latestRefundAt:'2026-09-26T12:00:00Z'},page.document);
assert.match(root.textContent,/Refunded/);assert.equal(root.querySelector('#refund-total').textContent,'Refunded−£8.99');assert.equal(root.querySelector('#net-paid').textContent,'Net paid£0.00');
renderInvoice(root,{...detail,paymentStatus:'partially_refunded',refundedPence:250,latestRefundAt:'2026-09-26T12:00:00Z'},page.document);
assert.equal(root.querySelector('#refund-total').textContent,'Refunded−£2.50');assert.equal(root.querySelector('#net-paid').textContent,'Net paid£6.49');
for(const refundedPence of [0,null,undefined]){renderInvoice(root,{...detail,refundedPence},page.document);assert.equal(root.querySelector('#refund-total'),null);assert.equal(root.querySelector('#refund-details'),null);assert.equal(root.querySelector('#net-paid'),null);}
assert.throws(()=>invoiceModel({...detail,paymentStatus:'refunded',refundedPence:0}),/refund status/);
assert.throws(()=>invoiceModel({...detail,paymentStatus:'paid',refundedPence:1}),/refund status/);
await startInvoice({document:page.document,location:{href:'https://apparitioninstruments.co.uk/account/order/invoice/?reference=AI-010010'},load:async()=>detail});
assert.equal(page.document.querySelector('#back-order').getAttribute('href'),'/account/order/?reference=AI-010010');page.happyDOM.abort();
const input={submissionId:'11111111-1111-4111-8111-111111111111',name:'Customer',email:'forged@example.co.uk',category:'order',orderReference:'AI-010010',orderContext:true,message:'Help with my Order please.',website:''};
const env={get:key=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server-secret'}[key])};
const invoke=async(token,body=input,owner=a)=>{let sent=null;const paths=[];
 const transport=async(url,init)=>{paths.push([url,init]);if(url.endsWith('/auth/v1/user'))return Response.json({id:token===tokenA?a:b,email:'customer@example.co.uk',aud:'authenticated',role:'authenticated',email_confirmed_at:'now'});
  if(url.includes('/rest/v1/orders?')){const q=new URL(url).searchParams;assert.equal(q.get('owner_user_id'),'eq.'+(token===tokenA?a:b));assert.equal(q.get('reference'),'eq.'+body.orderReference);return Response.json(owner===(token===tokenA?a:b)&&body.orderReference==='AI-010010'?[{id:'record'}]:[]);}
  if(url.endsWith('/rpc/reserve_contact_enquiry')){assert.equal(JSON.parse(init.body).p_email,body.orderContext?'customer@example.co.uk':'forged@example.co.uk');return Response.json('accepted');}
  if(url.endsWith('/rpc/attach_verified_contact_order')){const data=JSON.parse(init.body);assert.equal(data.p_owner,a);assert.equal(data.p_reference,'AI-010010');return Response.json(true);}
  if(url.endsWith('/rpc/mark_contact_enquiry_attempt')||url.endsWith('/rpc/finish_contact_enquiry'))return Response.json(true);throw Error(url);
 };
 const request=new Request('https://example.supabase.co/functions/v1/contact-enquiry',{method:'POST',headers:{Origin:'https://apparitioninstruments.co.uk','Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
 const result=await receiveContactEnquiry(request,env,transport,async(_env,mail)=>{sent=mail;});return {result,sent,paths};
};
let x=await invoke(tokenA);assert.equal(x.result.status,200);assert.match(x.sent.text,/Order Reference \(verified\): AI-010010/);assert.equal(x.sent.replyTo,'customer@example.co.uk');
assert(x.paths.some(([url])=>url.endsWith('/rpc/attach_verified_contact_order')));
x=await invoke(tokenB);assert.equal(x.result.status,404);assert(!x.paths.some(([url])=>url.includes('/rpc/')));assert(!x.sent);
x=await invoke(tokenA,{...input,orderReference:'AI-010011'});assert.equal(x.result.status,404);assert(!x.sent);
x=await invoke(null);assert.equal(x.result.status,404);assert(!x.sent);
x=await invoke(null,{...input,orderContext:false});assert.equal(x.result.status,200);assert(!x.paths.some(([url])=>url.includes('/rest/v1/orders?')));assert.match(x.sent.text,/unverified context/);
const html=renderEnquiry({...validateEnquiry({...input,message:'Hello <script>alert(1)<\/script> and more.'}),verifiedOrderReference:'AI-010010'},'2026-09-27T10:00:00Z').html;
assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>'));
const contact=new Window();contact.document.write(readFileSync('dist/contact/index.html','utf8'));
const form=contact.document.querySelector('#enquiry-form');const auth={getSession:async()=>({data:{session:{access_token:tokenA}}}),getUser:async()=>({data:{user:{email:'customer@example.co.uk',email_confirmed_at:'now'}}})};
let posted=null;const controller=createContactController({form,notice:contact.document.querySelector('#enquiry-status'),success:contact.document.querySelector('#enquiry-success'),auth,location:{href:'https://apparitioninstruments.co.uk/contact/?reference=AI-010010'},id:()=>input.submissionId,
 request:async(_url,init)=>{posted=init;return Response.json({state:'sent'});}});
await controller.initialiseContext();assert.equal(form.elements.orderReference.value,'AI-010010');assert.equal(form.elements.email.value,'customer@example.co.uk');assert(!form.querySelector('#order-context').hidden);
form.elements.name.value='Customer';form.elements.message.value='Please help with this Order.';
const previous=globalThis.FormData;globalThis.FormData=contact.FormData;
await controller.submit(new contact.Event('submit',{cancelable:true}));globalThis.FormData=previous;
assert.equal(JSON.parse(posted.body).orderContext,true);assert.equal(posted.headers.Authorization,'Bearer '+tokenA);
contact.happyDOM.abort();
assert(readFileSync('dist/account/order/view.mjs','utf8').includes('Contact us about this Order'));
const migration=readFileSync('supabase/migrations/20260927164300_p09ef_verified_contact_order.sql','utf8');assert(migration.includes('owner_user_id=p_owner'));assert(migration.includes('revoke all'));
console.log('P09E/F: invoice ownership via detail, historical totals/refund, verified support context, guest path and escaping PASS');

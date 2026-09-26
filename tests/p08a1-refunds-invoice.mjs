import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {bootAdminGate} from '../dist/admin/admin-gate.mjs';
import {currentAdminOrderRepository} from '../dist/backend/order-data.mjs?v=p08b2a';
import {invoiceFromOrder} from '../dist/admin/orders/invoice/model.mjs';
import {isPaidOrder,isCheckoutAttempt,paymentLabels,nextFulfilment} from '../dist/admin/orders/lifecycle.mjs';
import {receiveStripeWebhook} from '../supabase/functions/stripe-webhook/index.ts';
import {buildPaidOrderConfirmation} from '../supabase/functions/stripe-webhook/confirmation.ts';

const html=readFileSync('dist/admin/orders/invoice/index.html','utf8'),app=readFileSync('dist/admin/orders/invoice/app.mjs','utf8'),gate=readFileSync('dist/admin/admin-gate.mjs','utf8');
assert.match(html,/admin-gate\.mjs\?v=p08b2a/);assert.match(html,/data-admin-entry="\.\/app\.mjs\?v=p08b2a"/);
assert.match(gate,/order-data\.mjs\?v=p08b2a/);assert.match(app,/order-data\.mjs\?v=p08b2a/);
const page=()=>{const w=new Window({url:'https://apparitioninstruments.co.uk/admin/orders/invoice/?id=11111111-1111-1111-1111-111111111111'});w.document.body.innerHTML='<script data-admin-entry="./app.mjs?v=p08b2a"></script>';return w;};
let restore;const delayed=new Promise(resolve=>restore=resolve),admin=page();let loads=0;
const loading=bootAdminGate({document:admin.document,auth:{restore:()=>delayed,accessToken:async()=> 'admin-jwt'},load:async()=>{loads++;assert.equal(typeof currentAdminOrderRepository().list,'function');}});
assert.equal(loads,0,'Invoice entry must wait for restored Admin membership');
restore({status:'authorized'});await loading;assert.equal(loads,1);assert(admin.document.body.classList.contains('admin-authorized'));
for(const status of ['signed-out','denied']){
 const w=page();let accessed=false;await bootAdminGate({document:w.document,auth:{restore:async()=>({status}),signOut:async()=>{}},load:async()=>{accessed=true;}});
 assert.equal(accessed,false);assert.equal(w.document.body.classList.contains('admin-authorized'),false);
}
const paid={reference:'AI-010010',createdAt:'2026-09-25T12:00:00Z',paymentStatus:'paid',items:[{name:'Test',quantity:1,unitPrice:1,lineTotal:1}],pricing:{subtotal:1,delivery:399,total:400}};
assert.equal(invoiceFromOrder(paid).paymentLabel,'Paid');
assert.equal(invoiceFromOrder({...paid,paymentStatus:'refunded',refundedPence:400}).paymentLabel,'Refunded');
assert.equal(invoiceFromOrder({...paid,paymentStatus:'partially_refunded',refundedPence:150}).refundedPence,150);
assert.throws(()=>invoiceFromOrder({...paid,paymentStatus:'unpaid'}),/historically paid/);
assert.equal(paymentLabels.partially_refunded,'Partially Refunded');
assert(isPaidOrder({...paid,paymentStatus:'refunded'}));assert(!isCheckoutAttempt({...paid,paymentStatus:'refunded'}));
assert.equal(nextFulfilment({...paid,paymentStatus:'partially_refunded',fulfilmentStatus:'pending'}),null);assert.equal(nextFulfilment({...paid,paymentStatus:'partially_refunded',partialRefundAcknowledged:true,fulfilmentStatus:'pending'}),'in_production');
assert.equal(nextFulfilment({...paid,paymentStatus:'refunded',fulfilmentStatus:'pending'}),null);

const secret='whsec_fixture_refunds',now=1790346000000;
const env={get:key=>({STRIPE_WEBHOOK_SECRET:secret,STRIPE_SECRET_KEY:'restricted-server-only',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'service-server-only'})[key]};
const stripeRefund={id:'re_0123456789abcdef',object:'refund',amount:150,currency:'gbp',payment_intent:'pi_0123456789abcdef',created:1790345000,status:'succeeded'};
const event={id:'evt_0123456789abcdef',type:'refund.created',livemode:true,data:{object:stripeRefund}};
const calls=[];let current={...stripeRefund};
const request=async(url,init)=>{
 calls.push({url,init});
 if(url.startsWith('https://api.stripe.com/v1/refunds/')){assert.equal(init.headers.Authorization,'Bearer restricted-server-only');return Response.json(current);}
 if(url.endsWith('/rpc/record_verified_stripe_refund')){const body=JSON.parse(init.body);assert.equal(body.p_payment_intent_id,stripeRefund.payment_intent);assert.equal(body.p_amount,current.amount);return Response.json('partially_refunded');}
 throw Error('Refund receiver must never call inventory, fulfilment or email: '+url);
};
async function signed(value=event,keyValue=secret){const body=JSON.stringify(value),stamp=String(Math.floor(now/1000));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(keyValue),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(stamp+'.'+body))).toString('hex');
 return new Request('https://example.supabase.co/functions/v1/stripe-webhook',{method:'POST',headers:{'Stripe-Signature':`t=${stamp},v1=${mac}`},body});
}
assert.equal((await receiveStripeWebhook(await signed(),env,request,now)).status,200);
assert.equal((await receiveStripeWebhook(await signed(),env,request,now)).status,200,'Replay follows the same idempotent RPC');
current={...stripeRefund,id:'re_abcdef0123456789',amount:250};
assert.equal((await receiveStripeWebhook(await signed({...event,id:'evt_abcdef0123456789',type:'refund.updated',data:{object:current}}),env,request,now)).status,200);
assert.equal(calls.filter(c=>c.url.includes('/rpc/record_verified_stripe_refund')).length,3);
assert.equal((await receiveStripeWebhook(await signed(event,'whsec_invalid_fixture'),env,request,now)).status,401);
assert.equal((await receiveStripeWebhook(await signed({...event,livemode:false}),env,request,now)).status,400);
assert.equal(calls.length,6,'Invalid signature or test-mode event must cause no calls');
const paidSnapshot={reference:'AI-010010',payment_status:'refunded',paid_at:'2026-09-25',fulfillment_applied_at:'2026-09-25',customer:{name:'Customer',email:'safe@example.test'},delivery:{line1:'1 Road'},items:paid.items,subtotal_pence:1,delivery_pence:399,total_pence:400};
assert.throws(()=>buildPaidOrderConfirmation(paidSnapshot),/paid Order/);
const sql=readFileSync('supabase/migrations/20260926124503_p08a1_refund_lifecycle.sql','utf8');
assert.match(sql,/stripe_refund_events/);assert.match(sql,/on conflict\(event_id\) do nothing/);
assert.match(sql,/status='succeeded'/);assert.doesNotMatch(sql,/update public\.inventory|insert into public\.inventory/i);
assert.match(sql,/grant execute on function public\.record_verified_stripe_refund[\s\S]*to service_role/);
assert.match(readFileSync('supabase/migrations/20260925203000_p07b7_confirmation_delivery.sql','utf8'),/confirmation_email_status<>'pending'/);
assert.match(readFileSync('supabase/migrations/20260925222950_p08a_legacy_order_confirmation.sql','utf8'),/confirmation_email_status<>'legacy'/);
console.log('P08A.1: invoice authentication and refund event security/presentation PASS');

import assert from 'node:assert/strict';
import {secureSentinelCheckout,reconcilePayment,verifiedGuestProof,verifiedProviderSession} from '../../supabase/functions/_shared/commerce67-payments.ts';
import {reconcileCheckout} from '../../supabase/functions/commerce67-reconcile/index.ts';
const id='e13ed95e-11be-4dac-a7c8-26cd5a79ec21',sid='cs_live_fixtureAAAA',now=Date.now()/1000|0;
const row={id,sessionId:null,reference:'AI-123',amount:1300,currency:'gbp',state:'open',dispatch:'sending',createdAt:now,expiresAt:now+2400};
const session={id:sid,livemode:true,object:'checkout.session',mode:'payment',status:'open',payment_status:'unpaid',amount_total:1300,currency:'gbp',
 metadata:{order_id:id,order_reference:row.reference},client_reference_id:row.reference,url:'https://checkout.stripe.com/c/pay/demo'};
const env={get:n=>({SUPABASE_URL:'https://database.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',STRIPE_SECRET_KEY:'rk_live_fixtureOnly',
 COMMERCE67_TURNSTILE_SECRET:'fixture-proof',COMMERCE67_RECONCILE_SECRET:'fixture-only-operator-bearer-00000'})[n]};
let state=row, checkout=session, discovery=[session], unknown=false, lost=false, attached=false;
const calls=[];
async function request(url,init={}){
 calls.push([url,init.method??'GET',init.body,init.headers]);const name=new URL(url).pathname.split('/').at(-1);
 if(name==='commerce67_payment_status')return Response.json(state);
 if(name==='commerce67_abandon_never_sent')return Response.json(true);
 if(name==='commerce67_payment_claim')return Response.json({body:JSON.parse(init.body).p_body});
 if(name==='commerce67_payment_observe'){attached=true;const b=JSON.parse(init.body);assert.equal(b.p_amount,1300);
  return Response.json(b.p_state==='expired'?'expired':b.p_state==='paid'?'paid_needs_event':'linked');}
 if(name==='sessions'&&init.method==='POST'){
  if(lost)throw TypeError('fixture dropped response');
  return Response.json(checkout);
 }
 if(name==='sessions')return Response.json({data:discovery,has_more:unknown});
 if(name===sid)return Response.json(checkout);
 if(name==='siteverify')return Response.json({success:true,hostname:'apparitioninstruments.co.uk',action:'commerce_checkout'});
 throw Error('Unexpected fixture call');
}
const form=()=>new URLSearchParams({'mode':'payment','metadata[order_id]':id});
assert.equal(await verifiedGuestProof(env,request,'test-proof'),true);
assert.equal(await verifiedGuestProof(env,()=>Response.json({success:true,hostname:'untrusted.invalid',action:'commerce_checkout'}),'test-proof'),false);
assert.equal(await verifiedGuestProof(env,()=>Response.json({success:true,hostname:'apparitioninstruments.co.uk',action:'elsewhere'}),'test-proof'),false);
assert.equal(await verifiedGuestProof(env,()=>assert.fail('missing token must not fetch'),null),false);
lost=true;await assert.rejects(secureSentinelCheckout(env,request,row,form()),/dropped/);lost=false;
assert.equal(await secureSentinelCheckout(env,request,row,form()),session.url);
const posts=calls.filter(([url,method])=>url.endsWith('/sessions')&&method==='POST');
assert.equal(posts.length,2);assert.equal(posts[0][2],posts[1][2]);
assert.equal(posts[0][3]['Idempotency-Key'],'apparition-'+id);
assert.equal(new URLSearchParams(posts[0][2]).get('expires_at'),String(row.expiresAt));
assert.equal(await reconcilePayment(env,request,id),'linked');
checkout={...session,status:'expired'};assert.equal(await reconcilePayment(env,request,id),'expired');
checkout={...session,status:'complete',payment_status:'paid',payment_intent:'pi_123456789'};
assert.equal(await reconcilePayment(env,request,id,sid),'paid_needs_event');
checkout={...session,status:'expired',amount_total:1299};attached=false;
assert.equal(await reconcilePayment(env,request,id,sid),'unconfirmed');assert.equal(attached,false);
assert.equal(verifiedProviderSession({...session,currency:'usd'},row),null);
assert.equal(verifiedProviderSession({...session,livemode:false},row),null);
discovery=[];assert.equal(await reconcilePayment(env,request,id),'unconfirmed');assert.equal(attached,false);
checkout=session;discovery=[session];unknown=true;assert.equal(await reconcilePayment(env,request,id),'unconfirmed');
unknown=false;state={...row,dispatch:'new'};
assert.equal(await reconcilePayment(env,request,id),'never_sent_unreleased');
assert.equal(await reconcilePayment(env,request,id,undefined,true),'released_never_sent');
const denied=await reconcileCheckout(new Request('https://test.invalid',{method:'POST',body:JSON.stringify({orderId:id})}),env,
 ()=>assert.fail('unauthorized reconciliation must not call a provider'));
assert.equal(denied.status,403);
console.log('Sentinel Edge: fixture idempotency, recovery without session creation, provider matching, expiry, paid deferral and guest proof PASS');

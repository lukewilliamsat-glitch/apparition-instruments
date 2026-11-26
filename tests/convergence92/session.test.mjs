import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {reservedSession} from './session.mjs';
for(const live of [false,true]){
 const database=live?'https://acdxpxvksvdwfajntzfx.supabase.co':'https://prwmowexhonguvtiywsy.supabase.co';
 const account=live?'acct_1UJUR9I4E9fIeEmD':'acct_1UJURLIeVWpsCl5X';
 const order={id:'11111111-1111-4111-8111-111111111111',reference:'AI-929202',total_pence:1234};
 const plan={orderId:order.id,account,currency:'GBP',expectedMinor:1234,mode:live?'live':'sandbox',
  binding:'a'.repeat(64),idempotencyKey:'apparition79/'+'a'.repeat(64),expiration:Math.floor(Date.now()/1000)+2700,sessionId:null};
 const session={id:(live?'cs_live_':'cs_test_')+'Fixture929202',url:'https://checkout.stripe.com/c/pay/fixture',
  livemode:live,amount_total:1234,currency:'gbp',client_reference_id:order.id,metadata:{dominion_binding:plan.binding},expires_at:plan.expiration,status:'open'};
 let events=[],mutate=x=>x,fail='',attached=null;
 const request=async(url,options)=>{
  events.push(url);
  if(url.endsWith('/v1/account'))return Response.json({id:account});
  if(url.endsWith('/convergence92_prepare')){
   assert.deepEqual(JSON.parse(options.body),{p_order:order.id,p_owner:'fixture92-owner',p_expiration:Math.floor(Date.now()/1000)+2700});
   return Response.json(plan);
  }
  if(url.endsWith('/convergence92_attach')){
   attached=JSON.parse(options.body);
   return Response.json(fail!=='attach');
  }
  assert(url.startsWith('https://api.stripe.com/v1/checkout/sessions'));
  if(options.method==='POST'){
   assert.equal(options.headers['Idempotency-Key'],plan.idempotencyKey);
   assert.equal(options.headers['Stripe-Version'],'2025-02-24.acacia');
   const body=new URLSearchParams(options.body);
   assert.equal(body.get('client_reference_id'),order.id);
   assert.equal(body.get('metadata[dominion_binding]'),plan.binding);
   assert.equal(body.get('expires_at'),String(plan.expiration));
   assert.equal(body.get('line_items[0][price_data][unit_amount]'),'1234');
   if(fail==='uncertain')throw Error('Lost provider response');
  }else assert.equal(options.method,undefined);
  return Response.json(mutate(structuredClone(session)));
 };
 const options={database,serviceKey:'fixture-private',stripeKey:live?'sk_live_Disposable92':'sk_test_Disposable92',order,
  ownerKey:'fixture92-owner',form:new URLSearchParams({'line_items[0][price_data][unit_amount]':'1234'}),live,request};
 assert.equal((await reservedSession(options)).totalPence,1234);
 assert.deepEqual(attached,{p_order:order.id,p_binding:plan.binding,p_session:session.id});
 fail='uncertain';await assert.rejects(reservedSession(options));
 fail='';assert.equal((await reservedSession(options)).url,session.url);
 plan.sessionId=session.id;events=[];
 await reservedSession(options);
 assert(events.some(x=>x.endsWith('/'+session.id)));
 assert.equal(events.filter(x=>x.endsWith('/v1/checkout/sessions')).length,0);
 plan.sessionId=null;
 for(const changed of [s=>({...s,livemode:!live}),s=>({...s,amount_total:1}),s=>({...s,metadata:{}}),
  s=>({...s,client_reference_id:'other'}),s=>({...s,expires_at:s.expires_at+1}),s=>({...s,url:'https://evil.invalid/pay'}),
  s=>({...s,status:'expired'})]){
  mutate=changed;attached=null;await assert.rejects(reservedSession(options));assert.equal(attached,null);
 }
 mutate=x=>x;fail='attach';await assert.rejects(reservedSession(options));fail='';
 events=[];await assert.rejects(reservedSession({...options,database:'https://wrong.invalid'}));assert.equal(events.length,0);
 events=[];await assert.rejects(reservedSession({...options,stripeKey:live?'sk_test_Disposable92':'sk_live_Disposable92'}));assert.equal(events.length,0);
 events=[];await assert.rejects(reservedSession({...options,request:async()=>Response.json({id:'acct_WrongAccount'})}));assert.equal(events.length,0);
}
const source=await readFile(new URL('./create-checkout.production.review.ts',import.meta.url),'utf8');
const baseline=await readFile(new URL('./create-checkout.baseline.ts',import.meta.url),'utf8');
const added=/ if\(env\.get\('UNITY92_CHECKOUT'\)==='enabled'\)\{[\s\S]*?\n \}\n(?= const stripe=)/;
assert(source.match(added));
const restored=source.replace("import {reservedSession} from './session.mjs';\n",'').replace(added,'')
 .replace("if(order.stripe_checkout_session_id&&env.get('UNITY92_CHECKOUT')!=='enabled')return",'if(order.stripe_checkout_session_id)return');
assert.equal(restored,baseline);
console.log('PASS guarded plan, account/mode/amount/metadata/expiry binding, uncertain retry, Session resume, atomic attachment and exact legacy fallback source');

// Sandbox-shaped bridge to the accepted transactional writer, for the disposable
// PostgreSQL fixture only. No provider credentials or outward requests are used.
import assert from 'node:assert/strict';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {checkoutPlans} from './checkout-plans.mjs';
import {handleSandboxWebhook,reattachSandboxSession} from './stripe82.mjs';

const {Pool}=createRequire(import.meta.url)(process.env.DOMINION_PG_MODULE);
const db=new Pool({host:'127.0.0.1',port:55478,database:'dominion79_fixture',user:'postgres',max:2,connectionTimeoutMillis:3000,statement_timeout:6000});
const value=async(sql,args)=>Object.values((await db.query(sql,args)).rows[0])[0];
async function transaction(work){
 const c=await db.connect();
 try{
  await c.query('begin');
  const result=await work(c);
  await c.query('commit');
  return result;
 }catch(e){await c.query('rollback');throw e;}
 finally{c.release();}
}
async function asWriter(c,sql,args){
 await c.query('set local role service_role');
 const result=Object.values((await c.query(sql,args)).rows[0]??{})[0];
 await c.query('reset role');
 return result;
}
const service=(sql,args)=>transaction(c=>asWriter(c,sql,args));
const plans=checkoutPlans(db);
const account='acct_FixtureSandbox82', secret='whsec_OfflineFixture82';
const clock=new Date(), now=clock.toISOString();
const orderId=randomUUID(), orderRef='AI-829901';
const amount=750, item='fixture79-res', session='cs_test_Homecoming82Native', intent='pi_Homecoming82Native';
const expiresAt=new Date(clock.getTime()+45*60000);
const status=()=>value('select payment_status from public.orders where id=$1',[orderId]);
const stock=()=>value('select quantity::int from public.inventory where component_id=$1',[item]);
function signed(type,object,id){
 const event={id,object:'event',type,account,created:Math.floor(clock.getTime()/1000),livemode:false,data:{object}};
 const rawBody=Buffer.from(JSON.stringify(event)), t=String(event.created);
 return {rawBody,signature:'t='+t+',v1='+createHmac('sha256',secret).update(t+'.').update(rawBody).digest('hex'),secret,now,account};
}
try{
 assert.equal(await value('select current_database()'),'dominion79_fixture');
 assert.match(await value("select current_setting('server_version')"),/^17\.6\b/);
 await db.query(await readFile(new URL('./checkout-plans.review.sql',import.meta.url),'utf8'));
 const fdef=await value("select pg_get_functiondef('public.fulfil_paid_stripe_checkout(text,text,uuid,text,text,text,bigint,text)'::regprocedure)");
 assert.equal(createHash('md5').update(fdef).digest('hex'),'bb9667b96e2aa3d8a557863434463294');
 const pat='^cs_live_[A-Za-z0-9]{8,}$';
 assert.equal(fdef.split(pat).length,2);
 // The original production function refuses cs_test_ by design. In the isolated
 // fixture use the same implementation with ONLY the opposite session guard.
 await db.query(fdef.replace(pat,'^cs_test_[A-Za-z0-9]{8,}$'));
 await db.query("update dominion79.lifecycle_control set mode='accepting'");
 const bom=[{type:'component',productId:item,quantity:1,snapshot:{}}];
 await db.query(`insert into public.orders(id,request_id,request_hash,reference,sales_channel,subtotal_pence,delivery_pence,total_pence,customer,delivery,items,payment_status)
  values($1,$1,repeat('a',32),$2,'WEBSITE',750,0,750,'{}','{"country":"GB"}',$3,'unpaid')`,[orderId,orderRef,JSON.stringify(bom)]);
 const initial=await transaction(async c=>{
  const order=(await c.query('select total_pence::int as amount from public.orders where id=$1 for update',[orderId])).rows[0];
  const plan=await checkoutPlans(c).save({orderId,account,currencyCode:'GBP',expectedMinor:order.amount,expiresAt:expiresAt.toISOString(),now});
  assert.equal(await asWriter(c,'select dominion79.reserve($1,$2,$3)',[orderId,'offline-stripe-82',expiresAt]),'held');
  return plan;
 });
 const base=await stock();assert.ok(base>=1);
 const snapshot={object:'checkout.session',id:session,livemode:false,client_reference_id:orderId,
  metadata:{dominion_binding:initial.binding},amount_total:amount,currency:'gbp'};
 const paid={...snapshot,status:'complete',payment_status:'paid',payment_intent:intent};
 let attempts=0;
 const attachRepo={read:plans.read,attach:async attachment=>{
  if(++attempts===1)return false;
  return transaction(async c=>{
   const order=(await c.query('select stripe_checkout_session_id from public.orders where id=$1 for update',[attachment.orderId])).rows[0];
   if(!order||(order.stripe_checkout_session_id&&order.stripe_checkout_session_id!==attachment.sessionId))return false;
   if(!await checkoutPlans(c).attach(attachment))return false;
   if(!order.stripe_checkout_session_id){
    await c.query('update public.orders set stripe_checkout_session_id=$2 where id=$1',[attachment.orderId,attachment.sessionId]);
   }
   return true;
  });
 }};
 const paymentRepo={
  bySession:plans.bySession,
  byIntent:plans.byIntent,
  applyVerified:async p=>{
   if(p.type==='payment')return transaction(async c=>{
    const order=(await c.query('select reference from public.orders where id=$1 for update',[p.orderId])).rows[0];
    const result=await asWriter(c,'select dominion79.consume($1,$2,$3,$4,$5,$6,$7,$8)',
      [p.orderId,p.account,p.id,order.reference,p.reference,p.transactionId,p.money.minor,p.money.currency.toLowerCase()]);
    if(result==='paid'||result==='duplicate'){
     const saved=await checkoutPlans(c).read(p.orderId);
     if(!await checkoutPlans(c).attachVerifiedIntent({orderId:p.orderId,binding:saved.binding,intent:p.transactionId})){
      throw Error('Verified payment could not be bound to checkout plan');
     }
    }
    return {state:result};
   });
   if(p.type==='refund'){
    const saved=await plans.read(p.orderId);
    const result=await service("select public.record_verified_stripe_refund($1,'refund.updated',$2,$3,$4,$5,'succeeded',$6,$6)",
     [p.id,p.transactionId,saved.intent,p.money.minor,p.money.currency.toLowerCase(),p.occurredAt]);
    return {state:result};
   }
   throw Error('Expiry belongs to the separate verified unwind path');
  }
 };
 const route=(type,object,id)=>handleSandboxWebhook({...signed(type,object,id),repository:paymentRepo});
 assert.deepEqual(await route('checkout.session.completed',paid,'evt_Homecoming82Paid'),{state:'review-unattached',retry:true});
 assert.equal(await stock(),base);
 const requestKeys=[];
 const reconcile=()=>reattachSandboxSession({orderId,repository:attachRepo,now:()=>now,transport:{
  createOnce:async req=>{requestKeys.push(req.idempotencyKey);return paid;},get:async()=>paid
 }});
 assert.equal((await reconcile()).state,'review-attachment-conflict');
 assert.equal((await reconcile()).state,'verified-payment');
 assert.equal(new Set(requestKeys).size,1);
 await assert.rejects(route('checkout.session.completed',{...paid,amount_total:751},'evt_Homecoming82Wrong'),/does not match/);
 assert.equal(await stock(),base);
 assert.equal(await status(),'unpaid');
 assert.deepEqual(await route('checkout.session.completed',paid,'evt_Homecoming82Paid'),{state:'paid'});
 assert.deepEqual(await route('checkout.session.completed',paid,'evt_Homecoming82Paid'),{state:'duplicate'});
 assert.equal(await stock(),base-1);
 assert.equal(await status(),'paid');
 assert.equal((await plans.byIntent(account,intent)).orderId,orderId);
 assert.equal(await value('select count(*)::int from dominion79.provenance where order_id=$1',[orderId]),1);
 const refund={object:'refund',id:'re_Homecoming82Partial',status:'succeeded',payment_intent:intent,currency:'gbp',amount:75};
 assert.deepEqual(await route('refund.updated',refund,'evt_Homecoming82Refund'),{state:'partially_refunded'});
 assert.deepEqual(await route('refund.updated',refund,'evt_Homecoming82Refund'),{state:'partially_refunded'});
 assert.equal(await value('select count(*)::int from public.stripe_refunds where order_id=$1',[orderId]),1);
 assert.equal(await stock(),base-1);
 await db.query(fdef); // Restore the exact isolated legacy fingerprint for any later checks.
 assert.equal(await value("select md5(pg_get_functiondef('public.fulfil_paid_stripe_checkout(text,text,uuid,text,text,text,bigint,text)'::regprocedure))"),'bb9667b96e2aa3d8a557863434463294');
 console.log('PASS signed synthetic Sandbox bytes through the recovered session, native exactly-once stock retirement and refund writer; production cs_live_ fingerprint restored in the fixture');
}finally{await db.end();}

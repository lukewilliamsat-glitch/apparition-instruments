import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { currency, identifier, instant, whole } from './contracts.mjs';

const maxPayload=96*1024;
const verifiedEvents=new WeakMap();
const id=(s,re,label)=>{if(typeof s!=='string'||!re.test(s))throw Error('Invalid '+label);return s;};
const sessionId=s=>id(s,/^cs_test_[A-Za-z0-9]{8,128}$/,'sandbox session');
const paymentId=s=>id(s,/^pi_[A-Za-z0-9]{8,128}$/,'sandbox intent');
const eventId=s=>id(s,/^evt_[A-Za-z0-9]{8,128}$/,'sandbox event');
const refundId=s=>id(s,/^re_[A-Za-z0-9]{8,128}$/,'sandbox refund');
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const guardTime=(time)=>Math.floor(Date.parse(instant(time))/1000);

// Server-only fixture and future sandbox contract. Never accepts live-mode objects, a browser token, or a parsed-only event.
export function verifyStripeSandboxEnvelope({rawBody,signature,secret,now,toleranceSec=300}){
 const body=Buffer.isBuffer(rawBody)?rawBody:typeof rawBody==='string'?Buffer.from(rawBody):null;
 if(!body?.length||body.length>maxPayload||typeof signature!=='string'||signature.length>4096
   ||typeof secret!=='string'||!/^whsec_[A-Za-z0-9_]{8,200}$/.test(secret))throw Error('Invalid webhook envelope');
 whole(toleranceSec,'webhook tolerance',1,300);
 const fields=signature.split(',').map(p=>p.trim().split('='));
 const t=fields.filter(a=>a[0]==='t');
 const candidates=fields.filter(k=>k[0]==='v1').map(k=>k[1]).filter(h=>/^[a-fA-F0-9]{64}$/.test(h??''));
 if(t.length!==1||!/^\d{9,12}$/.test(t[0][1]??'')||!candidates.length||candidates.length>10)throw Error('Invalid webhook signature header');
 if(Math.abs(guardTime(now)-Number(t[0][1]))>toleranceSec)throw Error('Stale webhook signature');
 const expected=createHmac('sha256',secret).update(t[0][1]+'.').update(body).digest();
 if(!candidates.some(h=>timingSafeEqual(expected,Buffer.from(h,'hex'))))throw Error('Webhook signature mismatch');
 const event=JSON.parse(body.toString('utf8'));
 eventId(event.id);
 if(event.livemode!==false||event.object!=='event'||typeof event.type!=='string')throw Error('Only genuine-shaped sandbox envelopes are accepted');
 whole(event.created,'event timestamp',1,4102444800);
 const proof=Object.freeze({id:event.id,type:event.type});
 verifiedEvents.set(proof,event);return proof;
}

function correlation(saved,object){
 const c=currency(saved.currency),value=whole(saved.expectedMinor,'stored amount',1);
 if(sessionId(object.id)!==saved.sessionId||object.livemode!==false
   ||object.client_reference_id!==saved.orderId||object.metadata?.dominion_binding!==saved.binding
   ||object.amount_total!==value||typeof object.currency!=='string'||object.currency.toUpperCase()!==c)
  throw Error('Session does not match saved checkout');
 return {currency:c,minor:value};
}

export function sandboxPaymentPolicy(proof,saved){
 const event=verifiedEvents.get(proof);
 if(!event)throw Error('Verified sandbox envelope required');
 if(event.livemode!==false||event.account&&event.account!==saved.account)throw Error('Wrong sandbox account');
 const object=event.data?.object;
 const at=new Date(event.created*1000).toISOString(),base={verified:true,account:saved.account,orderId:saved.orderId,
  reference:saved.sessionId,id:eventId(event.id),occurredAt:at};
 if(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.expired'].includes(event.type)){
  if(object?.object!=='checkout.session')throw Error('Unexpected checkout object');
  const money=correlation(saved,object);
  if(event.type==='checkout.session.expired'){
   if(object.status!=='expired'||object.payment_status!=='unpaid')throw Error('Session expiry cannot prove nonpayment');
   return {...base,type:'cancel',transactionId:object.id,providerDisposition:'expired-unpaid'};
  }
  if(object.payment_status!=='paid'||object.status!=='complete')return null; // wait for confirmed payment
  return {...base,type:'payment',transactionId:paymentId(object.payment_intent),money};
 }
 if(event.type==='refund.created'||event.type==='refund.updated'){
  if(object?.object!=='refund'||object.status!=='succeeded')return null;
  if(!saved.intent||paymentId(object.payment_intent)!==saved.intent)throw Error('Refund is not linked to the captured payment');
  return {...base,type:'refund',transactionId:refundId(object.id),money:{currency:currency(object.currency.toUpperCase()),minor:whole(object.amount,'refund',1)}};
 }
 return null;
}

// Store this plan before the first network call. It excludes buyer details and pins the exact one-use provider request.
export function prepareSandboxCheckout({orderId,account,currencyCode,expectedMinor,expiresAt,now}){
 identifier(orderId,'order ID');identifier(account,'account');
 currency(currencyCode);whole(expectedMinor,'stored amount',1);
 const expiration=guardTime(expiresAt),start=guardTime(now);
 if(expiration-start<35*60||expiration-start>2*3600)throw Error('Checkout expiry outside permitted fixture window');
 const binding=digest([orderId,account,currencyCode,expectedMinor,expiration]);
 const idempotencyKey='apparition79/'+binding;
 return Object.freeze({orderId,account,currency:currencyCode,expectedMinor,expiration,binding,idempotencyKey,sessionId:null});
}

// repository.read is a bounded read; attach performs compare-and-swap on the binding and must be idempotent.
export async function reconcileSandboxSession({orderId,repository,transport,now}){
 identifier(orderId);
 if(typeof repository?.read!=='function'||typeof repository?.attach!=='function'||typeof transport?.createOnce!=='function'||typeof transport?.get!=='function')throw Error('Missing isolated correlation adapter');
 const row=await repository.read(orderId);
 if(!row||row.orderId!==orderId||row.mode!=='sandbox')throw Error('Missing saved sandbox checkout');
 const fingerprint=digest([row.orderId,row.account,row.currency,row.expectedMinor,row.expiration]);
 if(row.binding!==fingerprint||row.idempotencyKey!=='apparition79/'+fingerprint)throw Error('Saved checkout plan changed');
 let object;
 try{
  if(row.sessionId)object=await transport.get({sessionId:sessionId(row.sessionId),account:row.account});
  else{
   const last=guardTime(now());
   if(row.expiration-last<30*60)return {state:'review-missing-attachment',release:false};
   object=await transport.createOnce({idempotencyKey:row.idempotencyKey,account:row.account,orderId:row.orderId,
    expectedMinor:row.expectedMinor,currency:row.currency.toLowerCase(),expiresAt:row.expiration,metadata:{dominion_binding:row.binding}});
  }
 }catch{return {state:'review-provider-unavailable',release:false};}
 const saved={...row,sessionId:row.sessionId??sessionId(object?.id)};
 correlation(saved,object);
 if(!row.sessionId&&!await repository.attach({orderId,binding:row.binding,sessionId:saved.sessionId}))
  return {state:'review-attachment-conflict',release:false};
 if(object.status==='expired'&&object.payment_status==='unpaid')return {state:'verified-expiry',sessionId:saved.sessionId,release:true};
 if(object.status==='complete'&&object.payment_status==='paid')return {state:'verified-payment',sessionId:saved.sessionId,intent:paymentId(object.payment_intent),release:false};
 if(!['complete','open','expired'].includes(object.status))return {state:'review-provider-status',release:false};
 return {state:'awaiting-provider',sessionId:saved.sessionId,release:false};
}

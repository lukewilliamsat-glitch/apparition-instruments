import {providerJSON} from './provider-json.mjs';
import {identifier,whole} from '../dominion78c/contracts.mjs';
import {reconcileSandboxSession,verifyStripeSandboxEnvelope,sandboxPaymentPolicy} from '../dominion78c/stripe79.mjs';

const origin='https://api.stripe.com';
const session=x=>typeof x==='string'&&/^cs_test_[A-Za-z0-9]{8,128}$/.test(x);
const intent=x=>typeof x==='string'&&/^pi_[A-Za-z0-9]{8,128}$/.test(x);
function target(v){
 const u=new URL(v);
 // Harness only: a local HTTP service or a deliberately private, non-production HTTPS preview.
 if(u.username||u.password||u.port&&u.protocol==='https:'||u.search||u.hash||
   !(u.protocol==='http:'&&u.hostname==='127.0.0.1'||
    u.protocol==='https:'&&u.hostname==='apparition-phoenix-preview.pages.dev'))throw Error('Non-production checkout return required');
 return u.origin;
}

export function stripeSandboxTransport({key,account,returnOrigin,fetcher,apiVersion='2025-02-24.acacia'}){
 if(!/^(sk|rk)_test_[A-Za-z0-9]{8,}$/.test(key??'')||!/^acct_[A-Za-z0-9]{8,64}$/.test(account??'')||
  !/^\d{4}-\d{2}-\d{2}\.[a-z]+$/.test(apiVersion))throw Error('Dedicated Stripe Sandbox credentials required');
 const preview=target(returnOrigin);
 const send=providerJSON((u,method)=>u.origin===origin&&!u.search&&(
  method==='GET'&&(u.pathname==='/v1/account'||u.pathname.startsWith('/v1/checkout/sessions/')&&session(u.pathname.split('/').at(-1)))||
  method==='POST'&&u.pathname==='/v1/checkout/sessions'),fetcher);
 const headers={Authorization:'Bearer '+key,'Stripe-Version':apiVersion};
 async function api(path,method,extra,body){
  const response=await send({url:origin+path,method,headers:{...headers,...extra},body,timeoutMs:6500,maxBytes:50000});
  if(response.status!==200)throw Error('Stripe Sandbox request requires review');
  return response.body;
 }
 let identity;
 async function ensureAccount(wanted){
  if(wanted!==account)throw Error('Wrong Stripe Sandbox account');
  identity??=api('/v1/account','GET').then(x=>{
   if(x?.object!=='account'||x?.id!==account)throw Error('Stripe Sandbox key belongs to the wrong account');
  }).catch(err=>{identity=undefined;throw err;});
  await identity;
 }
 function safeObject(x){
  if(x?.object!=='checkout.session'||x.livemode!==false||!session(x.id))throw Error('Unexpected Stripe Sandbox session');
  const checkoutURL=x.url===null||x.url===undefined?null:new URL(x.url);
  if(checkoutURL&&(checkoutURL.origin!=='https://checkout.stripe.com'||checkoutURL.username||checkoutURL.password||
   !checkoutURL.pathname.startsWith('/c/pay/cs_test_')))throw Error('Unexpected hosted Sandbox checkout URL');
  return {id:x.id,object:x.object,livemode:false,client_reference_id:x.client_reference_id,metadata:{dominion_binding:x.metadata?.dominion_binding},
   amount_total:x.amount_total,currency:x.currency,payment_status:x.payment_status,status:x.status,payment_intent:x.payment_intent,url:checkoutURL?.href??null};
 }
 return {
  async get({sessionId,account}){
   if(!session(sessionId))throw Error('Non-Sandbox session ID');
   await ensureAccount(account);
   return safeObject(await api('/v1/checkout/sessions/'+sessionId,'GET'));
  },
  async createOnce({idempotencyKey,account,orderId,expectedMinor,currency,expiresAt,metadata}){
   identifier(orderId,'saved order');whole(expectedMinor,'saved total',1,100000000);whole(expiresAt,'planned expiry',1,4102444800);
   if(currency!=='gbp'||!/^apparition79\/[a-f0-9]{64}$/.test(idempotencyKey??'')||
    metadata?.dominion_binding!==idempotencyKey.slice('apparition79/'.length))throw Error('Invalid saved Sandbox session plan');
   await ensureAccount(account);
   const form=new URLSearchParams({mode:'payment','payment_method_types[0]':'card',expires_at:String(expiresAt),client_reference_id:orderId,
    success_url:preview+'/checkout/success/?session_id={CHECKOUT_SESSION_ID}',cancel_url:preview+'/checkout/',
    'metadata[dominion_binding]':metadata.dominion_binding,'line_items[0][quantity]':'1',
    'line_items[0][price_data][currency]':currency,'line_items[0][price_data][unit_amount]':String(expectedMinor),
    'line_items[0][price_data][product_data][name]':'Apparition sandbox checkout'});
   return safeObject(await api('/v1/checkout/sessions','POST',{'Idempotency-Key':idempotencyKey,'Content-Type':'application/x-www-form-urlencoded'},form.toString()));
  }
 };
}

export function checkoutRoute({mode,hasPlan,hasHold,hasSession}){
 if([hasPlan,hasHold,hasSession].some(v=>typeof v!=='boolean'))throw Error('Unknown order lifecycle');
 if(!['paused','draining','accepting'].includes(mode))throw Error('Unknown checkout mode');
 if(hasPlan||hasHold||hasSession)return 'resume-or-review';
 return mode==='accepting'?'reserve-first':'legacy';
}
export const reattachSandboxSession=reconcileSandboxSession;

// The repository owns uniqueness and commits the payment and stock mutation together.
// A verified event without a durable attachment is retryable or auditable, never a release.
export async function handleSandboxWebhook({rawBody,signature,secret,now,account,repository}){
 const proof=verifyStripeSandboxEnvelope({rawBody,signature,secret,now});
 const event=JSON.parse(rawBody.toString());
 const x=event.data?.object;
 if(event.account&&event.account!==account)throw Error('Wrong Stripe Sandbox account');
 const checkout=['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.expired','checkout.session.async_payment_failed'].includes(event.type);
 const refund=['refund.created','refund.updated'].includes(event.type);
 if(!checkout&&!refund)return {state:'ignored'};
 if(checkout&&!session(x?.id)||refund&&!intent(x?.payment_intent))throw Error('Invalid event identity');
 const saved=checkout?await repository.bySession(account,x.id):await repository.byIntent(account,x.payment_intent);
 if(!saved||saved.mode!=='sandbox'||saved.account!==account)return {state:'review-unattached',retry:true};
 if(event.type==='checkout.session.async_payment_failed')return {state:'review-failed-payment',release:false};
 const policy=sandboxPaymentPolicy(proof,saved);
 if(!policy)return {state:'awaiting-provider',release:false};
 if(policy.type==='refund'&&(policy.money.currency!==saved.currency||policy.money.minor>saved.expectedMinor))throw Error('Refund does not match captured payment');
 return repository.applyVerified(policy);
}

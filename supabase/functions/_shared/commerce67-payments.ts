type Environment={get:(key:string)=>string|undefined};
type Requester=typeof fetch;
export type PaymentOrder={id:string;reference:string;amount:number;currency:string;sessionId:string|null;state:string;dispatch:string;expiresAt:number;createdAt:number};
const api='https://api.stripe.com/v1/checkout/sessions';
const idPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function orderId(value:unknown){return typeof value==='string'&&idPattern.test(value);}
function sessionId(value:unknown){return typeof value==='string'&&/^cs_live_[A-Za-z0-9]{8,}$/.test(value);}
function parsedCheckoutURL(value:unknown){
 if(typeof value!=='string')return null;
 try{const url=new URL(value);return url.origin==='https://checkout.stripe.com'&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
export async function paymentRPC(env:Environment,request:Requester,name:string,body:object){
 const base=env.get('SUPABASE_URL'),service=env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!base||!service)throw Error('Payment database unavailable.');
 const r=await request(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(7000),redirect:'error'});
 if(!r.ok)throw Error('Payment state could not be verified.');
 return await r.json();
}
export async function paymentStatus(env:Environment,request:Requester,id:string):Promise<PaymentOrder|null>{
 if(!orderId(id))throw Error('Invalid order identity.');
 const row=await paymentRPC(env,request,'commerce67_payment_status',{p_order:id});
 if(row===null)return null;
 if(row?.id!==id||!/^AI-\d+$/.test(row.reference??'')||row.currency!=='gbp'||!Number.isSafeInteger(row.amount)||row.amount<=0||
  !Number.isSafeInteger(row.expiresAt)||!Number.isSafeInteger(row.createdAt)||!['open','paid','expired'].includes(row.state)||
  !['new','sending','linked'].includes(row.dispatch)||(row.sessionId!==null&&!sessionId(row.sessionId)))throw Error('Invalid payment record.');
 return row;
}
export function verifiedProviderSession(value:any,row:Pick<PaymentOrder,'id'|'reference'|'amount'|'currency'>){
 if(value?.livemode!==true||value.object!=='checkout.session'||value.mode!=='payment'||!sessionId(value.id)||
  value.metadata?.order_id!==row.id||value.metadata?.order_reference!==row.reference||value.client_reference_id!==row.reference||
  value.amount_total!==row.amount||value.currency!==row.currency)return null;
 if(value.status==='expired'&&value.payment_status==='unpaid')return 'expired';
 if(value.status==='complete'&&value.payment_status==='paid'&&/^pi_[A-Za-z0-9]{8,}$/.test(value.payment_intent??''))return 'paid';
 if(value.status==='open'&&value.payment_status==='unpaid')return 'open';
 if(value.status==='complete'&&value.payment_status==='unpaid')return 'pending';
 return null;
}
export async function observeProvider(env:Environment,request:Requester,value:any){
 const id=value?.metadata?.order_id;
 if(!orderId(id)||!/^AI-\d+$/.test(value?.client_reference_id??'')||!Number.isSafeInteger(value?.amount_total)||value.amount_total<=0||value.currency!=='gbp')
  throw Error('Provider observation lacks a valid order or amount.');
 const row={id,reference:value.client_reference_id,amount:value.amount_total,currency:value.currency};
 const state=verifiedProviderSession(value,row);
 if(!state)throw Error('Provider observation did not pass correlation.');
 return await paymentRPC(env,request,'commerce67_payment_observe',{p_order:id,p_session:value.id,p_reference:row.reference,p_amount:row.amount,p_currency:row.currency,p_state:state});
}
async function provider(env:Environment,request:Requester,url:string,form?:string,order?:string){
 const secret=env.get('STRIPE_SECRET_KEY');
 if(!secret||!/^(?:rk|sk)_live_[A-Za-z0-9]+$/.test(secret))throw Error('Stripe provider unavailable.');
 const r=await request(url,{redirect:'error',signal:AbortSignal.timeout(9000),...(form!==undefined?{method:'POST',body:form}:{}),
  headers:{Authorization:'Bearer '+secret,...(form!==undefined?{'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':'apparition-'+order}:{})}});
 if(!r.ok)throw Error('Stripe outcome unconfirmed.');
 return await r.json();
}
export async function secureSentinelCheckout(env:Environment,request:Requester,row:PaymentOrder,form:URLSearchParams){
 if(row.state!=='open')return null;
 let session;
 if(row.sessionId){
  session=await provider(env,request,api+'/'+row.sessionId);
  if(session.id!==row.sessionId)return null;
 }else{
  form.set('expires_at',String(row.expiresAt));
  const actual=form.toString();
  const claimed=await paymentRPC(env,request,'commerce67_payment_claim',{p_order:row.id,p_body:actual});
  if(claimed?.body!==actual)return null;
  session=await provider(env,request,api,actual,row.id);
 }
 if(verifiedProviderSession(session,row)!=='open')return null;
 const status=await observeProvider(env,request,session);
 return status==='linked'?parsedCheckoutURL(session.url):null;
}
export async function reconcilePayment(env:Environment,request:Requester,id:string,hint?:string,allowNeverSent=false){
 const row=await paymentStatus(env,request,id);
 if(!row)return 'not_found';
 if(row.state!=='open')return row.state;
 if(row.dispatch==='new'){
  if(!allowNeverSent)return 'never_sent_unreleased';
  return await paymentRPC(env,request,'commerce67_abandon_never_sent',{p_order:id})?'released_never_sent':'never_sent_unreleased';
 }
 if(hint&&!sessionId(hint))return 'unconfirmed';
 const key=row.sessionId??hint;
 let verified;
 if(key){
  verified=await provider(env,request,api+'/'+key);
  if(verified.id!==key||!verifiedProviderSession(verified,row))return 'unconfirmed';
 }else{
  // Recovery must not create a checkout on the customer's behalf. Discover
  // recent provider sessions within the exact dispatch interval, at most 100.
  const hits=[];
  let cursor=null,more=false;
  for(let page=0;page<2;page++){
   const query=new URLSearchParams({limit:'50','created[gte]':String(row.createdAt-5),
    'created[lte]':String(row.createdAt+150),...(cursor?{starting_after:cursor}:{})});
   const list=await provider(env,request,api+'?'+query);
   if(!Array.isArray(list.data)||list.data.length>50||typeof list.has_more!=='boolean')return 'unconfirmed';
   hits.push(...list.data.filter((x:any)=>x?.metadata?.order_id===row.id));
   more=list.has_more;
   if(!more)break;
   cursor=list.data.at(-1)?.id;
   if(!sessionId(cursor))return 'unconfirmed';
  }
  if(more||hits.length!==1||!sessionId(hits[0]?.id))return 'unconfirmed';
  verified=await provider(env,request,api+'/'+hits[0].id);
  if(verified.id!==hits[0].id||!verifiedProviderSession(verified,row))return 'unconfirmed';
 }
 // A verified complete paid session is attached only. Stripe must resend the
 // signed paid event to use the existing fulfilment/payment boundary.
 return await observeProvider(env,request,verified);
}
export async function verifiedGuestProof(env:Environment,request:Requester,token:unknown){
 const secret=env.get('COMMERCE67_TURNSTILE_SECRET');
 if(!secret||typeof token!=='string'||!token||token.length>2048)return false;
 try{
  const r=await request('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',redirect:'error',signal:AbortSignal.timeout(4500),
   headers:{'Content-Type':'application/json'},body:JSON.stringify({secret,response:token})});
  if(!r.ok)return false;
  const proof=await r.json();
  return proof.success===true&&proof.hostname==='apparitioninstruments.co.uk'&&proof.action==='commerce_checkout';
 }catch{return false;}
}

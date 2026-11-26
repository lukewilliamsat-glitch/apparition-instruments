// Server-only orchestration. The caller must first validate the saved order,
// customer/guest ownership, basket, delivery and store availability.
export async function reservedSession({database,serviceKey,stripeKey,order,ownerKey,form,live,request=fetch}) {
 const target=live?'https://acdxpxvksvdwfajntzfx.supabase.co':'https://prwmowexhonguvtiywsy.supabase.co';
 const account=live?'acct_1UJUR9I4E9fIeEmD':'acct_1UJURLIeVWpsCl5X';
 const prefix=live?'cs_live_':'cs_test_';
 if(database!==target||!serviceKey||typeof live!=='boolean'||
  !(live?/^(sk|rk)_live_[A-Za-z0-9]+$/:/^(sk|rk)_test_[A-Za-z0-9]+$/).test(stripeKey)||
  !/^[0-9a-f-]{36}$/i.test(order?.id||'')||!Number.isSafeInteger(order.total_pence)||order.total_pence<1||
  !/^[A-Za-z0-9:_-]{1,96}$/.test(ownerKey||'')||!(form instanceof URLSearchParams))throw Error('Checkout configuration needs review.');
 const call=async(url,options)=>{
  const response=await request(url,{...options,signal:AbortSignal.timeout(15000)});
  const text=await response.text();
  if(!response.ok||text.length>150000)throw Error('Secure checkout needs reconciliation. Retry the same basket.');
  try{return JSON.parse(text);}catch{throw Error('Secure checkout returned an invalid response.');}
 };
 const stripeHeaders={Authorization:'Bearer '+stripeKey,'Stripe-Version':'2025-02-24.acacia'};
 // A key with the wrong account must not reserve stock or create a Session.
 const identity=await call('https://api.stripe.com/v1/account',{headers:stripeHeaders});
 if(identity.id!==account)throw Error('Checkout provider account needs review.');
 const rpc=(name,body)=>call(database+'/rest/v1/rpc/'+name,{method:'POST',headers:{
  apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const plan=await rpc('convergence92_prepare',{p_order:order.id,p_owner:ownerKey,p_expiration:Math.floor(Date.now()/1000)+2700});
 if(plan?.orderId!==order.id||plan.account!==account||plan.currency!=='GBP'||plan.expectedMinor!==order.total_pence||
  plan.mode!==(live?'live':'sandbox')||!/^[a-f0-9]{64}$/.test(plan.binding||'')||
  plan.idempotencyKey!=='apparition79/'+plan.binding||!Number.isSafeInteger(plan.expiration)||
  plan.sessionId!==null&&!(typeof plan.sessionId==='string'&&plan.sessionId.startsWith(prefix)))throw Error('Saved checkout plan needs review.');
 let session;
 if(plan.sessionId){
  session=await call('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(plan.sessionId),{headers:stripeHeaders});
 }else{
  if(plan.expiration-Math.floor(Date.now()/1000)<1800)throw Error('Checkout deadline needs reconciliation.');
  const body=new URLSearchParams(form);
  body.set('client_reference_id',order.id);
  body.set('metadata[dominion_binding]',plan.binding);
  body.set('expires_at',String(plan.expiration));
  session=await call('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{...stripeHeaders,
   'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':plan.idempotencyKey},body});
 }
 let host;try{host=new URL(session.url).hostname;}catch{}
 if(typeof session.id!=='string'||!new RegExp('^'+prefix+'[A-Za-z0-9]{8,128}$').test(session.id)||
  plan.sessionId!==null&&session.id!==plan.sessionId||session.livemode!==live||
  !['checkout.stripe.com',...(!live?['checkout.stripe.dev']:[])].includes(host)||!session.url.startsWith('https://')||
  session.amount_total!==plan.expectedMinor||session.currency!=='gbp'||session.client_reference_id!==order.id||
  session.metadata?.dominion_binding!==plan.binding||session.expires_at!==plan.expiration||session.status!=='open')
  throw Error('Checkout session needs reconciliation.');
 if(await rpc('convergence92_attach',{p_order:order.id,p_binding:plan.binding,p_session:session.id})!==true)
  throw Error('Checkout attachment needs reconciliation.');
 return {url:session.url,reference:order.reference,totalPence:order.total_pence};
}

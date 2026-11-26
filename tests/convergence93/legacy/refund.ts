// A signed refund event selects a Refund. Its current state is fetched from
// Stripe using the server-side LIVE key before the service-only database write.
type Environment={get:(name:string)=>string|undefined};
export async function recordStripeRefund(event:any,env:Environment,request:typeof fetch=fetch):Promise<boolean>{
 const candidate=event?.data?.object;
 if(event?.livemode!==true||!['refund.created','refund.updated','refund.failed'].includes(event?.type)
  ||!/^evt_[A-Za-z0-9]{8,}$/.test(event?.id||'')
  ||candidate?.object!=='refund'||!/^re_[A-Za-z0-9]{8,}$/.test(candidate?.id||''))return false;
 const url=env.get('SUPABASE_URL'),service=env.get('SUPABASE_SERVICE_ROLE_KEY'),stripeKey=env.get('STRIPE_SECRET_KEY');
 if(!url||!service||!stripeKey)return false;
 const observedAt=new Date().toISOString();
 const stripe=await request('https://api.stripe.com/v1/refunds/'+encodeURIComponent(candidate.id),{
  headers:{Authorization:'Bearer '+stripeKey}});
 if(!stripe.ok)return false;
 const refund=await stripe.json();
 if(refund?.object!=='refund'||refund.id!==candidate.id
  ||!/^pi_[A-Za-z0-9]{8,}$/.test(refund.payment_intent||'')
  ||(candidate.payment_intent&&candidate.payment_intent!==refund.payment_intent)
  ||!Number.isSafeInteger(refund.amount)||refund.amount<1||refund.currency!=='gbp'
  ||!['pending','requires_action','succeeded','failed','canceled'].includes(refund.status)
  ||!Number.isSafeInteger(refund.created)||refund.created<1)return false;
 const db=await request(url+'/rest/v1/rpc/record_verified_stripe_refund',{
  method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},
  body:JSON.stringify({p_event_id:event.id,p_event_type:event.type,p_refund_id:refund.id,
   p_payment_intent_id:refund.payment_intent,p_amount:refund.amount,p_currency:refund.currency,
   p_status:refund.status,p_created_at:new Date(refund.created*1000).toISOString(),p_observed_at:observedAt})});
 return db.ok;
}

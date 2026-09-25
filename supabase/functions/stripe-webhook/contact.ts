// Only details supplied by a paid LIVE Stripe Session are eligible.
const bounded=(value:unknown,max=300)=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=max?value.trim():null;
export function contactFromStripeSession(session:any){
 const customer=session?.customer_details;
 const shipping=session?.collected_information?.shipping_details??session?.shipping_details;
 const address=shipping?.address;
 const name=bounded(customer?.name),email=bounded(customer?.email);
 const recipient=bounded(shipping?.name),line1=bounded(address?.line1);
 const line2=typeof address?.line2==='string'?address.line2.trim():'';
 const city=bounded(address?.city),postcode=bounded(address?.postal_code,30);
 if(session?.livemode!==true||session?.payment_status!=='paid'||!name||!email
  ||!/^\S+@\S+\.\S+$/.test(email)||!recipient||!line1||!city||!postcode
  ||address?.country!=='GB'||line2.length>300)return null;
 return {customer:{name,email},delivery:{recipient,line1,...line2?{line2}:{},city,postcode,country:'GB'}};
}
export async function storeVerifiedContact(session:any,env:{get:(key:string)=>string|undefined},request:typeof fetch=fetch){
 const data=contactFromStripeSession(session);
 if(!data)return false;
 const url=env.get('SUPABASE_URL'),service=env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!service)return false;
 const response=await request(url+'/rest/v1/rpc/save_stripe_order_contact',{
  method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},
  body:JSON.stringify({p_order_id:session.metadata.order_id,p_reference:session.client_reference_id,
   p_session_id:session.id,p_payment_intent_id:session.payment_intent,
   p_customer:data.customer,p_delivery:data.delivery})});
 return response.ok;
}

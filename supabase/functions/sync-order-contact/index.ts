// Admin-only repair for an existing paid Order. Fetches Stripe's LIVE Session
// server-side; never returns customer data or changes payment or stock.
import {storeVerifiedContact} from '../stripe-webhook/contact.ts';
const origin='https://apparitioninstruments.co.uk';
const response=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Vary':'Origin'}});
type Environment={get:(name:string)=>string|undefined};
export async function syncOrderContact(req:Request,env:Environment=Deno.env,request:typeof fetch=fetch){
 if(req.headers.get('origin')&&req.headers.get('origin')!==origin)return response(403,'Origin unavailable');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'apikey, authorization, content-type','Vary':'Origin'}});
 if(req.method!=='POST')return response(405,'Method unavailable');
 const token=/^Bearer (\S+)$/.exec(req.headers.get('Authorization')||'')?.[1];
 const url=env.get('SUPABASE_URL'),publicKey=env.get('SUPABASE_ANON_KEY'),service=env.get('SUPABASE_SERVICE_ROLE_KEY'),stripeKey=env.get('STRIPE_SECRET_KEY');
 if(!token||!url||!publicKey||!service||!stripeKey)return response(401,'Admin authorization required');
 const authHeaders={apikey:publicKey,Authorization:'Bearer '+token};
 const identity=await request(url+'/auth/v1/user',{headers:authHeaders});
 if(!identity.ok)return response(403,'Admin authorization required');
 const user=await identity.json();if(!/^[a-f\d-]{36}$/i.test(user?.id||''))return response(403,'Admin authorization required');
 const membership=await request(url+'/rest/v1/admin_members?user_id=eq.'+encodeURIComponent(user.id)+'&select=user_id',{headers:authHeaders});
 if(!membership.ok||(await membership.json())?.[0]?.user_id!==user.id)return response(403,'Admin authorization required');
 let input:any;try{input=await req.json();}catch{return response(400,'Invalid Order request');}
 if(!/^AI-\d+$/.test(input?.reference||''))return response(400,'Invalid Order reference');
 const orderResponse=await request(url+'/rest/v1/orders?reference=eq.'+encodeURIComponent(input.reference)+'&select=id,reference,status,payment_status,stripe_checkout_session_id,stripe_payment_intent_id,total_pence',{headers:{apikey:service,Authorization:'Bearer '+service}});
 if(!orderResponse.ok)return response(503,'Order unavailable');
 const order=(await orderResponse.json())?.[0];
 if(!order||order.status!=='pending'||order.payment_status!=='paid'||!/^cs_live_[A-Za-z0-9]{8,}$/.test(order.stripe_checkout_session_id||'')||!/^pi_[A-Za-z0-9]{8,}$/.test(order.stripe_payment_intent_id||''))return response(409,'Paid Order unavailable');
 const stripe=await request('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(order.stripe_checkout_session_id),{headers:{Authorization:'Bearer '+stripeKey}});
 if(!stripe.ok)return response(503,'Stripe Session unavailable for contact sync');
 const session=await stripe.json();
 if(session?.id!==order.stripe_checkout_session_id||session?.client_reference_id!==order.reference
  ||session?.metadata?.order_id!==order.id||session?.metadata?.order_reference!==order.reference
  ||session?.payment_intent!==order.stripe_payment_intent_id||session?.amount_total!==order.total_pence
  ||session?.currency!=='gbp'||session?.livemode!==true||session?.payment_status!=='paid')return response(409,'Stripe Session does not match paid Order');
 if(!await storeVerifiedContact(session,env,request))return response(503,'Stripe customer or shipping details unavailable');
 return response(200,'Verified Stripe customer and delivery details saved');
}
if(import.meta.main)Deno.serve(req=>syncOrderContact(req));

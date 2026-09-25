// P07B.2A receiver. Stripe owns payment status; only this signed, live-mode path
// can ask the service-only database function to apply inventory fulfilment.
type Environment={get:(name:string)=>string|undefined};
const reply=(status:number,body:string)=>new Response(body,{status,headers:{'Content-Type':'text/plain; charset=utf-8'}});
const sameBytes=(a:Uint8Array,b:Uint8Array)=>{
 if(a.length!==b.length)return false;
 let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];return difference===0;
};
export async function verifyStripeSignature(raw:Uint8Array,header:string|null,secret:string,now=Date.now()){
 const pieces=(header||'').split(',').map(piece=>piece.trim());
 const time=pieces.find(piece=>/^t=\d+$/.test(piece))?.slice(2);
 const signatures=pieces.filter(piece=>/^v1=[a-fA-F0-9]{64}$/.test(piece)).map(piece=>piece.slice(3));
 if(!time||!signatures.length||!/^whsec_\S+$/.test(secret))return false;
 const timestamp=Number(time);
 if(!Number.isSafeInteger(timestamp)||Math.abs(Math.floor(now/1000)-timestamp)>300)return false;
 const prefix=new TextEncoder().encode(time+'.');
 const signed=new Uint8Array(prefix.length+raw.length);signed.set(prefix);signed.set(raw,prefix.length);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,signed));
 return signatures.some(hex=>sameBytes(digest,Uint8Array.from(hex.match(/../g)!,byte=>parseInt(byte,16))));
}
export async function receiveStripeWebhook(req:Request,env:Environment=Deno.env,request:typeof fetch=fetch,now=Date.now()):Promise<Response>{
 if(req.method!=='POST')return reply(405,'Method not allowed');
 const secret=env.get('STRIPE_WEBHOOK_SECRET'),url=env.get('SUPABASE_URL'),service=env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!secret||!url||!service)return reply(503,'Webhook is not configured');
 const raw=new Uint8Array(await req.arrayBuffer());
 if(raw.length>200000)return reply(413,'Webhook payload too large');
 if(!await verifyStripeSignature(raw,req.headers.get('Stripe-Signature'),secret,now))return reply(401,'Invalid Stripe signature');
 let event:any;try{event=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{return reply(400,'Invalid Stripe event');}
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event?.type))return reply(200,'Event ignored');
 const session=event?.data?.object;
 if(event.livemode!==true||session?.livemode!==true||session?.object!=='checkout.session'
   ||!/^evt_[A-Za-z0-9]{8,}$/.test(event.id||'')
   ||!/^cs_live_[A-Za-z0-9]{8,}$/.test(session.id||''))return reply(400,'Invalid live Checkout event');
 if(session.payment_status!=='paid')return reply(200,'Payment not yet paid');
 if(session.status!=='complete'||session.mode!=='payment'
  ||!/^pi_[A-Za-z0-9]{8,}$/.test(session.payment_intent||'')
  ||!Number.isSafeInteger(session.amount_total)||session.amount_total<=0
  ||session.currency!=='gbp'||!/^AI-\d+$/.test(session.client_reference_id||'')
  ||!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(session.metadata?.order_id||'')
  ||session.metadata?.order_reference!==session.client_reference_id)return reply(400,'Checkout reference is invalid');
 const response=await request(url+'/rest/v1/rpc/fulfil_paid_stripe_checkout',{
  method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},
  body:JSON.stringify({p_event_id:event.id,p_event_type:event.type,p_order_id:session.metadata.order_id,
   p_reference:session.client_reference_id,p_session_id:session.id,
   p_payment_intent_id:session.payment_intent,p_amount:session.amount_total,p_currency:session.currency})});
 if(!response.ok)return reply(503,'Order fulfilment could not be confirmed');
 return reply(200,'Payment received');
}
if(import.meta.main)Deno.serve(req=>receiveStripeWebhook(req));

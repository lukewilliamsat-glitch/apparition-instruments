import {startCheckout} from './checkout/index.ts';
const stage='https://prwmowexhonguvtiywsy.supabase.co';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(Deno.env.get('SUPABASE_URL')!==stage)return reply({code:'STAGE_REQUIRED'},503);
 if(req.method!=='POST')return reply({code:'POST_REQUIRED'},405);
 let body:any;try{const text=await req.text();if(text.length>8192)throw Error();body=JSON.parse(text);}catch{return reply({code:'INVALID_REQUEST'},400);}
 let key=Deno.env.get('STRIPE_SANDBOX_SECRET_KEY')??Deno.env.get('STRIPE_SECRET_KEY');
 if(!key){
  try{
   const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
   const r=await fetch(stage+'/rest/v1/rpc/convergence93_test_credential',{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});
   if(!r.ok)return reply({code:'TEST_CREDENTIAL_UNAVAILABLE'},503);
   key=await r.json();
  }catch{return reply({code:'TEST_CREDENTIAL_UNAVAILABLE'},503);}
 }
 if(typeof key!=='string'||!/^(sk|rk)_test_[A-Za-z0-9_]{8,512}$/.test(key))return reply({code:'TEST_KEY_REQUIRED'},503);
 if(body?.action==='readiness'){
  try{
   const r=await fetch('https://api.stripe.com/v1/account',{headers:{Authorization:'Bearer '+key,'Stripe-Version':'2025-02-24.acacia'},signal:AbortSignal.timeout(10000)});
   if(!r.ok)return reply({code:'PROVIDER_AUTH',http:r.status},503);
   const account=await r.json();
   return account.id==='acct_1UJURLIeVWpsCl5X'?reply({configured:true,account:'acct_1UJURLIeVWpsCl5X',live:false}):reply({code:'ACCOUNT_MISMATCH'},503);
  }catch{return reply({code:'PROVIDER_UNAVAILABLE'},503);}
 }
 if(body?.action==='expire'){
  if(typeof body.order!=='string'||!/^[a-f0-9-]{36}$/.test(body.order))return reply({code:'FIXTURE_ONLY'},403);
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const r=await fetch(stage+'/rest/v1/orders?id=eq.'+body.order+'&select=id,request_id,items,stripe_checkout_session_id',
   {headers:{apikey:service,Authorization:'Bearer '+service},signal:AbortSignal.timeout(10000)});
  const rows=await r.json();const order=rows?.[0];
  if(!r.ok||rows.length!==1||!order.request_id?.startsWith('93100000-')||order.items?.length!==1||order.items[0].productId!=='fixture93-checkout'||
   !/^cs_test_[A-Za-z0-9]+$/.test(order.stripe_checkout_session_id||''))return reply({code:'FIXTURE_ONLY'},403);
  const headers={Authorization:'Bearer '+key,'Stripe-Version':'2025-02-24.acacia'};
  const url='https://api.stripe.com/v1/checkout/sessions/'+order.stripe_checkout_session_id;
  const current=await fetch(url,{headers,signal:AbortSignal.timeout(10000)});const session=await current.json();
  if(!current.ok||session.livemode!==false||session.client_reference_id!==order.id||session.payment_status!=='unpaid')return reply({code:'PROVIDER_STATE_CONFLICT'},409);
  if(session.status==='expired')return reply({session:session.id,status:'expired',existing:true});
  if(session.status!=='open')return reply({code:'PROVIDER_STATE_CONFLICT'},409);
  const expired=await fetch(url+'/expire',{method:'POST',headers,signal:AbortSignal.timeout(10000)});const result=await expired.json();
  if(!expired.ok||result.status!=='expired'||result.livemode!==false)return reply({code:'EXPIRY_UNCERTAIN',http:expired.status},503);
  return reply({session:result.id,status:result.status});
 }
 // The deployed rehearsal accepts synthetic SKU 93 only. The ordinary saved
 // order validator, reservation, durable plan and Stripe transport run unchanged.
 if(!Array.isArray(body?.items)||body.items.length!==1||body.items[0].product!=='component'||body.items[0].sku!=='FIXTURE93-CHECKOUT')
  return reply({code:'FIXTURE_ONLY'},403);
 const headers=new Headers(req.headers);
 // Gateway JWT verification remains enabled. Public anon project keys are not
 // customer sessions; authenticated users retain normal customer verification.
 try{const token=headers.get('authorization')?.slice(7);if(token&&JSON.parse(atob(token.split('.')[1])).role==='anon')headers.delete('authorization');}catch{return reply({code:'INVALID_GATEWAY_IDENTITY'},401);}
 const env={get:(name:string)=>name==='UNITY92_CHECKOUT'?'enabled':name==='STRIPE_SANDBOX_SECRET_KEY'?key:Deno.env.get(name)};
 return startCheckout(new Request(req.url,{method:'POST',headers,body:JSON.stringify(body)}),env);
});

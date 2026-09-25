// Read-only payment display. The URL parameter alone never changes Order state.
const origin='https://apparitioninstruments.co.uk';
type Environment={get:(name:string)=>string|undefined};
const result=(status:number,body:object)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Vary':'Origin'}});
export async function checkoutStatus(req:Request,env:Environment=Deno.env,request:typeof fetch=fetch){
 if(req.headers.get('origin')&&req.headers.get('origin')!==origin)return result(403,{message:'Origin unavailable'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'apikey','Vary':'Origin'}});
 if(req.method!=='GET')return result(405,{message:'Method unavailable'});
 const session=new URL(req.url).searchParams.get('session_id');
 if(!/^cs_live_[A-Za-z0-9]{8,}$/.test(session||''))return result(400,{message:'Invalid Checkout reference'});
 const url=env.get('SUPABASE_URL'),service=env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!service)return result(503,{message:'Order status unavailable'});
 const response=await request(url+'/rest/v1/orders?stripe_checkout_session_id=eq.'+encodeURIComponent(session!)+'&select=reference,payment_status,paid_at,fulfillment_applied_at&limit=1',
  {headers:{apikey:service,Authorization:'Bearer '+service}});
 if(!response.ok)return result(503,{message:'Order status unavailable'});
 const row=(await response.json())?.[0];
 if(!row)return result(404,{message:'Checkout reference unavailable'});
 return result(200,{reference:row.reference,paymentStatus:row.payment_status==='paid'&&row.paid_at&&row.fulfillment_applied_at?'paid':'processing'});
}
if(import.meta.main)Deno.serve(req=>checkoutStatus(req));

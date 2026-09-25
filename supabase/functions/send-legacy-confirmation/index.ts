// Explicit Admin-only one-time email for the pre-email paid test Order AI-010010.
// Recipient, payment and amounts always come from the persisted Order claim.
import {sendConfirmedOrderOnce} from '../stripe-webhook/delivery.ts';
type Environment={get:(name:string)=>string|undefined};
const origin='https://apparitioninstruments.co.uk';
const response=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Vary':'Origin'}});
export async function sendLegacyConfirmation(req:Request,env:Environment=Deno.env,request:typeof fetch=fetch,send?:Parameters<typeof sendConfirmedOrderOnce>[3]){
 if(req.headers.get('origin')!==origin)return response(403,'Origin unavailable');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'apikey, authorization, content-type','Vary':'Origin'}});
 if(req.method!=='POST')return response(405,'Method unavailable');
 const token=/^Bearer (\S+)$/.exec(req.headers.get('Authorization')||'')?.[1];
 const url=env.get('SUPABASE_URL'),publicKey=env.get('SUPABASE_ANON_KEY'),service=env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!token||!url||!publicKey||!service)return response(401,'Admin authorization required');
 const authHeaders={apikey:publicKey,Authorization:'Bearer '+token};
 const identity=await request(url+'/auth/v1/user',{headers:authHeaders});
 if(!identity.ok)return response(403,'Admin authorization required');
 const user=await identity.json();if(!/^[a-f\d-]{36}$/i.test(user?.id||''))return response(403,'Admin authorization required');
 const membership=await request(url+'/rest/v1/admin_members?user_id=eq.'+encodeURIComponent(user.id)+'&select=user_id',{headers:authHeaders});
 if(!membership.ok||(await membership.json())?.[0]?.user_id!==user.id)return response(403,'Admin authorization required');
 let input:any;try{input=await req.json();}catch{return response(400,'Invalid Order request');}
 if(input?.reference!=='AI-010010'||Object.keys(input).length!==1)return response(400,'Order unavailable');
 const serviceHeaders={apikey:service,Authorization:'Bearer '+service};
 const lookup=await request(url+'/rest/v1/orders?reference=eq.AI-010010&select=id,confirmation_email_status,payment_status',{headers:serviceHeaders});
 if(!lookup.ok)return response(503,'Order unavailable');
 const order=(await lookup.json())?.[0];
 if(!order||order.confirmation_email_status!=='legacy'||order.payment_status!=='paid')return response(409,'Confirmation already handled or unavailable');
 const delivered=await sendConfirmedOrderOnce(order.id,env,request,send,'claim_legacy_test_order_confirmation');
 return delivered?response(200,'Confirmation delivery recorded; refresh the Order for its status'):response(503,'Confirmation delivery could not be confirmed; review the Order email status');
}
if(import.meta.main)Deno.serve(req=>sendLegacyConfirmation(req));

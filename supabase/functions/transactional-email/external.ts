import {sendOrderMail} from './smtp.ts';
import {renderEmailV2} from './v2.ts';
type Env={get:(key:string)=>string|undefined};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cors={'Access-Control-Allow-Origin':'https://apparitioninstruments.co.uk','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
export async function handleExternalDispatch(request:Request,env:Env=Deno.env,transport:typeof fetch=fetch,send=sendOrderMail){
 const reply=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return reply(405,'Method not allowed');
 const token=request.headers.get('Authorization')||'',service=env.get('SUPABASE_SERVICE_ROLE_KEY'),url=env.get('SUPABASE_URL'),key=env.get('SUPABASE_ANON_KEY')||env.get('SUPABASE_PUBLISHABLE_KEY');
 if(!service||!url||!key)return reply(503,'Dispatch service unavailable');
 if(!/^Bearer [^\s]+$/.test(token)||token==='Bearer '+service)return reply(401,'Admin sign-in required');
 let body:any;try{body=await request.json();}catch{return reply(400,'Invalid request');}
 if(!body||Object.keys(body).some(k=>!['orderId','dispatch','send','expectedEmail'].includes(k))||!uuid.test(body.orderId||'')
  ||typeof body.dispatch!=='boolean'||typeof body.send!=='boolean'||typeof body.expectedEmail!=='string')return reply(400,'Explicit dispatch choice required');
 const userHeaders={apikey:key,Authorization:token,'Content-Type':'application/json'},serviceHeaders={apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'};
 try{
  const identity=await transport(url+'/auth/v1/user',{headers:userHeaders});if(!identity.ok)return reply(403,'Admin membership required');
  const user=await identity.json();if(!uuid.test(user?.id||''))return reply(403,'Admin membership required');
  const members=await transport(url+'/rest/v1/admin_members?select=user_id&user_id=eq.'+user.id,{headers:userHeaders});
  if(!members.ok||!(await members.json()).some((m:any)=>m.user_id===user.id))return reply(403,'Admin membership required');
  const rpc=async(name:string,payload:unknown,headers=serviceHeaders)=>{
   const r=await transport(url+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(payload)});
   if(!r.ok)throw Error('Order changed or dispatch request rejected. Refresh before retrying.');return r.json();
  };
  const id=await rpc('request_external_dispatch',{p_order_id:body.orderId,p_dispatch:body.dispatch,p_send:body.send,p_expected_email:body.expectedEmail},userHeaders);
  if(!body.send)return reply(200,'Order dispatched. No email was sent.');
  const claimed=await rpc('claim_external_dispatch',{p_delivery_id:id});
  if(!claimed)return reply(200,'No new email attempted. Check the persisted notification status; automatic retries and resend are disabled.');
  const order=claimed.order;order.customer={...order.customer,email:claimed.recipient};
  let message;try{message=renderEmailV2('dispatched',order);}catch{return reply(409,'Notification claimed but could not be rendered. Requires review; no automatic retry.');}
  if(await rpc('mark_order_email_attempt',{p_order_id:claimed.orderId,p_kind:'dispatched',p_claim:claimed.claim})!==true)return reply(409,'Notification requires review');
  let state='sent',reason=null;
  try{await send(env,message);}catch(error){state=(error as {outcome?:string})?.outcome==='unknown'?'unknown':'failed';reason='SMTP acceptance could not be confirmed';}
  const finished=await rpc('finish_order_email_delivery',{p_order_id:claimed.orderId,p_kind:'dispatched',p_claim:claimed.claim,p_state:state,p_reason:reason});
  if(finished!==true)return reply(503,'Outcome could not be recorded. Requires review; do not resend.');
  return reply(200,state==='sent'?'Sent: accepted by the mail server. Inbox delivery is not confirmed.':state==='unknown'?'Unknown acceptance: requires review. Do not resend.':'Failed: requires review. Automatic retry is disabled.');
 }catch(error){return reply(503,error instanceof Error?error.message:'Dispatch outcome unavailable. Refresh and review before retrying.');}
}

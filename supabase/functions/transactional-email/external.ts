import {sendOrderMail} from './smtp.ts';
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
 if(!body||Object.keys(body).some(k=>!['orderId','dispatch','send','expectedEmail','resend','operationId','previousDelivery','expectedUpdatedAt','reason'].includes(k))||!uuid.test(body.orderId||'')
  ||typeof body.dispatch!=='boolean'||typeof body.send!=='boolean'||typeof body.expectedEmail!=='string')return reply(400,'Explicit dispatch choice required');
 const userHeaders={apikey:key,Authorization:token,'Content-Type':'application/json'},serviceHeaders={apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'};
 try{
  const identity=await transport(url+'/auth/v1/user',{headers:userHeaders});if(!identity.ok)return reply(403,'Admin membership required');
  const user=await identity.json();if(!uuid.test(user?.id||''))return reply(403,'Admin membership required');
  const members=await transport(url+'/rest/v1/admin_members?select=user_id&user_id=eq.'+user.id,{headers:userHeaders});
  if(!members.ok||!(await members.json()).some((m:any)=>m.user_id===user.id))return reply(403,'Admin membership required');
  if(body.send)return reply(409,'Generate an order-specific preview and confirm it before sending. This legacy action cannot send email.');
  const rpc=async(name:string,payload:unknown,headers=serviceHeaders)=>{
   const r=await transport(url+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(payload)});
   if(!r.ok)throw Error('Order changed or dispatch request rejected. Refresh before retrying.');return r.json();
  };
  if(body.resend===true&&(body.dispatch!==false||body.send!==true||!uuid.test(body.operationId||'')||!uuid.test(body.previousDelivery||'')||typeof body.expectedUpdatedAt!=='string'||typeof body.reason!=='string'))return reply(400,'Explicit resend confirmation and reason required');
  const id=body.resend===true?await rpc('request_dispatch_resend',{p_order_id:body.orderId,p_operation_id:body.operationId,p_previous_delivery:body.previousDelivery,p_expected_updated_at:body.expectedUpdatedAt,p_expected_email:body.expectedEmail,p_reason:body.reason},userHeaders):await rpc('request_external_dispatch',{p_order_id:body.orderId,p_dispatch:body.dispatch,p_send:body.send,p_expected_email:body.expectedEmail},userHeaders);
  if(!body.send)return reply(200,'Order dispatched. No email was sent.');

 }catch(error){return reply(503,error instanceof Error?error.message:'Dispatch outcome unavailable. Refresh and review before retrying.');}
}

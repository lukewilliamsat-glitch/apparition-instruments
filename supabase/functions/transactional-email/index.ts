import {renderTransactionalMail,deliveryKinds} from './render.ts';
import {sendOrderMail} from './smtp.ts';
import {previewFixture,v2Kinds} from './v2.ts';

type Env={get:(key:string)=>string|undefined};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply=(status:number,message:string)=>new Response(JSON.stringify({status:message}),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
function sameSecret(a:string,b:string){const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);let diff=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]||0)^(y[i]||0);return diff===0&&x.length>0;}

// Service-key-only manual endpoint. There is no cron, webhook, browser or Admin caller in P08B.3.
export async function handleTransactionalEmail(request:Request,env:Env=Deno.env,transport:typeof fetch=fetch,send=sendOrderMail):Promise<Response>{
 const service=env.get('SUPABASE_SERVICE_ROLE_KEY'),url=env.get('SUPABASE_URL');
 if(!service||!url||!sameSecret(request.headers.get('Authorization')||'','Bearer '+service))return reply(401,'Unauthorized');
 if(request.method!=='POST')return reply(405,'Method not allowed');
 let body:any;try{body=await request.json();}catch{return reply(400,'Invalid delivery request');}
 if(!body||Object.keys(body).length!==1||!uuid.test(body.deliveryId||''))return reply(400,'Delivery ID required');
 const headers={apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'};
 const query=async(path:string,init?:RequestInit)=>{
  const response=await transport(url+'/rest/v1/'+path,{...init,headers});
  if(!response.ok)throw Error('Persistence unavailable');return response.json();
 };
 try{
  const rows=await query('order_email_deliveries?select=id,order_id,kind,state,source_event_id&id=eq.'+body.deliveryId+'&limit=1');
  const row=rows[0];if(!row||!deliveryKinds.includes(row.kind))return reply(404,'Eligible delivery unavailable');
  if(row.state!=='pending')return reply(200,'No delivery attempted');
  const rpc=(name:string,payload:unknown)=>query('rpc/'+name,{method:'POST',body:JSON.stringify(payload)});
  const claim=await rpc('claim_order_email_delivery',{p_order_id:row.order_id,p_kind:row.kind});
  if(!claim)return reply(200,'No delivery attempted');
  // The database atomically checks the event, payment and historic eligibility before claiming.
  const orders=await query('orders?select=*&id=eq.'+row.order_id+'&limit=1');
  const order=orders[0];
  // If the Order changes between claim and send, retain the claim for human review; never email stale lifecycle data.
  if(!order||!uuid.test(claim)||!order.customer?.email||
    (row.kind==='full_refund'&&order.payment_status!=='refunded')||
    (row.kind!=='full_refund'&&!['paid','partially_refunded'].includes(order.payment_status)))return reply(409,'Claim requires review');
  let message;try{message=renderTransactionalMail(row.kind,order);}catch{return reply(409,'Claim requires review');}
  const marked=await rpc('mark_order_email_attempt',{p_order_id:row.order_id,p_kind:row.kind,p_claim:claim});
  if(marked!==true)return reply(409,'Claim requires review');
  let outcome:'sent'|'failed'|'unknown'='sent',reason:null|string=null;
  try{await send(env,message);}catch(error){outcome=(error as {outcome?:string})?.outcome==='unknown'?'unknown':'failed';reason='SMTP delivery could not be confirmed';}
  const finished=await rpc('finish_order_email_delivery',{p_order_id:row.order_id,p_kind:row.kind,p_claim:claim,p_state:outcome,p_reason:reason});
  return finished===true?reply(200,outcome):reply(503,'Outcome requires review');
 }catch{return reply(503,'Delivery unavailable');}
}
const previewOrigin='https://apparitioninstruments.co.uk';
const previewHeaders={'Access-Control-Allow-Origin':previewOrigin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
// Preview is fixture-only and has a separate, explicit Admin membership check. No SMTP or ledger access.
export async function handleEmailPreview(request:Request,env:Env=Deno.env,transport:typeof fetch=fetch){
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:previewHeaders});
 if(request.method!=='GET')return reply(405,'Method not allowed');
 const token=request.headers.get('Authorization')||'';
 if(!/^Bearer [^\s]+$/.test(token)||token==='Bearer '+env.get('SUPABASE_SERVICE_ROLE_KEY'))return reply(401,'Unauthorized');
 const url=env.get('SUPABASE_URL'),key=env.get('SUPABASE_ANON_KEY')||env.get('SUPABASE_PUBLISHABLE_KEY');
 if(!url||!key)return reply(503,'Preview unavailable');
 try{
  const headers={apikey:key,Authorization:token};
  const identity=await transport(url+'/auth/v1/user',{headers});if(!identity.ok)return reply(403,'Admin membership required');
  const user=await identity.json();if(!uuid.test(user?.id||''))return reply(403,'Admin membership required');
  const membership=await transport(url+'/rest/v1/admin_members?select=user_id&user_id=eq.'+encodeURIComponent(user.id),{headers});
  if(!membership.ok||!(await membership.json()).some((row:any)=>row.user_id===user.id))return reply(403,'Admin membership required');
  const params=new URL(request.url).searchParams,kind=params.get('kind'),tracking=params.get('tracking')==='1';
  if(!v2Kinds.includes(kind as any))return reply(400,'Unknown preview');
  const data=previewFixture(kind as any,tracking);
  return new Response(JSON.stringify({label:'PREVIEW — NOT A REAL ORDER',html:data.html,text:data.text,subject:data.subject}),{status:200,headers:{...previewHeaders,'Content-Type':'application/json'}});
 }catch{return reply(503,'Preview unavailable');}
}

// Dormant, service-only batch dispatcher. No schedule, webhook call or Admin browser caller exists.
export async function dispatchPending(request:Request,env:Env=Deno.env,transport:typeof fetch=fetch,send=sendOrderMail){
 const service=env.get('SUPABASE_SERVICE_ROLE_KEY'),url=env.get('SUPABASE_URL');
 if(!service||!url||!sameSecret(request.headers.get('Authorization')||'','Bearer '+service))return reply(401,'Unauthorized');
 if(request.method!=='POST')return reply(405,'Method not allowed');
 const headers={apikey:service,Authorization:'Bearer '+service};
 try{const pending=await transport(url+'/rest/v1/order_email_deliveries?select=id&state=eq.pending&kind=in.(in_production,ready_to_dispatch,dispatched,full_refund)&order=created_at.asc&limit=10',{headers});
  if(!pending.ok)throw Error('Ledger unavailable');const rows=await pending.json();if(!Array.isArray(rows))throw Error('Ledger unavailable');
  let attempted=0;for(const row of rows){if(!uuid.test(row.id||''))continue;
   const result=await handleTransactionalEmail(new Request(request.url,{method:'POST',headers:{Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify({deliveryId:row.id})}),env,transport,send);
   if(result.status!==200)return reply(503,'Delivery requires review');attempted++;
  }
  return reply(200,`Processed ${attempted} eligible records`);
 }catch{return reply(503,'Dispatcher unavailable');}
}
export function routeEmailRequest(request:Request,env:Env=Deno.env,transport:typeof fetch=fetch,send=sendOrderMail){
 const path=new URL(request.url).pathname;
 if(path.endsWith('/preview'))return handleEmailPreview(request,env,transport);
 if(path.endsWith('/dispatch'))return dispatchPending(request,env,transport,send);
 return handleTransactionalEmail(request,env,transport,send);
}
if(import.meta.main)Deno.serve(request=>routeEmailRequest(request));

import {renderTransactionalMail,deliveryKinds} from './render.ts';
import {sendOrderMail} from './smtp.ts';

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
if(import.meta.main)Deno.serve(request=>handleTransactionalEmail(request));

import {renderEmailV2,aftercareTemplateIdentity} from './v2.ts';
import {sendOrderMail} from './smtp.ts';

type Env={get:(key:string)=>string|undefined};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cors={'Access-Control-Allow-Origin':'https://apparitioninstruments.co.uk','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
const stale='This order or email has changed since you opened the preview. Please generate a new preview before sending.';
export const templateIdentity='dispatch-v2-fulfilment-email-v1/prepared-v1';
export function canonical(value:any):string{return JSON.stringify(value===null||typeof value!=='object'?value:Array.isArray(value)?value.map(v=>JSON.parse(canonical(v))):Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(canonical(value[k]))])));}
const bytes=(s:string)=>new TextEncoder().encode(s);
export async function digest(value:any){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(canonical(value)))),b=>b.toString(16).padStart(2,'0')).join('');}
const encodeBytes=(b:Uint8Array)=>btoa(String.fromCharCode(...b)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const encode=(s:string)=>encodeBytes(bytes(s));
const decode=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function signingKey(secret:string){return crypto.subtle.importKey('raw',bytes('apparition-email-preview-v1:'+secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function signPreview(payload:any,secret:string){const data=encode(JSON.stringify(payload));const sig=await crypto.subtle.sign('HMAC',await signingKey(secret),bytes(data));return data+'.'+encodeBytes(new Uint8Array(sig));}
export async function verifyPreview(token:string,secret:string){
 if(typeof token!=='string'||token.length>4096)throw Error('Invalid preview');
 const parts=token.split('.');if(parts.length!==2)throw Error('Invalid preview');
 const sig=decode(parts[1]);
 if(!await crypto.subtle.verify('HMAC',await signingKey(secret),sig,bytes(parts[0])))throw Error('Invalid preview');
 return JSON.parse(new TextDecoder().decode(decode(parts[0])));
}
export function prepareContent(context:any,env:Env,kind='dispatched'){
 const order=context.order,recipient=String(order.customer?.email||'').trim().toLowerCase();
 const from={email:env.get('SMTP_FROM_EMAIL'),name:env.get('SMTP_FROM_NAME')};
 if(!from.email||!from.name||/[\r\n]/.test(from.email+from.name))throw Error('Sender unavailable');
 const message=renderEmailV2(kind as any,{...order,customer:{...order.customer,email:recipient}},{manualAftercare:kind==='aftercare'&&context.route!=='email'});
 return {message,from,template:kind==='aftercare'?aftercareTemplateIdentity:templateIdentity,renderer:renderEmailV2.toString()};
}
export async function handlePreparedEmail(request:Request,env:Env=Deno.env,transport:typeof fetch=fetch,send=sendOrderMail,now=()=>Date.now()){
 const reply=(status:number,data:any)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return reply(405,{message:'Method not allowed'});
 const service=env.get('SUPABASE_SERVICE_ROLE_KEY'),url=env.get('SUPABASE_URL'),key=env.get('SUPABASE_ANON_KEY')||env.get('SUPABASE_PUBLISHABLE_KEY');
 if(!service||!url||!key)return reply(503,{message:'Email preview unavailable'});
 const token=request.headers.get('Authorization')||'';
 if(!/^Bearer [^\s]+$/.test(token)||token==='Bearer '+service)return reply(401,{message:'Admin sign-in required'});
 const userHeaders={apikey:key,Authorization:token,'Content-Type':'application/json'},serviceHeaders={apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'};
 let claimed=false;
 try{
  const identity=await transport(url+'/auth/v1/user',{headers:userHeaders});if(!identity.ok)return reply(403,{message:'Admin membership required'});
  const user=await identity.json();if(!uuid.test(user?.id||''))return reply(403,{message:'Admin membership required'});
  const members=await transport(url+'/rest/v1/admin_members?select=user_id&user_id=eq.'+user.id,{headers:userHeaders});
  if(!members.ok||!(await members.json()).some((m:any)=>m.user_id===user.id))return reply(403,{message:'Admin membership required'});
  let body:any;try{body=await request.json();}catch{return reply(400,{message:'Invalid request'});}
  const path=new URL(request.url).pathname,kind=path.endsWith('-aftercare')?'aftercare':'dispatched',aftercare=kind==='aftercare',template=aftercare?aftercareTemplateIdentity:templateIdentity;
  const confirm=path.endsWith('/confirm-dispatch')||path.endsWith('/confirm-aftercare');
  const allowed=confirm?['orderId','previewIdentity','recipientConfirmed','reason']:['orderId','mode'];
  if(!body||Object.keys(body).some(k=>!allowed.includes(k))||!uuid.test(body.orderId||''))return reply(400,{message:'Order identity required; email overrides are unavailable'});
  let binding:any;
  if(confirm){
   if(body.recipientConfirmed!==true)return reply(400,{message:'Explicit recipient confirmation required'});
   try{binding=await verifyPreview(body.previewIdentity,service);}catch{return reply(409,{code:'PREVIEW_STALE',message:stale});}
   if(binding.kind!==kind||binding.actor!==user.id||binding.orderId!==body.orderId||!['first','resend'].includes(binding.mode)||!uuid.test(binding.operationId||'')||!Number.isSafeInteger(binding.expires)||binding.expires<=now()||binding.expires>now()+600000)return reply(409,{code:'PREVIEW_STALE',message:stale});
   if(binding.mode==='resend'&&(typeof body.reason!=='string'||body.reason.trim().length<5||body.reason.trim().length>1000||/[\x00-\x1f\x7f]/.test(body.reason)))return reply(400,{message:'Resend reason must contain 5–1000 characters'});
  }else if(!['first','resend'].includes(body.mode))return reply(400,{message:'Unsupported notification action'});
  const mode=confirm?binding.mode:body.mode;
  if(aftercare&&mode!=='first')return reply(400,{message:'Aftercare has no repeat-send action'});
  const rpc=async(name:string,payload:any,headers=userHeaders)=>{
   const r=await transport(url+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(payload)});
   if(!r.ok){const error=Object.assign(Error('Preview unavailable'),{status:r.status});throw error;}return r.json();
  };
  let context:any;try{context=await rpc(aftercare?'get_aftercare_preview_context':'get_dispatch_preview_context',aftercare?{p_order_id:body.orderId}:{p_order_id:body.orderId,p_resend:mode==='resend'});}catch{return reply(409,{code:confirm?'PREVIEW_STALE':'INELIGIBLE',message:confirm?stale:'This order is not eligible for this notification. Refresh the order and review its communication history.'});}
  if(context?.order?.id!==body.orderId)return reply(409,{code:'PREVIEW_STALE',message:stale});
  let content:any;try{content=prepareContent(context,env,kind);}catch{return reply(409,{code:confirm?'PREVIEW_STALE':'INELIGIBLE',message:confirm?stale:'The saved order cannot be rendered safely. Review its customer and item information.'});}
  const stateHash=await digest(context),contentHash=await digest(content);
  if(!confirm){
   const expires=now()+600000;
   const previewIdentity=await signPreview({actor:user.id,orderId:body.orderId,mode,kind,operationId:crypto.randomUUID(),stateHash,contentHash,expires,template},service);
   return reply(200,{...content.message,from:content.from,orderReference:context.order.reference,channel:context.order.sales_channel,kind,mode,previewIdentity,expires,template,route:aftercare?context.route:'email',notice:aftercare?context.notice:null});
  }
  if(binding.stateHash!==stateHash||binding.contentHash!==contentHash||binding.template!==template)return reply(409,{code:'PREVIEW_STALE',message:stale});
  if(aftercare&&context.route!=='email')return reply(409,{code:'INELIGIBLE',message:'Use the original order conversation. Aftercare email transport is unavailable for this channel.'});
  let claim:any;try{claim=await rpc(aftercare?'confirm_aftercare_preview':'confirm_dispatch_preview',aftercare?{p_order_id:body.orderId,p_actor:user.id,p_context:context,p_operation_id:binding.operationId,p_template:template}:{p_order_id:body.orderId,p_actor:user.id,p_resend:mode==='resend',p_context:context,p_operation_id:binding.operationId,p_reason:mode==='resend'?body.reason.trim():null},serviceHeaders);}catch(error){
   if([400,409].includes((error as {status?:number})?.status||0))return reply(409,{code:'PREVIEW_STALE',message:stale});
   return reply(503,{code:'REVIEW_REQUIRED',message:'Confirmation outcome requires review. Refresh the notification audit; do not resend.'});
  }
  if(!claim||!uuid.test(claim.claim||''))return reply(409,{code:'PREVIEW_STALE',message:stale});
  claimed=true;
  if(await rpc('mark_order_email_attempt',{p_order_id:body.orderId,p_kind:kind,p_claim:claim.claim},serviceHeaders)!==true)return reply(503,{code:'REVIEW_REQUIRED',message:'Notification claimed but not attempted. Review its audit before another action.'});
  let state='sent',reason=null;
  // This is the already-reviewed payload, never client HTML or a post-claim regeneration.
  try{await send(env,content.message);}catch(error){state=(error as {outcome?:string})?.outcome==='unknown'?'unknown':'failed';reason='SMTP acceptance could not be confirmed';}
  if(await rpc(aftercare?'finish_aftercare_delivery':'finish_order_email_delivery',aftercare?{p_order_id:body.orderId,p_claim:claim.claim,p_state:state,p_reason:reason}:{p_order_id:body.orderId,p_kind:kind,p_claim:claim.claim,p_state:state,p_reason:reason},serviceHeaders)!==true)return reply(503,{code:'REVIEW_REQUIRED',message:'Email outcome could not be recorded. Review the notification audit; do not resend.'});
  return reply(200,{state,message:state==='sent'?'Provider accepted. Inbox delivery is not confirmed.':state==='unknown'?'Email outcome uncertain. Review the notification audit; do not resend.':'Email failed. Review the notification audit. Automatic retry is disabled.'});
 }catch{return reply(503,{code:claimed?'REVIEW_REQUIRED':'UNAVAILABLE',message:claimed?'Email outcome requires review. Refresh the notification audit; do not resend.':'Email preview unavailable. No automatic retry will occur.'});}
}

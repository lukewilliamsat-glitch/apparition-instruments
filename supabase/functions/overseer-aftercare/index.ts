import {sendOrderMail} from '../transactional-email/smtp.ts';
type Env={get:(name:string)=>string|undefined};
type Draft={template:string,subject:string,message:string};
const stage='https://prwmowexhonguvtiywsy.supabase.co', production='https://acdxpxvksvdwfajntzfx.supabase.co';
const reviewOrigin='https://overseer.apparition-phoenix-preview.pages.dev', liveOrigin='https://apparitioninstruments.co.uk';
export const sender='luke@apparitioninstruments.co.uk';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const chars=new TextEncoder();
const binary=(v:Uint8Array)=>btoa(String.fromCharCode(...v)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const fromBinary=(v:string)=>Uint8Array.from(atob(v.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const stable=(v:any):string=>v&&typeof v==='object'?(Array.isArray(v)?'['+v.map(stable).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}'):JSON.stringify(v);
const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const drafts:Record<string,Draft>=Object.freeze({
 order_support:{template:'order_support',subject:'Support with your eBay order {{order_number}}',message:'Hi {{first_name}},\n\nI’m checking in about your eBay order {{order_number}}. If you need help with this order, please reply in your eBay order conversation.\n\nThanks,\nLuke'},
 delivery_help:{template:'delivery_help',subject:'Delivery help for eBay order {{order_number}}',message:'Hi {{first_name}},\n\nIf your eBay order {{order_number}} has not arrived as expected, please let me know in the eBay order conversation so I can help.\n\nThanks,\nLuke'}
});
const validate=(input:Draft)=>{
 if(!Object.hasOwn(drafts,input.template)||typeof input.subject!=='string'||typeof input.message!=='string'
  ||input.subject.trim().length<1||input.subject.length>160||/[\x00-\x1f\x7f]/.test(input.subject)
  ||input.message.trim().length<1||input.message.length>4000||/[\x00-\x08\x0b-\x1f\x7f]/.test(input.message)
  ||/(?:https?:|www\.|[^\s@]+@[^\s@]+\.[^\s@]+)/i.test(input.subject+'\n'+input.message)
  ||/\{\{(?!first_name\}\}|order_number\}\})/.test(input.subject+'\n'+input.message))
 throw Error('Use transaction support text without contact details, web links or unknown placeholders.');
 return {template:input.template,subject:input.subject.trim(),message:input.message.trim()};
};
export async function handleAftercare(request:Request,env:Env=Deno.env,transport:typeof fetch=fetch,send=sendOrderMail,clock=()=>Date.now()){
 const base=env.get('SUPABASE_URL'),mode=base===stage?'sink':base===production&&env.get('OVERSEER_EBAY_SMTP_ENABLED')==='true'&&
  env.get('SMTP_FROM_EMAIL')===sender&&env.get('SMTP_FROM_NAME')?'smtp':null;
 const origin=mode==='sink'?reviewOrigin:liveOrigin;
 const reply=(status:number,data:any)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Vary':'Origin'}});
 if(request.headers.get('origin')!==origin)return reply(403,{message:'Aftercare origin unavailable.'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}});
 if(request.method!=='POST')return reply(405,{message:'Use POST.'});
 const key=env.get('SUPABASE_ANON_KEY')||env.get('SUPABASE_PUBLISHABLE_KEY'),service=env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!mode||!key||!service)return reply(503,{message:'Direct transport is disabled. Use the eBay order conversation.'});
 const token=request.headers.get('authorization');
 if(!token||!/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(token)||token==='Bearer '+service)return reply(401,{message:'Authorised Admin sign-in required.'});
 const consume=async()=>{
  const reader=request.body?.getReader();if(!reader)throw Error('No request body.');
  let total=0;const chunks=[];for(;;){const part=await reader.read();if(part.done)break;total+=part.value.length;if(total>9500){await reader.cancel();throw Error('Message exceeds allowed size.');}chunks.push(part.value);}
  return JSON.parse(await new Blob(chunks).text());
 };
 const call=async(path:string,options:RequestInit={},privileged=false)=>{
  const target=new URL(path,base);
  if(target.origin!==base||!/^\/(?:auth|rest)\/v1\//.test(target.pathname))throw Error('Unknown database endpoint.');
  return transport(target,{...options,headers:{apikey:privileged?service:key,Authorization:privileged?'Bearer '+service:token,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(10000)});
 };
 const rpc=async(name:string,body:object)=>{
  const r=await call('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(body)},true);
  if(!r.ok)throw Error(r.status>=500?'Staging or mail service unavailable.':'The order is not eligible, or saved details changed. Review the saved order and history.');
  return r.json();
 };
 let claimed=false;
 try{
  const identity=await call('/auth/v1/user');
  if(!identity.ok)return reply(403,{message:'Authorised Admin sign-in required.'});
  const person=await identity.json();if(!uuid.test(person?.id??'')||person.role!=='authenticated')return reply(403,{message:'Authorised Admin sign-in required.'});
  const check=await call('/rest/v1/admin_members?select=user_id&user_id=eq.'+person.id+'&limit=1');
  if(!check.ok||!(await check.json())?.some((row:any)=>row.user_id===person.id))return reply(403,{message:'Admin membership required.'});
  let body:any;try{body=await consume();}catch{return reply(400,{message:'Invalid aftercare request.'});}
  const action=body?.action,allowed=['action','orderId','template',...(action==='preview'||action==='confirm'?['subject','message']:[]),...(action==='confirm'?['token','confirmed']:[])];
  if(!['draft','preview','confirm'].includes(action)||!uuid.test(body.orderId||'')||!Object.hasOwn(drafts,body.template)||Object.keys(body).some(k=>!allowed.includes(k)))
   return reply(400,{message:'Choose an eligible saved eBay order and a service template.'});
  const context=await rpc('overseer_aftercare_context',{p_order:body.orderId,p_actor:person.id,p_mode:mode});
  if(context?.orderId!==body.orderId||typeof context.recipient!=='string'||!(mode==='sink'?/^[a-z0-9._%+-]+@example\.invalid$/:/^[a-z0-9._%+-]+@members\.ebay\.com$/).test(context.recipient))return reply(409,{message:'Saved recipient is not allowed.'});
  if(action==='draft')return reply(200,{...drafts[body.template],mode,sender,recipient:context.recipient,reference:context.reference});
  let draft:Draft;try{draft=validate(body);}catch(e){return reply(400,{message:(e as Error).message});}
  const substitute=(v:string)=>v.replace(/\{\{(first_name|order_number)\}\}/g,(_,k)=>k==='first_name'?String(context.firstName||'there'):String(context.reference));
  const subject=substitute(draft.subject),text=substitute(draft.message);
  try{validate({template:draft.template,subject,message:text});}catch{return reply(409,{message:'The rendered message contains unsupported content. Review the saved order.'});}
  const html='<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body><h1>'+escape(subject)+'</h1><p>'+escape(text).replace(/\n/g,'<br>')+'</p></body></html>';
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',chars.encode(stable({mode,context,draft})))),x=>x.toString(16).padStart(2,'0')).join('');
  const secret=await crypto.subtle.importKey('raw',chars.encode('overseer68-aftercare:'+service),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
  if(action==='preview'){
   const data=binary(chars.encode(JSON.stringify({actor:person.id,orderId:body.orderId,digest,id:crypto.randomUUID(),exp:clock()+300000})));
   const sig=binary(new Uint8Array(await crypto.subtle.sign('HMAC',secret,chars.encode(data))));
   return reply(200,{token:data+'.'+sig,subject,text,html,sender,recipient:context.recipient,mode});
  }
  let binding:any;
  try{
   if(body.confirmed!==true||typeof body.token!=='string'||body.token.length>2048||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(body.token))throw Error();
   const [data,sig]=body.token.split('.');
   if(!await crypto.subtle.verify('HMAC',secret,fromBinary(sig),chars.encode(data)))throw Error();
   binding=JSON.parse(new TextDecoder().decode(fromBinary(data)));
   if(binding.actor!==person.id||binding.orderId!==body.orderId||binding.digest!==digest||!uuid.test(binding.id)||!Number.isSafeInteger(binding.exp)||binding.exp<=clock()||binding.exp>clock()+300000)throw Error();
  }catch{return reply(409,{message:'The message or saved order changed. Generate a fresh preview.'});}
  if(await rpc('overseer_aftercare_claim',{p_order:body.orderId,p_actor:person.id,p_mode:mode,p_context:context,p_id:binding.id,p_subject:subject,p_hash:digest})!==true)
   return reply(409,{message:'This order already has an Aftercare Direct attempt. Review its history. Do not resend automatically.'});
  claimed=true;
  let state=mode==='sink'?'sink_recorded':'submitted';
  // Staging has no outbound mail path even if SMTP credentials were accidentally added.
  if(mode==='smtp')try{await send(env,{to:context.recipient,subject,text,html});}catch(e){state=(e as {outcome?:string}).outcome==='failed'?'failed':'unknown';}
  if(await rpc('overseer_aftercare_finish',{p_order:body.orderId,p_id:binding.id,p_mode:mode,p_state:state})!==true)throw Error('Audit update did not complete.');
  return reply(200,{state,message:({sink_recorded:'Synthetic message recorded in the staging sink. No email sent.',submitted:'SMTP accepted the message. eBay forwarding and inbox delivery are not confirmed.',failed:'SMTP rejected the attempt. Review the order history; use the eBay conversation if necessary.',unknown:'Submission outcome is uncertain. Review the order history before taking action.'})[state]});
 }catch{
  return reply(409,{message:claimed?'Submission outcome requires review. Refresh message history before using another route.':'Direct email is unavailable for this order. Check eligibility and use the eBay order conversation if needed.'});
 }
}
if(import.meta.main)Deno.serve(req=>handleAftercare(req));

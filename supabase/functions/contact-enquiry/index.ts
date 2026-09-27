import {validateEnquiry,renderEnquiry} from './mail.ts';
import {sendContactMail} from './smtp.ts';
type Env={get:(key:string)=>string|undefined};
const origin='https://apparitioninstruments.co.uk';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
const response=(status:number,state:string,id?:string)=>new Response(JSON.stringify({state,...(id?{submissionId:id}:{})}),{status,headers:{...cors,'Content-Type':'application/json'}});
async function boundedJson(req:Request){
 if(!req.body)throw Error('Empty request');
 const reader=req.body.getReader(),parts:Uint8Array[]=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16000){await reader.cancel();throw Error('Enquiry too long');}parts.push(value);}
 const joined=new Uint8Array(size);let offset=0;for(const part of parts){joined.set(part,offset);offset+=part.length;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(joined));
}
const clientIp=(req:Request)=>{
 const value=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()||'';
 return /^[a-f0-9:.]{3,45}$/i.test(value)?value:'';
};
export async function receiveContactEnquiry(req:Request,env:Env=Deno.env,transport:typeof fetch=fetch,send=sendContactMail){
 if(req.method==='OPTIONS')return req.headers.get('Origin')===origin?new Response(null,{status:204,headers:cors}):response(403,'unavailable');
 if(req.method!=='POST')return response(405,'unavailable');
 if(req.headers.get('Origin')&&req.headers.get('Origin')!==origin)return response(403,'unavailable');
 if(!(req.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))return response(415,'invalid');
 let data:ReturnType<typeof validateEnquiry>;
 try{data=validateEnquiry(await boundedJson(req));}catch{return response(400,'invalid');}
 if(data.honeypot)return response(200,'sent',data.submissionId); // Plausible response; no email or DB access.
 const url=env.get('SUPABASE_URL'),service=env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!service)return response(503,'uncertain',data.submissionId);
 const headers={apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'};
 const rpc=async(name:string,payload:object)=>{const r=await transport(url+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(payload)});if(!r.ok)throw Error('Contact persistence unavailable');return r.json();};
 try{
  const state=await rpc('reserve_contact_enquiry',{p_submission_id:data.submissionId,p_email:data.email,p_ip:clientIp(req)});
  if(state==='rate_limited')return response(429,'rate_limited',data.submissionId);
  if(state==='sent')return response(200,'sent',data.submissionId);
  if(state==='failed')return response(502,'failed',data.submissionId);
  if(state!=='accepted')return response(202,'uncertain',data.submissionId);
  const message=renderEnquiry(data,new Date().toISOString());
  if(await rpc('mark_contact_enquiry_attempt',{p_submission_id:data.submissionId})!==true)return response(202,'uncertain',data.submissionId);
  let outcome='sent';try{await send(env,message);}catch(e){outcome=(e as {outcome?:string})?.outcome==='unknown'?'unknown':'failed';}
  if(await rpc('finish_contact_enquiry',{p_submission_id:data.submissionId,p_outcome:outcome})!==true)return response(202,'uncertain',data.submissionId);
  return outcome==='sent'?response(200,'sent',data.submissionId):outcome==='failed'?response(502,'failed',data.submissionId):response(202,'uncertain',data.submissionId);
 }catch{return response(202,'uncertain',data.submissionId);}
}
if(import.meta.main)Deno.serve(req=>receiveContactEnquiry(req));

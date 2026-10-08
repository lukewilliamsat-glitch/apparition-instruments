import {renderEmailV2,previewOrderFixture} from './v2.ts';
import {validateTemplate,templateKeys} from './templates.ts';
const headers={'Access-Control-Allow-Origin':'https://apparitioninstruments.co.uk','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store','Content-Type':'application/json'};
// Fixture-only preview. No send, ledger, real-order lookup or signing pathway.
export async function handleTemplatePreview(request:Request,env:any,transport:typeof fetch){
 const reply=(status:number,data:any)=>new Response(JSON.stringify(data),{status,headers});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(request.method!=='POST')return reply(405,{message:'POST required'});
 const token=request.headers.get('Authorization')||'',service=env.get('SUPABASE_SERVICE_ROLE_KEY'),url=env.get('SUPABASE_URL'),key=env.get('SUPABASE_ANON_KEY')||env.get('SUPABASE_PUBLISHABLE_KEY');
 if(!/^Bearer [^\s]+$/.test(token)||token==='Bearer '+service)return reply(401,{message:'Admin sign-in required'});
 if(!url||!key)return reply(503,{message:'Preview unavailable'});
 try{
  const auth={apikey:key,Authorization:token};const userResponse=await transport(url+'/auth/v1/user',{headers:auth});if(!userResponse.ok)return reply(403,{message:'Admin membership required'});const user=await userResponse.json();if(!/^[0-9a-f-]{36}$/i.test(user.id||''))return reply(403,{message:'Admin membership required'});
  const membership=await transport(url+'/rest/v1/admin_members?select=user_id&user_id=eq.'+user.id,{headers:auth});if(!membership.ok||!(await membership.json()).some((r:any)=>r.user_id===user.id))return reply(403,{message:'Admin membership required'});
  const body=await request.json();if(!body||Object.keys(body).some(k=>!['key','content','versionId','tracking'].includes(k))||!templateKeys.includes(body.key))return reply(400,{message:'Supported template required'});
  let content=body.content,version='Unsaved draft';
  if(body.versionId){if(content)return reply(400,{message:'Select a draft or a version, not both'});const versions=await transport(url+'/rest/v1/email_template_versions?select=*&id=eq.'+encodeURIComponent(body.versionId)+'&template_key=eq.'+encodeURIComponent(body.key),{headers:auth});if(!versions.ok)throw Error('Version unavailable');const v=(await versions.json())[0];if(!v)return reply(404,{message:'Version unavailable'});content=v.content;version='Published version '+v.version;}
  try{validateTemplate(body.key,content);}catch(error){return reply(400,{message:error.message});}
  const [kind,channel]=body.key.split(':');const order=previewOrderFixture(kind as any,body.tracking===true,channel);const message=renderEmailV2(kind as any,order,{preview:true,published:{content},manualAftercare:kind==='aftercare'&&channel==='EBAY'});
  return reply(200,{...message,label:'SAMPLE ONLY — NOT A REAL CUSTOMER OR ORDER',key:body.key,version,orderReference:order.reference});
 }catch{return reply(503,{message:'Template preview unavailable'});}
}

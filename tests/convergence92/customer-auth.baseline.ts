type Env={get:(name:string)=>string|undefined};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function verifiedCustomer(req:Request,env:Env,request:typeof fetch=fetch):Promise<{id:string,email:string}|null>{
 const token=req.headers.get('Authorization');
 const url=env.get('SUPABASE_URL'),key=env.get('SUPABASE_ANON_KEY');
 if(!url||!key||!token||!/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(token))return null;
 try{
  const reply=await request(url+'/auth/v1/user',{headers:{apikey:key,Authorization:token},cache:'no-store'});
  if(!reply.ok)return null;
  const user=await reply.json();
  return uuid.test(user?.id||'')&&user?.aud==='authenticated'&&user?.role==='authenticated'&&user?.email_confirmed_at&&
   typeof user?.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email.trim())?
   {id:user.id,email:user.email.trim().toLowerCase()}:null;
 }catch{return null;}
}

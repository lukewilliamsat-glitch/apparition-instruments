// Standalone sandbox adapter for an existing server request. No provider calls.
const origin='https://prwmowexhonguvtiywsy.supabase.co';
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const bearer=/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;
const deny=()=>new Error('Verified staging Marketplace Admin required');

async function bounded(response,limit,signal){
 const reader=response.body?.getReader();
 if(!reader)throw deny();
 const blocks=[];
 let bytes=0;
 try{
  for(;;){
   signal.throwIfAborted();
   const {value,done}=await reader.read();
   if(done)break;
   bytes+=value.byteLength;
   if(bytes>limit)throw deny();
   blocks.push(value);
  }
  return JSON.parse(Buffer.concat(blocks).toString('utf8'));
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}

export function marketplaceStageAuth({request,publishableKey,sessionOrigin,allowActor,fetcher=fetch}){
 if(sessionOrigin!==origin||!/^sb_publishable_[\w-]+$/.test(publishableKey??'')||
    typeof allowActor!=='function'||!request?.headers)throw deny();
 return {
  async requireAdmin(){
   const raw=request.headers.get('authorization')??'';
   if(raw.length>8192)throw deny();
   const token=bearer.exec(raw)?.[1];
   if(!token)throw deny();
   let claim;
   try{claim=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));}catch{throw deny();}
   // Issuer is a reject-only check before sending the bearer. Auth must still verify it.
   if(claim.iss!==origin+'/auth/v1'||!uuid.test(claim.sub??''))throw deny();
   const signal=AbortSignal.any([request.signal,AbortSignal.timeout(6000)]);
   const send=path=>fetcher(origin+path,{method:'GET',headers:{apikey:publishableKey,Authorization:'Bearer '+token},
    signal,redirect:'error',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
   const user=await send('/auth/v1/user');
   if(!user.ok)throw deny();
   const actor=(await bounded(user,16384,signal))?.id;
   if(actor!==claim.sub||!await allowActor(actor))throw deny();
   const membership=await send('/rest/v1/admin_members?select=user_id&user_id=eq.'+encodeURIComponent(actor)+'&limit=2');
   if(!membership.ok)throw deny();
   const rows=await bounded(membership,2048,signal);
   if(!Array.isArray(rows)||rows.length!==1||rows[0]?.user_id!==actor)throw deny();
   return actor;
  }
 };
}

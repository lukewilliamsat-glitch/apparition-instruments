// TEMPORARY SMTP DIAGNOSTIC. Sends only to SMTP_FROM_EMAIL; invoke once, then retire.
// Gateway JWT verification is required. The body also requires an Admin member
// session or the project's service role JWT. No caller-supplied recipient/content.
type Env={get:(name:string)=>string|undefined};
const json=(status:number,message:string)=>Response.json({message},{status});
async function authorised(request:Request,env:Env,fetcher:typeof fetch){
 const token=/^Bearer (\S+)$/.exec(request.headers.get('Authorization')||'')?.[1];
 if(!token)return false;
 if(token===env.get('SUPABASE_SERVICE_ROLE_KEY'))return true;
 const url=env.get('SUPABASE_URL'),key=env.get('SUPABASE_ANON_KEY');if(!url||!key)return false;
 const headers={apikey:key,Authorization:'Bearer '+token};
 const identity=await fetcher(url+'/auth/v1/user',{headers});if(!identity.ok)return false;
 const user=await identity.json();if(!/^[a-f\d-]{36}$/i.test(user?.id||''))return false;
 const members=await fetcher(url+'/rest/v1/admin_members?user_id=eq.'+encodeURIComponent(user.id)+'&select=user_id',{headers});
 return members.ok&&(await members.json())?.[0]?.user_id===user.id;
}
async function sendTestMail(env:Env){
 const host=env.get('SMTP_HOST'),port=Number(env.get('SMTP_PORT')),user=env.get('SMTP_USER'),password=env.get('SMTP_PASSWORD'),from=env.get('SMTP_FROM_EMAIL'),name=env.get('SMTP_FROM_NAME');
 if(!host||port!==465||!user||!password||!from||!name||/[\r\n]/.test(from+name)||!/^\S+@\S+\.\S+$/.test(from))throw new Error('SMTP configuration incomplete or unsupported');
 const conn=await Deno.connectTls({hostname:host,port});const decoder=new TextDecoder(),encoder=new TextEncoder();let pending='';
 async function line(){while(!pending.includes('\n')){const buffer=new Uint8Array(2048),n=await conn.read(buffer);if(n===null)throw new Error('SMTP connection closed');pending+=decoder.decode(buffer.subarray(0,n));if(pending.length>16384)throw new Error('SMTP response too large');}const i=pending.indexOf('\n'),result=pending.slice(0,i).replace(/\r$/,'');pending=pending.slice(i+1);return result;}
 async function expect(code:number){let response;do{response=await line();if(!/^\d{3}[ -]/.test(response))throw new Error('SMTP response invalid');}while(response[3]==='-');if(Number(response.slice(0,3))!==code)throw new Error('SMTP rejected stage with code '+response.slice(0,3));}
 async function write(value:string){await conn.write(encoder.encode(value+'\r\n'));}
 async function command(value:string,code:number){await write(value);await expect(code);}
 const base64=(text:string)=>btoa(String.fromCharCode(...encoder.encode(text)));
 try{
  await expect(220);await command('EHLO apparitioninstruments.co.uk',250);
  await command('AUTH LOGIN',334);await command(base64(user),334);await command(base64(password),235);
  await command('MAIL FROM:<'+from+'>',250);await command('RCPT TO:<'+from+'>',250);
  await command('DATA',354);
  const data=['From: '+name+' <'+from+'>','To: <'+from+'>','Subject: Apparition Instruments SMTP Test','MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','','The Apparition Instruments production SMTP connection is working.','.'];
  await write(data.join('\r\n'));await expect(250);await command('QUIT',221);
 }finally{conn.close();}
}
export async function smtpDiagnostic(req:Request,env:Env=Deno.env,fetcher:typeof fetch=fetch){
 if(req.method!=='POST')return json(405,'POST required');
 try{if(!await authorised(req,env,fetcher))return json(403,'Authorised Admin or service role required');
  await sendTestMail(env);return json(200,'SMTP accepted one test email to the configured sender mailbox');
 }catch(error){const message=error instanceof Error?error.message:'SMTP diagnostic failed';
  // Never echo server responses, account identifiers, passwords or addresses.
  return json(503,/^SMTP (configuration|connection|response|rejected)/.test(message)?message:'SMTP delivery failed');}
}
if(import.meta.main)Deno.serve(req=>smtpDiagnostic(req));

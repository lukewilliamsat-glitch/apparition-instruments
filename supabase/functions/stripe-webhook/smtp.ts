// SMTP over implicit TLS. No caller-controlled server, sender or credentials.
export async function sendOrderMail(env:{get:(key:string)=>string|undefined},mail:{to:string;subject:string;text:string;html:string},connect:(options:{hostname:string;port:number})=>Promise<any>=Deno.connectTls){
 const host=env.get('SMTP_HOST'),port=Number(env.get('SMTP_PORT')),user=env.get('SMTP_USER'),password=env.get('SMTP_PASSWORD'),from=env.get('SMTP_FROM_EMAIL'),name=env.get('SMTP_FROM_NAME');
 if(!host||port!==465||!user||!password||!from||!name||/[\r\n]/.test(from+name)||!/^\S+@\S+\.\S+$/.test(from)||!/^\S+@\S+\.\S+$/.test(mail.to)||!/^Apparition Instruments order AI-\d+ confirmed$/.test(mail.subject))throw new Error('SMTP configuration or recipient invalid');
 const encoder=new TextEncoder(),decoder=new TextDecoder();let conn:any,buffer='',dataStarted=false;
 const base64=(value:string)=>btoa(String.fromCharCode(...encoder.encode(value)));
 const safe=(value:string)=>value.replace(/\r\n?/g,'\n').split('\n').map(line=>line.startsWith('.')?'.'+line:line).join('\r\n');
 try{
  conn=await connect({hostname:host,port});
  async function line(){while(!buffer.includes('\n')){const bytes=new Uint8Array(2048),n=await conn.read(bytes);if(n===null)throw Error('SMTP connection closed');buffer+=decoder.decode(bytes.subarray(0,n));if(buffer.length>16384)throw Error('SMTP response exceeded limit');}const i=buffer.indexOf('\n'),value=buffer.slice(0,i).replace(/\r$/,'');buffer=buffer.slice(i+1);return value;}
  async function expect(code:number){let value;do{value=await line();if(!/^\d{3}[ -]/.test(value))throw Error('SMTP response invalid');}while(value[3]==='-');if(Number(value.slice(0,3))!==code)throw Error('SMTP rejected command ('+value.slice(0,3)+')');}
  async function write(value:string){const bytes=encoder.encode(value+'\r\n');let written=0;while(written<bytes.length){const n=await conn.write(bytes.subarray(written));if(!n)throw Error('SMTP write incomplete');written+=n;}}
  async function command(value:string,code:number){await write(value);await expect(code);}
  await expect(220);await command('EHLO apparitioninstruments.co.uk',250);
  await command('AUTH LOGIN',334);await command(base64(user),334);await command(base64(password),235);
  await command('MAIL FROM:<'+from+'>',250);await command('RCPT TO:<'+mail.to+'>',250);
  await command('DATA',354);dataStarted=true;
  const boundary='apparition-order-confirmation';
  const parts=['From: '+name+' <'+from+'>','To: <'+mail.to+'>','Subject: '+mail.subject,'MIME-Version: 1.0','Content-Type: multipart/alternative; boundary="'+boundary+'"','',
   '--'+boundary,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: 8bit','',safe(mail.text),'',
   '--'+boundary,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: 8bit','',safe(mail.html),'','--'+boundary+'--','.'];
  await write(parts.join('\r\n'));await expect(250);dataStarted=false;
  try{await command('QUIT',221);}catch{/* Mail was already accepted. */}
 }catch(error){const reason=error instanceof Error?error.message:'SMTP failure';throw Object.assign(new Error(/^SMTP /.test(reason)?reason:'SMTP connection failed'),{outcome:dataStarted?'unknown':'failed'});}
 finally{try{conn?.close();}catch{}}
}

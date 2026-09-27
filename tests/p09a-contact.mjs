import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {validateEnquiry,renderEnquiry,categories} from '../supabase/functions/contact-enquiry/mail.ts';
import {receiveContactEnquiry} from '../supabase/functions/contact-enquiry/index.ts';
import {sendContactMail} from '../supabase/functions/contact-enquiry/smtp.ts';
import {createContactController} from '../dist/contact/contact.mjs';
const submissionId='11111111-1111-4111-8111-111111111111';
const good={submissionId,name:'  Alice   Customer  ',email:'Alice@example.co.uk',category:'order',orderReference:'ai-010010',message:'Please help with my order.\nSecond paragraph here.',website:''};
const valid=validateEnquiry(good);assert.equal(valid.name,'Alice Customer');assert.equal(valid.email,'alice@example.co.uk');assert.equal(valid.orderReference,'AI-010010');
const mail=renderEnquiry({...valid,message:'Hello <script>alert(1)</script>\nSecond paragraph'},'2026-09-27T12:00:00Z');
assert.equal(mail.to,'luke@apparitioninstruments.co.uk');assert.equal(mail.replyTo,'alice@example.co.uk');assert.equal(mail.subject,'Apparition Instruments enquiry - Order Help');assert(mail.text.includes('Reply to this email'));assert(mail.text.includes('Second paragraph'));assert(mail.html.includes('&lt;script&gt;'));assert(!mail.html.includes('<script>'));assert(mail.html.includes('NEW WEBSITE ENQUIRY'));
for(const [key,value] of Object.entries({name:'',email:'invalid',category:'subject: injected',orderReference:'AI-010010\r\nBcc: evil',message:'',submissionId:'bad'}))assert.throws(()=>validateEnquiry({...good,[key]:value}),key);
for(const [key,value] of Object.entries({name:'Alice\r\nBcc: evil@example.com',email:'evil@example.com\nBcc: x@y.test',message:'a'.repeat(5001),orderReference:'AI-XYZ',website:'x'.repeat(201)}))assert.throws(()=>validateEnquiry({...good,[key]:value}),key);
assert.throws(()=>validateEnquiry({...good,message:'short'}));assert.throws(()=>validateEnquiry({...good,name:'A'.repeat(101)}));assert.throws(()=>validateEnquiry({...good,email:'a'.repeat(250)+'@example.co.uk'}));
assert.equal(Object.keys(categories).length,6);
const env={get:key=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'service-secret'}[key])};
const req=(input=good)=>new Request('https://example.supabase.co/functions/v1/contact-enquiry',{method:'POST',headers:{Origin:'https://apparitioninstruments.co.uk','Content-Type':'application/json','cf-connecting-ip':'203.0.113.3'},body:JSON.stringify(input)});
function system(outcome='sent',reserve='accepted'){
 let state=reserve,marks=0,sends=0;const paths=[];
 const transport=async(url,init)=>{const path=url.split('/rest/v1/')[1];paths.push(path);assert.equal(init.headers.apikey,'service-secret');
  if(path==='rpc/reserve_contact_enquiry'){const args=JSON.parse(init.body);assert.equal(args.p_email,'alice@example.co.uk');assert.equal(args.p_ip,'203.0.113.3');return Response.json(state);}
  if(path==='rpc/mark_contact_enquiry_attempt'){if(state!=='accepted')return Response.json(false);marks++;state='attempting';return Response.json(true);}
  if(path==='rpc/finish_contact_enquiry'){state=JSON.parse(init.body).p_outcome;return Response.json(true);}
  throw Error('Contact may not access '+path);
 };
 const send=async(_env,message)=>{sends++;assert.equal(message.to,'luke@apparitioninstruments.co.uk');assert.equal(message.replyTo,'alice@example.co.uk');if(outcome!=='sent')throw Object.assign(Error('SMTP'),{outcome});};
 return {invoke:(input=good)=>receiveContactEnquiry(req(input),env,transport,send),paths,get marks(){return marks},get sends(){return sends},get state(){return state}};
}
const delivered=system();assert.equal((await delivered.invoke()).status,200);assert.equal(delivered.state,'sent');assert.equal((await delivered.invoke()).status,200);assert.equal(delivered.sends,1);assert.equal(delivered.marks,1);
for(const outcome of ['failed','unknown']){const s=system(outcome);assert.equal((await s.invoke()).status,outcome==='unknown'?202:502);assert.equal(s.state,outcome);await s.invoke();assert.equal(s.sends,1);}
const limited=system('sent','rate_limited');assert.equal((await limited.invoke()).status,429);assert.equal(limited.sends,0);
const bot=system();assert.equal((await bot.invoke({...good,website:'https://bot.test'})).status,200);assert.equal(bot.paths.length,0);assert.equal(bot.sends,0);
const invalid=system();assert.equal((await invalid.invoke({...good,email:'evil\r\nBcc: x@y.test'})).status,400);assert.equal(invalid.paths.length,0);
assert.equal((await receiveContactEnquiry(new Request(req().url,{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify(good)}),env,async()=>{throw Error('Foreign origin');})).status,403);
const smtpEnv={get:key=>({SMTP_HOST:'smtp.example.test',SMTP_PORT:'465',SMTP_USER:'user',SMTP_PASSWORD:'password',SMTP_FROM_EMAIL:'sender@example.test',SMTP_FROM_NAME:'Apparition Instruments'}[key])};
let writes=[];const replies=['220 hi','250 hello','334 user','334 password','235 authenticated','250 sender','250 recipient','354 data','250 queued','221 bye'];
const connect=async()=>({read:async bytes=>{const next=replies.shift();if(!next)return null;const data=new TextEncoder().encode(next+'\r\n');bytes.set(data);return data.length;},write:async bytes=>{writes.push(new TextDecoder().decode(bytes));return bytes.length;},close:()=>{}});
await sendContactMail(smtpEnv,mail,connect);const wire=writes.join('');assert(wire.includes('RCPT TO:<luke@apparitioninstruments.co.uk>'));assert(wire.includes('Reply-To: <alice@example.co.uk>'));assert(wire.includes('Subject: Apparition Instruments enquiry - Order Help'));assert(!wire.includes('RCPT TO:<alice@example.co.uk>'));
await assert.rejects(()=>sendContactMail(smtpEnv,{...mail,to:'attacker@example.co.uk'},async()=>{throw Error('must not connect')}));
await assert.rejects(()=>sendContactMail(smtpEnv,{...mail,replyTo:'alice@example.co.uk\r\nBcc: attacker@example.com'},async()=>{throw Error('must not connect')}));
const db=readFileSync('supabase/migrations/20260927121000_p09a_contact_audit.sql','utf8');assert(db.includes('pg_advisory_xact_lock'));assert(db.includes('extensions.hmac'));assert(db.includes("'14 days'"));assert(!/\b(?:message|customer_name|reply_to)\s+text\b/i.test(db));
const contactSource=readFileSync('supabase/functions/contact-enquiry/index.ts','utf8');
assert(contactSource.includes("owner_user_id:'eq.'+owner.id"));
assert(!/inventory|refund|stripe|fulfilment|order_email_deliveries/.test(contactSource));
const html=readFileSync('dist/contact/index.html','utf8');assert(html.includes('name="orderReference"')&&html.includes('name="website"')&&html.includes('name="name"')&&html.includes('name="email"'));
const window=new Window(),document=window.document;globalThis.FormData=window.FormData;document.body.innerHTML='<form id="enquiry-form"><input name="name" value="Alice"><input name="email" value="alice@example.co.uk"><select name="category"><option value="order" selected>Order Help</option></select><input name="orderReference" value="AI-010010"><textarea name="message">A long enough question here.</textarea><input name="website" value=""><button type="submit">Send enquiry</button></form><p id="enquiry-status"></p><div id="enquiry-success" hidden tabindex="-1"></div>';
const form=document.querySelector('form'),notice=document.querySelector('#enquiry-status'),success=document.querySelector('#enquiry-success');let calls=0,resolve;
const pending=new Promise(r=>resolve=r);const controller=createContactController({form,notice,success,id:()=>submissionId,config:{url:'https://example.supabase.co',publishableKey:'sb_publishable_test'},request:async(url,init)=>{calls++;assert.equal(url,'https://example.supabase.co/functions/v1/contact-enquiry');assert(!init.body.includes('service-secret'));await pending;return Response.json({state:'sent'});}});
const first=controller.submit(new window.Event('submit',{cancelable:true}));assert(form.querySelector('button').disabled);await controller.submit(new window.Event('submit',{cancelable:true}));assert.equal(calls,1);resolve();await first;assert(form.hidden&&!success.hidden);
for(const [outcome,statusCode,shouldEnable] of [['failed',502,true],['rate_limited',429,true],['uncertain',202,false]]){
 const page=new Window();page.document.body.innerHTML='<form><input name="name" value="Alice"><input name="email" value="alice@example.co.uk"><select name="category"><option value="order">Order Help</option></select><input name="orderReference" value="AI-010010"><textarea name="message">Keep this message intact.</textarea><input name="website"><button type="submit">Send enquiry</button></form><p></p><div hidden tabindex="-1"></div>';
 const f=page.document.querySelector('form'),n=page.document.querySelector('p'),s=page.document.querySelector('div');
 const c=createContactController({form:f,notice:n,success:s,id:()=>crypto.randomUUID(),request:async()=>new Response(JSON.stringify({state:outcome}),{status:statusCode})});
 await c.submit(new page.Event('submit',{cancelable:true}));assert.equal(f.querySelector('textarea').value,'Keep this message intact.');assert.equal(f.querySelector('button').disabled,!shouldEnable);assert.equal(n.dataset.state,outcome==='uncertain'?'uncertain':'error');page.happyDOM.abort();
}
window.happyDOM.abort();
console.log('P09A: validation, escaping, SMTP headers, audit isolation, idempotency, rate limit, honeypot and browser states PASS');

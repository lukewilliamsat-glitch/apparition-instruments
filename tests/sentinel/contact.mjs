import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createContactController} from '../../dist/contact/contact.mjs';
let checks=0;const results=[];
for(const scenario of ['sent','failed','invalid','rate_limited','timeout','lost','malformed','ambiguous','validation']){
 const w=new Window(),d=w.document;globalThis.FormData=w.FormData;
 d.body.innerHTML='<form><input name="name" required value="Fictional Customer"><input name="email" type="email" required value="fictional@example.invalid"><select name="category"><option value="general">General</option></select><input name="orderReference"><textarea name="message" required minlength="10">Fictional retained message — Ω &amp; detail.</textarea><input name="website"><button type="submit">Send enquiry</button></form><p role="status" aria-live="polite"></p><div hidden tabindex="-1"></div>';
 const form=d.querySelector('form'),button=d.querySelector('button'),notice=d.querySelector('p'),success=d.querySelector('div'),message=form.elements.message.value,bodies=[];let ids=0;
 if(scenario==='validation')form.elements.email.value='invalid';
 const c=createContactController({form,notice,success,location:new URL('http://fixture.invalid/contact/'),config:{url:'https://fixture.invalid',publishableKey:'fictional'},id:()=>`11111111-1111-4111-8111-${String(++ids).padStart(12,'0')}`,request:async(_url,init)=>{bodies.push(JSON.parse(init.body));if(scenario==='timeout')throw new DOMException('private fixture timeout','TimeoutError');if(scenario==='lost')throw new TypeError('private fixture lost response');if(scenario==='malformed')return new Response('{');return Response.json({state:scenario==='ambiguous'?'unknown':scenario},{status:scenario==='failed'?502:scenario==='invalid'?400:scenario==='rate_limited'?429:scenario==='ambiguous'?202:200});}});
 await c.submit(new w.Event('submit',{cancelable:true}));
 const uncertain=['timeout','lost','malformed','ambiguous'].includes(scenario);
 assert.equal(bodies.length,scenario==='validation'?0:1);assert.equal(form.elements.message.value,message);
 if(uncertain){assert.equal(button.disabled,true);assert.equal(button.textContent,'Delivery not confirmed');assert.equal(form.getAttribute('aria-busy'),'false');assert.equal(notice.dataset.state,'uncertain');assert(!form.hidden&&success.hidden);assert(!notice.textContent.includes('private fixture'));await c.submit(new w.Event('submit',{cancelable:true}));assert.equal(bodies.length,1);assert.equal(ids,1);}
 else if(scenario==='sent'){assert(form.hidden&&!success.hidden);assert.equal(form.getAttribute('aria-busy'),'false');await c.submit(new w.Event('submit',{cancelable:true}));assert.equal(bodies.length,1);}
 else if(scenario!=='validation'){assert(!button.disabled&&button.textContent==='Send enquiry');assert.equal(notice.dataset.state,'error');assert.equal(ids,2,'Only definitive error changes the existing submission identity');assert.equal(form.getAttribute('aria-busy'),'false');}
 else{assert(!button.disabled);assert.notEqual(form.getAttribute('aria-busy'),'true');}
 results.push({scenario,status:'PASS',applicationRequests:bodies.length,uncertain,originalMessagePreserved:true});checks++;await w.happyDOM.close();
}
const w=new Window();globalThis.FormData=w.FormData;w.document.body.innerHTML='<form><input name="name" value="Fictional"><input name="email" value="fictional@example.invalid"><select name="category"><option value="general">General</option></select><input name="orderReference"><textarea name="message">Fictional pending enquiry text.</textarea><input name="website"><button type="submit">Send enquiry</button></form><p></p><div hidden tabindex="-1"></div>';
const form=w.document.querySelector('form');let release,calls=0;const pending=new Promise(r=>release=r),c=createContactController({form,notice:w.document.querySelector('p'),success:w.document.querySelector('div'),request:async()=>{calls++;await pending;return Response.json({state:'sent'});}});
const first=c.submit(new w.Event('submit',{cancelable:true}));assert.equal(form.getAttribute('aria-busy'),'true');await c.submit(new w.Event('submit',{cancelable:true}));assert.equal(calls,1);release();await first;assert.equal(form.getAttribute('aria-busy'),'false');checks++;await w.happyDOM.close();
console.log(JSON.stringify({status:'PASS',checks,results,scope:'RAV06 real controller/DOM with fictional request callbacks; not Chrome'}));

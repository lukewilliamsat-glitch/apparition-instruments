import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {setAdminOrderRepository} from '../dist/backend/order-data.mjs?v=external-v1';
import {installCatalogueFixture} from './fixtures/catalogue-fixture.mjs';
installCatalogueFixture();
const tick=()=>new Promise(r=>setTimeout(r,0));
const id='10000000-0000-4000-8000-000000000001';
for(const channel of ['EBAY','WEBSITE']){
 const w=new Window({url:'https://apparitioninstruments.co.uk/admin/orders/?id='+id});
 for(const key of ['document','window','location','localStorage'])globalThis[key]=key==='window'?w:w[key];
 w.document.body.innerHTML=readFileSync('dist/admin/orders/index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,'').replace(/<link[^>]+>/g,'');
 w.localStorage.setItem('apparition.admin.supabase-session.v1',JSON.stringify({access_token:'test-jwt',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600}));
 const order={id,reference:'AI-100001',updatedAt:'version',channel,externalReference:'EXT',customer:{name:'Fixture buyer',email:channel==='EBAY'?'buyer@members.ebay.com':'buyer@example.test'},delivery:{},dispatchDetails:{},notes:'',fulfilmentStatus:'ready_to_dispatch',status:'ready_to_dispatch',paymentStatus:'paid',items:[{name:'Part',type:'component',quantity:1,lineTotal:100,unitPrice:100,snapshot:{}}],pricing:{subtotal:100,delivery:0,total:100},statusHistory:[],emailDeliveries:[]};
 let calls=[],transitions=0;
 const transition=()=>{transitions++;order.fulfilmentStatus=order.status='dispatched';order.emailDeliveries=channel==='WEBSITE'?[{id:crypto.randomUUID(),kind:'dispatched',state:'pending',automatic_delivery_eligible:false}]:[];};
 setAdminOrderRepository({list:async()=>[structuredClone(order)],advanceFulfilment:async(_id,next)=>{assert.equal(next,'dispatched');transition();},correctFulfilment:async()=>{assert.fail('No correction during dispatch');}});
 globalThis.fetch=async(url,init)=>{
  const body=JSON.parse(init.body);calls.push({url,body});
  if(url.endsWith('/external-dispatch')){assert.equal(body.dispatch,true);assert.equal(body.send,false);transition();return Response.json({message:'Order dispatched. No email was sent.'});}
  if(url.endsWith('/prepare-dispatch')){assert.equal(order.fulfilmentStatus,'dispatched');return Response.json({previewIdentity:'signed',expires:Date.now()+600000,kind:'dispatched',mode:'first',from:{name:'Apparition',email:'orders@example.test'},to:order.customer.email,subject:'Saved subject',html:'<html><head></head><body>Saved message</body></html>',text:'Saved message',orderReference:order.reference,channel});}
  if(url.endsWith('/confirm-dispatch'))return Response.json({state:'failed',message:'Email failed. Review the notification audit. Automatic retry is disabled.'});
  throw Error('Unexpected '+url);
 };
 await import('../dist/admin/orders/app.mjs?dispatch-test='+channel);await tick();if(w.document.querySelector('#order-message').textContent)throw Error(w.document.querySelector('#order-message').textContent);
 const submit=()=>w.document.querySelector('#order-status-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
 const choice=text=>[...w.document.querySelectorAll('dialog button')].find(b=>b.textContent===text);
 submit();await tick();choice('Cancel').click();await tick();assert.equal(transitions,0);assert.equal(calls.length,0);
 submit();await tick();choice('Dispatch without Email').click();await tick();await tick();assert.equal(transitions,1);assert.equal(calls.filter(c=>c.url.endsWith('/prepare-dispatch')).length,0);assert.match(w.document.querySelector('#order-message').textContent,/No email has been sent/);
 order.fulfilmentStatus=order.status='ready_to_dispatch';order.emailDeliveries=[];w.dispatchEvent(new w.Event('pageshow'));await tick();
 submit();await tick();choice('Dispatch & Preview Email').click();await tick();await tick();assert.equal(transitions,2);assert.match(w.document.querySelector('dialog').textContent,/Cancelling this preview keeps the order Dispatched/);choice('Cancel').click();await tick();assert.equal(order.fulfilmentStatus,'dispatched');assert.equal(calls.filter(c=>c.url.endsWith('/confirm-dispatch')).length,0);
 order.fulfilmentStatus=order.status='ready_to_dispatch';order.emailDeliveries=[];w.dispatchEvent(new w.Event('pageshow'));await tick();submit();await tick();choice('Dispatch & Preview Email').click();await tick();await tick();const check=w.document.querySelector('dialog input');check.checked=true;check.dispatchEvent(new w.Event('change'));choice('Confirm & Send Email').click();await tick();await tick();assert.equal(order.fulfilmentStatus,'dispatched');assert.match(w.document.querySelector('#order-message').textContent,/Order changed to Dispatched\. Email failed/);assert.equal(calls.filter(c=>c.url.endsWith('/confirm-dispatch')).length,1);
 assert(calls.every(c=>!c.body.html&&!c.body.items));await w.happyDOM.close();
}
console.log('Actual Orders app dispatch PASS: website/eBay cancel, no-email transition, transition-before-preview, preview cancellation, failed mail keeps fulfilment, authenticated endpoints and no body overrides.');

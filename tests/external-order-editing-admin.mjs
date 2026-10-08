import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createAuthenticatedRepositoryTransport} from '../dist/backend/providers.mjs';
import {createAdminOrderRepository} from '../dist/backend/order-data.mjs';
import {mountExternalEditing,confirmDispatchEmail,requestExternalDispatch,isEbayRelay,externalRecipientAllowed} from '../dist/admin/orders/external-edit.mjs';
const w=new Window({url:'https://apparitioninstruments.co.uk/admin/orders/'});globalThis.document=w.document;
const root=w.document.createElement('div'),message=w.document.createElement('p');w.document.body.append(root,message);
const order={id:'saved',updatedAt:'2026-10-08T00:00:00Z',channel:'EBAY',externalReference:'REF',customer:{name:'Buyer'},delivery:{},dispatchDetails:{},notes:'',fulfilmentStatus:'dispatched',statusHistory:[],emailDeliveries:[]};
let changes=[],sends=0,refreshes=0;
const persisted={id:order.id,reference:'AI-123456',updated_at:order.updatedAt,sales_channel:order.channel,external_reference:order.externalReference,customer:{...order.customer},delivery:{},dispatch_details:{},internal_notes:'',items:[],status:'dispatched',payment_status:'paid',subtotal_pence:100,delivery_pence:0,total_pence:100,status_history:[]};
let inventoryWrites=0,emailRequests=0;
const transport=createAuthenticatedRepositoryTransport({accessToken:async()=> 'fixture-admin'},{request:async(url,options)=>{
 assert.equal(options.headers.Authorization,'Bearer fixture-admin');const resource=new URL(url).pathname.replace('/rest/v1/','');
 if(resource==='orders')return Response.json([persisted]);
 if(resource==='order_email_deliveries')return Response.json([]);
 if(resource==='rpc/edit_external_order'){
  const {p_order_id,p_expected_updated_at,p_change}=JSON.parse(options.body);assert.equal(options.method,'POST');assert.equal(p_order_id,order.id);assert.equal(p_expected_updated_at,order.updatedAt);
  changes.push([p_order_id,p_expected_updated_at,p_change]);persisted.customer={...persisted.customer,name:p_change.customerName,email:p_change.email};persisted.delivery=p_change.delivery;persisted.dispatch_details=p_change.dispatch;persisted.internal_notes=p_change.notes;persisted.external_reference=p_change.externalReference;return Response.json(true);
 }
 if(resource==='inventory')inventoryWrites++;if(url.includes('/functions/'))emailRequests++;
 throw Error('Unexpected fixture request '+resource);
}});
const repository=createAdminOrderRepository(transport);
const loaded=(await repository.list())[0];assert.equal(loaded.channel,'EBAY');assert.equal(loaded.customer.name,'Buyer');
await assert.rejects(transport.send('rpc/unapproved_resource',{method:'POST'}),/Unsupported Admin repository resource/);
const mount=o=>{root.replaceChildren();mountExternalEditing(o,{root,repository,message,refresh:async()=>refreshes++,requestDispatch:async()=>{sends++;return 'Sent';},confirm:async()=> 'yes'});};
mount(order);root.querySelector('button').click();const form=root.querySelector('form');form.reportValidity=()=>true;form.elements.email.value=' LATER@EXAMPLE.TEST ';form.dispatchEvent(new w.Event('submit',{cancelable:true}));form.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,0));assert.equal(changes.length,1);assert.equal(changes[0][2].email,'later@example.test');assert.equal(sends,0);assert.equal(refreshes,1);
assert.equal(changes[0][2].externalReference,'REF');assert.equal(changes[0][2].customerName,'Buyer');assert.equal(changes[0][2].notes,'');assert.equal(changes[0][2].dispatch.tracking_reference,'');assert.equal(changes[0][2].delivery.line1,'');
assert.equal(inventoryWrites,0);assert.equal(emailRequests,0);
const added=(await repository.list())[0];assert.equal(added.customer.email,'later@example.test');
mount({...order,customer:added.customer});root.querySelector('button').click();const changeForm=root.querySelector('form');changeForm.reportValidity=()=>true;changeForm.elements.email.value='changed@example.test';changeForm.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,0));assert.equal((await repository.list())[0].customer.email,'changed@example.test');assert.equal(changes.length,2);assert.equal(sends,0);assert.equal(inventoryWrites,0);assert.equal(emailRequests,0);assert.match(message.textContent,/No email was sent/);
mount({...order,customer:{name:'Buyer',email:'later@example.test'}});const send=[...root.querySelectorAll('button')].find(b=>b.textContent==='Send Dispatch Email');send.click();send.click();await new Promise(r=>setTimeout(r,0));assert.equal(sends,1);
mount({...order,customer:{email:'new@example.test'},emailDeliveries:[{kind:'dispatched',state:'sent',recipient_email:'old@example.test'}]});assert.match(root.textContent,/old@example.test/);assert.equal([...root.querySelectorAll('button')].some(b=>b.textContent==='Send Dispatch Email'),false);
for(const [label,result] of [['Yes, send email','yes'],['No, update only','no'],['Cancel','cancel']]){const promise=confirmDispatchEmail({document:w.document,email:'fixture@example.test'});const dialog=w.document.querySelector('dialog');assert.equal(dialog.open,true);assert.equal(dialog.getAttribute('aria-labelledby'),'external-dispatch-title');[...dialog.querySelectorAll('button')].find(b=>b.textContent===label).click();assert.equal(await promise,result);assert.equal(w.document.querySelector('dialog'),null);}
assert.equal(isEbayRelay('buyer@MeMbErS.EbAy.CoM'),true);assert.equal(isEbayRelay('buyer@members.ebay.com.evil.test'),false);assert.equal(externalRecipientAllowed('buyer@members.ebay.com','DIRECT'),false);
const relayDialog=confirmDispatchEmail({document:w.document,email:'buyer@members.ebay.com',channel:'EBAY'});assert.match(w.document.querySelector('dialog').textContent,/Delivery remains subject to eBay’s filtering/);assert.doesNotMatch(w.document.querySelector('dialog').textContent,/relay addresses are unavailable/);[...w.document.querySelectorAll('dialog button')].find(b=>b.textContent==='Cancel').click();assert.equal(await relayDialog,'cancel');
const escape=confirmDispatchEmail({document:w.document,email:'fixture@example.test'});w.document.querySelector('dialog').dispatchEvent(new w.Event('cancel',{cancelable:true}));assert.equal(await escape,'cancel');
let posted;await requestExternalDispatch({...order,customer:{email:'later@example.test'}},{send:true,auth:{accessToken:async()=> 'admin'},request:async(url,options)=>{posted=JSON.parse(options.body);assert.match(url,/external-dispatch$/);assert.equal(options.headers.Authorization,'Bearer admin');return Response.json({message:'Sent'});}});assert.equal(posted.dispatch,false);assert.equal(posted.send,true);
await w.happyDOM.close();console.log('External Admin PASS: real allowlisted transport/load/edit/save, optional empty fields, unchanged values, add/change email/no send, postdispatch manual send, double clicks, recipient history, native dialog Yes/No/Cancel/Escape, authenticated request');

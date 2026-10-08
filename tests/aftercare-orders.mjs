import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {setAdminOrderRepository} from '../dist/backend/order-data.mjs?v=external-v1';
import {installCatalogueFixture} from './fixtures/catalogue-fixture.mjs';
installCatalogueFixture();const tick=()=>new Promise(r=>setTimeout(r,0)),id='10000000-0000-4000-8000-000000000001';
const order={id,reference:'AI-100001',updatedAt:'version',createdAt:'2026-03-01T12:00:00Z',channel:'EBAY',externalReference:'EXT',customer:{name:'Luke Fixture',email:'buyer@members.ebay.com'},delivery:{},dispatchDetails:{carrier:'Royal Mail 2nd Class'},notes:'',fulfilmentStatus:'dispatched',status:'dispatched',paymentStatus:'paid',items:[{name:'Part',type:'component',quantity:1,lineTotal:100,unitPrice:100,snapshot:{}}],pricing:{subtotal:100,delivery:0,total:100},statusHistory:[],emailDeliveries:[]};
const row={orderId:id,reference:order.reference,customerName:order.customer.name,channel:'EBAY',dispatchAt:'2026-03-01T12:00:00Z',defaultDue:'2026-03-08',dueDate:'2026-03-08',state:'due',route:'manual',eligible:true,suppressed:false,shippingService:'Royal Mail 2nd Class',tracking:'Untracked service',history:[]};
for(const view of ['queue','detail','unavailable']){
 const w=new Window({url:'https://apparitioninstruments.co.uk/admin/orders/'+(view==='queue'?'?view=aftercare':view==='detail'?'?id='+id:'')});for(const key of ['window','document','location','localStorage'])globalThis[key]=key==='window'?w:w[key];w.document.body.innerHTML=readFileSync('dist/admin/orders/index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,'').replace(/<link[^>]+>/g,'');
 let writes=0;setAdminOrderRepository({list:async()=>[order],aftercare:async()=>{if(view==='unavailable')throw Error('Mock aftercare transport failure');return [row];},updateAftercare:async()=>writes++});
 await import('../dist/admin/orders/app.mjs?aftercare-test='+view);await tick();await tick();
 if(view==='queue'){assert(w.document.querySelector('#order-list').hidden);assert(!w.document.querySelector('#aftercare-queue').hidden);assert.match(w.document.querySelector('#aftercare-queue').textContent,/Luke Fixture/);const select=w.document.querySelector('#aftercare-queue select');select.value='all';select.dispatchEvent(new w.Event('change'));w.dispatchEvent(new w.Event('pageshow'));await tick();assert.equal(w.document.querySelector('#aftercare-queue select').value,'all');}
 if(view==='detail'){assert.match(w.document.querySelector('.order-aftercare').textContent,/8 Mar 2026/);assert([...w.document.querySelectorAll('.admin-order-sections a')].some(a=>a.textContent==='Customer Aftercare'));assert([...w.document.querySelectorAll('.order-aftercare button')].some(b=>b.textContent==='Preview Thank-You'));}
 if(view==='unavailable'){assert.match(w.document.querySelector('#order-rows').textContent,/AI-100001/);assert(!w.document.querySelector('#order-list').hidden);}
 assert.equal(writes,0,'Loading due reminders never sends or updates state');await w.happyDOM.close();
}
console.log('Actual Orders aftercare integration PASS: queue and order panel, detail anchor, retained filters, unavailable aftercare preserves Orders, no writes on load.');

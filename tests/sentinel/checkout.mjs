// Real checkout module/controller + happy-dom. Focus claims require Chrome.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {catalogue} from '../../dist/components/catalogue.mjs';
import {customerAuth} from '../../dist/account/client.mjs';
import '../../dist/commerce.mjs';
const key='apparition.basket.v1',item={id:'fictional-intent',product:'component',sku:'fictional-part',quantity:1};
catalogue.splice(0,catalogue.length,{id:item.sku,name:'Fictional part',price:599,stock:20,specs:{Value:'0.022µF'}});
customerAuth.getSession=async()=>({data:{session:null},error:null});
const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}assert.fail('Controller condition did not settle');};
let serial=0;const results=[];
async function setup(search=''){
 const w=new Window({url:'http://fixture.invalid/checkout/'+search,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});w.document.write(readFileSync('dist/checkout/index.html','utf8'));w.apparitionStoreState={state:'OPEN'};w.localStorage.setItem(key,JSON.stringify({version:1,items:[item]}));
 Object.assign(globalThis,{window:w,document:w.document,location:w.location,localStorage:w.localStorage,CustomEvent:w.CustomEvent});
 const calls=[],pending=[],navigation=[];w.location.assign=url=>navigation.push(url);
 globalThis.fetch=async(url,init)=>{const p=new URL(String(url)).pathname;if(p.endsWith('/commerce_shipping'))return Response.json([{standard_delivery_pence:399,free_delivery_threshold_pence:5000}]);assert(p.endsWith('/functions/v1/create-checkout'),'Unexpected request is denied');calls.push(JSON.parse(init.body));return new Promise((resolve,reject)=>pending.push({resolve,reject}));};
 await import('../../dist/checkout/checkout.mjs?sentinel-unit='+ ++serial);await until(()=>w.document.querySelector('.checkout-order-form'));
 const form=w.document.querySelector('.checkout-order-form'),button=form.querySelector('button'),status=form.querySelector('[role="status"]');
 const event=(state='OPEN')=>{w.apparitionStoreState={state,customer_message:state==='OPEN'?'':'Fictional pause'};w.dispatchEvent(new w.CustomEvent('apparition:store-status',{detail:w.apparitionStoreState}));};
 const submit=()=>form.dispatchEvent(new w.Event('submit',{cancelable:true}));
 return{w,form,button,status,calls,pending,navigation,event,submit};
}
const decline=()=>Response.json({message:'Fictional authoritative rejection.'},{status:409});
const accepted=totalPence=>Response.json({url:'https://checkout.stripe.com/c/pay/FICTIONAL',reference:'AI-010001',totalPence});
{
 const f=await setup();f.button.focus();for(let i=0;i<5;i++)f.event();assert.equal(f.w.document.querySelector('.checkout-order-form'),f.form);assert.equal(f.w.document.activeElement,f.button);assert.equal(f.calls.length,0);results.push('idle status retains form/focus and makes no checkout request');await f.w.happyDOM.close();
}
{
 const f=await setup();f.button.focus();f.submit();await until(()=>f.calls.length===1);const id=f.calls[0].requestId;f.event();f.submit();assert.equal(f.calls.length,1);assert(f.button.disabled);assert.equal(f.form.getAttribute('aria-busy'),'true');assert(f.form.isConnected);
 f.event('ORDERS_PAUSED');f.pending[0].resolve(decline());await until(()=>f.form.getAttribute('aria-busy')==='false');assert(f.button.disabled);assert(f.form.isConnected);f.event();assert(!f.button.disabled);f.submit();await until(()=>f.calls.length===2);assert.equal(f.calls[1].requestId,id);f.pending[1].resolve(decline());await until(()=>!f.button.disabled);results.push('one pending attempt; pause/open; definitive response; same request identity');await f.w.happyDOM.close();
}
{
 const f=await setup();f.submit();await until(()=>f.calls.length===1);f.pending[0].reject(new TypeError('private lost response'));await until(()=>f.button.textContent==='Checkout outcome unconfirmed');assert.equal(f.form.getAttribute('aria-busy'),'false');f.event();f.submit();assert.equal(f.calls.length,1);assert(f.button.disabled&&f.form.isConnected);assert.match(f.status.textContent,/could not confirm/);assert(!f.status.textContent.includes('private'));assert.equal(JSON.parse(f.w.localStorage.getItem(key)).items[0].quantity,1);results.push('uncertain settlement never restarts on status or submit events');await f.w.happyDOM.close();
}
{
 const f=await setup();f.submit();await until(()=>f.calls.length===1);f.w.localStorage.setItem(key,JSON.stringify({version:1,items:[{...item,quantity:2}]}));f.w.dispatchEvent(new f.w.CustomEvent('apparition:basket-changed'));assert(f.form.isConnected);assert.equal(f.calls.length,1);f.pending[0].resolve(decline());await until(()=>f.w.document.querySelector('.checkout-quantity')?.textContent.includes('2'));assert.equal(JSON.parse(f.w.localStorage.getItem(key)).items[0].quantity,2);assert.equal(f.calls.length,1);assert.match(f.w.document.querySelector('.checkout-order-form [role="status"]').textContent,/Fictional authoritative rejection/);results.push('basket progress and definitive error retained during delayed request; no automatic new submission');await f.w.happyDOM.close();
}
for(const [total,shouldNavigate]of [[998,true],[999,false]]){
 const f=await setup();f.submit();await until(()=>f.calls.length===1);f.pending[0].resolve(accepted(total));await until(()=>f.form.getAttribute('aria-busy')==='false');assert.equal(f.navigation.length,shouldNavigate?1:0);results.push(shouldNavigate?'validated fictional handoff goes only to mocked navigation sink':'amount mismatch prevents handoff');await f.w.happyDOM.close();
}
{
 const f=await setup();f.submit();await until(()=>f.calls.length===1);f.event('ORDERS_PAUSED');f.pending[0].resolve(accepted(998));await until(()=>f.button.textContent==='Checkout outcome unconfirmed');assert.equal(f.navigation.length,0);assert(f.button.disabled);results.push('availability change prevents late handoff and any automatic retry');await f.w.happyDOM.close();
}
{
 const f=await setup('?checkout=cancel');assert.match(f.w.document.querySelector('#checkout-content').textContent,/cancelled.*Pending and Unpaid/);assert.equal(JSON.parse(f.w.localStorage.getItem(key)).items.length,1);results.push('cancellation wording and stored basket preserved');await f.w.happyDOM.close();
}
console.log(JSON.stringify({status:'PASS',checks:results.length,results,scope:'Native checkout JS/happy-dom; fictional fetch and navigation sinks, not real payment or Chrome'}));

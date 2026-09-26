import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dispatchCanary,handleTransactionalEmail} from '../supabase/functions/transactional-email/index.ts';
const orderId='a3217839-e590-431f-8c40-c59ec9a75b64',deliveryId='56b1b78d-3c97-49b1-9360-ad3e411f5784';
const env={get:key=>({SUPABASE_URL:'https://project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'service'}[key])};
const request=token=>new Request('https://project.supabase.co/functions/v1/transactional-email/canary',{method:'POST',headers:{Authorization:'Bearer '+token}});
const makeOrder=(kind,details={})=>({id:orderId,reference:'AI-010010',payment_status:'paid',status:kind,customer:{name:'Recipient',email:'persisted@example.co.uk'},items:[{name:'Test Item',quantity:1,unitPrice:1,lineTotal:1}],subtotal_pence:1,delivery_pence:399,total_pence:400,dispatch_details:details});
function scenario(kind='ready_to_dispatch',details={}){
 let state='pending',attempts=0,sends=0,finished,queries=[];
 const row={id:deliveryId,order_id:orderId,kind,state};
 const transport=async(url,options)=>{
  const path=url.split('/rest/v1/')[1];queries.push(path);
  if(path==='rpc/get_ai010010_canary_token')return Response.json('private-token');
  if(path.startsWith('order_email_deliveries?')){
   if(path.includes('order_id=eq.')&&!path.includes('order_id=eq.'+orderId))throw Error('Unexpected order selector');
   return Response.json(state==='pending'?[{...row,state}]:[]);
  }
  if(path==='rpc/claim_order_email_delivery'){if(state!=='pending')return Response.json(null);state='claimed';return Response.json('33333333-3333-4333-8333-333333333333');}
  if(path.startsWith('orders?'))return Response.json([makeOrder(kind,details)]);
  if(path==='rpc/mark_order_email_attempt'){attempts++;return Response.json(true);}
  if(path==='rpc/finish_order_email_delivery'){finished=JSON.parse(options.body).p_state;state=finished;return Response.json(true);}
  throw Error('Unexpected query '+path);
 };
 const send=async(_env,mail)=>{sends++;assert.equal(mail.to,'persisted@example.co.uk');assert(mail.html.includes(kind==='ready_to_dispatch'?'ready-to-dispatch-email.png':'dispatched-email.png'));assert(mail.html.includes('Company No. 17454761'));if(kind==='dispatched'){assert.equal(mail.text.includes('Tracking reference:'),Boolean(details.tracking_reference));}};
 return {invoke:()=>dispatchCanary(request('private-token'),env,transport,send),get sends(){return sends;},get attempts(){return attempts;},get finished(){return finished;},queries,transport,send};
}
const ready=scenario();assert.equal((await ready.invoke()).status,200);assert.equal(ready.sends,1);assert.equal(ready.attempts,1);assert.equal(ready.finished,'sent');assert.equal((await ready.invoke()).status,200);assert.equal(ready.sends,1);
const duplicate=scenario();await Promise.all([duplicate.invoke(),duplicate.invoke()]);assert.equal(duplicate.sends,1);
for(const details of [{},{carrier:'Royal Mail',tracking_reference:'TRACK-123',tracking_url:'https://example.invalid/track'}]){const s=scenario('dispatched',details);await s.invoke();assert.equal(s.sends,1);}
const unauthorized=scenario();assert.equal((await dispatchCanary(request('wrong'),env,unauthorized.transport,unauthorized.send)).status,401);assert.equal(unauthorized.sends,0);
const otherOrder='22222222-2222-4222-8222-222222222222';const other=async(url,options)=>{
 const path=url.split('/rest/v1/')[1];if(path==='rpc/get_ai010010_canary_token')return Response.json('private-token');
 if(path.startsWith('order_email_deliveries?')){assert(path.includes('order_id=eq.'+orderId));return Response.json([]);}
 throw Error('Other order accessed: '+otherOrder);
};
assert.equal((await dispatchCanary(request('private-token'),env,other,async()=>{throw Error('Other order sent');})).status,200);
const migration=readFileSync('supabase/migrations/20260926232000_p08b5a_ai010010_canary.sql','utf8');
assert.match(migration,/order_id='a3217839-e590-431f-8c40-c59ec9a75b64'/);assert.match(migration,/kind in \('ready_to_dispatch','dispatched'\)/);assert(!/update public\.orders|insert into public\.order_email_deliveries|refund|inventory/i.test(migration));
console.log('P08B.5A: fixed-order canary, V2 dispatch variants, atomic replay and isolation PASS');

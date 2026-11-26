import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHmac} from 'node:crypto';
const root=await mkdtemp(join(tmpdir(),'nexus93-edge-'));
const text=name=>readFile(new URL(name,import.meta.url),'utf8');
const legacyNames=['index.ts','contact.ts','delivery.ts','confirmation.ts','v2.ts','smtp.ts','refund.ts'];
const originalFetch=globalThis.fetch;
try{
 await mkdir(join(root,'legacy'));
 for(const name of legacyNames)await writeFile(join(root,'legacy',name),await text('legacy/'+name));
 await writeFile(join(root,'legacy/index.ts'),await text('legacy-router.production.review.ts'));
 const {receiveStripeWebhook}=await import(pathToFileURL(join(root,'legacy/index.ts')).href);
 const secret='whsec_Disposable93',url='https://acdxpxvksvdwfajntzfx.supabase.co';
 const env={get:key=>({STRIPE_WEBHOOK_SECRET:secret,SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:'fixture-service'})[key]};
 const base={id:'evt_DisposableFixture93',type:'checkout.session.completed',livemode:true,
  data:{object:{object:'checkout.session',id:'cs_live_DisposableFixture93',livemode:true,status:'complete',mode:'payment',
   payment_status:'paid',payment_intent:'pi_DisposableFixture93',amount_total:1633,currency:'gbp',
   client_reference_id:'AI-93000001',metadata:{order_id:'11111111-1111-4111-8111-111111111111',order_reference:'AI-93000001'},
   customer_details:{name:'Fixture',email:'fixture@example.invalid'},collected_information:{shipping_details:{name:'Fixture',address:{line1:'1 Test Street',city:'London',postal_code:'SW1A 1AA',country:'GB'}}}}}};
 const req=(event,valid=true)=>{const raw=JSON.stringify(event),t=Math.floor(Date.now()/1000);
  const signature=valid?createHmac('sha256',secret).update(t+'.'+raw).digest('hex'):'0'.repeat(64);
  return new Request('https://fixture.invalid',{method:'POST',headers:{'Stripe-Signature':'t='+t+',v1='+signature},body:raw});};
 let calls=[];
 const request=async(url,options)=>{calls.push(url);if(url.endsWith('/claim_paid_order_confirmation'))return Response.json(null);return Response.json('paid');};
 const reserved=structuredClone(base);reserved.data.object.metadata.dominion_binding='a'.repeat(64);reserved.data.object.client_reference_id=reserved.data.object.metadata.order_id;
 assert.equal((await receiveStripeWebhook(req(reserved,false),env,request)).status,401);assert.equal(calls.length,0);
 const routed=await receiveStripeWebhook(req(reserved),env,request);assert.equal(routed.status,200);assert.equal(await routed.text(),'UNITY routed');assert.equal(calls.length,0);
 assert.equal((await receiveStripeWebhook(req(base),env,request)).status,200);
 assert.deepEqual(calls.map(x=>x.split('/').pop()),['save_stripe_order_contact','fulfil_paid_stripe_checkout','claim_paid_order_confirmation']);
 // The new receiver retains the accepted confirmation claim after settlement;
 // failed claims stay retryable, and a duplicate settlement can recover them.
 let handler;globalThis.Deno={env,serve:fn=>{handler=fn;}};
 await writeFile(join(root,'index.ts'),await text('receiver.production.review.ts'));
 await import(pathToFileURL(join(root,'index.ts')).href);
 let claimFails=true,outcome='paid';calls=[];
 globalThis.fetch=async(url,options)=>{calls.push(url);if(url.endsWith('/convergence92_receive'))return Response.json({outcome});
  if(url.endsWith('/claim_paid_order_confirmation'))return claimFails?Response.json({}, {status:503}):Response.json(null);
  throw Error('Unexpected external operation');};
 assert.equal((await handler(req(reserved))).status,503);
 claimFails=false;outcome='duplicate';assert.equal((await handler(req(reserved))).status,200);
 assert.equal(calls.filter(x=>x.endsWith('/claim_paid_order_confirmation')).length,2);
 console.log('PASS signed-only legacy routing, exact old fulfilment/contact/confirmation path and new confirmation recovery after duplicate settlement');
}finally{globalThis.fetch=originalFetch;delete globalThis.Deno;await rm(root,{recursive:true,force:true});}

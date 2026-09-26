import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {v2Kinds,emailAssets,previewFixture,renderEmailV2} from '../supabase/functions/transactional-email/v2.ts';
import {handleEmailPreview,dispatchPending} from '../supabase/functions/transactional-email/index.ts';
import {nextFulfilment} from '../dist/admin/orders/lifecycle.mjs';
const env={get:key=>({SUPABASE_URL:'https://project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'private-service-key',SUPABASE_ANON_KEY:'public-anon-key'}[key])};
for(const kind of v2Kinds){const mail=previewFixture(kind);assert(mail.html.includes('AI-PREVIEW'));assert(mail.text.includes('AI-PREVIEW'));assert(mail.html.includes('alt="Apparition Instruments"'));assert(mail.html.includes('align="center"'));assert(mail.html.includes('https://apparitioninstruments.co.uk/contact/'));assert(!mail.html.includes('luke@apparitioninstruments.co.uk'));assert(!mail.text.includes('luke@apparitioninstruments.co.uk'));assert(mail.text.includes('Luke'));assert(!/<script\b|<style\b/i.test(mail.html));assert.equal(mail.to,'preview@example.invalid');}
const confirmed=previewFixture('order_confirmed');assert.match(confirmed.html,/ORDER CONFIRMED/);assert.match(confirmed.text,/2 × Premium Duncan-Style Treble Bleed/);assert.match(confirmed.text,/Delivery £0\.00/);assert.match(confirmed.text,/Total paid £54\.98/);assert.match(confirmed.text,/46 Example Road/);
assert.match(previewFixture('in_production').text,/another update|let you know/i);assert.match(previewFixture('ready_to_dispatch').text,/actually been dispatched/);
assert(confirmed.html.indexOf('apparition-logo-email.png')<confirmed.html.indexOf('the-violinist-email.png'));assert(confirmed.html.indexOf('the-violinist-email.png')>confirmed.html.indexOf('ORDER CONFIRMED'));assert(!previewFixture('in_production').html.includes('the-violinist-email.png'));
const artwork={order_confirmed:emailAssets.violinist,in_production:emailAssets.inProduction,ready_to_dispatch:emailAssets.readyToDispatch,dispatched:emailAssets.dispatched,full_refund:null};
const artworkUrls=Object.values(emailAssets).filter(url=>url!==emailAssets.logo);
for(const [kind,expected] of Object.entries(artwork)){
 const html=previewFixture(kind).html;
 assert.deepEqual(artworkUrls.filter(url=>html.includes(`src="${url}"`)),expected?[expected]:[],`${kind} must contain only its own artwork`);
 const footer=html.match(/<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="[^"]*background:#1d1d1b[^"]*">([\s\S]*?)<\/table>/)?.[1];
 assert(footer,`${kind} must have a footer table`);
 assert.equal((footer.match(/<tr>/g)||[]).length,1,`${kind} footer must remain a single row`);
 assert(footer.includes('Contact us')&&footer.includes('apparitioninstruments.co.uk')&&footer.includes('Company No. 17454761'));
 if(expected){
  assert(footer.includes(`src="${expected}"`),`${kind} artwork belongs beside the footer text`);
  assert(footer.includes('align="right" valign="middle" width="35%"'));
  assert(footer.includes('max-width:100%')||footer.includes('max-width:200px'));
  assert(footer.includes('word-break:break-word'),`${kind} footer text must wrap on narrow screens`);
 }else assert.equal((footer.match(/<td\b/g)||[]).length,1,'Refund footer must be text only');
}
for(const name of ['in-production','ready-to-dispatch','dispatched']){
 const png=readFileSync(`dist/assets/${name}-email.png`);
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(png.readUInt32BE(16),400);assert.equal(png.readUInt32BE(20),267);
 assert(png.includes(Buffer.from('tRNS')),`${name} must retain transparent pixels`);
 assert(png.length<100000,`${name} must remain email-safe`);
}
const bare=previewFixture('dispatched'),tracked=previewFixture('dispatched',true);assert(!bare.text.includes('Tracking reference'));assert(tracked.text.includes('Tracking reference: PREVIEW-123'));assert(tracked.html.includes('https://example.invalid/preview-tracking'));
assert(!bare.html.includes('DELIVERY DETAILS'));assert(tracked.html.includes('TRACK YOUR ORDER'));
const fixture={reference:'AI-010099',customer:{name:'Long name <script>alert(1)</script>',email:'safe@example.co.uk'},payment_status:'paid',delivery:{country:'GB'},items:[{name:'Long product name <img src=x onerror=alert(1)> '.repeat(3),quantity:2,unitPrice:250,lineTotal:500},{name:'Capacitor',quantity:1,unitPrice:200,lineTotal:200}],subtotal_pence:700,delivery_pence:399,total_pence:1099,dispatch_details:{carrier:'Royal Mail',tracking_reference:'A'.repeat(140),tracking_url:'javascript:alert(1)'}};
const referenceOnly=renderEmailV2('dispatched',fixture);assert(referenceOnly.html.includes('Tracking reference:'));assert(!referenceOnly.html.includes('TRACK YOUR ORDER'));assert(!referenceOnly.html.includes('javascript:'));assert(referenceOnly.text.includes('Carrier: Royal Mail'));
const longLines=renderEmailV2('order_confirmed',fixture);assert(!longLines.html.includes('<script>'));assert(!longLines.html.includes('<img src=x'));assert(longLines.html.includes('&lt;img src=x'));assert(longLines.html.includes('Total paid £10.99'));
assert.match(previewFixture('full_refund').text,/Refund processed £54\.98/);assert.match(previewFixture('full_refund').text,/bank or card provider/i);
assert.throws(()=>renderEmailV2('full_refund',{reference:'AI-123',customer:{email:'a@b.c',name:'Alice'},items:[{quantity:1,lineTotal:100,unitPrice:100,name:'Item'}],subtotal_pence:100,delivery_pence:0,total_pence:100,payment_status:'paid',refunded_pence:100}));
assert.equal(emailAssets.logo,'https://apparitioninstruments.co.uk/assets/apparition-logo-email.png');
for(const name of ['apparition-logo','the-violinist']){const original=statSync('dist/assets/'+name+'.png').size,optimized=statSync('dist/assets/'+name+'-email.png').size;assert(optimized<original/8);assert(optimized<100000);}
const identity='11111111-1111-4111-8111-111111111111';let paths=[];
const previewTransport=async(url)=>{paths.push(url);if(url.endsWith('/auth/v1/user'))return Response.json({id:identity});if(url.includes('/admin_members?'))return Response.json([{user_id:identity}]);throw Error('Unexpected network path');};
const previewReq=(token='Bearer admin-jwt',kind='order_confirmed')=>new Request('https://project.supabase.co/functions/v1/transactional-email/preview?kind='+kind,{headers:{Authorization:token,Origin:'https://apparitioninstruments.co.uk'}});
assert.equal((await handleEmailPreview(previewReq(),env,previewTransport)).status,200);assert.equal(paths.length,2);
assert.equal((await handleEmailPreview(previewReq(''),env,previewTransport)).status,401);
assert.equal((await handleEmailPreview(previewReq(),env,async url=>url.endsWith('/auth/v1/user')?Response.json({id:identity}):Response.json([]))).status,403);
assert.equal((await handleEmailPreview(previewReq('Bearer private-service-key'),env,previewTransport)).status,401);
assert.equal((await handleEmailPreview(previewReq('Bearer admin-jwt','invented'),env,previewTransport)).status,400);
const noDispatch=new Request('https://project.supabase.co/functions/v1/transactional-email/dispatch',{method:'POST'});
assert.equal((await dispatchPending(noDispatch,env,async()=>{throw Error('Must not touch data');})).status,401);
let queried=0;const serviceRequest=new Request(noDispatch.url,{method:'POST',headers:{Authorization:'Bearer private-service-key'}});
assert.equal((await dispatchPending(serviceRequest,env,async()=>{queried++;return Response.json([]);})).status,200);assert.equal(queried,1);
const deliveryId='22222222-2222-4222-8222-222222222222',orderId='33333333-3333-4333-8333-333333333333',claim='44444444-4444-4444-8444-444444444444';
let claimed=false,attempts=0,sent=0;const calls=[];
const workerTransport=async(url,options)=>{const path=url.split('/rest/v1/')[1];calls.push({path,body:options.body&&JSON.parse(options.body)});
 if(path.startsWith('order_email_deliveries?select=id&'))return Response.json([{id:deliveryId}]);
 if(path.startsWith('order_email_deliveries?select=id,order_id'))return Response.json([{id:deliveryId,order_id:orderId,kind:'in_production',state:'pending',source_event_id:'new-event'}]);
 if(path==='rpc/claim_order_email_delivery'){if(claimed)return Response.json(null);claimed=true;return Response.json(claim);}
 if(path.startsWith('orders?'))return Response.json([{reference:'AI-010099',customer:{name:'Customer',email:'persisted@example.co.uk'},payment_status:'paid',total_pence:400,items:[]}]);
 if(path==='rpc/mark_order_email_attempt'){attempts++;return Response.json(true);}
 if(path==='rpc/finish_order_email_delivery')return Response.json(true);
 throw Error('Unexpected transport path: '+path);
};
await Promise.all([dispatchPending(serviceRequest,env,workerTransport,async(_env,mail)=>{assert.equal(mail.to,'persisted@example.co.uk');sent++;}),dispatchPending(serviceRequest,env,workerTransport,async()=>{sent++;})]);
assert.equal(sent,1);assert.equal(attempts,1);assert(!calls.some(c=>/^(?:inventory|stripe)|rpc\/(?:.*inventory|.*payment|.*refund|.*fulfilment|.*confirmation)/.test(c.path)));
const sql=readFileSync('supabase/migrations/20260926181500_p08b4_dispatch_details.sql','utf8');assert.match(sql,/Admin membership required/);assert.match(sql,/status not in \('ready_to_dispatch','dispatched'\)/);assert.match(sql,/status_history=status_history\|\|/);assert.doesNotMatch(sql,/sendOrderMail|smtp|insert into public\.order_email_deliveries|payment_status\s*=|update public\.inventory/i);
const app=readFileSync('dist/admin/orders/app.mjs','utf8'),preview=readFileSync('dist/admin/email-preview/app.mjs','utf8'),engine=readFileSync('supabase/functions/transactional-email/index.ts','utf8');
assert.match(app,/Acknowledge partial refund and allow fulfilment/);assert.match(app,/recordDispatchDetails/);assert.match(app,/Unknown \/ Requires Review/);
assert.match(app,/Step 1/);assert.match(app,/Step 2/);assert.match(app,/Save your dispatch details before marking this Order Dispatched/);assert.match(app,/\.before\(form\)/);
assert.match(preview,/createAdminAuth\(\)\.accessToken\(\)/);assert(!/\.send\(|smtp|rpc\/|stripe/i.test(preview));
assert.match(engine,/No schedule, webhook call or Admin browser caller/);assert(!/setInterval|Deno\.cron|pg_net|sendConfirmedOrderOnce/.test(engine));
assert.equal(nextFulfilment({paymentStatus:'refunded',fulfilmentStatus:'ready_to_dispatch'}),null);
assert.equal(nextFulfilment({paymentStatus:'partially_refunded',partialRefundAcknowledged:false,fulfilmentStatus:'pending'}),null);
assert.equal(nextFulfilment({paymentStatus:'partially_refunded',partialRefundAcknowledged:true,fulfilmentStatus:'pending'}),'in_production');
console.log('P08B.4: V2 templates, assets, Admin-only previews, dispatch data, dormant dispatcher and lifecycle safeguards PASS');

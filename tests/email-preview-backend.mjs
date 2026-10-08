import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {aftercareDatabase as emailPreviewDatabase} from './fixtures/aftercare-database.mjs';
import {handlePreparedEmail,signPreview,verifyPreview,digest} from '../supabase/functions/transactional-email/prepared.ts';
import {renderEmailV2} from '../supabase/functions/transactional-email/v2.ts';
import {routeEmailRequest} from '../supabase/functions/transactional-email/index.ts';
const {db,actor,create,one,query,stock}=await emailPreviewDatabase();
await db.exec(readFileSync('supabase/migrations/20261008152227_email_template_studio_giga_v1.sql','utf8'));
const env={get:k=>({SUPABASE_URL:'https://backend.invalid',SUPABASE_SERVICE_ROLE_KEY:'server-secret',SUPABASE_ANON_KEY:'public',SMTP_FROM_EMAIL:'orders@example.test',SMTP_FROM_NAME:'Apparition Instruments'})[k]};
let time=Date.now(),sent=[],rpcCalls=[],failAt='',isAdmin=true,unauthorized=false;
const send=async(e,m)=>{sent.push(structuredClone(m));if(failAt==='provider')throw Object.assign(Error('mock'),{outcome:'failed'});if(failAt==='uncertain')throw Object.assign(Error('mock'),{outcome:'unknown'});};
await db.exec('grant usage on schema auth to authenticated,service_role;grant execute on function auth.uid() to authenticated,service_role;');
const transport=async(url,init={})=>{
 if(url.includes('/auth/v1/user'))return Response.json({id:actor},{status:unauthorized?401:200});
 if(url.includes('/admin_members?'))return Response.json(isAdmin?[{user_id:actor}]:[]);
 const name=url.split('/rpc/')[1];assert(name,'No direct order lookup or external provider calls');
 const p=JSON.parse(init.body);rpcCalls.push(name);
 if(name===failAt)throw Error('Mock transport lost');
 const params=Object.values(p).map(v=>v&&typeof v==='object'?JSON.stringify(v):v);
 const role=init.headers.Authorization==='Bearer server-secret'?'service_role':'authenticated';
 try{await db.exec('set role '+role);const result=(await db.query(`select public.${name}(${params.map((_,i)=>'$'+(i+1)).join(',')}) as result`,params)).rows[0].result;return Response.json(result);}
 catch(e){return Response.json({code:e.code},{status:e.code==='42501'?403:400});}
 finally{await db.exec('reset role');}
};
const req=(action,body,token='admin-token')=>new Request('https://backend.invalid/functions/v1/transactional-email/'+action,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
const call=(action,body,token)=>handlePreparedEmail(req(action,body,token),env,transport,send,()=>time);
const request={requestId:crypto.randomUUID(),channel:'EBAY',externalReference:'PREVIEW-TEST',orderDate:'2026-10-08',customerName:'Fixture buyer',postagePence:91,items:[{type:'component',productId:'a',quantity:2,unitPricePence:100}]};
async function fixture(channel='EBAY'){
 const o=await create({...request,requestId:crypto.randomUUID(),externalReference:crypto.randomUUID(),channel:channel==='WEBSITE'?'DIRECT':channel});
 await db.query(`update public.orders set customer=customer||jsonb_build_object('email',$2::text),dispatch_details='{"carrier":"Royal Mail","tracking_reference":"TEST","tracking_url":"https://example.test/track"}' where id=$1`,[o.id,channel==='EBAY'?'BUYER@MeMbErS.EbAy.CoM':'buyer@example.test']);
 if(channel==='WEBSITE')await db.query("update public.orders set sales_channel='WEBSITE',external_reference=null,order_date=null where id=$1",[o.id]);
 for(const stage of ['in_production','ready_to_dispatch','dispatched'])await db.query('select public.advance_order_fulfilment($1,$2)',[o.id,stage]);
 return o.id;
}
const snapshot=()=>query('select (select jsonb_agg(to_jsonb(o)) from public.orders o) orders,(select jsonb_agg(to_jsonb(d)) from public.order_email_deliveries d) ledger,(select jsonb_agg(to_jsonb(i)) from public.inventory i) inventory');
async function preview(id,mode='first'){const before=await snapshot(),n=sent.length,c=rpcCalls.length;const r=await call('prepare-dispatch',{orderId:id,mode});assert.equal(r.status,200,await r.clone().text());const p=await r.json();assert.deepEqual(await snapshot(),before);assert.equal(sent.length,n);assert.deepEqual(rpcCalls.slice(c),['get_dispatch_preview_context','get_published_email_template']);return p;}
const confirm=(id,p,extra={})=>call('confirm-dispatch',{orderId:id,previewIdentity:p.previewIdentity,recipientConfirmed:true,...extra});
let assertions=0;
for(const channel of ['EBAY','WEBSITE','DIRECT']){
 const id=await fixture(channel),p=await preview(id);assert.equal(p.channel,channel);assert.equal(p.mode,'first');assert.equal(p.to,channel==='EBAY'?'buyer@members.ebay.com':'buyer@example.test');
 const saved=(await one('select * from public.orders where id=$1',[id]));const expected=renderEmailV2('dispatched',{...saved,customer:{...saved.customer,email:p.to}});assert.deepEqual({to:p.to,subject:p.subject,html:p.html,text:p.text},expected);
 if(channel==='EBAY'){assert.doesNotMatch(p.html,/href=/);assert.match(p.html,/apparition-logo-email.png/);assert.match(p.text,/eBay order messages/);assert.doesNotMatch(p.text,/https:/);}
 const beforeOrder=await one('select to_jsonb(o) as o from public.orders o where id=$1',[id]),beforeStock=await stock();
 const r=await confirm(id,p);assert.equal(r.status,200);assert.equal((await r.json()).state,'sent');assert.deepEqual(sent.at(-1),expected);assert.deepEqual(await stock(),beforeStock);assert.deepEqual(await one('select to_jsonb(o) as o from public.orders o where id=$1',[id]),beforeOrder);
 const count=sent.length;assert.equal((await confirm(id,p)).status,409);assert.equal(sent.length,count);assert.equal((await call('prepare-dispatch',{orderId:id,mode:'first'})).status,409);
 const original=await query("select * from public.order_email_deliveries where kind='dispatched' and order_id=$1",[id]);const resend=await preview(id,'resend');
 assert.equal((await confirm(id,resend)).status,400);assert.equal((await confirm(id,resend,{reason:'x'})).status,400);assert.equal((await confirm(id,resend,{reason:'Requested copy',recipientConfirmed:false})).status,400);
 assert.equal((await confirm(id,resend,{reason:'Requested copy'})).status,200);assert.deepEqual(sent.at(-1),{to:resend.to,subject:resend.subject,html:resend.html,text:resend.text});
 const rows=await query("select * from public.order_email_deliveries where kind='dispatched' and order_id=$1 order by created_at,id",[id]);assert.equal(rows.length,2);assert.equal(rows[1].resend_of,rows[0].id);assert.equal(rows[1].resend_reason,'Requested copy');assert.equal(rows[1].external_requested_by,actor);assert.deepEqual(rows[0],original[0]);assert.notEqual(rows[0].operation_id,rows[1].operation_id);
 assert.equal((await confirm(id,resend,{reason:'Requested copy'})).status,409);assertions+=12;
}
// State, shipping, recipient, items and arbitrary concurrent edits invalidate without claiming.
for(const update of ["customer=customer||'{\"email\":\"changed@members.ebay.com\"}'","customer=customer||'{\"name\":\"Changed buyer\"}'","dispatch_details=dispatch_details||'{\"carrier\":\"Changed\"}'","updated_at=clock_timestamp()","status='ready_to_dispatch'","items=jsonb_set(items,'{0,name}','\"Changed item\"')","payment_status='refunded'"]){
 const id=await fixture(),p=await preview(id);await db.query('update public.orders set '+update+' where id=$1',[id]);const before=await snapshot(),n=sent.length;const r=await confirm(id,p);assert.equal(r.status,409);assert.equal((await r.json()).code,'PREVIEW_STALE');assert.deepEqual(await snapshot(),before);assert.equal(sent.length,n);assertions++;
}
const id=await fixture(),p=await preview(id),count=sent.length;
time+=600001;assert.equal((await confirm(id,p)).status,409);time-=600001;
assert.equal((await confirm(id,{...p,previewIdentity:p.previewIdentity.slice(0,-3)+'xyz'})).status,409);
const binding=await verifyPreview(p.previewIdentity,'server-secret');
for(const override of [{actor:crypto.randomUUID()},{contentHash:'different-template'},{template:'obsolete-template'},{mode:'marketing'},{expires:time+700000}])assert.equal((await confirm(id,{...p,previewIdentity:await signPreview({...binding,...override},'server-secret')})).status,409);
assert.equal((await confirm(await fixture(),p)).status,409);
assert.equal((await call('prepare-dispatch',{orderId:id,mode:'first',html:'<script>send()</script>'})).status,400);
assert.equal((await confirm(id,p,{to:'other@example.test'})).status,400);
assert.equal((await call('prepare-dispatch',{orderId:id,mode:'marketing'})).status,400);
assert.equal((await call('prepare-dispatch',{orderId:id,mode:'first'},'server-secret')).status,401);
unauthorized=true;assert.equal((await call('prepare-dispatch',{orderId:id,mode:'first'})).status,403);unauthorized=false;
isAdmin=false;assert.equal((await confirm(id,p)).status,403);isAdmin=true;assert.equal(sent.length,count);
assert.equal(await digest({b:1,a:{z:2,y:3}}),await digest({a:{y:3,z:2},b:1}));
// Changed eligibility, forced automated eligibility and latest pending/failed/unknown resend fail closed.
for(const outcome of ['failed','uncertain']){
 const fresh=await fixture(),p=await preview(fresh);failAt=outcome==='failed'?'provider':'uncertain';assert.equal((await confirm(fresh,p)).status,200);failAt='';assert.equal((await call('prepare-dispatch',{orderId:fresh,mode:'resend'})).status,409);assert.equal((await confirm(fresh,p)).status,409);
}
const native=await fixture('WEBSITE'),np=await preview(native);await assert.rejects(db.query('update public.order_email_deliveries set automatic_delivery_eligible=true where order_id=$1',[native]));await db.query("update public.order_email_deliveries set source_event_id='changed' where order_id=$1 and kind='dispatched'",[native]);assert.equal((await confirm(native,np)).status,409);
const concurrent=await fixture(),cp=await preview(concurrent);const current=await one('select public.get_dispatch_preview_context($1,false) as c',[concurrent]);await db.query('select public.confirm_dispatch_preview($1,$2,false,$3,$4,null)',[concurrent,actor,JSON.stringify(current.c),crypto.randomUUID()]);assert.equal((await confirm(concurrent,cp)).status,409);
// Confirmation double-claim and simultaneous confirmations share the existing order/ledger lock.
const burst=await fixture(),bp=await preview(burst),bc=(await verifyPreview(bp.previewIdentity,'server-secret')),ctx=(await one('select public.get_dispatch_preview_context($1,false) as c',[burst])).c;
const races=await Promise.allSettled(Array.from({length:6},()=>db.query('select public.confirm_dispatch_preview($1,$2,false,$3,$4,null)',[burst,actor,JSON.stringify(ctx),bc.operationId])));assert.equal(races.filter(r=>r.status==='fulfilled').length,1);
// Lost claim or provider-result transports never advertise a safe retry.
for(const stage of ['claim_email_template_preview','finish_order_email_delivery','mark_order_email_attempt']){const fresh=await fixture(),p=await preview(fresh);failAt=stage;const r=await confirm(fresh,p);assert.equal(r.status,503);assert.equal((await r.json()).code,'REVIEW_REQUIRED');failAt='';}
// Legacy direct-send endpoint now fails without requesting or claiming delivery.
const before=await snapshot();const old=await routeEmailRequest(req('external-dispatch',{orderId:id,dispatch:false,send:true,expectedEmail:'buyer@members.ebay.com'}),env,transport,send);assert.equal(old.status,409);assert.deepEqual(await snapshot(),before);
for(const role of ['anon','authenticated'])assert.equal((await one("select has_function_privilege($1,'public.confirm_dispatch_preview(uuid,uuid,boolean,jsonb,uuid,text)','execute') as ok",[role])).ok,false);
assert.equal((await one("select has_function_privilege('anon','public.get_dispatch_preview_context(uuid,boolean)','execute') as ok")).ok,false);
await db.exec("select set_config('request.jwt.claim.sub','',false)");await assert.rejects(db.query('select public.get_dispatch_preview_context($1,false)',[id]),e=>e.code==='42501');
await db.close();console.log('Email preview backend PASS: '+assertions+' grouped parity/state assertions; real SQL preparation/atomic claims, no preview mutations, website/eBay/direct exact provider payload, first/resend history, expiry/tamper/actor/order binding, role permissions, concurrency, stale state and conservative outcomes. All delivery mocked.');

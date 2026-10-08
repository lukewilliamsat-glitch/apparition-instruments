import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {aftercareDatabase} from './fixtures/aftercare-database.mjs';
import {handlePreparedEmail,verifyPreview,signPreview} from '../supabase/functions/transactional-email/prepared.ts';
import {renderEmailV2} from '../supabase/functions/transactional-email/v2.ts';
import {routeEmailRequest,dispatchPending} from '../supabase/functions/transactional-email/index.ts';
const {db,actor,create,query,one,stock}=await aftercareDatabase();
await db.exec(readFileSync('supabase/migrations/20261008152227_email_template_studio_giga_v1.sql','utf8'));
const env={get:k=>({SUPABASE_URL:'https://backend.invalid',SUPABASE_SERVICE_ROLE_KEY:'server-secret',SUPABASE_ANON_KEY:'public',SMTP_FROM_EMAIL:'orders@example.test',SMTP_FROM_NAME:'Apparition Instruments'})[k]};
let time=Date.now(),sent=[],isAdmin=true,userId=actor,failAt='',outcome='';
const send=async(e,m)=>{sent.push(structuredClone(m));if(outcome)throw Object.assign(Error('Mock delivery'),{outcome});};
const transport=async(url,init={})=>{
 if(url.includes('/auth/v1/user'))return Response.json({id:userId});
 if(url.includes('/admin_members?'))return Response.json(isAdmin?[{user_id:userId}]:[]);
 const name=url.split('/rpc/')[1];assert(name,'Preparation never scans customer tables directly');if(name===failAt)throw Error('Lost transport');
 const p=JSON.parse(init.body),params=Object.values(p).map(v=>v&&typeof v==='object'?JSON.stringify(v):v),role=init.headers.Authorization==='Bearer server-secret'?'service_role':'authenticated';
 try{await db.exec('set role '+role);return Response.json((await db.query(`select public.${name}(${params.map((_,i)=>'$'+(i+1)).join(',')}) r`,params)).rows[0].r);}catch(e){return Response.json({code:e.code},{status:e.code==='42501'?403:400});}finally{await db.exec('reset role');}
};
const req=(action,body,token='admin-token')=>new Request('https://backend.invalid/functions/v1/transactional-email/'+action,{method:'POST',headers:token?{Authorization:'Bearer '+token,'Content-Type':'application/json'}:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const call=(action,body,token)=>handlePreparedEmail(req(action,body,token),env,transport,send,()=>time);
const snapshot=()=>query('select (select jsonb_agg(to_jsonb(o)) from public.orders o) orders,(select jsonb_agg(to_jsonb(i)) from public.inventory i) inventory,(select jsonb_agg(to_jsonb(d)) from public.order_email_deliveries d) ledger,(select jsonb_agg(to_jsonb(a)) from public.order_aftercare a) aftercare');
const scalar=async(sql,p=[])=>(await one(sql,p)).r;
async function fixture(channel='WEBSITE'){
 const o=await create({requestId:crypto.randomUUID(),channel:channel==='WEBSITE'?'DIRECT':channel,externalReference:crypto.randomUUID(),orderDate:'2026-03-01',customerName:'Luke <Fixture>',postagePence:91,items:[{type:'component',productId:'a',quantity:1,unitPricePence:100}]});
 await db.query("update public.orders set status='dispatched',sales_channel=$2,external_reference=case when $2='WEBSITE' then null else external_reference end,order_date=case when $2='WEBSITE' then null else order_date end,customer=customer||jsonb_build_object('email',$3::text),status_history=jsonb_build_array(jsonb_build_object('status','dispatched','event_id',gen_random_uuid(),'at','2026-03-01T23:30:00Z')),dispatch_details='{\"carrier\":\"Royal Mail 2nd Class untracked\",\"tracking_reference\":\"N/A\"}' where id=$1",[o.id,channel,channel==='EBAY'?'hidden@members.ebay.com':crypto.randomUUID()+'@example.test']);return o.id;
}
async function preview(id){const before=await snapshot(),n=sent.length;const r=await call('prepare-aftercare',{orderId:id,mode:'first'});assert.equal(r.status,200,await r.clone().text());const p=await r.json();assert.equal(sent.length,n);assert.deepEqual(await snapshot(),before);return p;}
const confirm=(id,p,extra={})=>call('confirm-aftercare',{orderId:id,previewIdentity:p.previewIdentity,recipientConfirmed:true,...extra});
for(const channel of ['WEBSITE','DIRECT']){const id=await fixture(channel),p=await preview(id);assert.equal(p.kind,'aftercare');assert.equal(p.route,'email');assert.equal(p.subject,'Checking in after your Apparition Instruments order');assert.match(p.html,/apparition-logo-email/);assert.match(p.html,/Hi Luke,/);assert.match(p.text,/Hopefully your order has arrived safely and you're getting on well with everything\./);assert.match(p.text,/please don't hesitate to reply/);assert.doesNotMatch(p.text,/discount|review|feedback|delivered|Tracking reference: N\/A|interactive tools/i);assert.doesNotMatch(p.html,/Tracking reference: N\/A/);
 const actual=await one('select * from public.orders where id=$1',[id]);assert.doesNotMatch(renderEmailV2('dispatched',actual).text,/Tracking reference: N\/A/);assert.doesNotMatch(renderEmailV2('dispatched',actual).html,/Tracking reference: N\/A/);assert.match(renderEmailV2('aftercare',{...actual,customer:{...actual.customer,name:'Customer'}}).text,/Hello,/);assert.deepEqual({to:p.to,html:p.html,text:p.text,subject:p.subject},renderEmailV2('aftercare',{...actual,customer:{...actual.customer,email:p.to}}));
 const beforeOrder=await one('select to_jsonb(o) r from public.orders o where id=$1',[id]),beforeStock=await stock();assert.equal((await confirm(id,p,{recipientConfirmed:false})).status,400);const r=await confirm(id,p);assert.equal(r.status,200);assert.equal((await r.json()).state,'sent');assert.deepEqual(sent.at(-1),{to:p.to,subject:p.subject,text:p.text,html:p.html});assert.deepEqual(await one('select to_jsonb(o) r from public.orders o where id=$1',[id]),beforeOrder);assert.deepEqual(await stock(),beforeStock);assert.equal(await scalar('select state r from public.order_aftercare where order_id=$1',[id]),'sent');const n=sent.length;assert.equal((await confirm(id,p)).status,409);assert.equal(sent.length,n);assert.equal((await call('prepare-aftercare',{orderId:id,mode:'resend'})).status,400);
}
const ebay=await fixture('EBAY'),draft=await preview(ebay);assert.equal(draft.route,'manual');assert.equal(draft.to,'eBay order conversation');assert.doesNotMatch(draft.text,/https?:|@|discount|review|feedback/i);assert.doesNotMatch(draft.html,/href=|hidden@|Tracking reference: N\/A/);assert.equal((await confirm(ebay,draft)).status,409);assert.equal(await scalar("select count(*)::int r from public.order_email_deliveries where order_id=$1 and kind='aftercare'",[ebay]),0);const ebayContext=await scalar('select public.get_aftercare_preview_context($1) r',[ebay]);await assert.rejects(scalar('select public.confirm_aftercare_preview($1,$2,$3,$4,$5) r',[ebay,actor,JSON.stringify(ebayContext),crypto.randomUUID(),'aftercare-support-v1/prepared-v1']));
const other=await fixture('OTHER');assert.equal((await preview(other)).to,'Original order conversation');
const invalidRecipient=await fixture('DIRECT');await db.query("update public.orders set customer=customer-'email' where id=$1",[invalidRecipient]);assert.equal((await preview(invalidRecipient)).route,'manual');
for(const mutation of ['recipient','template','expired','order','actor','kind','tamper','reschedule','refund','suppression']){
 const id=await fixture(),p=await preview(id);const b=await verifyPreview(p.previewIdentity,'server-secret');let token=p.previewIdentity,orderId=id;
 if(mutation==='recipient')await db.query("update public.orders set customer=customer||'{\"email\":\"changed@example.test\"}'::jsonb where id=$1",[id]);
 if(mutation==='template')token=await signPreview({...b,contentHash:'new-renderer'},'server-secret');
 if(mutation==='expired')time+=600001;
 if(mutation==='order')orderId=await fixture();
 if(mutation==='actor')token=await signPreview({...b,actor:crypto.randomUUID()},'server-secret');
 if(mutation==='kind')token=await signPreview({...b,kind:'dispatched'},'server-secret');
 if(mutation==='tamper')token=token.slice(0,-4)+'abcd';
 if(mutation==='reschedule')await scalar("select public.update_customer_aftercare($1,public.aftercare_summary(public.aftercare_state($1)),'reschedule','2026-03-15','Owner moved follow-up') r",[id]);
 if(mutation==='refund')await db.query("update public.orders set payment_status='refunded',refunded_pence=total_pence where id=$1",[id]);
 if(mutation==='suppression')await scalar("select public.update_customer_aftercare($1,public.aftercare_summary(public.aftercare_state($1)),'suppress',null,'Customer contact preference') r",[id]);
 const n=sent.length,r=await confirm(orderId,{previewIdentity:token});assert.equal(r.status,409,mutation);assert.equal((await r.json()).code,'PREVIEW_STALE',mutation);assert.equal(sent.length,n);time=Date.now();
}
for(const failure of ['failed','unknown','mark_order_email_attempt','finish_aftercare_delivery','claim_email_template_preview']){const id=await fixture(),p=await preview(id);outcome=['failed','unknown'].includes(failure)?failure:'';failAt=outcome?'':failure;const r=await confirm(id,p);assert.equal(r.status,outcome?200:503);if(outcome){assert.equal((await r.json()).state,outcome);assert.equal(await scalar('select state r from public.order_aftercare where order_id=$1',[id]),outcome);}const n=sent.length;failAt='';outcome='';if(failure!=='claim_email_template_preview'){assert.equal((await call('prepare-aftercare',{orderId:id,mode:'first'})).status,409);assert.equal(sent.length,n);}}
const concurrent=await fixture(),context=await scalar('select public.get_aftercare_preview_context($1) r',[concurrent]);const attempts=await Promise.allSettled(Array.from({length:6},()=>scalar('select public.confirm_aftercare_preview($1,$2,$3,$4,$5) r',[concurrent,actor,JSON.stringify(context),crypto.randomUUID(),'aftercare-support-v1/prepared-v1'])));assert.equal(attempts.filter(a=>a.status==='fulfilled').length,1);
const authId=await fixture();assert.equal((await call('prepare-aftercare',{orderId:authId,mode:'first'},'')).status,401);assert.equal((await call('prepare-aftercare',{orderId:authId,mode:'first'},'server-secret')).status,401);isAdmin=false;assert.equal((await call('prepare-aftercare',{orderId:authId,mode:'first'})).status,403);isAdmin=true;
for(const extra of [{html:'override'},{recipient:'other@example.test'},{mode:'resend'}])assert.equal((await call('prepare-aftercare',{orderId:authId,mode:'first',...extra})).status,400);
assert.equal((await routeEmailRequest(req('prepare-aftercare',{orderId:authId,mode:'first'}),env,transport,send)).status,200);
// The scheduler only selects its unchanged lifecycle kind allowlist; aftercare never enters it.
let schedulerQuery='';await dispatchPending(req('dispatch',{},'server-secret'),env,async url=>{schedulerQuery=url;return Response.json([]);},send);assert.match(schedulerQuery,/kind=in\.\(in_production,ready_to_dispatch,dispatched,full_refund\)/);assert.doesNotMatch(schedulerQuery,/aftercare/);
await db.close();console.log('Aftercare backend PASS: real SQL + shared preview engine, exact provider parity, no preview/business writes, safe direct/manual/eBay variants, actor/order/kind/recipient/template/state/expiry binding, policy/overrides, duplicate/concurrent claims, failed/unknown/lost outcomes, no scheduler or relay sending.');

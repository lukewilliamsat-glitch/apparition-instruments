import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareFulfilmentRevision } from './finance80.mjs';
import { seededKitRequest } from './kit80.fixture.mjs';
import { marketplaceWalkthrough } from './reconciliation-fixture79.mjs';

const r=createRequire(import.meta.url);
const {Pool}=r(process.env.DOMINION_PG_MODULE);
const base=resolve(process.env.DOMINION_ACCEPTED_ROOT);
const here=new URL('./',import.meta.url);
const raw=f=>readFile(resolve(base,f),'utf8');
const digest=s=>createHash('sha256').update(s).digest('hex');
const pool=new Pool({host:'127.0.0.1',port:55478,user:'postgres',database:'dominion79_fixture',max:5,connectionTimeoutMillis:3500,statement_timeout:8000});
const query=(sql,args)=>pool.query(sql,args);
const out=async(sql,args)=>Object.values((await query(sql,args)).rows[0]??{})[0];
const as=async(role,actor,op)=>{
 const c=await pool.connect();
 try{
  await c.query('begin');
  await c.query(role==='service_role'?'set local role service_role':'set local role authenticated');
  if(actor)await c.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);
  const v=await op(async(sql,args)=>Object.values((await c.query(sql,args)).rows[0]??{})[0]);
  await c.query('commit');
  return v;
 }catch(e){await c.query('rollback');throw e;}finally{c.release();}
};
const admin=randomUUID(),buyer=randomUUID();
const numberHex=()=>randomUUID().replaceAll('-','');
const write=(k,body,key=randomUUID())=>as('authenticated',admin,q=>q('select public.ironclad69_write($1,$2,$3)',[key,k,body]));
const read=(k,body)=>as('authenticated',admin,q=>q('select public.ironclad69_read($1,$2)',[k,body]));
const adminRpc=(sql,args)=>as('authenticated',admin,q=>q(sql,args));
const stock=id=>out('select quantity::int from public.inventory where component_id=$1',[id]);
const expiry=()=>new Date(Date.now()+3600000).toISOString();
const reserve=(o,owner,until)=>as('service_role',null,q=>q('select dominion79.reserve($1,$2,$3)',[o.id,owner,until]));
const release=(o,why,session=o.session)=>as('service_role',null,q=>q('select dominion79.release_verified($1,$2,$3)',[o.id,session,why]));
const pay=(o,event=o.event,amount=o.totalPence)=>as('service_role',null,q=>q('select dominion79.consume($1,$2,$3,$4,$5,$6,$7,$8)',[o.id,'fixture-stripe',event,o.reference,o.session,o.intent,amount,'gbp']));
const directItem=(id,quantity=1,snapshot={})=>({type:'component',productId:id,quantity,snapshot});
const assemblyItem=(entries,quantity=1)=>({type:'assembly',quantity,snapshot:{stockRequirements:entries}});
const kitItem=(entries,quantity=1)=>({type:'kit',quantity,snapshot:{stockRequirements:entries}});
const part=(componentId,quantity)=>({componentId,quantity});
const refs=o=>({...o,session:'cs_live_'+numberHex(),event:'evt_'+numberHex(),intent:'pi_'+numberHex()});
async function syntheticOrder(items){
 const id=randomUUID(),o=refs({id,reference:'AI-'+String(++sequence),totalPence:750});
 if(items.length===3)items=items.map((x,i)=>({...x,productId:x.productId??['fixture80-les-paul','fixture80-treble-bleed'][i],sku:'F80-'+i,
  name:['Configured Les Paul wiring kit','Treble bleed assembly','Resistor'][i],unitPrice:[150,225,225][i],lineTotal:[300,225,225][i],currency:'GBP'}));
 await query(`insert into public.orders(id,request_id,request_hash,reference,sales_channel,subtotal_pence,delivery_pence,total_pence,customer,delivery,items,payment_status,stripe_checkout_session_id)
 values($1,$1,repeat('a',32),$2,'WEBSITE',750,0,750,'{}','{"country":"GB"}',$3,'unpaid',$4)`,[id,o.reference,JSON.stringify(items),o.session]);
 return o;
}
let sequence=790000;
const legacyQuote=sku=>as('service_role',null,q=>q('select public.create_guest_kit_order($1)',[{requestId:randomUUID(),items:[{product:'component',sku,quantity:1}],checkoutMode:'stripe',deliveryMethod:'standard'}]));
const legacyPay=o=>as('service_role',null,q=>q("select public.fulfil_paid_stripe_checkout($1,'checkout.session.completed',$2,$3,$4,$5,$6,'gbp')",[o.event,o.id,o.reference,o.session,o.intent,o.totalPence]));

async function setup(){
 assert.match(await out("select current_setting('server_version')"),/^17\.6\b/);
 assert.equal(await out('select current_database()'),'dominion79_fixture');
 await query(await raw('tests/release69b/production-contract.sql'));
 const manifest=JSON.parse(await raw('tests/release69b/manifest.json'));
 for(const [name,hash] of manifest.releaseA){
  const s=await raw('supabase/migrations/'+name);assert.equal(digest(s),hash);await query(s);
 }
 const b=await raw('docs/operations/release69b/ironclad69b-production.atomic.sql');
 assert.equal(digest(b),'04ec507549545b31946aaef827e54201a8fec15c806f10f0fd217ea22fe49c90');await query(b);
 const c=await readFile(resolve(process.env.DOMINION_C_SQL),'utf8');
 assert.equal(digest(c),'f73d9b68df1eb8bd4a251d29ec58df1941132a4549d80c79e1790260fd9ea6be');await query(c);
 const stage=await readFile(new URL('ironheart80-stage-a.review.sql',here),'utf8');
 const audit=`do $$ begin
  if (select mode from dominion79.lifecycle_control)<>'paused' or (select mode from quartermaster79.rollout)<>'disabled'
   or exists(select 1 from pg_proc where pronamespace in ('dominion79'::regnamespace,'quartermaster79'::regnamespace))
   or exists(select from pg_class c where c.relnamespace in ('dominion79'::regnamespace,'quartermaster79'::regnamespace)
     and c.relkind='r' and (not c.relrowsecurity or has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE')
       or has_table_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE,DELETE')))
   or exists(select 1 from pg_trigger where tgname like 'ironheart80%')
  then raise exception 'Stage A exposed a runtime writer, missing RLS or attached hook';end if;
 end $$;
 rollback;`;
 assert.match(stage,/commit;\s*$/);
 await query(stage.replace(/commit;\s*$/,audit));
 assert.equal(await out("select to_regnamespace('dominion79') is null and to_regnamespace('quartermaster79') is null"),true);
 console.log('PASS Stage A review SQL: exact prerequisite contracts, private RLS additions, no callable writer or existing hooks');
 await query(await readFile(new URL('unity79.sql',here),'utf8'));
 await query(await readFile(new URL('quartermaster79.sql',here),'utf8'));
 await query(await readFile(new URL('marketplace79.sql',here),'utf8'));
 await query(await readFile(new URL('legacy-writers80.fixture.sql',here),'utf8'));
 await query(await readFile(new URL('ironheart80.sql',here),'utf8'));
 assert.equal(await out('select mode from dominion79.lifecycle_control'),'paused');
 assert.equal(await out('select mode from quartermaster79.rollout'),'disabled');
 assert.equal(await out("select md5(pg_get_functiondef('public.record_verified_stripe_refund(text,text,text,text,bigint,text,text,timestamptz,timestamptz)'::regprocedure))"),'641531809393e7e596b89a5a6404fcc3');

 await query(`insert into auth.users(id,email,email_confirmed_at) values ($1,'fixture79-admin@example.invalid',now()),($2,'fixture79-buyer@example.invalid',now())`,[admin,buyer]);
 await query('insert into public.admin_members(user_id) values ($1)',[admin]);
 await query(`insert into public.site_operations(id,desired_state) values(true,'OPEN');
 insert into public.commerce_shipping(country,standard_delivery_pence,free_delivery_threshold_pence) values('GB',399,5000);
 insert into public.components(id,sku,name,category,active,individually,sale_price) values
 ('fixture79-cap','F79-CAP','Synthetic capacitor','capacitors',true,true,750),
 ('fixture79-res','F79-RES','Synthetic resistor','resistors',true,true,750),
 ('fixture79-pot','F79-POT','Synthetic measured pot','potentiometers',false,false,750),
 ('fixture79-race','F79-RACE','Synthetic race part','capacitors',true,true,750);
 insert into public.inventory(component_id,quantity) values ('fixture79-cap',0),('fixture79-res',4),('fixture79-pot',0),('fixture79-race',1);
 insert into quartermaster79.material(sku,title,reorder_at,inner_mm,outer_mm,tare_grams) values 
 ('F79-LABEL','Synthetic mailer',1,array[195,145,15],array[200,150,18],12);`);
}
try{
 await setup();
 const pausedOrder=await syntheticOrder([directItem('fixture79-race')]);
 await assert.rejects(reserve(pausedOrder,'paused-owner',expiry()),/paused/);
 await query("update quartermaster79.rollout set mode='observe'");
 await assert.rejects(adminRpc('select public.quartermaster80_pick($1,$2,$3,$4,$5)',[pausedOrder.id,randomUUID(),'fixture79-race',0,1]),/disabled/);
 await query("update quartermaster79.rollout set mode='workshop'; update dominion79.lifecycle_control set mode='accepting'");

 // Scenario C: the actual Admin procurement RPC receives stock and creates a real IRONCLAD batch.
 const supplier=(await write('supplier',{name:'Fixture supplier 79',currency:'GBP'})).id;
 const receive=(componentId,quantity,unitMinor,reference,key=randomUUID())=>write('quickPurchase',{
  supplierId:supplier,currency:'GBP',reference,date:'2026-11-19',method:'quantity',
  lines:[{componentId,quantity,unitMinor}],charges:{freight:40}
 },key);
 const note=randomUUID(),q1=await receive('fixture79-cap',6,110,'F79-RECEIVE-C',note),q2=await receive('fixture79-cap',6,110,'F79-RECEIVE-C',note);
 assert.equal(q1.batches[0].batchId,q2.batches[0].batchId);
 assert.equal(await stock('fixture79-cap'),6);
 assert.equal((await read('inventory',{componentId:'fixture79-cap'}))[0].available,6);
 assert.equal(q1.batches[0].costMinor,700);
 const purchase=randomUUID();
 assert.equal(await as('service_role',null,q=>q('select quartermaster79.receive($1,$2,$3,$4,$5,$6)',[purchase,'F79-LABEL',supplier,'F79-PACKAGING',2,101])),true);
 assert.equal(await as('service_role',null,q=>q('select quartermaster79.receive($1,$2,$3,$4,$5,$6)',[purchase,'F79-LABEL',supplier,'F79-PACKAGING',2,101])),false);

 // A/E/F: one saved configured physical BOM is consumed by the unchanged real legacy paid RPC.
 const configured=await syntheticOrder([kitItem([part('fixture79-cap',2),part('fixture79-res',1)],2),assemblyItem([part('fixture79-cap',1)]),directItem('fixture79-res')]);
 const deadlines=expiry();
 assert.equal(await reserve(configured,'fixture-purchaser',deadlines),'held');
 assert.equal(await reserve(configured,'fixture-purchaser',deadlines),'held');
 await assert.rejects(reserve(configured,'wrong-owner',deadlines),/differs/);
 assert.equal(await stock('fixture79-cap'),6);
 const during=(await read('inventory',{componentId:'fixture79-cap'}))[0];
 assert.equal(during.reserved,5);assert.equal(during.available,1);
 await assert.rejects(query("update public.inventory set quantity=1 where component_id='fixture79-cap'"),/reserved or protected/);
 await assert.rejects(pay(configured,configured.event,1),/does not match/);
 await assert.rejects(query("update public.orders set status='cancelled' where id=$1",[configured.id]),/Active reservation/);
 await assert.rejects(query("update public.orders set items='[]' where id=$1",[configured.id]),/Active reservation/);

 assert.equal(await stock('fixture79-cap'),6);
 assert.equal(await out('select count(*)::int from dominion79.provider_events'),0);
 const first=await Promise.all([pay(configured),pay(configured,'evt_'+numberHex())]);
 assert.deepEqual(first.sort(),['duplicate','paid']);
 assert.equal(await pay(configured),'duplicate');
 assert.equal(await stock('fixture79-cap'),1);
 const after=(await read('inventory',{componentId:'fixture79-cap'}))[0];
 assert.equal(after.reserved,0);assert.equal(after.available,1);
 assert.equal(await stock('fixture79-res'),1);
 const trace=await out("select batches from dominion79.provenance where order_id=$1 and component_id='fixture79-cap'",[configured.id]);
 assert.deepEqual(trace,[{batch:q1.batches[0].batchId,quantity:5,basis:'estimated-batch',batchCostMinor:700,batchUnits:6}]);
 assert.equal(await out("select count(*)::int from ironclad69.movements where component_id='fixture79-cap' and delta=-5"),1);
 // Packaging reservations are distinct from saleable stock; physical packing integrates into existing order.
 const pick={'fixture79-cap':5,'fixture79-res':3}, pack=randomUUID();
 await assert.rejects(as('service_role',null,q=>q('select quartermaster79.reserve($1,$2,$3,$4)',[configured.id,pack,'F79-LABEL',{'fixture79-cap':4}])),/complete saved/);
 assert.equal(await as('service_role',null,q=>q('select quartermaster79.reserve($1,$2,$3,$4)',[configured.id,pack,'F79-LABEL',pick])),'reserved');
 const packSql='select quartermaster79.complete($1,$2,$3,$4,$5,$6,$7,$8)';
 const packArgs=[configured.id,pack,purchase,[200,150,18],113,'large-letter','SYNTHETIC-79',115];
 const pickSql='select public.quartermaster80_pick($1,$2,$3,$4,$5)';
 const inspect='select public.quartermaster80_order($1)';
 const pickKey=randomUUID();
 assert.equal((await adminRpc(pickSql,[configured.id,pickKey,'fixture79-cap',0,2])).picked,2);
 assert.equal((await adminRpc(pickSql,[configured.id,pickKey,'fixture79-cap',0,2])).duplicate,true);
 await assert.rejects(adminRpc(pickSql,[configured.id,randomUUID(),'fixture79-cap',0,3]),e=>e.code==='40001');
 assert.equal((await adminRpc(inspect,[configured.id])).picked[0].picked,2);
 await assert.rejects(as('service_role',null,q=>q(packSql,packArgs)),/every saved BOM pick/);
 assert.equal(await out("select count(*)::int from quartermaster79.movement where kind='packed'"),0);
 assert.equal(await stock('fixture79-cap'),1);
 await adminRpc(pickSql,[configured.id,randomUUID(),'fixture79-cap',2,5]);
 await adminRpc(pickSql,[configured.id,randomUUID(),'fixture79-res',0,3]);
 await assert.rejects(as('authenticated',buyer,q=>q(inspect,[configured.id])),e=>e.code==='42501');

 assert.deepEqual(await Promise.all(Array.from({length:2},()=>as('service_role',null,q=>q(packSql,packArgs)))),['packed','packed']);
 assert.equal(await out("select count(*)::int from quartermaster79.movement where kind='packed'"),1);
 const cost=await as('service_role',null,q=>q('select quartermaster79.cost_evidence($1)',[configured.id]));
 assert.equal(cost.packagingActualMinor,50);assert.equal(cost.postageEstimatedMinor,115);assert.equal(cost.postageActualMinor,null);assert.equal(cost.dispatched,false);
 assert.equal(await out('select status from public.orders where id=$1',[configured.id]),'pending');
 const paidItems=await out('select items from public.orders where id=$1',[configured.id]);
 const model=await import(pathToFileURL(resolve(base,'dist/admin/orders/finance-ui.mjs')));
 const rd='select public.command63_financial_read($1)', wr='select public.command63_financial_save($1,$2,$3,$4,$5)';
 let current=await adminRpc(rd,[configured.id]);
 current.document=model.financeDraft({id:configured.id,channel:'WEBSITE',providerBacked:true,items:paidItems,pricing:{subtotal:750,delivery:0,total:750}});
 let proposal=prepareFulfilmentRevision({current,orderId:configured.id,evidence:(await adminRpc(inspect,[configured.id])).cost});
 assert.equal(proposal.estimatedPostageMinor,115);
 assert.equal(proposal.document.costs.shipping.minor,null);
 const firstKey=randomUUID();
 const save=async(p,k)=>adminRpc(wr,[configured.id,p.expectedRevision,p.orderBasisHash,k,p.document]);
 assert.equal((await save(proposal,firstKey)).revision,1);
 assert.equal((await save(proposal,firstKey)).idempotent,true);
 const postageKey=randomUUID(), postage='select public.quartermaster80_postage($1,$2,$3,$4)';
 assert.equal((await adminRpc(postage,[configured.id,postageKey,109,'Fixture receipt RM-80'])).duplicate,false);
 assert.equal((await adminRpc(postage,[configured.id,postageKey,109,'Fixture receipt RM-80'])).duplicate,true);
 await assert.rejects(adminRpc(postage,[configured.id,randomUUID(),110,'Different fixture receipt']),e=>e.code==='23505');
 current=await adminRpc(rd,[configured.id]);
 proposal=prepareFulfilmentRevision({current,orderId:configured.id,evidence:(await adminRpc(inspect,[configured.id])).cost,
  adjustment:{minor:15,reference:'Fixture fulfilment review-80'}});
 assert.equal((await save(proposal,randomUUID())).revision,2);
 assert.equal((await adminRpc(rd,[configured.id])).document.costs.shipping.minor,109);
 assert.equal((await out("select after_document from public.order_financial_revisions where order_id=$1 and revision=1",[configured.id])).costs.shipping.minor,null);
 const report=await adminRpc("select public.omniscience74_orders(current_date-2,current_date+1,null,null)",[]);
 const row=report.rows.find(x=>x.id===configured.id);
 assert.equal(row.finance.costs.packaging.minor,50);assert.equal(row.finance.costs.shipping.minor,109);assert.equal(row.finance.costs.other.minor,15);
 assert.equal(row.current,true);
 console.log('PASS IRONHEART: partial pick persisted, failed packing rolled back, actual ECLIPSE revision/replay and unchanged history, recorded postage vs estimate reaches OMNISCIENCE');
 // The production checkout validator, rather than an inserted order fixture, creates the second order.
 const request=await seededKitRequest(base,query);
 const webkit=refs(await as('service_role',null,q=>q('select public.create_guest_kit_order($1)',[request])));
 assert.equal(webkit.totalPence,5798);
 const actualBom=await out('select dominion79.requirements(o.items) from public.orders o where o.id=$1',[webkit.id]);
 assert.deepEqual(actualBom,{'pot-short-alpha-a':4,'cde-022':1,'cde-047':1,'bleed-prs':2});
 await query('update public.orders set stripe_checkout_session_id=$1 where id=$2',[webkit.session,webkit.id]);
 await reserve(webkit,'F80-configured-checkout',expiry());
 assert.equal(await pay(webkit),'paid');
 assert.equal(await pay(webkit),'duplicate');
 for(const [id,quantity] of Object.entries(actualBom))assert.equal(await stock(id),20-quantity);
 await query("insert into quartermaster79.material(sku,title,reorder_at,inner_mm,outer_mm,tare_grams) values('F80-KIT-MAILER','Synthetic kit box',0,array[240,160,60],array[250,175,65],40)");
 const ki=randomUUID(),batchKey=randomUUID();
 await as('service_role',null,q=>q('select quartermaster79.receive($1,$2,$3,$4,$5,$6)',[batchKey,'F80-KIT-MAILER',supplier,'F80-KIT-BOX-BATCH',1,210]));
 await as('service_role',null,q=>q('select quartermaster79.reserve($1,$2,$3,$4)',[webkit.id,ki,'F80-KIT-MAILER',actualBom]));
 for(const [id,quantity] of Object.entries(actualBom))await adminRpc(pickSql,[webkit.id,randomUUID(),id,0,quantity]);
 await as('service_role',null,q=>q(packSql,[webkit.id,ki,batchKey,[250,175,65],280,'small-parcel',null,379]));
 const webEvidence=(await adminRpc(inspect,[webkit.id])).cost;
 assert.equal(webEvidence.packagingActualMinor,210);assert.equal(webEvidence.postageActualMinor,null);
 assert.equal(await out('select status from public.orders where id=$1',[webkit.id]),'pending');
 console.log('PASS builder-to-Orders: existing Les Paul checkout validates exact six roles and £57.98; payment, four component deductions, packing and actual cost evidence');


 assert.deepEqual(await as('service_role',null,q=>q("select quartermaster79.ready_stock('F79-LABEL')")),{sku:'F79-LABEL',physical:1,available:1,reorder:true});
 console.log('PASS A/C/F: exact A+B+C, actual IRONCLAD procurement, saved configured BOM, real legacy paid procedure, duplicate payment and packing, traceable batch estimates and no dispatch');

 const [competitor1,competitor2]=await Promise.all(Array.from({length:2},()=>syntheticOrder([directItem('fixture79-race')])));
 const raced=await Promise.allSettled([reserve(competitor1,'race-a',expiry()),reserve(competitor2,'race-b',expiry())]);
 assert.equal(raced.filter(x=>x.status==='fulfilled').length,1);
 const held=raced[0].status==='fulfilled'?competitor1:competitor2, other=held===competitor1?competitor2:competitor1;
 await assert.rejects(release(held,'expired-unpaid'),/not due/);
 await assert.rejects(release(held,'cancelled-unpaid',other.session),/Verified attached/);
 await assert.rejects(release(held,'browser-abandoned'),/Verified attached/);
 assert.equal(await release(held,'cancelled-unpaid'),'released');
 await assert.rejects(pay(held),/no longer usable/);
 assert.equal(await reserve(other,'recovered',expiry()),'held');
 assert.equal(await stock('fixture79-race'),1);
 const legacy=refs(await legacyQuote('F79-RACE'));
 await query('update public.orders set stripe_checkout_session_id=$1 where id=$2',[legacy.session,legacy.id]);
 await assert.rejects(legacyPay(legacy),/reserved or protected/);
 const extInput={requestId:randomUUID(),channel:'DIRECT',externalReference:'F80-held-external',orderDate:'2026-11-19',
  customerName:'Synthetic fixture',postagePence:0,items:[{type:'component',productId:'fixture79-race',quantity:1,unitPricePence:8}]};
 await assert.rejects(adminRpc('select public.create_external_order($1)',[extInput]),/reserved or protected/);
 assert.equal(await out('select count(*)::int from public.orders where request_id=$1',[extInput.requestId]),0);
 await assert.rejects(adminRpc('select public.delete_unused_component($1)',['fixture79-race']),e=>e.code==='23503');
 const holdReceipt=await receive('fixture79-race',2,100,'F80-receipt-during-hold');
 assert.equal(await stock('fixture79-race'),3);
 assert.equal((await read('inventory',{componentId:'fixture79-race'}))[0].reserved,1);
 assert.ok(holdReceipt.batches[0].batchId);
 await assert.rejects(legacyPay(other),/Reserved order must use/);
 assert.equal(await stock('fixture79-race'),3);
 const revision=(await read('inventory',{componentId:'fixture79-race'}))[0].revision;
 await assert.rejects(write('adjust',{componentId:'fixture79-race',expected:3,expectedRevision:revision,quantity:0,
  kind:'damage',reason:'Synthetic conflicting count'}),/reserved or protected/);
 const st=(await write('stocktakeOpen',{componentIds:['fixture79-race'],reason:'IRONHEART count during allocation'})).id;
 await assert.rejects(write('stocktakeApply',{id:st,counts:{'fixture79-race':0},confirmed:true,reason:'Synthetic conflict test'}),/reserved or protected/);
 const externalCommitted=await adminRpc('select public.create_external_order($1)',[extInput]);
 assert.equal((await adminRpc('select public.create_external_order($1)',[extInput])).id,externalCommitted.id);
 assert.equal(await stock('fixture79-race'),2);

 assert.equal(await release(other,'cancelled-unpaid'),'released');
 assert.equal(await legacyPay(legacy),'paid');
 assert.equal(await legacyPay(legacy),'already_paid');
 assert.equal(await stock('fixture79-race'),1);
 await assert.rejects(legacyPay(other),/Reserved order must use/);
 assert.equal(await stock('fixture79-race'),1);
 const providerRefund="select public.record_verified_stripe_refund($1,'refund.created',$2,$3,73,'gbp','succeeded',$4,$4)";
 const refundArgs=['evt_'+numberHex(),'re_'+numberHex(),legacy.intent,new Date().toISOString()];
 assert.equal(await as('service_role',null,q=>q(providerRefund,refundArgs)),'partially_refunded');
 assert.equal(await as('service_role',null,q=>q(providerRefund,refundArgs)),'partially_refunded');
 const refundAt=await out('select latest_refund_at::text from public.orders where id=$1',[legacy.id]);
 await adminRpc('select public.acknowledge_partial_refund($1,73,$2)',[legacy.id,refundAt]);
 await adminRpc("select public.advance_order_fulfilment($1,'in_production')",[legacy.id]);
 assert.equal(await stock('fixture79-race'),1);
 assert.equal(await out("select count(*)::int from public.stripe_refunds where order_id=$1",[legacy.id]),1);

 assert.equal(legacy.totalPence,1149);
 // Move only the fixture hold clock to exercise authoritative overdue expiry without a long sleep.
 const overdue=await syntheticOrder([directItem('fixture79-res')]);
 await reserve(overdue,'fixture-expiry',expiry());
 await query("update dominion79.holds set opened_at=now()-interval '90 minutes',ends_at=now()-interval '30 minutes' where order_id=$1",[overdue.id]);
 assert.equal(await release(overdue,'expired-unpaid'),'expired');
 assert.equal(await release(overdue,'expired-unpaid'),'expired');
 await assert.rejects(pay(overdue),/no longer usable/);
 assert.equal(await stock('fixture79-res'),1);
 console.log('PASS E/F: concurrent holds, false cancellation/late payment refusal, original checkout and postage, legacy writer protection and fallback');

 // D: actual bench measurement, allocation, guarded pick and legacy retirement of the exact reserved physical units.
 const pots=(await receive('fixture79-pot',3,300,'F79-MEASURED')).batches[0];
 await write('measure',{batchId:pots.batchId,nominalOhm:500000,taper:'A',shaft:'short split',units:[{slot:1,ohm:498700},{slot:2,ohm:499200},{slot:3,ohm:510000,quality:'quarantine'}]});
 const units=(await read('measurements',{batchId:pots.batchId})).filter(x=>x.slot<=2).map(x=>x.id).sort();
 const set=(await write('allocate',{componentId:'fixture79-pot',toleranceBp:100,unitIds:units})).id;
 const selected=await syntheticOrder([directItem('fixture79-pot',2,{dominionSetId:set})]);
 await reserve(selected,'measured-buyer',expiry());
 await assert.rejects(write('release',{id:set,reason:'Fixture reserved set guard'}),/reserved order/);
 await assert.rejects(reserve(await syntheticOrder([directItem('fixture79-pot')]),'generic-buyer',expiry()),/Insufficient/);
 assert.equal(await pay(selected),'paid');
 assert.equal(await stock('fixture79-pot'),1);
 assert.deepEqual(await out('select measured_units from dominion79.provenance where order_id=$1',[selected.id]),units);
 assert.equal((await read('inventory',{componentId:'fixture79-pot'}))[0].available,0);


 // A selected non-FIFO set may not be reported consumed if the current real trigger retires another batch.
 await query(`insert into public.components(id,sku,name,category,active,individually,sale_price)
 values('fixture80-nonfifo','F80-NONFIFO','Synthetic non-FIFO potentiometer','potentiometers',false,false,750);
 insert into public.inventory(component_id,quantity) values('fixture80-nonfifo',0)`);
 await receive('fixture80-nonfifo',2,220,'F80-NONFIFO-OPEN');
 const newer=(await receive('fixture80-nonfifo',2,300,'F80-NONFIFO-NEW')).batches[0];
 await write('measure',{batchId:newer.batchId,nominalOhm:500000,taper:'A',shaft:'short split',units:[{slot:1,ohm:498700},{slot:2,ohm:499200}]});
 const pickedUnits=(await read('measurements',{batchId:newer.batchId})).map(r=>r.id);
 const laterSet=(await write('allocate',{componentId:'fixture80-nonfifo',toleranceBp:100,unitIds:pickedUnits})).id;
 const later=await syntheticOrder([directItem('fixture80-nonfifo',2,{dominionSetId:laterSet})]);
 await reserve(later,'non-fifo-review',expiry());
 await assert.rejects(pay(later),/does not prove the measured pick/);
 assert.equal(await stock('fixture80-nonfifo'),4);
 assert.equal(await out('select count(*)::int from dominion79.provenance where order_id=$1',[later.id]),0);
 assert.equal(await out('select payment_status from public.orders where id=$1',[later.id]),'unpaid');
 assert.equal(await release(later,'cancelled-unpaid'),'released');
 console.log('PASS unproven non-FIFO measurement rolls back physical stock, payment and provenance');

 // B/F: read-only provider evidence joins an actual existing synthetic external Orders record.
 const external=randomUUID(), previousStock=await stock('fixture79-cap');
 await query(`insert into public.orders(id,request_id,request_hash,sales_channel,external_reference,order_date,subtotal_pence,delivery_pence,total_pence,customer,delivery,items,payment_status,paid_at,fulfillment_applied_at)
 values($1,$1,repeat('b',32),'EBAY','F79-EBAY-PAID',date '2026-11-19',1000,150,1150,'{}','{}',$2,'paid',now(),now())`,[external,JSON.stringify([directItem('fixture79-cap',2)])]);
 const market=await marketplaceWalkthrough(query,{persist:true});
 assert.equal(market.orders.length,1);assert.equal(market.orders[0].existingOrderId,external);assert.equal(market.orders[0].stockMutation,false);
 assert.equal(market.finance.length,2);assert.ok(market.finance.every(x=>x.manualOrderId===external));
 const applyStage='select marketplace79.stage($1,$2,$3,$4,$5::jsonb,$6::jsonb)';
 await assert.rejects(query(applyStage,['fixture-ebay','orders',0,'2026-11-19T10:30:00Z','[]','[]']),e=>e.code==='40001');
 await assert.rejects(query(applyStage,['fixture-ebay','orders',1,'2026-11-19T10:30:00Z',JSON.stringify([{...market.orders[0],buyer:'forbidden'}]),'[]']),/outside scoped evidence/);
 assert.equal(await out("select revision::int from marketplace79.watermarks where account='fixture-ebay' and kind='orders'"),1);
 assert.equal(market.review[0].kind,'unmapped-listing');assert.equal(await stock('fixture79-cap'),previousStock);
 assert.equal(await out("select count(*)::int from public.orders where external_reference='F79-EBAY-PAID'"),1);
 console.log('PASS B/F: eBay read-only import matched an existing external Orders record; fee and refund evidence deduplicated, no stock or additional orders');

 // An authorised role still cannot directly use experimental database routines or see their evidence.
 await assert.rejects(as('authenticated',buyer,q=>q("select quartermaster79.ready_stock('F79-LABEL')")),e=>e.code==='42501');
 await assert.rejects(as('authenticated',admin,q=>q('select dominion79.reserve($1,$2,$3)',[held.id,'admin-not-service',expiry()])),e=>e.code==='42501');
 await assert.rejects(as('service_role',null,q=>q('select * from dominion79.holds limit 1')),e=>e.code==='42501');
 assert.equal(await out('select count(*)::int from public.order_financial_revisions'),2);
 const drain=await syntheticOrder([directItem('fixture79-race')]);
 const drainUntil=expiry();
 await reserve(drain,'drain-owner',drainUntil);
 await query("update dominion79.lifecycle_control set mode='draining'");
 assert.equal(await reserve(drain,'drain-owner',drainUntil),'held');
 await assert.rejects(reserve(await syntheticOrder([directItem('fixture79-race')]),'new-owner',expiry()),/paused/);
 assert.equal(await release(drain,'cancelled-unpaid'),'released');
 assert.equal(await out("select count(*)::int from dominion79.holds where state='held'"),0);

 console.log('PASS D and permissions: exact measured set consumption, quality hold preserved, denied client access, no Financial revisions');
}finally{await pool.end();}

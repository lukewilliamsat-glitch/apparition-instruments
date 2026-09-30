import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const read=name=>readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');
// Only an ephemeral local database. This runner has no production URL or credentials.
await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
await db.exec(read('20260924131615_p05a_backend_foundation.sql').split('create table public.kit_definitions')[0]);
await db.exec(read('20260925083000_p07a_guest_orders.sql').split('create function public.create_guest_kit_order')[0]);
await db.exec(`alter table public.orders add column stripe_checkout_session_id text unique;
 alter table public.orders drop constraint orders_delivery_pence_check;
 alter table public.orders add constraint orders_delivery_pence_check check(delivery_pence between 0 and 1000000000);`);
await db.exec(read('20260925150000_p07b2a_paid_order_fulfilment.sql'));
await db.exec(read('20260925174000_p07b5_order_fulfilment.sql'));
await db.exec(read('20260925203000_p07b7_confirmation_delivery.sql').split('create function public.claim_paid_order_confirmation')[0]);
await db.exec(read('20260926124503_p08a1_refund_lifecycle.sql').split('create table public.stripe_refunds')[0]);
await db.exec(read('20260926134458_p08b2_delivery_foundation.sql').split('-- A claim is atomic')[0]);
await db.exec(`alter table public.order_email_deliveries add column automatic_delivery_eligible boolean not null default false;
 create table public.partial_refund_reviews(order_id uuid,refunded_pence bigint,refund_at timestamptz);
 create table public.stripe_refund_events(event_id text,order_id uuid);`);
await db.exec(readFileSync(new URL('fixtures/external-orders-baseline.sql',import.meta.url),'utf8'));
await db.exec(read('20260930114021_external_orders_v1.sql'));
const actor='10000000-0000-4000-8000-000000000001';
await db.exec(`insert into auth.users values('${actor}');insert into public.admin_members(user_id) values('${actor}');
 select set_config('request.jwt.claim.sub','${actor}',false);
 insert into public.components(id,sku,name,category,individually,sale_price) values
 ('a','SKU-A','Part A','test',true,100),('b','SKU-B','Part B','test',true,200),('z','SKU-Z','Empty part','test',true,50);
 insert into public.inventory(component_id,quantity) values('a',100),('b',100),('z',0);
 insert into public.assemblies(id,sku,name,category,kind) values('assembled','SKU-ASM','Fixed assembly','test','assembly'),('configured','SKU-KIT','Configured kit','test','wiring-kit');
 insert into public.assembly_bom values('assembled','a',2),('assembled','b',3);`);
const query=async(sql,params=[])=>(await db.query(sql,params)).rows;
const one=async(sql,params=[])=>(await query(sql,params))[0];
const create=async request=>(await one('select public.create_external_order($1::jsonb) as result',[JSON.stringify(request)])).result;
const stock=async()=>query('select component_id,quantity from public.inventory order by component_id');
const request={requestId:crypto.randomUUID(),channel:'EBAY',externalReference:'22-TEST',orderDate:'2026-09-30',customerName:'Fixture buyer',postagePence:91,items:[{type:'assembly',productId:'assembled',quantity:2,unitPricePence:500},{type:'component',productId:'a',quantity:3,unitPricePence:100}]};
const created=await create(request);assert.equal(created.duplicate,false);
assert.deepEqual(await stock(),[{component_id:'a',quantity:93},{component_id:'b',quantity:94},{component_id:'z',quantity:0}]);
const saved=await one('select * from public.orders where id=$1',[created.id]);
assert.equal(saved.total_pence,1391);assert.equal(saved.sales_channel,'EBAY');assert.equal(saved.order_date.toISOString().slice(0,10),'2026-09-30');assert.equal(saved.customer.name,'Fixture buyer');assert.equal(saved.items[0].sku,'SKU-ASM');assert.equal(saved.items[0].snapshot.stockRequirements[0].quantity,2);assert.equal(saved.stripe_payment_intent_id,null);assert.equal(saved.stripe_checkout_session_id,null);
assert.equal((await create(request)).duplicate,true);assert.deepEqual(await stock(),[{component_id:'a',quantity:93},{component_id:'b',quantity:94},{component_id:'z',quantity:0}]);
await assert.rejects(create({...request,requestId:crypto.randomUUID(),externalReference:' 22-test '}),error=>error.code==='23505');
await assert.rejects(create({...request,customerName:'Changed'}),error=>error.code==='23505');
const other=await create({...request,requestId:crypto.randomUUID(),channel:'DIRECT'});assert.notEqual(other.id,created.id);
const before=await stock(),count=Number((await one('select count(*) as n from public.orders')).n);
for(const items of [[{type:'component',productId:'a',quantity:1,unitPricePence:100},{type:'component',productId:'z',quantity:1,unitPricePence:50}],[{type:'component',productId:'missing',quantity:1,unitPricePence:1}],[{type:'assembly',productId:'configured',quantity:1,unitPricePence:1}]]){
 await assert.rejects(create({...request,requestId:crypto.randomUUID(),externalReference:crypto.randomUUID(),items}));assert.deepEqual(await stock(),before);assert.equal(Number((await one('select count(*) as n from public.orders')).n),count);
}
// Persisted identity serializes a burst of repeated submissions; only one sale is committed.
const retryRequest={...request,requestId:crypto.randomUUID(),externalReference:'retry'};
const replies=await Promise.all(Array.from({length:6},()=>create(retryRequest)));assert.equal(replies.filter(row=>!row.duplicate).length,1);assert.equal(new Set(replies.map(row=>row.id)).size,1);
await db.query('select public.advance_order_fulfilment($1,$2)',[created.id,'in_production']);
assert.equal(Number((await one('select count(*) as n from public.order_email_deliveries where order_id=$1',[created.id])).n),0);
// Even forced email eligibility cannot bypass channel isolation.
await db.query(`update public.orders set customer=customer||'{"email":"fixture@example.test"}',confirmation_email_status='pending' where id=$1`,[created.id]);
assert.equal((await one('select public.claim_paid_order_confirmation($1) as claim',[created.id])).claim,null);
await db.query(`insert into public.order_email_deliveries(order_id,kind,source_event_id,automatic_delivery_eligible) values($1,'in_production','forced',true)`,[created.id]);
assert.equal((await one("select public.claim_order_email_delivery($1,'in_production') as claim",[created.id])).claim,null);
// Existing website stock and replay fixture runs on the local schema, never production.
await db.exec(readFileSync(new URL('p07b2a-fulfilment.sql',import.meta.url),'utf8'));
const website=(await query("select * from public.orders where sales_channel='WEBSITE'"))[0];
await db.query(`update public.orders set customer='{"email":"website@example.test"}' where id=$1`,[website.id]);
assert((await one('select public.claim_paid_order_confirmation($1) as claim',[website.id])).claim);
await db.query('select public.advance_order_fulfilment($1,$2)',[website.id,'in_production']);
assert.equal(Number((await one('select count(*) as n from public.order_email_deliveries where order_id=$1',[website.id])).n),1);
assert.equal((await one("select has_function_privilege('anon','public.create_external_order(jsonb)','execute') as allowed")).allowed,false);
assert.equal((await one("select has_function_privilege('authenticated','public.apply_order_inventory(jsonb)','execute') as allowed")).allowed,false);
await db.exec("select set_config('request.jwt.claim.sub','',false)");await assert.rejects(create({...request,requestId:crypto.randomUUID(),externalReference:'unauthorized'}),error=>error.code==='42501');
await db.close();
console.log('External Orders DB: creation, catalogue/BOM, quantities, aggregation, retries, duplicate identity, atomic failure, persistence, fulfilment, email isolation, website inventory/replay and permissions PASS (local only)');

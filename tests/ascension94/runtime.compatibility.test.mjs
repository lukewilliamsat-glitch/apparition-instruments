import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const {Client}=createRequire(import.meta.url)(process.env.PG_ORDERS_MODULE);
const c=new Client({host:'127.0.0.1',port:55494,user:'postgres',database:'postgres'});
const peer=new Client({host:'127.0.0.1',port:55494,user:'postgres',database:'postgres'});
const sql=name=>readFile(new URL('../convergence92/'+name,import.meta.url),'utf8');
const value=async(query,args,client=c)=>Object.values((await client.query(query,args)).rows[0])[0];
const productionShape=process.env.PRODUCTION_SHAPE==='1';
const account=productionShape?'acct_1UJUR9I4E9fIeEmD':'acct_1UJURLIeVWpsCl5X',secret='whsec_DisposableFixture92';
const signed=(event,stamp=Math.floor(Date.now()/1000))=>{
 const raw=JSON.stringify(event);
 return [raw,'t='+stamp+',v1='+createHmac('sha256',secret).update(stamp+'.'+raw).digest('hex')];
};
const event=(type,object,id='evt_'+randomUUID().replaceAll('-',''))=>({id,object:'event',livemode:productionShape,type,created:Math.floor(Date.now()/1000),data:{object}});
const receive=async(e,client=c)=>value('select public.convergence92_receive($1,$2)',signed(e),client);
async function order(reference,quantity=1) {
 const id=randomUUID(),request=randomUUID(),session=(productionShape?'cs_live_':'cs_test_')+randomUUID().replaceAll('-',''),amount=1234;
 const expiry=Math.floor(Date.now()/1000)+2400;
 const binding=createHash('sha256').update(JSON.stringify([id,account,'GBP',amount,expiry])).digest('hex');
 await c.query(`insert into public.orders(id,request_id,request_hash,reference,items,total_pence,stripe_checkout_session_id)
 values($1,$2,'fixture',$3,$4,$5,$6)`,[id,request,reference,JSON.stringify([{type:'component',productId:'fixture92-stock',quantity}]),amount,session]);
 await c.query('update public.orders set stripe_checkout_session_id=null where id=$1',[id]);
 const prepared=await value("select public.convergence92_prepare($1::uuid,'fixture92-'||$1::text,$2)",[id,expiry]);
 assert.equal(prepared.binding,binding);
 assert.deepEqual(await value("select public.convergence92_prepare($1::uuid,'fixture92-'||$1::text,$2)",[id,expiry]),prepared);
 assert.equal(await value('select public.convergence92_attach($1,$2,$3)',[id,binding,session]),true);
 assert.equal(await value('select public.convergence92_attach($1,$2,$3)',[id,binding,session]),true);
 return {id:session,orderId:id,session,amount,binding,object:'checkout.session',livemode:productionShape,client_reference_id:id,metadata:{dominion_binding:binding},amount_total:amount,currency:'gbp',status:'complete',payment_status:'paid',payment_intent:'pi_'+randomUUID().replaceAll('-','')};
}
await c.connect();await peer.connect();
try {
 await c.query(`
  create role anon;create role authenticated;create role service_role;
  create schema extensions;create extension pgcrypto with schema extensions;
  create schema vault;create table vault.decrypted_secrets(name text primary key,decrypted_secret text);
  create schema auth;create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
  create table public.orders(id uuid primary key,request_id uuid,request_hash text,reference text unique,status text default 'pending',
   payment_status text default 'unpaid',items jsonb,currency text default 'GBP',total_pence bigint,
   customer jsonb default '{}',sales_channel text default 'WEBSITE',stripe_checkout_session_id text,stripe_payment_intent_id text,paid_at timestamptz,
   fulfillment_applied_at timestamptz,updated_at timestamptz default now(),refunded_pence bigint default 0,latest_refund_at timestamptz);
  create table public.inventory(component_id text primary key,quantity bigint,stock_unit text default 'item',updated_at timestamptz default now());
  create table public.stripe_webhook_events(event_id text primary key,order_id uuid,event_type text);
  create table public.stripe_refunds(refund_id text primary key,order_id uuid,payment_intent_id text,amount_pence bigint,status text,refund_created_at timestamptz,observed_at timestamptz,last_event_id text);
  create table public.stripe_refund_events(event_id text primary key,refund_id text,order_id uuid,event_type text);
  create table public.order_email_deliveries(order_id uuid,kind text,source_event_id text,resend_of uuid);
  create unique index on public.order_email_deliveries(order_id,kind) where resend_of is null;
  create schema ironclad69;
  create table ironclad69.tracking(component_id text,revision bigint default 0);
  create table ironclad69.batches(id uuid primary key,component_id text,quantity bigint,remaining bigint,cost_minor bigint,origin text default 'opening',receipt_id uuid,line_id uuid,lot text,notes text,evidence text,received_at timestamptz default now());
  create table ironclad69.measurements(id uuid primary key,batch_id uuid,quality text,slot int);
  create table ironclad69.sets(id uuid primary key,state text,released_at timestamptz);
  create table ironclad69.set_members(set_id uuid,unit_id uuid,active boolean);
  create table ironclad69.stock_context(component_id text,kind text,reason text,actor uuid,source uuid,line_id uuid,cost_minor bigint,lot text,evidence text);
  create table ironclad69.movements(component_id text,kind text,previous bigint,delta bigint,resulting bigint,reason text,actor uuid,source uuid);
  create function ironclad69.commerce_enabled() returns boolean language sql as $$select false$$;
  create function ironclad69.reservations(c text) returns bigint language sql as $$select 0::bigint$$;
  create schema quartermaster84c;create table quartermaster84c.fixture_orders(order_id uuid);
  create schema commerce67;
  create table commerce67.control(single boolean,enabled boolean);
  insert into commerce67.control values(true,false);
  create table commerce67.sessions(order_id uuid,state text);
  create table commerce67.holds(component_id text,quantity bigint);
  create table commerce67.matched_sets(id uuid,state text);
  create function commerce67.inventory_floor() returns trigger language plpgsql as $$begin return new;end$$;
  create function commerce67.audit_paid_transition() returns trigger language plpgsql as $$begin return new;end$$;
  create function commerce67.consume(p_order uuid) returns void language plpgsql as $$begin return;end$$;
  create trigger commerce67_inventory_floor before update on public.inventory for each row execute function commerce67.inventory_floor();
  create trigger commerce67_payment_paid after update on commerce67.sessions for each row execute function commerce67.audit_paid_transition();
  create schema dominion79;
  create table dominion79.lifecycle_control(singleton boolean primary key default true,mode text);
  insert into dominion79.lifecycle_control values(true,'paused');
  create table dominion79.holds(order_id uuid primary key,owner_key text,components jsonb,selection jsonb,order_items_hash bytea,
   opened_at timestamptz default clock_timestamp(),ends_at timestamptz,state text default 'held',resolved_at timestamptz);
  create table dominion79.hold_lines(order_id uuid,component_id text,quantity bigint,picked_units uuid[] default '{}',primary key(order_id,component_id));
  create table dominion79.active_units(unit_id uuid,order_id uuid);
 `);
 await c.query(productionShape?await sql('plans.production.review.sql'):await sql('plans.staging.sql'));
 await c.query(await sql('stock-refund.accepted.sql'));
 await c.query(await sql('inventory-trigger.accepted.sql'));
 if(productionShape){
  await c.query('drop schema commerce67 cascade');
  await c.query(await sql('fulfilment.production.baseline.sql'));
 }
 await c.query(`create table dominion79.consuming(order_id uuid primary key references dominion79.holds(order_id),transaction_id xid8 not null);alter table dominion79.consuming enable row level security;revoke all on dominion79.consuming from public,anon,authenticated,service_role;`);
 const runtime=await readFile(new URL('runtime.compatibility.review.sql',import.meta.url),'utf8');
 const oid=await value("select 'dominion79.consuming'::regclass::oid");
 for(const drift of ['alter table dominion79.consuming add column unexpected text','grant select on dominion79.consuming to anon','alter table dominion79.consuming disable row level security']){
  await c.query('begin');await c.query(drift);await assert.rejects(c.query(runtime),/Installed UNITY lock table differs/);await c.query('rollback');
 }
 await c.query(runtime);
 assert.equal(await value("select 'dominion79.consuming'::regclass::oid"),oid);
 assert.equal(await value('select count(*)::int from dominion79.consuming'),0);
 assert.equal(await value('select mode from dominion79.lifecycle_control'),'paused');
 for(const role of ['anon','authenticated','service_role']){
  await c.query('set role '+role);await assert.rejects(c.query('select * from dominion79.consuming'),{code:'42501'});await c.query('reset role');
 }
 console.log('PASS exact installed lock table preserved; columns, grants and RLS drift rejected; runtime installs paused with closed tables');
}finally{await c.end();await peer.end();}

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
export async function emailPreviewDatabase(){
const db=new PGlite();
const read=name=>readFileSync(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8');
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
await db.exec(readFileSync(new URL('external-orders-baseline.sql',import.meta.url),'utf8'));
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
await db.exec(read('20260926134458_p08b2_delivery_foundation.sql').slice(read('20260926134458_p08b2_delivery_foundation.sql').indexOf('create function public.mark_order_email_attempt')).split('-- Each acknowledgement')[0]);
await db.exec(read('20260927112000_p08b5b_delivery_boundary.sql').split('alter table public.order_email_deliveries')[0]);
await db.exec(read('20260927112000_p08b5b_delivery_boundary.sql').slice(read('20260927112000_p08b5b_delivery_boundary.sql').indexOf('create function public.set_automatic_email_eligibility')).split('-- The claim remains atomic')[0]);
await db.exec("alter table public.orders add column dispatch_details jsonb not null default '{}'::jsonb");
await db.exec(read('20261008075917_external_order_editing_v1.sql'));
await db.exec(read('20261008081744_ebay_relay_dispatch_v1.sql'));
// Exercise the existing refund notification writer's conflict-target compatibility only.
await db.exec(`create function public.record_verified_stripe_refund(text,text,text,text,bigint,text,text,timestamptz,timestamptz) returns void language plpgsql as $$begin
 insert into public.order_email_deliveries(order_id,kind) values($1::uuid,'full_refund') on conflict(order_id,kind) do nothing;
end;$$;`);
await db.exec(read('20261008083746_fulfilment_email_v1.sql'));
await db.exec(read('20261008134245_email_preview_giga_v1.sql'));
assert.match((await one("select pg_get_functiondef('public.record_verified_stripe_refund(text,text,text,text,bigint,text,text,timestamptz,timestamptz)'::regprocedure) as body")).body,/on conflict\(order_id,kind\) where resend_of is null do nothing/);

return {db,actor,create,one,query,stock};
}

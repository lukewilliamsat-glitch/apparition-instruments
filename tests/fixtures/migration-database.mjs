import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
export async function createMigrationDatabase(){
// Ephemeral schema replay. Managed Auth/Storage/Vault/Cron are local stubs;
// no network, real credentials, payment calls, or production mutations.
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 alter default privileges in schema public grant all on tables to service_role;alter default privileges in schema public grant all on tables to anon,authenticated;alter default privileges in schema public grant all on sequences to service_role;alter default privileges in schema public grant execute on functions to service_role;
 create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid,bucket_id text,name text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
 create schema extensions;create function gen_random_bytes(int) returns bytea language sql as $$select decode(repeat('01',$1),'hex')$$;
 create schema vault;create table vault.secrets(id uuid primary key default gen_random_uuid(),name text,decrypted_secret text);
 create view vault.decrypted_secrets as select * from vault.secrets;
 create function vault.create_secret(text,text) returns uuid language sql as $$insert into vault.secrets(name,decrypted_secret) values($2,'local-fixture-only') returning id$$;
 create schema cron;create table cron.job(jobid serial primary key,jobname text,schedule text,command text,active boolean default true);
 create function cron.schedule(text,text,text) returns bigint language sql as $$insert into cron.job(jobname,schedule,command) values($1,$2,$3) returning jobid::bigint$$;
 create function cron.unschedule(text) returns boolean language sql as $$delete from cron.job where jobname=$1 returning true$$;`);
const migrations=readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort();
for(const name of migrations){
 if(name.endsWith('_p08b5b_global_activation.sql'))await db.exec(`insert into public.orders(id,reference,request_id,request_hash,subtotal_pence,total_pence,customer,delivery,items,payment_status) values('10000000-0000-4000-8000-000000000010','AI-010010',gen_random_uuid(),'fixture',1,1,'{}','{}','[{}]','paid');insert into public.order_email_deliveries(order_id,kind,source_event_id,state,claim_id,attempts) select '10000000-0000-4000-8000-000000000010',kind,'fixture-'||kind,'sent',gen_random_uuid(),1 from unnest(array['ready_to_dispatch','dispatched']) as kind;`);
 // pg_net and pg_cron binaries are managed extensions. Their SQL consumers and
 // scheduler configuration are replayed, while local stubs never execute jobs.
 const sql=readFileSync('supabase/migrations/'+name,'utf8').replace(/create extension if not exists pg_(net|cron)[^;]*;/g,'');

 if(name.includes('_qualify_delivery_country')||name.includes('_qualify_inventory_update')){
  const guest=name.includes('_delivery_country'),signature=guest?'public.create_guest_kit_order(jsonb)':'public.fulfil_paid_stripe_checkout(text,text,uuid,text,text,text,bigint,text)';
  const definition=(await db.query('select pg_get_functiondef($1::regprocedure) as source',[signature])).rows[0].source;
  const qualified=guest?"from public.commerce_shipping shipping where shipping.country='GB'":"update public.inventory inventory_row set quantity=inventory_row.quantity-wanted.value::bigint,updated_at=now()\n   where inventory_row.component_id=wanted.key and inventory_row.quantity>=wanted.value::bigint";
  const old=guest?"from public.commerce_shipping where country='GB'":"update public.inventory set quantity=quantity-wanted.value::bigint,updated_at=now()\n   where component_id=wanted.key and quantity>=wanted.value::bigint";
  assert(definition.includes(qualified),name+' fresh source already repaired');
  await db.exec(sql); // already-repaired path
  await db.exec(definition.replace(qualified,old));await db.exec(sql); // historical path
  assert.equal((await db.query('select pg_get_functiondef($1::regprocedure) as source',[signature])).rows[0].source,definition,name+' repair preserves function definition');
  const unexpected=guest?definition.replace(qualified,"from public.commerce_shipping shipping where shipping.country='FR'"):definition.replace(qualified,qualified.replace('quantity>=wanted.value::bigint','quantity>wanted.value::bigint'));
  await db.exec(unexpected);await assert.rejects(db.exec(sql),/Expected P07B/,'Unknown function body must halt');await db.exec(definition);
 }
 const priorGuest=name.endsWith('_site_operations_v1.sql')?(await db.query("select pg_get_functiondef('public.create_guest_kit_order(jsonb)'::regprocedure) as source")).rows[0].source:null;
 try{await db.exec(sql);}catch(e){throw new Error(name+': '+e.message);}
 if(priorGuest){const after=(await db.query("select pg_get_functiondef('public.create_guest_kit_order(jsonb)'::regprocedure) as source")).rows[0].source;assert.equal(after.replace(' perform public.assert_store_accepting_orders();\n',''),priorGuest,'Only the initiation guard changes the existing guest-order authority');assert.equal(after.split('perform public.assert_store_accepting_orders();').length,2);}
 if(name.endsWith('_p05a_backend_foundation.sql'))await db.exec(`insert into public.assemblies(id,sku,name,category,kind) values('kit-les-paul','FIXTURE-KIT','Fixture kit','test','wiring-kit');insert into public.kit_definitions(assembly_id,family,base_price,default_wiring_style) values('kit-les-paul','les-paul',0,'modern');`);
}
return {db,migrations};
}

import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
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
 try{await db.exec(sql);}catch(e){throw new Error(name+': '+e.message);}
 if(name.endsWith('_p05a_backend_foundation.sql'))await db.exec(`insert into public.assemblies(id,sku,name,category,kind) values('kit-les-paul','FIXTURE-KIT','Fixture kit','test','wiring-kit');insert into public.kit_definitions(assembly_id,family,base_price,default_wiring_style) values('kit-les-paul','les-paul',0,'modern');`);
}
const rows=async(sql,params=[])=>(await db.query(sql,params)).rows;
const tables=await rows(`select n.nspname as schema,c.relname as name,c.relkind as kind,c.relrowsecurity as rls,c.relforcerowsecurity as force_rls,c.reloptions as options from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v') order by c.relname`);
const functions=await rows(`select p.proname as name,p.prosrc as body,pg_get_function_identity_arguments(p.oid) as identity,p.proconfig as settings,p.prosecdef as security_definer,has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' and p.proname<>'gen_random_bytes' order by p.proname`);
for(const t of tables)assert(t.kind==='v'?t.options.includes('security_invoker=true'):t.rls,t.name+' security');
const adminFunctions=functions.filter(f=>f.security_definer&&f.authenticated_execute);assert.deepEqual(adminFunctions.map(f=>f.name),['acknowledge_partial_refund','advance_order_fulfilment','create_external_order','delete_unused_catalogue_option','record_order_dispatch_details']);
for(const f of functions){assert(!f.security_definer||!f.anon_execute,f.name);if(f.security_definer)assert(f.settings.includes('search_path=""'),f.name);}
// Live snapshot contains schema definitions only; optional comparison never connects.
if(process.env.QA_PRODUCTION_METADATA){const live=JSON.parse(readFileSync(process.env.QA_PRODUCTION_METADATA,'utf8')),defs=JSON.parse(readFileSync(process.env.QA_PRODUCTION_FUNCTIONS,'utf8'));assert.deepEqual(tables,live.metadata.tables.filter(t=>t.schema==='public'));const norm=s=>s.replace(/--[^\n]*/g,'').replace(/\s+/g,' ').trim();
 for(const f of functions){const prod=defs.functions.find(p=>p.name===f.name);assert(prod,'Production function '+f.name);assert.equal(norm(f.body),norm(prod.body),'Effective migration body '+f.name);const remote=live.metadata.functions.find(p=>p.name===f.name);for(const k of ['identity','settings','security_definer','anon_execute','authenticated_execute','service_execute'])assert.deepEqual(f[k],remote[k],f.name+' '+k);}
 const columns=await rows(`select table_name as "table",column_name as name,udt_name as type,is_nullable as nullable,column_default as "default" from information_schema.columns where table_schema='public' order by table_name,ordinal_position`);assert.deepEqual(columns,live.contracts.columns,'Columns/defaults/nullability');
 const constraints=await rows(`select c.conrelid::regclass::text as "table",c.conname as name,c.contype as kind,pg_get_constraintdef(c.oid) as definition from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public' and c.contype<>'n' order by c.conrelid::regclass::text,c.conname`);assert.deepEqual(constraints,live.contracts.constraints,'Relationships and checks');
 const policies=await rows(`select * from pg_policies where schemaname='public' order by tablename,policyname`);const original=live.metadata.policies.filter(p=>p.schemaname==='public');assert.deepEqual(policies,original,'Effective RLS policies');
 const indexes=await rows(`select * from pg_indexes where schemaname='public' order by tablename,indexname`);assert.deepEqual(indexes,live.contracts.indexes,'Index definitions');
 const triggers=await rows(`select c.relname as "table",t.tgname as name,pg_get_triggerdef(t.oid) as definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal order by c.relname,t.tgname`);assert.deepEqual(triggers,live.contracts.triggers,'Trigger definitions');
 const grants=await rows(`select table_name as "table",grantee,privilege_type as privilege from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated')`),sort=a=>a.sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));assert.deepEqual(sort(grants),sort(live.metadata.grants.filter(g=>g.table_schema==='public'&&['anon','authenticated'].includes(g.grantee)&&(!process.env.QA_PENDING_CATALOGUE_READ_GRANTS||!['catalogue_components','catalogue_wiring_kits'].includes(g.table_name)||g.privilege_type==='SELECT')).map(g=>({table:g.table_name,grantee:g.grantee,privilege:g.privilege_type}))),'Client table grants');
}
for(const role of ['anon','authenticated'])for(const view of ['catalogue_components','catalogue_wiring_kits']){for(const privilege of ['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'])assert.equal((await rows('select has_table_privilege($1,$2,$3) as allowed',[role,'public.'+view,privilege]))[0].allowed,false);await db.exec('set role '+role);await rows('select * from public.'+view);await db.exec('reset role');}
const admin='10000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000002';await db.exec(`insert into auth.users values('${admin}'),('${customer}');insert into public.admin_members(user_id) values('${admin}');set role authenticated;select set_config('request.jwt.claim.sub','${customer}',false);select set_config('request.jwt.claims','{"user_metadata":{"role":"admin"}}',false);`);
for(const table of ['admin_members','component_internal','orders','order_email_deliveries','partial_refund_reviews'])assert.equal((await rows('select * from public.'+table)).length,0,'Ordinary customer cannot read '+table);
const calls=[['delete_unused_catalogue_option',"'manufacturer','fixture'"],['create_external_order','null'],['advance_order_fulfilment',"gen_random_uuid(),'in_production'"],['record_order_dispatch_details','gen_random_uuid()'],['acknowledge_partial_refund','gen_random_uuid(),1,now()']];
for(const [name,args] of calls)await assert.rejects(db.query('select public.'+name+'('+args+')'),e=>e.code==='42501',name+' requires membership even outside UI');
await assert.rejects(db.exec(`insert into public.admin_members(user_id) values('${customer}')`),e=>e.code==='42501');await db.exec('reset role;set role anon;');for(const [name,args] of calls)await assert.rejects(db.query('select public.'+name+'('+args+')'),e=>e.code==='42501');
await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${admin}',false);`);assert.equal((await rows('select user_id from public.admin_members'))[0].user_id,admin);await db.exec(`reset role;insert into public.catalogue_options(option_set,option_key,label) values('manufacturer','qa_fixture','QA fixture');set role authenticated;`);assert.equal((await rows("select public.delete_unused_catalogue_option('manufacturer','qa_fixture') as result"))[0].result.deleted,true);await db.exec(`reset role;delete from public.admin_members where user_id='${admin}';set role authenticated;`);await assert.rejects(db.query("select public.delete_unused_catalogue_option('manufacturer','qa_fixture')"),e=>e.code==='42501','Revoked membership beats a stale token');
await db.close();console.log(JSON.stringify({migrationReplay:migrations.length,publicRelations:tables.length,functions:functions.length,securityDefinerAdminRPCs:adminFunctions.length,anonymousAndCustomerDenied:'PASS',metadataRolesIgnored:'PASS',revokedMembershipDenied:'PASS',productionSchemaComparison:process.env.QA_PRODUCTION_METADATA?'PASS':'NOT REQUESTED'}));

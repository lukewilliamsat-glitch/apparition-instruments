-- Metadata and aggregate counts only. Results stay inside the sealed archive.
with
 scope as (select oid,nspname from pg_namespace where nspname in ('public','forge_private','auth','storage','supabase_migrations')),
 rel as (
  select n.nspname as ns,c.relname as rel,c.oid,c.relkind,c.relrowsecurity,c.relforcerowsecurity,
    pg_get_userbyid(c.relowner) as owner,c.relacl::text as acl,
    case when c.relkind in ('v','m') then pg_get_viewdef(c.oid) end as view_definition
  from pg_class c join scope n on n.oid=c.relnamespace
  where c.relkind in ('r','p','v','m','S','f')
    and (n.nspname,c.relname) not in (('storage','vector_indexes'),('storage','buckets_vectors'))
    and not exists(select from pg_depend d where d.classid='pg_class'::regclass and c.oid=d.objid and d.deptype='e')
 ),
 counts as (
  select ns,rel,(xpath('/row/n/text()',query_to_xml(format('select count(*) as n from %I.%I',ns,rel),false,true,'')))[1]::text as n
  from rel where relkind in('r','p')
 ),
 col as (
  select r.ns,r.rel,a.attname,format_type(a.atttypid,a.atttypmod) as type,a.attnotnull,a.attidentity,a.attgenerated,a.attacl::text as acl,
    pg_get_expr(d.adbin,d.adrelid) as default_expr
  from rel r join pg_attribute a on a.attrelid=r.oid left join pg_attrdef d on d.adrelid=r.oid and d.adnum=a.attnum
  where a.attnum>0 and not a.attisdropped order by r.ns,r.rel,a.attnum
 ),
 constraints as (
  select r.ns,r.rel,c.conname,pg_get_constraintdef(c.oid) as rule,c.convalidated
  from rel r join pg_constraint c on c.conrelid=r.oid
 ),
 indexes as (
  select r.ns,r.rel,i.relname as name, pg_get_indexdef(x.indexrelid) as definition,x.indisvalid
  from rel r join pg_index x on x.indrelid=r.oid join pg_class i on i.oid=x.indexrelid
 ),
 policies as (
  select p.schemaname,p.tablename,p.policyname,p.permissive,p.roles,p.cmd,p.qual,p.with_check
    from pg_policies p join rel r on r.ns=p.schemaname and r.rel=p.tablename
 ),
 triggers as (
  select r.ns,r.rel,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) as definition
    from rel r join pg_trigger t on t.tgrelid=r.oid where not t.tgisinternal
 ),
 funcs as (
  select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as signature,pg_get_functiondef(p.oid) as definition,
    pg_get_userbyid(p.proowner) as owner,p.proacl::text as acl
  from pg_proc p join scope n on n.oid=p.pronamespace
  where p.prokind in ('f','p','w') and not exists(select from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
 ),
 seq as (
  select r.ns,r.rel,s.seqstart,s.seqincrement,s.seqmax,s.seqmin,s.seqcycle,
  (xpath('/row/v/text()',query_to_xml(format('select last_value as v from %I.%I',r.ns,r.rel),false,true,'')))[1]::text as current_value,
  (xpath('/row/v/text()',query_to_xml(format('select is_called as v from %I.%I',r.ns,r.rel),false,true,'')))[1]::text as is_called
  from rel r join pg_sequence s on s.seqrelid=r.oid
 )
select jsonb_build_object(
 'schemas',(select to_jsonb(array_agg(nspname order by nspname)) from scope),
 'relations',(select jsonb_agg(to_jsonb(r)-'oid' order by ns,rel) from rel r),
 'columns',(select jsonb_agg(to_jsonb(c) order by ns,rel,attname) from col c),
 'counts',(select jsonb_agg(to_jsonb(c) order by ns,rel) from counts c),
 'constraints',(select jsonb_agg(to_jsonb(x) order by ns,rel,conname) from constraints x),
 'indexes',(select jsonb_agg(to_jsonb(x) order by ns,rel,name) from indexes x),
 'policies',(select jsonb_agg(to_jsonb(x) order by schemaname,tablename,policyname) from policies x),
 'triggers',(select jsonb_agg(to_jsonb(x) order by ns,rel,tgname) from triggers x),
 'functions',(select jsonb_agg(to_jsonb(x) order by nspname,proname,signature) from funcs x),
 'sequences',(select jsonb_agg(to_jsonb(x) order by ns,rel) from seq x),
 'joins',jsonb_build_object(
   'admin_auth',(select count(*) from public.admin_members a join auth.users u on u.id=a.user_id),
   'stock_catalogue',(select count(*) from public.inventory i join public.components c on c.id=i.component_id),
   'financial_orders',(select count(*) from public.order_financial_records f join public.orders o on o.id=f.order_id),
   'financial_revisions',(select count(*) from public.order_financial_revisions f join public.order_financial_records x on x.order_id=f.order_id)),
 'admin_acl',jsonb_build_object(
   'public_private_grant',has_schema_privilege('anon','forge_private','USAGE'),
   'member_table_access',has_table_privilege('authenticated','public.admin_members','SELECT'),
   'anon_financial_table',has_table_privilege('anon','public.order_financial_records','SELECT'),
   'auth_financial_table',has_table_privilege('authenticated','public.order_financial_records','SELECT')),
 'core_extensions',(select jsonb_object_agg(extname,jsonb_build_object('version',extversion,'schema',nspname))
    from pg_extension join pg_namespace on pg_namespace.oid=extnamespace where extname in ('pgcrypto','uuid-ossp'))
);

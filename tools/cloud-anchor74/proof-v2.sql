-- V2: both sides run this projection inside a read-only transaction.
SET LOCAL search_path TO pg_catalog;
SET LOCAL quote_all_identifiers TO off;
SET LOCAL DateStyle TO 'ISO, YMD';
SET LOCAL TimeZone TO 'UTC';
SET LOCAL IntervalStyle TO postgres;
SET LOCAL extra_float_digits TO 3;
SET LOCAL standard_conforming_strings TO on;
-- Metadata and aggregate counts only. Results stay inside the sealed archive.
with
 scope as (select oid,nspname from pg_namespace where nspname in ('public','forge_private','auth','storage','supabase_migrations')),
 rel as (
  select n.nspname as ns,c.relname as rel,c.oid,c.relkind,c.relpersistence,c.relrowsecurity,c.relforcerowsecurity,
    pg_get_userbyid(c.relowner) as owner,case when c.relacl is null then null else coalesce((
      select jsonb_agg(jsonb_build_array(g.grantor_name,g.grantee_public,g.grantee_name,g.privilege_type,g.is_grantable)
        order by g.grantor_name collate "C",g.grantee_public,g.grantee_name collate "C",g.privilege_type collate "C",g.is_grantable)
      from (select pg_get_userbyid(e.grantor) as grantor_name,e.grantee=0 as grantee_public,
          case when e.grantee<>0 then pg_get_userbyid(e.grantee) end as grantee_name,e.privilege_type,e.is_grantable
        from aclexplode(c.relacl) e) g
    ), '[]'::jsonb) end as acl,
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
  select r.ns,r.rel,a.attname,tn.nspname as type_schema,t.typname as type_name,a.atttypmod,
    format_type(a.atttypid,a.atttypmod) as type,cn.nspname as collation_schema,co.collname as collation_name,
    row_number() over (partition by r.oid order by a.attnum) as visible_position,a.attnotnull,a.attidentity,a.attgenerated,case when a.attacl is null then null else coalesce((
      select jsonb_agg(jsonb_build_array(g.grantor_name,g.grantee_public,g.grantee_name,g.privilege_type,g.is_grantable)
        order by g.grantor_name collate "C",g.grantee_public,g.grantee_name collate "C",g.privilege_type collate "C",g.is_grantable)
      from (select pg_get_userbyid(e.grantor) as grantor_name,e.grantee=0 as grantee_public,
          case when e.grantee<>0 then pg_get_userbyid(e.grantee) end as grantee_name,e.privilege_type,e.is_grantable
        from aclexplode(a.attacl) e) g
    ), '[]'::jsonb) end as acl,
    pg_get_expr(d.adbin,d.adrelid) as default_expr
  from rel r join pg_attribute a on a.attrelid=r.oid
    join pg_type t on t.oid=a.atttypid join pg_namespace tn on tn.oid=t.typnamespace
    left join pg_collation co on co.oid=a.attcollation left join pg_namespace cn on cn.oid=co.collnamespace
    left join pg_attrdef d on d.adrelid=r.oid and d.adnum=a.attnum
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
  select p.schemaname,p.tablename,p.policyname,p.permissive,array(select k from unnest(p.roles) k order by k collate "C") as roles,p.cmd,p.qual,p.with_check
    from pg_policies p join rel r on r.ns=p.schemaname and r.rel=p.tablename
 ),
 triggers as (
  select r.ns,r.rel,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) as definition
    from rel r join pg_trigger t on t.tgrelid=r.oid where not t.tgisinternal
 ),
 funcs as (
  select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as signature,pg_get_functiondef(p.oid) as definition,
    pg_get_userbyid(p.proowner) as owner,case when p.proacl is null then null else coalesce((
      select jsonb_agg(jsonb_build_array(g.grantor_name,g.grantee_public,g.grantee_name,g.privilege_type,g.is_grantable)
        order by g.grantor_name collate "C",g.grantee_public,g.grantee_name collate "C",g.privilege_type collate "C",g.is_grantable)
      from (select pg_get_userbyid(e.grantor) as grantor_name,e.grantee=0 as grantee_public,
          case when e.grantee<>0 then pg_get_userbyid(e.grantee) end as grantee_name,e.privilege_type,e.is_grantable
        from aclexplode(p.proacl) e) g
    ), '[]'::jsonb) end as acl
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
 'schemas',(select to_jsonb(array_agg(nspname order by nspname collate "C")) from scope),
 'relations',(select jsonb_agg(to_jsonb(r)-'oid' order by ns collate "C",rel collate "C") from rel r),
 'columns',(select jsonb_agg(to_jsonb(c) order by ns collate "C",rel collate "C",attname collate "C") from col c),
 'counts',(select jsonb_agg(to_jsonb(c) order by ns collate "C",rel collate "C") from counts c),
 'constraints',(select jsonb_agg(to_jsonb(x) order by ns collate "C",rel collate "C",conname collate "C") from constraints x),
 'indexes',(select jsonb_agg(to_jsonb(x) order by ns collate "C",rel collate "C",name collate "C") from indexes x),
 'policies',(select jsonb_agg(to_jsonb(x) order by schemaname collate "C",tablename collate "C",policyname collate "C") from policies x),
 'triggers',(select jsonb_agg(to_jsonb(x) order by ns collate "C",rel collate "C",tgname collate "C") from triggers x),
 'functions',(select jsonb_agg(to_jsonb(x) order by nspname collate "C",proname collate "C",signature collate "C") from funcs x),
 'sequences',(select jsonb_agg(to_jsonb(x) order by ns collate "C",rel collate "C") from seq x),
 'joins',jsonb_build_object(
   'admin_auth',(select count(*) from public.admin_members a join auth.users u on u.id=a.user_id),
   'stock_catalogue',(select count(*) from public.inventory i join public.components c on c.id=i.component_id),
   'financial_orders',(select count(*) from public.order_financial_records f join public.orders o on o.id=f.order_id),
   'financial_revisions',(select count(*) from public.order_financial_revisions f join public.order_financial_records x on x.order_id=f.order_id)),
 'role_memberships',(select jsonb_agg(jsonb_build_object('role',r.rolname,'member',m.rolname,'grantor',g.rolname,
        'admin',j.admin_option,'inherit',j.inherit_option,'set',j.set_option) order by r.rolname collate "C",m.rolname collate "C",g.rolname collate "C")
        from pg_auth_members j join pg_roles r on r.oid=j.roleid join pg_roles m on m.oid=j.member join pg_roles g on g.oid=j.grantor),
 'admin_acl',jsonb_build_object(
   'public_private_grant',has_schema_privilege('anon','forge_private','USAGE'),
   'member_table_access',has_table_privilege('authenticated','public.admin_members','SELECT'),
   'anon_financial_table',has_table_privilege('anon','public.order_financial_records','SELECT'),
   'auth_financial_table',has_table_privilege('authenticated','public.order_financial_records','SELECT')),
 'core_extensions',(select jsonb_object_agg(extname,jsonb_build_object('version',extversion,'schema',nspname))
    from pg_extension join pg_namespace on pg_namespace.oid=extnamespace where extname in ('pgcrypto','uuid-ossp','citext'))
);

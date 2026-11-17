-- Disabled by default: a draft never alters checkout.
create schema overseer_delivery;
revoke all on schema overseer_delivery from public, anon, authenticated, service_role;
create table overseer_delivery.settings (
 id boolean primary key default true check (id),
 revision integer not null default 0, draft jsonb, active jsonb
);
insert into overseer_delivery.settings default values;
create table overseer_delivery.history (
 revision integer primary key, action text not null check(action in ('draft','activate','legacy')),
 actor uuid not null, changed_at timestamptz not null default clock_timestamp(),
 before_config jsonb, after_config jsonb
);
alter table overseer_delivery.settings enable row level security;
alter table overseer_delivery.history enable row level security;
revoke all on all tables in schema overseer_delivery from public, anon, authenticated, service_role;

create function overseer_delivery.admin() returns uuid language plpgsql stable set search_path='' as $$
declare a uuid:=auth.uid();
begin
 if a is null or not exists(select from public.admin_members where user_id=a) then
  raise exception 'Admin membership required' using errcode='42501';
 end if;
 return a;
end $$;

create function overseer_delivery.number(v jsonb, high int) returns int
language plpgsql immutable set search_path='' as $$
begin
 if jsonb_typeof(v) is distinct from 'number' or v::text !~ '^[0-9]{1,10}$' or (v::text)::bigint>high then
  raise exception 'Enter a bounded whole number of pence, days or units' using errcode='22023';
 end if;
 return (v::text)::int;
end $$;

create function overseer_delivery.validate(c jsonb) returns void language plpgsql set search_path='' as $$
declare m jsonb; r jsonb; seen text[]:=array[]::text[]; key text; b timestamptz; e timestamptz;
begin
 if jsonb_typeof(c) is distinct from 'object' or octet_length(c::text)>12000
 or c-array['methods','freeEnabled','freeThreshold','promo','overrides']<>'{}'
 or jsonb_typeof(c->'freeEnabled') is distinct from 'boolean'
 or jsonb_typeof(c->'methods') is distinct from 'array'
 or jsonb_typeof(c->'overrides') is distinct from 'array' then
  raise exception 'Invalid delivery configuration' using errcode='22023';
 end if;
 if jsonb_array_length(c->'methods') not between 1 and 5 or jsonb_array_length(c->'overrides')>30 then
  raise exception 'Configure one to five methods and at most thirty product rules.' using errcode='22023';
 end if;
 if overseer_delivery.number(c->'freeThreshold',1000000)<1 then
  raise exception 'Free delivery threshold must be positive.' using errcode='22023';
 end if;
 for m in select value from jsonb_array_elements(c->'methods') loop
  key:=m->>'id';
  if jsonb_typeof(m) is distinct from 'object' or m-array['id','name','description','price','dispatchDays','deliveryDays','minOrder','minUnits']<>'{}'
   or coalesce(key,'') !~ '^[a-z][a-z0-9-]{1,20}$' or key=any(seen)
   or coalesce(length(btrim(m->>'name')),0) not between 1 and 60
   or coalesce(length(btrim(m->>'description')),0) not between 1 and 180
   or m->>'name' ~ '[[:cntrl:]]' or m->>'description' ~ '[[:cntrl:]]'
   then raise exception 'Invalid delivery method, name or description' using errcode='22023'; end if;
  seen:=array_append(seen,key);
  perform overseer_delivery.number(m->'price',99999),overseer_delivery.number(m->'dispatchDays',60),
    overseer_delivery.number(m->'deliveryDays',60),overseer_delivery.number(m->'minOrder',1000000),overseer_delivery.number(m->'minUnits',600);
  if cardinality(seen)=1 and (m->>'minOrder'<>'0' or m->>'minUnits'<>'0') then
   raise exception 'The first method must always be available.' using errcode='22023';
  end if;
 end loop;
 seen:=array[]::text[];
 for r in select value from jsonb_array_elements(c->'overrides') loop
  key:=r->>'productId';
  if jsonb_typeof(r) is distinct from 'object' or r-array['productId','minUnits','price']<>'{}'
   or coalesce(key,'') !~ '^[A-Za-z0-9_-]{1,120}$' or key=any(seen)
   or not (exists(select from public.components where id=key) or exists(select from public.assemblies where id=key))
   then raise exception 'Unknown or repeated product in delivery override' using errcode='22023'; end if;
  seen:=array_append(seen,key);
  if overseer_delivery.number(r->'minUnits',600)<1 then raise exception 'Override quantity must be positive' using errcode='22023'; end if;
  perform overseer_delivery.number(r->'price',99999);
 end loop;
 if c->'promo' is not null and c->'promo'<>'null' then
  if jsonb_typeof(c->'promo') is distinct from 'object' or (c->'promo')-array['start','end']<>'{}'
   or coalesce(c#>>'{promo,start}','') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$'
   or coalesce(c#>>'{promo,end}','') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$' then
   raise exception 'Promotion requires a valid start and end.' using errcode='22023'; end if;
  b:=(c#>>'{promo,start}')::timestamptz;e:=(c#>>'{promo,end}')::timestamptz;
  if e<=b or e-b>interval '90 days' then raise exception 'Promotion must end after it starts and within 90 days.' using errcode='22023'; end if;
 end if;
end $$;

create function overseer_delivery.legacy() returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('methods',jsonb_build_array(jsonb_build_object('id','standard','name','UK Delivery',
 'description','Standard UK delivery','price',standard_delivery_pence,'dispatchDays',null,'deliveryDays',null,'minOrder',0,'minUnits',0)),
 'freeEnabled',true,'freeThreshold',free_delivery_threshold_pence,'overrides','[]'::jsonb,'promo',null)
 from public.commerce_shipping where country='GB';
$$;

create function overseer_delivery.quote(c jsonb, subtotal bigint, items jsonb, at_time timestamptz) returns jsonb
language plpgsql stable set search_path='' as $$
declare units bigint; required_price bigint; result jsonb; free boolean;
begin
 if c is null then raise exception 'UK shipping is unavailable' using errcode='22023'; end if;
 if subtotal is null or subtotal not between 0 and 1000000000 or jsonb_typeof(items) is distinct from 'array'
   or jsonb_array_length(items)>60 or octet_length(items::text)>800000 then
   raise exception 'Invalid delivery basket' using errcode='22023';
 end if;
 if exists(select from jsonb_array_elements(items) i where coalesce(i->>'productId','') !~ '^[A-Za-z0-9_-]{1,120}$'
    or coalesce(i->>'quantity','') !~ '^[1-9][0-9]{0,2}$') then
   raise exception 'Invalid product or quantity' using errcode='22023'; end if;
 select coalesce(sum((i->>'quantity')::int),0) into units from jsonb_array_elements(items) i;
 select max((r->>'price')::int) into required_price from jsonb_array_elements(c->'overrides') r
 where (select coalesce(sum((i->>'quantity')::int),0) from jsonb_array_elements(items) i where i->>'productId'=r->>'productId') >= (r->>'minUnits')::int;
 free:=((c->>'freeEnabled')::boolean and subtotal>=(c->>'freeThreshold')::int)
  or coalesce(at_time >= (c#>>'{promo,start}')::timestamptz and at_time < (c#>>'{promo,end}')::timestamptz,false);
 select jsonb_agg(jsonb_build_object('id',m->>'id','name',m->>'name','description',m->>'description',
  'dispatchDays',m->'dispatchDays','deliveryDays',m->'deliveryDays',
  'price',greatest(coalesce(required_price,0),case when free and n=1 then 0 else (m->>'price')::int end)) order by n)
 into result from jsonb_array_elements(c->'methods') with ordinality x(m,n)
 where subtotal >= (m->>'minOrder')::int and units >= (m->>'minUnits')::int;
 return result;
end $$;

revoke all on all functions in schema overseer_delivery from public, anon, authenticated, service_role;

create function public.overseer_delivery_options(p_subtotal bigint,p_items jsonb) returns jsonb
language sql stable security definer set search_path='' as $$
 select overseer_delivery.quote(coalesce(s.active,overseer_delivery.legacy()),p_subtotal,p_items,statement_timestamp())
 from overseer_delivery.settings s where id;
$$;
create function public.overseer_delivery_admin_read() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform overseer_delivery.admin();
 return (select jsonb_build_object('revision',revision,'active',active,'draft',draft,'legacy',overseer_delivery.legacy(),'history',
  coalesce((select jsonb_agg(to_jsonb(h) order by h.revision desc) from (select revision,action,changed_at from overseer_delivery.history order by revision desc limit 15) h),'[]'::jsonb))
 from overseer_delivery.settings where id);
end $$;
create function public.overseer_delivery_admin_write(p_revision int,p_action text,p_config jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a uuid:=overseer_delivery.admin(); s overseer_delivery.settings%rowtype; next_config jsonb;
begin
 select * into strict s from overseer_delivery.settings where id for update;
 if p_revision is distinct from s.revision then raise exception 'Delivery settings changed. Reload and review.' using errcode='40001';end if;
 if p_action='draft' then
  perform overseer_delivery.validate(p_config);next_config:=p_config;
  update overseer_delivery.settings set draft=p_config,revision=revision+1 where id;
 elsif p_action='activate' and s.draft is not null and p_config is null then
  perform overseer_delivery.validate(s.draft);next_config:=s.draft;
  update overseer_delivery.settings set active=draft,revision=revision+1 where id;
 elsif p_action='legacy' and p_config is null then
  update overseer_delivery.settings set active=null,revision=revision+1 where id;
 else raise exception 'Invalid delivery change' using errcode='22023';end if;
 insert into overseer_delivery.history(revision,action,actor,before_config,after_config)
 values(s.revision+1,p_action,a,case when p_action='draft' then s.draft else s.active end,next_config);
 return public.overseer_delivery_admin_read();
end $$;
create function public.overseer_delivery_admin_preview(p_config jsonb,p_subtotal bigint,p_items jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform overseer_delivery.admin();
 perform overseer_delivery.validate(p_config);
 return overseer_delivery.quote(p_config,p_subtotal,p_items,statement_timestamp());
end $$;

create function overseer_delivery.resolve(subtotal bigint, items jsonb, requested text) returns bigint
language plpgsql stable set search_path='' as $$
declare options jsonb; cost bigint;
begin
 options:=public.overseer_delivery_options(subtotal,items);
 if requested is null then return (options#>>'{0,price}')::bigint; end if;
 select (m->>'price')::bigint into cost from jsonb_array_elements(options) m where m->>'id'=requested;
 if cost is null then raise exception 'Selected UK shipping method is unavailable' using errcode='22023'; end if;
 return cost;
end $$;

revoke all on function overseer_delivery.resolve(bigint,jsonb,text) from public,anon,authenticated,service_role;
revoke all on function public.overseer_delivery_options(bigint,jsonb),public.overseer_delivery_admin_read(),
 public.overseer_delivery_admin_write(int,text,jsonb),public.overseer_delivery_admin_preview(jsonb,bigint,jsonb)
 from public,anon,authenticated,service_role;
grant execute on function public.overseer_delivery_options(bigint,jsonb) to anon,authenticated,service_role;
grant execute on function public.overseer_delivery_admin_read(),public.overseer_delivery_admin_write(int,text,jsonb),
 public.overseer_delivery_admin_preview(jsonb,bigint,jsonb) to authenticated;

do $$
declare
 src text:=pg_get_functiondef('public.create_guest_kit_order(jsonb)'::regprocedure);
 marker text:='shipping_price:=case when subtotal>=shipping_threshold then 0 else shipping_price end;';
begin
 if (length(src)-length(replace(src,marker,'')))<>length(marker)
 or strpos(src,'assert_store_accepting_orders')=0 or strpos(src,'request_hash_value')=0 then
  raise exception 'Legacy order authority changed; rebase the delivery integration before applying.';
 end if;
 execute replace(src,marker,'shipping_price:=overseer_delivery.resolve(subtotal,stored_items,p_request->>''deliveryMethod'');');
end $$;

-- Commerce Ascendant. Additive, disabled on migration. Existing orders are never rewritten.
begin;
create schema commerce67;
revoke all on schema commerce67 from public, anon, authenticated;
create table commerce67.control (
 single boolean primary key default true check(single),
 enabled boolean not null default false
);
insert into commerce67.control default values;
create table commerce67.rules (
 id uuid primary key, revision integer not null check(revision>0),
 kind text not null check(kind in ('offer','bundle','addon')),
 state text not null check(state in ('draft','scheduled','active','paused','archived')),
 name text not null check(length(btrim(name)) between 1 and 120),
 description text not null check(length(description)<=600),
 starts_at timestamptz, ends_at timestamptz,
 code text check(code ~ '^[A-Z0-9-]{3,32}$'),
 priority integer not null check(priority between 0 and 999),
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<=12000),
 check(ends_at is null or starts_at is null or ends_at>starts_at),
 check(state<>'scheduled' or starts_at is not null),
 check(kind='offer' or code is null)
);
create index commerce67_rules_enabled on commerce67.rules(priority,id)
 where state in ('active','scheduled');
create unique index commerce67_unique_code on commerce67.rules(code) where state<>'archived' and code is not null;
create table commerce67.rule_versions (
 id uuid not null references commerce67.rules(id),
 revision integer not null,
 actor uuid not null, changed_at timestamptz not null default now(), body jsonb not null,
 primary key(id,revision)
);
create table commerce67.measured_units (
 id uuid primary key default gen_random_uuid(),
 component_id text not null references public.components(id),
 -- Integer ohms, entered on the UI and displayed in kΩ.
 resistance_ohms integer not null check(resistance_ohms between 100000 and 900000),
 measured_by uuid not null, measured_at timestamptz not null default now(),
 sold_order uuid references public.orders(id)
);
create index commerce67_unsold_units on commerce67.measured_units(component_id) where sold_order is null;
create table commerce67.matched_sets (
 id uuid primary key default gen_random_uuid(), component_id text not null references public.components(id),
 size integer not null check(size in (2,4)), tolerance_bp integer not null check(tolerance_bp between 1 and 2000),
 price_minor integer not null check(price_minor between 1 and 100000000), actor uuid not null,
 state text not null default 'available' check(state in ('available','reserved','sold','retired')),
 order_id uuid references public.orders(id),
 created_at timestamptz not null default now(),
 check((state in ('reserved','sold'))=(order_id is not null))
);
create unique index commerce67_order_set on commerce67.matched_sets(order_id,id) where order_id is not null;
-- A measured unit may occur in at most one set, including reservations. Keep sold
-- members for fulfilment; retiring an unsold set releases its membership only.
create table commerce67.set_members (
 set_id uuid not null references commerce67.matched_sets(id),
 unit_id uuid primary key references commerce67.measured_units(id)
);
create index commerce67_members_by_set on commerce67.set_members(set_id);
create table commerce67.holds (
 order_id uuid not null references public.orders(id),
 component_id text not null references public.inventory(component_id),
 quantity bigint not null check(quantity between 1 and 100000),
 primary key(order_id,component_id)
);
create index commerce67_holds_by_component on commerce67.holds(component_id);
create table commerce67.sessions (
 order_id uuid primary key references public.orders(id),
 state text not null default 'open' check(state in ('open','paid','expired')),
 created_at timestamptz not null default now(), resolved_at timestamptz
);
alter table commerce67.control enable row level security;
alter table commerce67.rules enable row level security;
alter table commerce67.rule_versions enable row level security;
alter table commerce67.measured_units enable row level security;
alter table commerce67.matched_sets enable row level security;
alter table commerce67.set_members enable row level security;
alter table commerce67.holds enable row level security;
alter table commerce67.sessions enable row level security;
revoke all on all tables in schema commerce67 from public,anon,authenticated;

create function commerce67.admin_actor() returns uuid language plpgsql stable set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(select from public.admin_members where user_id=actor)
 then raise exception 'Commerce Admin membership required' using errcode='42501'; end if;
 return actor;
end $$;

create function commerce67.require_int(p jsonb, low integer, high integer)
returns integer language plpgsql immutable set search_path='' as $$
begin
 if jsonb_typeof(p) is distinct from 'number' or p::text !~ '^[0-9]{1,10}$'
 or p::text::bigint not between low and high then
  raise exception 'Invalid integer configuration' using errcode='22023';
 end if;
 return p::text::integer;
end $$;

create function public.commerce67_save_rule(p_id uuid,p_expected integer,p_rule jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=commerce67.admin_actor(); previous commerce67.rules; saved commerce67.rules;
 k text:=p_rule->>'kind'; s text:=p_rule->>'state'; d jsonb:=p_rule->'data';
 id_value uuid:=coalesce(p_id,gen_random_uuid()); v jsonb; b jsonb; key text;
begin
 if jsonb_typeof(p_rule) is distinct from 'object' or octet_length(p_rule::text)>16000
  or jsonb_typeof(d) is distinct from 'object' or k is null
  or s is null or jsonb_typeof(d->'products') is distinct from 'array'
  or jsonb_typeof(d->'categories') is distinct from 'array'
  or jsonb_typeof(d->'exclude') is distinct from 'array'
  or jsonb_array_length(d->'products')>40 or jsonb_array_length(d->'categories')>20
  or jsonb_array_length(d->'exclude')>40 then
  raise exception 'Invalid commercial definition' using errcode='22023';
 end if;
 if exists(select 1 from jsonb_array_elements_text((d->'products')||(d->'exclude')) x(id)
   where not exists(select from public.components c where c.id=x.id))
 then raise exception 'Unknown product or variant' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements_text(d->'categories') x(category)
   where x.category not in ('potentiometers','capacitors','treble-bleeds','switches','jacks','other'))
 then raise exception 'Unknown category' using errcode='22023'; end if;
 if k='offer' then
  if coalesce(d->>'stacking','') not in ('exclusive','stackable')
    or jsonb_typeof(d->'tiers') is distinct from 'array' or jsonb_array_length(d->'tiers') not between 1 and 8
    or (jsonb_array_length(d->'products')=0 and jsonb_array_length(d->'categories')=0 and d->'all' is distinct from 'true'::jsonb)
  then raise exception 'Invalid eligibility or stacking' using errcode='22023'; end if;
  for v in select value from jsonb_array_elements(d->'tiers') loop
   perform commerce67.require_int(v->'minimum',1,99);
   if coalesce(v->>'type','') not in ('percent','fixed','package') then raise exception 'Invalid tier type'; end if;
   perform commerce67.require_int(v->'value',1,
    case when v->>'type'='percent' then 10000 else 100000000 end);
  end loop;
  if (select count(distinct value->>'minimum') from jsonb_array_elements(d->'tiers'))<>jsonb_array_length(d->'tiers')
  then raise exception 'Duplicate quantity thresholds' using errcode='22023'; end if;
 elsif k in ('bundle','addon') then
  if jsonb_typeof(d->'parts') is distinct from 'array' or jsonb_array_length(d->'parts') not between 1 and 10
    or (k='addon' and (jsonb_array_length(d->'products')=0 or length(btrim(coalesce(d->>'instructions',''))) not between 1 and 500))
    or (k='bundle' and coalesce(d->>'pricing','') not in ('fixed','discount'))
  then raise exception 'Invalid bundle or add-on' using errcode='22023'; end if;
  perform commerce67.require_int(d->'priceMinor',case when k='addon' then 0 else 1 end,100000000);
  for b in select value from jsonb_array_elements(d->'parts') loop
   if not exists(select from public.components where id=b->>'componentId') then raise exception 'Unknown constituent'; end if;
   perform commerce67.require_int(b->'quantity',1,99);
  end loop;
  if (select count(distinct value->>'componentId') from jsonb_array_elements(d->'parts'))<>jsonb_array_length(d->'parts')
  then raise exception 'Duplicate constituents' using errcode='22023'; end if;
  if k='bundle' and (select sum((value->>'quantity')::int) from jsonb_array_elements(d->'parts'))<2
  then raise exception 'A bundle must contain at least two units'; end if;
 else raise exception 'Unknown commercial definition';
 end if;
 -- Serialize rule changes against quotes, including new rules and schedule changes.
 perform 1 from commerce67.control where single for update;
 select * into previous from commerce67.rules where id=id_value;
 if p_expected is distinct from coalesce(previous.revision,0) then raise exception 'Commerce revision changed' using errcode='40001'; end if;
 if previous.state='archived' or (previous.kind is not null and previous.kind<>k) or (previous.id is null and s<>'draft') then
  raise exception 'Invalid commercial lifecycle transition' using errcode='22023';
 end if;
 if previous.id is null and (select count(*) from commerce67.rules where state<>'archived')>=100
 then raise exception 'Too many retained commercial definitions'; end if;
 insert into commerce67.rules values(id_value,coalesce(previous.revision,0)+1,k,s,btrim(p_rule->>'name'),
  coalesce(p_rule->>'description',''),nullif(p_rule->>'startsAt','')::timestamptz,nullif(p_rule->>'endsAt','')::timestamptz,
  nullif(upper(btrim(p_rule->>'code')),''),commerce67.require_int(p_rule->'priority',0,999),d)
 on conflict(id) do update set revision=excluded.revision,state=excluded.state,name=excluded.name,
  description=excluded.description,starts_at=excluded.starts_at,ends_at=excluded.ends_at,
  code=excluded.code,priority=excluded.priority,data=excluded.data returning * into saved;
 insert into commerce67.rule_versions(id,revision,actor,body) values(saved.id,saved.revision,actor,to_jsonb(saved));
 return to_jsonb(saved);
end $$;

create function public.commerce67_admin_workspace() returns jsonb language plpgsql
security definer stable set search_path='' as $$
begin
 perform commerce67.admin_actor();
 return jsonb_build_object(
  'rules',coalesce((select jsonb_agg(to_jsonb(t) order by t.priority,t.id) from
   (select * from commerce67.rules where state<>'archived' order by priority,id limit 100) t),'[]'),
  'units',coalesce((select jsonb_agg(to_jsonb(t)) from (
   select id,component_id,resistance_ohms from commerce67.measured_units
   where sold_order is null order by measured_at desc,id limit 100) t),'[]'),
  'sets',coalesce((select jsonb_agg(to_jsonb(t)) from (
   select s.id,s.component_id,s.size,s.tolerance_bp,s.price_minor,s.state,
   (select jsonb_agg(m.unit_id) from commerce67.set_members m where m.set_id=s.id) as members
   from commerce67.matched_sets s where s.state<>'retired' order by s.created_at desc,s.id limit 100) t),'[]'));
end $$;

create function commerce67.floor_quantity(p_component text) returns bigint
language sql volatile set search_path='' as $$
 select (select count(*) from commerce67.measured_units where component_id=p_component and sold_order is null)
 + coalesce((select sum(quantity) from commerce67.holds where component_id=p_component),0)::bigint
$$;
create function commerce67.inventory_floor() returns trigger language plpgsql security definer set search_path='' as $$
declare floor_qty bigint:=commerce67.floor_quantity(old.component_id);
begin
 if floor_qty>0 and (tg_op='DELETE' or new.component_id is distinct from old.component_id or new.quantity<floor_qty) then
  raise exception 'Stock is allocated to measured units or pending checkout' using errcode='23514';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create trigger commerce67_inventory_floor before update of quantity,component_id or delete on public.inventory
 for each row execute function commerce67.inventory_floor();

create function public.commerce67_record_measurement(p_component text,p_ohms integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=commerce67.admin_actor(); stock bigint; unit uuid;
begin
 if not (select enabled from commerce67.control where single for share) then raise exception 'Measured inventory is disabled'; end if;
 if not exists(select from public.components c where c.id=p_component and c.category='potentiometers'
     and lower(c.manufacturer)='cts' and c.active and c.name ~* '[AB][[:space:]]*500[[:space:]]*k')
 then raise exception 'Select an active CTS A500K or B500K variant' using errcode='22023'; end if;
 select i.quantity into stock from public.inventory i where i.component_id=p_component and i.stock_unit='item' for update;
 if stock is null or stock<=commerce67.floor_quantity(p_component) then raise exception 'No unallocated physical stock'; end if;
 update public.inventory set updated_at=updated_at where component_id=p_component;
 insert into commerce67.measured_units(component_id,resistance_ohms,measured_by) values(p_component,p_ohms,actor) returning id into unit;
 return unit;
end $$;
create function public.commerce67_make_set(p_units uuid[],p_tolerance_bp integer,p_price_minor integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=commerce67.admin_actor(); count_units integer; component text; low integer; high integer; set_id uuid;
begin
 if cardinality(p_units) is null or cardinality(p_units) not in (2,4) or array_position(p_units,null) is not null
 then raise exception 'Select two or four measured units'; end if;
 -- Lock in UUID order to serialize overlapping set creation.
 perform 1 from commerce67.measured_units where id=any(p_units) order by id for update;
 select count(*),min(component_id),min(resistance_ohms),max(resistance_ohms) into count_units,component,low,high
 from commerce67.measured_units u where u.id=any(p_units) and u.sold_order is null
   and not exists(select from commerce67.set_members m where m.unit_id=u.id);
 if count_units<>cardinality(p_units) or exists(select from commerce67.measured_units u where u.id=any(p_units) and component_id<>component)
 then raise exception 'Units must be unique, available and from one exact variant'; end if;
 if (high-low)::bigint*10000>low::bigint*p_tolerance_bp then raise exception 'Selected measurements exceed tolerance'; end if;
 insert into commerce67.matched_sets(component_id,size,tolerance_bp,price_minor,actor)
 values(component,count_units,p_tolerance_bp,p_price_minor,actor) returning id into set_id;
 insert into commerce67.set_members select set_id,unnest(p_units);
 return set_id;
end $$;

create function public.commerce67_retire_set(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform commerce67.admin_actor();
 update commerce67.matched_sets set state='retired' where id=p_id and state='available';
 if not found then raise exception 'Only an available set may be retired'; end if;
 delete from commerce67.set_members where set_id=p_id;
end $$;

create function commerce67.requirements(p_items jsonb)
returns table(component_id text,quantity bigint) language sql immutable set search_path='' as $$
 select parts.id,sum(parts.q)::bigint
 from jsonb_array_elements(p_items) r(item)
 cross join lateral (
  select r.item->>'productId' id,(r.item->>'quantity')::bigint q where r.item->>'type'='component'
  union all
  select v->>'componentId',(v->>'quantity')::bigint*(r.item->>'quantity')::bigint
  from jsonb_array_elements(r.item->'snapshot'->'stockRequirements') v
  where r.item->>'type' in ('kit','assembly') and not (r.item->'snapshot' ? 'measuredSet')
 ) parts
 group by parts.id order by parts.id
$$;

create function commerce67.reserve(p_order uuid,p_items jsonb) returns void
language plpgsql set search_path='' as $$
declare requirement record; have bigint; item jsonb; set_uuid uuid;
begin
 for requirement in select * from commerce67.requirements(p_items) loop
  select i.quantity into have from public.inventory i where i.component_id=requirement.component_id and i.stock_unit='item' for update;
  if have is null or have-commerce67.floor_quantity(requirement.component_id)<requirement.quantity
  then raise exception 'Shared stock is unavailable' using errcode='22023'; end if;
  update public.inventory set updated_at=updated_at where component_id=requirement.component_id;
  insert into commerce67.holds values(p_order,requirement.component_id,requirement.quantity);
 end loop;
 for item in select value from jsonb_array_elements(p_items) where value->'snapshot' ? 'measuredSet' order by value->>'productId' loop
  set_uuid:=(item->'snapshot'->'measuredSet'->>'id')::uuid;
  update commerce67.matched_sets set state='reserved',order_id=p_order where id=set_uuid and state='available';
  if not found then raise exception 'Measured set is unavailable' using errcode='22023'; end if;
 end loop;
 insert into commerce67.sessions(order_id) values(p_order);
end $$;

create function commerce67.consume(p_order uuid) returns void language plpgsql set search_path='' as $$
declare row_state text;
begin
 select state into row_state from commerce67.sessions where order_id=p_order for update;
 if not found then return; end if;
 if row_state<>'open' then raise exception 'Commerce checkout reservation is no longer open'; end if;
 -- Same ordering as the established stock deduction, including measured variants.
 perform 1 from public.inventory i where i.component_id in (
  select component_id from commerce67.holds where order_id=p_order
  union select component_id from commerce67.matched_sets where order_id=p_order)
  order by i.component_id for update;
 update commerce67.measured_units u set sold_order=p_order where exists(
  select from commerce67.set_members m join commerce67.matched_sets s on s.id=m.set_id
  where m.unit_id=u.id and s.order_id=p_order and s.state='reserved');
 update commerce67.matched_sets set state='sold' where order_id=p_order and state='reserved';
 delete from commerce67.holds where order_id=p_order;
 update commerce67.sessions set state='paid',resolved_at=now() where order_id=p_order;
end $$;

create function public.commerce67_expire_checkout(p_order uuid,p_session text,p_reference text) returns boolean
language plpgsql security definer set search_path='' as $$
declare o public.orders; state_now text;
begin
 select * into o from public.orders where id=p_order for update;
 if not found or o.reference is distinct from p_reference or o.stripe_checkout_session_id is distinct from p_session
  or p_session is null or p_session !~ '^cs_live_[A-Za-z0-9]{8,}$' then return false; end if;
 select state into state_now from commerce67.sessions where order_id=p_order for update;
 if state_now is distinct from 'open' then return true; end if;
 if o.payment_status<>'unpaid' or o.status<>'pending' then return false; end if;
 delete from commerce67.holds where order_id=p_order;
 update commerce67.matched_sets set state='available',order_id=null where order_id=p_order and state='reserved';
 update commerce67.sessions set state='expired',resolved_at=now() where order_id=p_order;
 return true;
end $$;

-- Patch only the recognised hooks; preserve the single order and fulfilment path.
do $migration$
declare body text;
 old_stock text:=' perform public.apply_order_inventory(order_row.items);';
 old_return text:=' returning * into order_data;';
begin
 body:=pg_get_functiondef('public.fulfil_paid_stripe_checkout(text,text,uuid,text,text,text,bigint,text)'::regprocedure);
 if length(body)-length(replace(body,old_stock,''))<>length(old_stock) then raise exception 'Unknown fulfilment boundary'; end if;
 execute replace(body,old_stock,' perform commerce67.consume(p_order_id);'||chr(10)||old_stock);
 body:=pg_get_functiondef('public.create_guest_kit_order(jsonb)'::regprocedure);
 if length(body)-length(replace(body,old_return,''))<>length(old_return) then raise exception 'Unknown existing checkout boundary'; end if;
 execute replace(body,old_return,old_return||chr(10)
 ||' if p_request->>''checkoutMode''=''stripe'' and (select enabled from commerce67.control where single for share) then'
 ||' perform commerce67.reserve(order_data.id,stored_items); end if;');
end $migration$;

revoke execute on all functions in schema commerce67 from public,anon,authenticated;
revoke all on function public.commerce67_save_rule(uuid,integer,jsonb),public.commerce67_admin_workspace(),
 public.commerce67_record_measurement(text,integer),public.commerce67_make_set(uuid[],integer,integer),
 public.commerce67_retire_set(uuid),public.commerce67_expire_checkout(uuid,text,text) from public,anon,authenticated;
grant execute on function public.commerce67_save_rule(uuid,integer,jsonb),public.commerce67_admin_workspace(),
 public.commerce67_record_measurement(text,integer),public.commerce67_make_set(uuid[],integer,integer),
 public.commerce67_retire_set(uuid) to authenticated;
grant execute on function public.commerce67_expire_checkout(uuid,text,text) to service_role;

create table commerce67.order_snapshots (
 order_id uuid primary key references public.orders(id),
 quote jsonb not null, private_costs jsonb not null, recorded_at timestamptz not null default now()
);
alter table commerce67.order_snapshots enable row level security;
revoke all on commerce67.order_snapshots from public,anon,authenticated;
create function public.commerce67_order_snapshot(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform commerce67.admin_actor();
 return (select to_jsonb(s) from commerce67.order_snapshots s where s.order_id=p_order);
end $$;
revoke all on function public.commerce67_order_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.commerce67_order_snapshot(uuid) to authenticated;

create function commerce67.apply_offer(p_units jsonb, r commerce67.rules) returns jsonb
language plpgsql set search_path='' as $$
declare tier jsonb; gross bigint; discount bigint; allocation bigint; balance bigint; allocated bigint:=0;
 ids integer[]; ix integer; groups integer; min_qty integer; unit jsonb; modified jsonb:=p_units;
begin
 select array_agg(n::integer-1 order by (v->>'remaining')::bigint desc,n) into ids
 from jsonb_array_elements(p_units) with ordinality as x(v,n)
 where v->>'type'='component'
 and not ((r.data->'exclude') ? (v->>'productId'))
 and (r.data->'all'='true'::jsonb or (r.data->'products') ? (v->>'productId') or (r.data->'categories') ? (v->>'category'));
 select value into tier from jsonb_array_elements(r.data->'tiers')
  where (value->>'minimum')::int<=coalesce(cardinality(ids),0) order by (value->>'minimum')::int desc limit 1;
 if tier is null then return null; end if;
 min_qty:=(tier->>'minimum')::int;
 if tier->>'type'='package' then
  ids:=array(select k from unnest(ids) k where not coalesce((p_units->k->>'packageUsed')::boolean,false));
  select value into tier from jsonb_array_elements(r.data->'tiers') where value->>'type'='package'
    and (value->>'minimum')::int<=cardinality(ids) order by (value->>'minimum')::int desc limit 1;
  if tier is null then return null; end if;
  min_qty:=(tier->>'minimum')::int;
 end if;
 groups:=cardinality(ids)/min_qty;
 if tier->>'type'='package' then ids:=ids[1:groups*min_qty]; end if;
 select sum((p_units->k->>'remaining')::bigint) into gross from unnest(ids) k;
 discount:=case tier->>'type' when 'percent' then (gross*(tier->>'value')::bigint+5000)/10000
  when 'fixed' then groups*(tier->>'value')::bigint
  else greatest(0,gross-groups*(tier->>'value')::bigint) end;
 -- A physical line is never rounded below one penny. Fixed-package groups
 -- occupy the highest-priced available eligible units, as in the draft studio.
 discount:=least(discount,gross-cardinality(ids));
 if discount<=0 then return null; end if;
 balance:=gross-cardinality(ids);
 foreach ix in array ids loop
  unit:=modified->ix;
  allocation:=((unit->>'remaining')::bigint-1)*discount/balance;
  modified:=jsonb_set(modified,array[ix::text],unit||jsonb_build_object('remaining',(unit->>'remaining')::bigint-allocation,
   'packageUsed',coalesce((unit->>'packageUsed')::boolean,false) or tier->>'type'='package',
   'offers',coalesce(unit->'offers','[]'::jsonb)||jsonb_build_array(r.id)),false);
  allocated:=allocated+allocation;
 end loop;
 foreach ix in array ids loop
  exit when allocated=discount;
  if (modified->ix->>'remaining')::bigint>1 then
   modified:=jsonb_set(modified,array[ix::text,'remaining'],to_jsonb((modified->ix->>'remaining')::bigint-1),false);
   allocated:=allocated+1;
  end if;
 end loop;
 if allocated<>discount then raise exception 'Discount allocation failed'; end if;
 return jsonb_build_object('units',modified,'discount',discount,
  'offer',jsonb_build_object('id',r.id,'revision',r.revision,'name',r.name,'discountMinor',discount,'minimum',min_qty));
end $$;

create function commerce67.quote(p_intents jsonb,p_code text) returns jsonb
language plpgsql set search_path='' as $$
declare t timestamptz:=statement_timestamp(); input jsonb; u jsonb; r commerce67.rules; a commerce67.rules;
 c record; matched commerce67.matched_sets; match_data jsonb;
 units jsonb:='[]'; stacked jsonb; chosen jsonb; applied jsonb:='[]'; chosen_applied jsonb:='[]'; attempt jsonb;
 parts jsonb; cost bigint; gross bigint; price bigint; goods bigint:=0; unit_count integer:=0; quantity integer;
 stacked_discount bigint:=0; best_discount bigint:=0; ship bigint; threshold bigint; key text; customer_name text;
 item_sku text; offer_code text:=nullif(upper(btrim(p_code)),''); order_lines jsonb; base_gross bigint;
 stock_need record; existing bigint;
begin
 if not (select enabled from commerce67.control where single for share)
 then raise exception 'Commerce checkout is disabled' using errcode='55000'; end if;
 if jsonb_typeof(p_intents) is distinct from 'array' or jsonb_array_length(p_intents) not between 1 and 10
 or octet_length(p_intents::text)>7000 or (offer_code is not null and offer_code !~ '^[A-Z0-9-]{3,32}$')
 then raise exception 'Invalid commerce basket' using errcode='22023'; end if;
 for input in select value from jsonb_array_elements(p_intents) loop
  if jsonb_typeof(input) is distinct from 'object' or (input - array['kind','id','quantity','addon'])<>'{}'::jsonb
   or coalesce(input->>'id','') !~ '^[A-Za-z0-9_-]{1,120}$'
  then raise exception 'Invalid commerce item' using errcode='22023'; end if;
  quantity:=commerce67.require_int(input->'quantity',1,60);
  unit_count:=unit_count+quantity;
  if unit_count>60 then raise exception 'Commerce checkout supports at most sixty sellable units'; end if;
  key:=input->>'id'; match_data:=null; parts:='[]';
  if input->>'kind'='component' then
   select id,sku,name,category,sale_price into c from public.components where id=key and active and individually and sale_price>0 for share;
   if not found then raise exception 'Component is unavailable' using errcode='22023'; end if;
   gross:=c.sale_price; price:=gross; customer_name:=c.name; item_sku:=c.sku;
   u:=jsonb_build_object('type','component','productId',c.id,'category',c.category);
   if input ? 'addon' then
    select * into a from commerce67.rules where id=(input->>'addon')::uuid and kind='addon' and state in ('active','scheduled')
    and (starts_at is null or starts_at<=t) and (ends_at is null or ends_at>t)
    and (data->'products') ? c.id and not ((data->'exclude') ? c.id);
    if not found then raise exception 'Add-on is unavailable or incompatible' using errcode='22023'; end if;
    if exists(select from jsonb_array_elements(a.data->'parts') p where p->>'componentId'=c.id)
    then raise exception 'Incompatible repeated base component'; end if;
    parts:=(a.data->'parts')||jsonb_build_array(jsonb_build_object('componentId',c.id,'quantity',1));
    customer_name:=c.name||' + '||a.name;
    price:=price+(a.data->>'priceMinor')::bigint; gross:=price;
    u:=jsonb_build_object('type','assembly','productId',c.id,'addon',
     jsonb_build_object('id',a.id,'revision',a.revision,'name',a.name,'instructions',a.data->>'instructions','priceMinor',a.data->'priceMinor'));
   end if;
  elsif input->>'kind'='bundle' and not(input ? 'addon') then
   select * into r from commerce67.rules where id=key::uuid and kind='bundle' and state in ('active','scheduled')
   and (starts_at is null or starts_at<=t) and (ends_at is null or ends_at>t);
   if not found then raise exception 'Bundle is unavailable' using errcode='22023'; end if;
   parts:=r.data->'parts'; customer_name:=r.name; item_sku:='BUNDLE-'||left(key,8);
   u:=jsonb_build_object('type','assembly','productId',key,'bundle',jsonb_build_object('id',r.id,'revision',r.revision,'name',r.name));
  elsif input->>'kind'='set' and quantity=1 and not(input ? 'addon') then
   select * into matched from commerce67.matched_sets where id=key::uuid and state='available';
   if not found then raise exception 'Measured set is unavailable' using errcode='22023'; end if;
   select id,sku,name,category,sale_price into c from public.components where id=matched.component_id and active and sale_price>0 for share;
   if not found then raise exception 'Measured set variant is unavailable'; end if;
   parts:=jsonb_build_array(jsonb_build_object('componentId',c.id,'quantity',matched.size));
   price:=matched.price_minor; gross:=price;
   customer_name:=c.name||' · measured set of '||matched.size;
   item_sku:='MATCH-'||left(key,8);
   -- Public quote strips this metadata; the authenticated fulfilment copy retains it.
   select jsonb_build_object('id',matched.id,'toleranceBp',matched.tolerance_bp,
    'units',jsonb_agg(jsonb_build_object('id',m.id,'ohms',m.resistance_ohms) order by m.id))
   into match_data from commerce67.set_members s join commerce67.measured_units m on m.id=s.unit_id where s.set_id=matched.id;
   if jsonb_array_length(match_data->'units') is distinct from matched.size then raise exception 'Measured set membership changed'; end if;
   u:=jsonb_build_object('type','assembly','productId',key,'measuredSet',match_data);
  else raise exception 'Unsupported commercial selection' using errcode='22023';
  end if;
  if jsonb_array_length(parts)>0 then
   -- Only constituent rows; never select an image or private cost on this path.
   perform 1 from public.components cc where cc.id in (select value->>'componentId' from jsonb_array_elements(parts))
    order by cc.id for share;
   if exists(select from jsonb_array_elements(parts) p left join public.components cc on cc.id=p->>'componentId'
    where cc.active is not true or (input->>'kind'='bundle' and coalesce(cc.sale_price,0)<1))
   then raise exception 'A constituent is unavailable'; end if;
   if input->>'kind'='bundle' then
    select sum(cc.sale_price::bigint*(p->>'quantity')::int) into gross
    from jsonb_array_elements(parts) p join public.components cc on cc.id=p->>'componentId';
    price:=case r.data->>'pricing' when 'fixed' then (r.data->>'priceMinor')::bigint
     else greatest(1,gross-(r.data->>'priceMinor')::bigint) end;
    if price>gross then raise exception 'Bundle price exceeds its constituent prices'; end if;
   end if;
   select jsonb_agg(p||jsonb_build_object('name',cc.name,'sku',cc.sku) order by cc.id) into parts
    from jsonb_array_elements(parts) p join public.components cc on cc.id=p->>'componentId';
  end if;
  u:=u||jsonb_build_object('name',customer_name,'sku',item_sku,'gross',gross,'remaining',price,
   'stockRequirements',parts,'offers','[]'::jsonb);
  for ix in 1..quantity loop units:=units||jsonb_build_array(u); end loop;
 end loop;
 base_gross:=(select sum((v->>'gross')::bigint) from jsonb_array_elements(units) v);
 if base_gross>1000000000 or (select max((v->>'remaining')::bigint) from jsonb_array_elements(units) v)>99999999
  then raise exception 'Commerce totals exceed the supported range'; end if;

 stacked:=units;
 for r in select * from commerce67.rules where kind='offer' and state in ('active','scheduled')
   and (starts_at is null or starts_at<=t) and (ends_at is null or ends_at>t)
   and (code is null or code=offer_code) and data->>'stacking'='stackable' order by priority,id loop
  attempt:=commerce67.apply_offer(stacked,r);
  if attempt is not null then
   stacked:=attempt->'units'; stacked_discount:=stacked_discount+(attempt->>'discount')::bigint;
   applied:=applied||jsonb_build_array(attempt->'offer');
  end if;
 end loop;
 chosen:=stacked; chosen_applied:=applied; best_discount:=stacked_discount;
 for r in select * from commerce67.rules where kind='offer' and state in ('active','scheduled')
   and (starts_at is null or starts_at<=t) and (ends_at is null or ends_at>t)
   and (code is null or code=offer_code) and data->>'stacking'='exclusive' order by priority,id loop
  attempt:=commerce67.apply_offer(units,r);
  if (attempt->>'discount')::bigint>best_discount then
   chosen:=attempt->'units'; chosen_applied:=jsonb_build_array(attempt->'offer'); best_discount:=(attempt->>'discount')::bigint;
  end if;
 end loop;
 if offer_code is not null and not exists(select from jsonb_array_elements(chosen_applied) p
  join commerce67.rules rr on rr.id=(p->>'id')::uuid where rr.code=offer_code)
 then raise exception 'Code is unavailable for this basket' using errcode='22023'; end if;
 select jsonb_agg(jsonb_build_object('type',s.u->>'type','productId',s.u->>'productId','sku',s.u->>'sku','name',s.u->>'name',
 'quantity',q,'unitPrice',(s.u->>'remaining')::bigint,'lineTotal',q*(s.u->>'remaining')::bigint,'currency','GBP',
 'snapshot',jsonb_build_object('originalUnitPrice',(s.u->>'gross')::bigint,'offerIds',s.u->'offers',
 'stockRequirements',s.u->'stockRequirements')||
 case when s.u?'addon' then jsonb_build_object('addon',s.u->'addon') when s.u?'bundle' then jsonb_build_object('bundle',s.u->'bundle')
 when s.u?'measuredSet' then jsonb_build_object('measuredSet',s.u->'measuredSet') else '{}'::jsonb end)
 order by first_ordinal) into order_lines
 from (select v u,count(*) q,min(n) first_ordinal
  from jsonb_array_elements(chosen) with ordinality as x(v,n) group by v) s;
 if exists(select from jsonb_array_elements(order_lines) item where item->'snapshot'?'measuredSet' and (item->>'quantity')::int<>1) or
  (select count(*) from jsonb_array_elements(order_lines) item where item->'snapshot'?'measuredSet')<>
  (select count(distinct item->>'productId') from jsonb_array_elements(order_lines) item where item->'snapshot'?'measuredSet')
  then raise exception 'A measured set can only be selected once'; end if;
 for stock_need in select * from commerce67.requirements(order_lines) loop
  select i.quantity into existing from public.inventory i where i.component_id=stock_need.component_id and i.stock_unit='item';
  if existing is null or existing-commerce67.floor_quantity(stock_need.component_id)<stock_need.quantity
   then raise exception 'Shared stock is unavailable' using errcode='22023'; end if;
 end loop;
 goods:=(select sum((item->>'lineTotal')::bigint) from jsonb_array_elements(order_lines) item);
 select standard_delivery_pence,free_delivery_threshold_pence into ship,threshold
 from public.commerce_shipping where country='GB' for share;
 if ship is null or threshold is null then raise exception 'UK delivery is unavailable'; end if;
 if goods>=threshold then ship:=0; end if;
 return jsonb_build_object('currency','GBP','subtotalMinor',goods,'deliveryMinor',ship,'totalMinor',goods+ship,
  'originalMinor',base_gross,'discountMinor',base_gross-goods,'offers',chosen_applied,'items',order_lines);
end $$;

create function public.commerce67_quote(p_items jsonb,p_code text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q jsonb:=commerce67.quote(p_items,p_code);
begin
 -- No costs, stock counts, measurement identities or resolver data in a customer response.
 return (q-'items')||jsonb_build_object('quoteId',md5(q::text),'lines',
  (select jsonb_agg(item-'snapshot'||jsonb_build_object('originalUnitPrice',item->'snapshot'->'originalUnitPrice'))
   from jsonb_array_elements(q->'items') item));
end $$;

create function public.commerce67_product_terms(p_component text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c record; t timestamptz:=statement_timestamp();
begin
 if length(coalesce(p_component,'')) not between 1 and 120 or
    not (select enabled from commerce67.control where single) then return '[]'::jsonb; end if;
 select id,category into c from public.components where id=p_component and active and individually and sale_price>0;
 if not found then return '[]'::jsonb; end if;
 return coalesce((select jsonb_agg(to_jsonb(x)) from (
  select name,description,data->'tiers' as tiers, data->>'stacking' as stacking
  from commerce67.rules r where kind='offer' and state in ('active','scheduled') and code is null
  and (starts_at is null or starts_at<=t) and (ends_at is null or ends_at>t)
  and not ((r.data->'exclude') ? c.id)
  and (r.data->'all'='true'::jsonb or (r.data->'products') ? c.id or (r.data->'categories') ? c.category)
  order by priority,id limit 8) x),'[]'::jsonb);
end $$;
revoke all on function public.commerce67_product_terms(text) from public,anon,authenticated;
grant execute on function public.commerce67_product_terms(text) to anon,authenticated;

create function public.commerce67_product_configurations(p_component text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare t timestamptz:=statement_timestamp();
begin
 if length(coalesce(p_component,'')) not between 1 and 120 or not (select enabled from commerce67.control where single)
 or not exists(select from public.components where id=p_component and active and individually)
 then return '[]'::jsonb; end if;
 return coalesce((select jsonb_agg(to_jsonb(x)) from (
  select * from (
   select r.id,r.kind,r.name,r.description,(r.data->>'priceMinor')::int as price_minor,r.data->>'pricing' as pricing,
   (select jsonb_agg(jsonb_build_object('name',c.name,'quantity',p->'quantity') order by c.id)
    from jsonb_array_elements(r.data->'parts') p join public.components c on c.id=p->>'componentId') as contents
   from commerce67.rules r where r.kind in('bundle','addon') and r.state in ('active','scheduled')
    and (r.starts_at is null or r.starts_at<=t) and (r.ends_at is null or r.ends_at>t)
    and ((r.kind='addon' and (r.data->'products')?p_component and not((r.data->'exclude')?p_component))
    or (r.kind='bundle' and exists(select from jsonb_array_elements(r.data->'parts') p where p->>'componentId'=p_component)))
    and not exists(select from jsonb_array_elements(r.data->'parts') p
      left join public.components c on c.id=p->>'componentId' where c.active is not true)
   union all
   select s.id,'set','Precision-matched set of '||s.size,'Full spread at most '||(s.tolerance_bp/100.0)::numeric(5,2)||'%.',
     s.price_minor,'fixed',null::jsonb from commerce67.matched_sets s
     where s.component_id=p_component and s.state='available'
  ) rows order by kind,name,id limit 20) x),'[]'::jsonb);
end $$;
revoke all on function public.commerce67_product_configurations(text) from public,anon,authenticated;
grant execute on function public.commerce67_product_configurations(text) to anon,authenticated;

create function public.commerce67_start_checkout(p_request jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare request_id_value uuid; h text; q jsonb; o public.orders;
begin
 if not (select enabled from commerce67.control where single for share)
 then raise exception 'Commerce checkout is disabled' using errcode='55000'; end if;
 if jsonb_typeof(p_request) is distinct from 'object' or octet_length(p_request::text)>8000 then raise exception 'Invalid request'; end if;
 request_id_value:=(p_request->>'requestId')::uuid;
 if request_id_value is null or coalesce(p_request->>'quoteId','') !~ '^[a-f0-9]{32}$' then raise exception 'Invalid quote identity'; end if;
 perform pg_advisory_xact_lock(hashtext(request_id_value::text));
 h:=md5((p_request-'requestId')::text);
 select * into o from public.orders where request_id=request_id_value;
 if found then
  if o.request_hash is distinct from h or not exists(select from commerce67.sessions where order_id=o.id and state='open')
   then raise exception 'Checkout request is stale'; end if;
  if o.stripe_checkout_session_id is not null then
   return jsonb_build_object('id',o.id,'reference',o.reference,'totalPence',o.total_pence);
  end if;
  -- An unknown Stripe-create response is never repriced or replaced under the
  -- same idempotency key. It requires proof of a terminal Stripe outcome first.
  raise exception 'Unlinked checkout request requires reconciliation';
 end if;
 q:=commerce67.quote(p_request->'items',p_request->>'code');
 if md5(q::text) is distinct from p_request->>'quoteId' then raise exception 'The commerce quote price or total changed' using errcode='22023'; end if;
 insert into public.orders(request_id,request_hash,subtotal_pence,delivery_pence,total_pence,customer,delivery,items,owner_user_id)
 values(request_id_value,h,(q->>'subtotalMinor')::bigint,(q->>'deliveryMinor')::bigint,(q->>'totalMinor')::bigint,
 '{}'::jsonb,'{"country":"GB"}'::jsonb,q->'items',nullif(p_request->>'ownerUserId','')::uuid) returning * into o;
 perform commerce67.reserve(o.id,o.items);
 insert into commerce67.order_snapshots(order_id,quote,private_costs) values(o.id,q,coalesce(
  (select jsonb_object_agg(ids.id,c.internal_unit_cost) from (
   select component_id as id from commerce67.requirements(o.items)
   union select p->>'componentId' from jsonb_array_elements(o.items) i
    cross join lateral jsonb_array_elements(i->'snapshot'->'stockRequirements') p
  ) ids left join public.component_internal c on c.component_id=ids.id),'{}'));
 return jsonb_build_object('id',o.id,'reference',o.reference,'totalPence',o.total_pence);
end $$;
revoke execute on all functions in schema commerce67 from public,anon,authenticated;
revoke all on function public.commerce67_quote(jsonb,text),public.commerce67_start_checkout(jsonb) from public,anon,authenticated;
grant execute on function public.commerce67_quote(jsonb,text) to anon,authenticated;
grant execute on function public.commerce67_start_checkout(jsonb) to service_role;
commit;

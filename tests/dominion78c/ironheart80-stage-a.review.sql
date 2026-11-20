-- IRONHEART 80 Stage A, review draft. This is not permission to apply it.
-- Private additive schema only. Existing Checkout, Orders and inventory functions remain unchanged.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
do $$ begin
 if to_regnamespace('dominion79') is not null or to_regnamespace('quartermaster79') is not null or to_regnamespace('commerce67') is not null
  or to_regclass('ironclad69.measurements') is null or to_regnamespace('omniscience74') is null
  or md5(pg_get_functiondef(to_regprocedure('public.apply_order_inventory(jsonb)'))) is distinct from '9d1c421b855ded51ce681ec46cf32a13'
  or md5(pg_get_functiondef(to_regprocedure('public.create_guest_kit_order(jsonb)'))) is distinct from 'ba4bf95a75a64036cb04f280be006d92'
  or md5(pg_get_functiondef(to_regprocedure('public.create_external_order(jsonb)'))) is distinct from 'df2e46524aba50edb6140f4eb87d3f3e'
 then raise exception 'IRONHEART Stage A prerequisite or namespace mismatch';end if;
end $$;

create schema dominion79;
revoke all on schema dominion79 from public,anon,authenticated,service_role;
create table dominion79.lifecycle_control(
 singleton boolean primary key default true check(singleton), mode text not null check(mode in('paused','accepting','draining'))
);
insert into dominion79.lifecycle_control(mode) values('paused');
create table dominion79.holds(
 order_id uuid primary key references public.orders(id),
 owner_key text not null check(length(owner_key) between 1 and 96),
 components jsonb not null, selection jsonb not null, order_items_hash bytea not null,
 opened_at timestamptz not null default clock_timestamp(), ends_at timestamptz not null,
 state text not null default 'held' check(state in ('held','consumed','released','expired')),
 resolved_at timestamptz,
 check ((state='held')=(resolved_at is null)),
 check(ends_at>opened_at)
);
create table dominion79.hold_lines(
 order_id uuid not null references dominion79.holds(order_id), component_id text not null references public.inventory(component_id),
 quantity bigint not null check(quantity>0), picked_units uuid[] not null default '{}',
 primary key(order_id,component_id), check(cardinality(picked_units)<=quantity)
);
create index on dominion79.hold_lines(component_id,order_id);
create table dominion79.active_units (
 unit_id uuid primary key references ironclad69.measurements(id),
 order_id uuid not null references dominion79.holds(order_id)
);
create table dominion79.consuming(
 order_id uuid primary key references dominion79.holds(order_id),
 transaction_id xid8 not null
);
create table dominion79.provider_events (
 provider_account text not null, event_key text not null, order_id uuid not null references public.orders(id),
 fingerprint jsonb not null, outcome text,
 primary key(provider_account,event_key)
);
create table dominion79.provenance(
 order_id uuid not null references public.orders(id), component_id text not null references public.inventory(component_id),
 consumed_on timestamptz not null default clock_timestamp(), quantity bigint not null check(quantity>0),
 batches jsonb not null, measured_units uuid[] not null,
 primary key(order_id,component_id)
);
do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='dominion79' loop
  execute format('alter table dominion79.%I enable row level security',t);
 end loop;
end $$;

create schema quartermaster79;
revoke all on schema quartermaster79 from public,anon,authenticated,service_role;
create table quartermaster79.material (
 sku text primary key check(sku ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$'),
 title text not null, reorder_at integer not null check(reorder_at between 0 and 100000),
 quantity bigint not null default 0 check(quantity between 0 and 1000000),
 inner_mm integer[] not null, outer_mm integer[] not null, tare_grams integer not null check(tare_grams between 0 and 25000),
 check(array_length(inner_mm,1)=3 and array_length(outer_mm,1)=3
 and inner_mm[1] between 1 and outer_mm[1] and inner_mm[2] between 1 and outer_mm[2] and inner_mm[3] between 1 and outer_mm[3]
 and outer_mm[1]<=1500 and outer_mm[2]<=1500 and outer_mm[3]<=1500)
);
create table quartermaster79.purchase(
 id uuid primary key, sku text not null references quartermaster79.material,
 supplier uuid not null references ironclad69.suppliers(id),
 reference text not null check(length(trim(reference)) between 3 and 100),
 quantity integer not null check(quantity between 1 and 10000),
 remaining integer not null check(remaining between 0 and quantity),
 total_minor bigint not null check(total_minor between 0 and 10000000),
 received_at timestamptz not null default clock_timestamp(),
 unique (supplier,reference,sku)
);
create table quartermaster79.packing(
 order_id uuid primary key references public.orders,
 request_id uuid not null unique,
 sku text not null references quartermaster79.material, purchase_id uuid references quartermaster79.purchase,
 picked jsonb not null, state text not null check(state in ('reserved','packed','released')),
 measured_mm integer[], measured_grams integer, postal_class text, tracking text,
 packed_at timestamptz, actual_material_minor bigint, estimated_postage_minor bigint, 
 check((state='packed')=(packed_at is not null)), check(actual_material_minor between 0 and 10000000),
 check(estimated_postage_minor between 0 and 1000000)
);
create unique index on quartermaster79.packing(lower(tracking)) where tracking is not null;
create index on quartermaster79.packing (sku,state);
create table quartermaster79.movement(
 id bigint generated always as identity primary key, sku text not null references quartermaster79.material,
 quantity_delta bigint not null, resulting bigint not null check(resulting>=0),
 kind text not null check(kind in ('purchase','packed')),
 purchase_id uuid not null references quartermaster79.purchase,
 order_id uuid references public.orders, recorded_at timestamptz not null default clock_timestamp()
);
do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='quartermaster79' loop
  execute format('alter table quartermaster79.%I enable row level security',t);
 end loop;
end $$;

create table quartermaster79.rollout(
 singleton boolean primary key default true check(singleton),
 mode text not null check(mode in ('disabled','observe','workshop'))
);
insert into quartermaster79.rollout(mode) values('disabled');
alter table quartermaster79.rollout enable row level security;
revoke all on quartermaster79.rollout from public,anon,authenticated,service_role;
create table quartermaster79.pick_events(
 id uuid primary key, order_id uuid not null references quartermaster79.packing,
 component_id text not null references public.inventory,
 previous integer not null check(previous>=0), picked integer not null check(picked>=0),
 actor uuid not null references auth.users, at timestamptz not null default clock_timestamp()
);
create index on quartermaster79.pick_events(order_id,component_id,at desc,id desc);
create table quartermaster79.pick_progress(
 order_id uuid not null references quartermaster79.packing, component_id text not null references public.inventory,
 picked integer not null check(picked>=0), primary key(order_id,component_id)
);
create table quartermaster79.postage_evidence(
 id uuid primary key, order_id uuid not null unique references quartermaster79.packing,
 minor integer not null check(minor between 0 and 1000000), receipt text not null unique,
 actor uuid not null references auth.users, at timestamptz not null default clock_timestamp()
);
alter table quartermaster79.pick_events enable row level security;
alter table quartermaster79.pick_progress enable row level security;
alter table quartermaster79.postage_evidence enable row level security;
revoke all on quartermaster79.pick_events,quartermaster79.pick_progress,quartermaster79.postage_evidence from public,anon,authenticated,service_role;


revoke all on all tables in schema dominion79,quartermaster79 from public,anon,authenticated,service_role;
revoke all on all sequences in schema dominion79,quartermaster79 from public,anon,authenticated,service_role;
-- No runtime functions are installed or exposed by Stage A.
commit;

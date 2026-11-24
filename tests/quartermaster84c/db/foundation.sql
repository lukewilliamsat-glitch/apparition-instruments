-- Applicable only to the checked Supabase staging instance.
do $preflight$
begin
  if to_regnamespace('commerce67') is null or to_regnamespace('dominion79') is not null
     or to_regnamespace('quartermaster79') is not null or to_regnamespace('quartermaster84w') is not null
     or to_regnamespace('quartermaster84c') is not null then
    raise exception 'Unexpected staging schema baseline';
  end if;
  if md5(pg_get_functiondef('ironclad69.actor()'::regprocedure)) is distinct from 'dfd0d21e2b3f4f16701b8deb7f5953c4'
     or md5(pg_get_functiondef('public.command63_financial_read(uuid)'::regprocedure)) is distinct from '13c440e3341d1550a9798a6f8361d508'
     or md5(pg_get_functiondef('public.command63_financial_save(uuid,bigint,text,uuid,jsonb)'::regprocedure)) is distinct from 'e7226e9772be861465e0cd7f9b377f59'
     or md5(pg_get_functiondef('public.omniscience74_orders(date,date,date,uuid)'::regprocedure)) is distinct from 'b728d8e8b2a23d4a08319aa316684d7c' then
    raise exception 'Unexpected Orders finance or Admin interface';
  end if;
  if not exists(select from public.inventory where component_id='fixture-staging-pot')
     or exists(select from pg_trigger t where not t.tgisinternal and t.tgenabled<>'D'
         and t.tgrelid in ('public.orders'::regclass,'ironclad69.suppliers'::regclass,'public.order_financial_records'::regclass,
           'public.order_financial_revisions'::regclass,'public.order_financial_requests'::regclass)) then
    raise exception 'Synthetic fixture or trigger preflight failed';
  end if;
end
$preflight$;

create schema quartermaster84c;
revoke all on schema quartermaster84c from public,anon,authenticated,service_role;
create table quartermaster84c.fixture_orders(id uuid primary key references public.orders);
create table quartermaster84c.fixture_suppliers(id uuid primary key references ironclad69.suppliers);
create table quartermaster84c.test_members(user_id uuid primary key references auth.users);
create table quartermaster84c.finance_staff(
 user_id uuid primary key references auth.users, can_review boolean not null, can_approve boolean not null
);
alter table quartermaster84c.fixture_orders enable row level security;
alter table quartermaster84c.fixture_suppliers enable row level security;
alter table quartermaster84c.finance_staff enable row level security;
alter table quartermaster84c.test_members enable row level security;
revoke all on all tables in schema quartermaster84c from public,anon,authenticated,service_role;

create function quartermaster84c.require_order(p_order uuid) returns void
language plpgsql stable set search_path='' as $$
begin
 if not exists(select from quartermaster84c.fixture_orders where id=p_order) then
   raise exception 'Use an 84C synthetic order' using errcode='42501';
 end if;
end
$$;
create function quartermaster84c.require_sku(p_sku text) returns void
language plpgsql immutable set search_path='' as $$
begin
 if p_sku is null or p_sku !~ '^84C-[A-Z0-9][A-Z0-9_-]{0,43}$' then
   raise exception 'Use an 84C packaging SKU' using errcode='42501';
 end if;
end
$$;
create function quartermaster84c.require_supplier(p_supplier uuid) returns void
language plpgsql stable set search_path='' as $$
begin
 if not exists(select from quartermaster84c.fixture_suppliers f join ironclad69.suppliers s using(id) where id=p_supplier and s.active) then
   raise exception 'Use an active 84C synthetic supplier' using errcode='42501';
 end if;
end
$$;
revoke all on all functions in schema quartermaster84c from public,anon,authenticated,service_role;

create function quartermaster84c.actor() returns uuid
language plpgsql stable set search_path='' as $$
declare member uuid:=auth.uid();
begin
 if not exists(select from quartermaster84c.test_members where user_id=member) then
   raise exception 'Verified 84C staging membership required' using errcode='42501';
 end if;
 return member;
end
$$;
revoke all on function quartermaster84c.actor() from public,anon,authenticated,service_role;

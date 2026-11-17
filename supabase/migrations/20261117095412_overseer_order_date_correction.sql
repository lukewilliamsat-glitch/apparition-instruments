-- A manual sale date is mutable; creation, payment, fulfilment and reporting
-- evidence stay separate. This migration does not change any existing order.
create schema overseer_order_dates;
revoke all on schema overseer_order_dates from public, anon, authenticated, service_role;
create table overseer_order_dates.corrections (
 id bigint generated always as identity primary key,
 order_id uuid not null references public.orders(id) on delete restrict,
 request_id uuid not null,
 previous_date date not null,
 corrected_date date not null,
 reason text not null check (length(reason) between 5 and 300 and reason !~ '[[:cntrl:]]'),
 actor uuid not null references auth.users(id) on delete restrict,
 corrected_at timestamptz not null,
 expected_order_version timestamptz not null,
 unique (order_id,request_id),
 check (previous_date <> corrected_date)
);
create index overseer_order_date_history_idx on overseer_order_dates.corrections(order_id,id desc);
alter table overseer_order_dates.corrections enable row level security;
revoke all on all tables in schema overseer_order_dates from public, anon, authenticated, service_role;
revoke all on all sequences in schema overseer_order_dates from public, anon, authenticated, service_role;

create function overseer_order_dates.require_admin() returns uuid
language plpgsql stable set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.admin_members m where m.user_id=actor)
 then raise exception 'Admin membership required' using errcode='42501';end if;
 return actor;
end $$;
revoke all on function overseer_order_dates.require_admin() from public,anon,authenticated,service_role;

create function public.overseer_order_date_history(p_order_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform overseer_order_dates.require_admin();
 return coalesce((select jsonb_agg(jsonb_build_object('previousDate',r.previous_date,'correctedDate',r.corrected_date,
  'reason',r.reason,'actor',r.actor,'correctedAt',r.corrected_at) order by r.id desc)
 from (select id,previous_date,corrected_date,reason,actor,corrected_at from overseer_order_dates.corrections
       where order_id=p_order_id order by id desc limit 100) r),'[]'::jsonb);
end $$;

create function public.overseer_correct_order_date(
 p_order_id uuid,p_expected_updated_at timestamptz,p_new_date date,p_reason text,p_request_id uuid
) returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' set statement_timeout='6s' as $$
declare
 actor_id uuid:=overseer_order_dates.require_admin(); o public.orders%rowtype;
 prior overseer_order_dates.corrections%rowtype; justification text:=btrim(p_reason);
 boundary date; changed timestamptz; new_version timestamptz;
begin
 if p_order_id is null or p_request_id is null or p_expected_updated_at is null or not isfinite(p_expected_updated_at)
    or p_new_date is null or not isfinite(p_new_date) or justification is null
    or length(justification) not between 5 and 300 or justification ~ '[[:cntrl:]]'
 then raise exception 'Enter a valid date and a reason of 5 to 300 characters' using errcode='22023';end if;

 select * into o from public.orders where id=p_order_id for update;
 if not found then raise exception 'Order not found' using errcode='P0002';end if;
 if o.sales_channel not in ('EBAY','DIRECT','OTHER') or o.order_date is null or o.external_reference is null
    or o.stripe_checkout_session_id is not null or o.stripe_payment_intent_id is not null
 then raise exception 'Only manually recorded external sale dates can be corrected' using errcode='22023';end if;
 select * into prior from overseer_order_dates.corrections where order_id=p_order_id and request_id=p_request_id;
 if found then
  if prior.actor is distinct from actor_id or prior.corrected_date is distinct from p_new_date
     or prior.reason is distinct from justification or prior.expected_order_version is distinct from p_expected_updated_at
  then raise exception 'The correction request was already used with different details' using errcode='40001';end if;
  return jsonb_build_object('orderId',o.id,'orderDate',o.order_date,'updatedAt',o.updated_at,'duplicate',true);
 end if;
 if o.updated_at is distinct from p_expected_updated_at then
  raise exception 'This order changed. Reload it before correcting the date.' using errcode='40001';
 end if;
 -- External paid_at marks recording in the legacy lane, not settlement.
 boundary:=least((statement_timestamp() at time zone 'Europe/London')::date,
  (o.created_at at time zone 'Europe/London')::date,(o.paid_at at time zone 'Europe/London')::date,
  (o.fulfillment_applied_at at time zone 'Europe/London')::date);
 if p_new_date not between date '1900-01-01' and boundary then
  raise exception 'The sale date cannot follow the UK business date of record creation, recorded payment or fulfilment' using errcode='22023';
 end if;
 if o.order_date=p_new_date then raise exception 'Choose a different commercial order date' using errcode='22023';end if;

 changed:=clock_timestamp();
 new_version:=greatest(changed,o.updated_at+interval '1 microsecond');
 insert into overseer_order_dates.corrections(order_id,request_id,previous_date,corrected_date,reason,actor,corrected_at,expected_order_version)
 values(o.id,p_request_id,o.order_date,p_new_date,justification,actor_id,changed,p_expected_updated_at);
 update public.orders set order_date=p_new_date,updated_at=new_version where id=o.id;
 return jsonb_build_object('orderId',o.id,'orderDate',p_new_date,'updatedAt',new_version,'duplicate',false);
end $$;

revoke all on function public.overseer_order_date_history(uuid),
 public.overseer_correct_order_date(uuid,timestamptz,date,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.overseer_order_date_history(uuid),
 public.overseer_correct_order_date(uuid,timestamptz,date,text,uuid) to authenticated;

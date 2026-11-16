-- Commerce Sentinel: additive reservation limits and auditable Stripe handoff.
-- Apply after 20261116213239; require an inactive, drained Commerce subsystem.
begin;
do $guard$
begin
 if exists(select from commerce67.control where enabled) or exists(select from commerce67.sessions where state='open') then
  raise exception 'Sentinel migration requires inactive Commerce and no open Commerce reservations';
 end if;
end $guard$;
alter table commerce67.sessions
 add column physical_units bigint not null default 0 check(physical_units between 0 and 60),
 add column expires_epoch bigint,
 add column dispatch text not null default 'new' check(dispatch in ('new','sending','linked')),
 add column attempts smallint not null default 0 check(attempts between 0 and 2),
 add column attempt_at timestamptz,
 add column request_body text check(octet_length(request_body)<=65536);
create index commerce67_sessions_recent on commerce67.sessions(created_at desc);
create index commerce67_sessions_open on commerce67.sessions(created_at) where state='open';
create table commerce67.payment_audit (
 id bigint generated always as identity primary key,
 order_id uuid not null references public.orders(id),
 transition text not null check(transition in ('reserved','create_authorized','attached','expired','paid','never_sent')),
 at timestamptz not null default clock_timestamp()
);
alter table commerce67.payment_audit enable row level security;
revoke all on commerce67.payment_audit from public,anon,authenticated;

-- All checkout paths take the same transaction lock and count the same pool.
-- Existing stock locks, measured-set uniqueness and conditional deductions remain intact.
do $patch$
declare src text; marker text; prefix text;
begin
 src:=pg_get_functiondef('commerce67.reserve(uuid,jsonb)'::regprocedure);
 marker:=' for requirement in select * from commerce67.requirements(p_items) loop';
 if length(src)-length(replace(src,marker,''))<>length(marker) then raise exception 'Unrecognised Commerce reservation body'; end if;
 src:=replace(src, 'set_uuid uuid;', 'set_uuid uuid; owner_id uuid; physical bigint; current_timepoint timestamptz;');
 if position('current_timepoint timestamptz;' in src)=0 then raise exception 'Unrecognised Commerce reservation declaration'; end if;
 prefix:=$source$
 perform pg_advisory_xact_lock(671016221000::bigint);
 current_timepoint:=clock_timestamp();
 select owner_user_id into strict owner_id from public.orders where id=p_order;
 select coalesce(sum(quantity),0) into physical from commerce67.requirements(p_items);
 physical:=physical+coalesce((select sum((x->>'quantity')::int)
  from jsonb_array_elements(p_items) t(v)
  cross join lateral jsonb_array_elements(v->'snapshot'->'stockRequirements') x
  where v->'snapshot'?'measuredSet'),0);
 if physical not between 1 and 60 then
  raise exception 'Checkout reservation quantity limit exceeded' using errcode='22023';
 end if;
 if (select count(*) from commerce67.sessions where state='open')>=20
 or physical+coalesce((select sum(physical_units) from commerce67.sessions where state='open'),0)>150
 or (select count(*) from commerce67.sessions where created_at>current_timepoint-interval '1 minute')>=12
 or (owner_id is null and (
  (select count(*) from commerce67.sessions s join public.orders o on o.id=s.order_id where s.state='open' and o.owner_user_id is null)>=6 or
  (select count(*) from commerce67.sessions s join public.orders o on o.id=s.order_id where s.created_at>current_timepoint-interval '1 minute' and o.owner_user_id is null)>=6))
 or (owner_id is not null and (
  (select count(*) from commerce67.sessions s join public.orders o on o.id=s.order_id where s.state='open' and o.owner_user_id=owner_id)>=2 or
  (select count(*) from commerce67.sessions s join public.orders o on o.id=s.order_id where s.created_at>current_timepoint-interval '1 minute' and o.owner_user_id=owner_id)>=3))
 then raise exception 'Checkout is temporarily at reservation capacity' using errcode='P0067'; end if;
$source$;
 src:=replace(src,marker,prefix||marker);
 marker:=' insert into commerce67.sessions(order_id) values(p_order);';
 if length(src)-length(replace(src,marker,''))<>length(marker) then raise exception 'Unrecognised Commerce session insertion'; end if;
 src:=replace(src,marker,$source$
 insert into commerce67.sessions(order_id,physical_units,expires_epoch)
 values(p_order,physical,floor(extract(epoch from current_timepoint))::bigint+2400);
 insert into commerce67.payment_audit(order_id,transition) values(p_order,'reserved');
$source$);
 execute src;
 src:=pg_get_functiondef('public.create_guest_kit_order(jsonb)'::regprocedure);
 marker:=$legacy$'paymentStatus',order_data.payment_status)$legacy$;
 if length(src)-length(replace(src,marker,''))<>2*length(marker) then raise exception 'Unrecognised legacy order receipt boundary'; end if;
 execute replace(src,marker,$legacy_new$'paymentStatus',order_data.payment_status,
  'sentinel',exists(select from commerce67.sessions where order_id=order_data.id))$legacy_new$);
 src:=pg_get_functiondef('public.commerce67_start_checkout(jsonb)'::regprocedure);
 prefix:=$old$  if o.stripe_checkout_session_id is not null then
   return jsonb_build_object('id',o.id,'reference',o.reference,'totalPence',o.total_pence);
  end if;
  -- An unknown Stripe-create response is never repriced or replaced under the
  -- same idempotency key. It requires proof of a terminal Stripe outcome first.
  raise exception 'Unlinked checkout request requires reconciliation';$old$;
 if length(src)-length(replace(src,prefix,''))<>length(prefix) then raise exception 'Unrecognised Commerce checkout replay guard'; end if;
 src:=replace(src,prefix,$new$  return jsonb_build_object('id',o.id,'reference',o.reference,'totalPence',o.total_pence);$new$);
 marker:='''totalPence'',o.total_pence)';
 if length(src)-length(replace(src,marker,''))<>2*length(marker) then raise exception 'Unrecognised Commerce receipt boundary'; end if;
 execute replace(src,marker,'''totalPence'',o.total_pence,''sentinel'',true)');
end $patch$;

-- Future delivery integration replaces this one integer-pence lookup. The
-- current threshold and rate table remain authoritative.
create function commerce67.delivery_pence(p_merchandise bigint) returns bigint
language plpgsql set search_path='' as $$
declare rate bigint; threshold bigint;
begin
 select standard_delivery_pence,free_delivery_threshold_pence into rate,threshold
 from public.commerce_shipping where country='GB' for share;
 if rate is null or threshold is null then raise exception 'UK delivery is unavailable'; end if;
 return case when p_merchandise>=threshold then 0 else rate end;
end $$;
do $delivery$
declare src text; marker text;
begin
 src:=pg_get_functiondef('commerce67.quote(jsonb,text)'::regprocedure);
 marker:=$old$ select standard_delivery_pence,free_delivery_threshold_pence into ship,threshold
 from public.commerce_shipping where country='GB' for share;
 if ship is null or threshold is null then raise exception 'UK delivery is unavailable'; end if;
 if goods>=threshold then ship:=0; end if;$old$;
 if length(src)-length(replace(src,marker,''))<>length(marker) then raise exception 'Unrecognised UK delivery boundary'; end if;
 execute replace(src,marker,' ship:=commerce67.delivery_pence(goods);');
end $delivery$;

-- Service-only projection. No saved payment URL, credentials or customer data.
create function public.commerce67_payment_status(p_order uuid) returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object('id',s.order_id,'reference',o.reference,'amount',o.total_pence,
  'currency',lower(o.currency),'sessionId',o.stripe_checkout_session_id,'state',s.state,
  'dispatch',s.dispatch,'expiresAt',s.expires_epoch,'createdAt',floor(extract(epoch from s.created_at))::bigint)
 from commerce67.sessions s join public.orders o on o.id=s.order_id where s.order_id=p_order
$$;
create function public.commerce67_payment_claim(p_order uuid,p_body text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s commerce67.sessions; o public.orders; at_time timestamptz:=clock_timestamp();
begin
 select * into o from public.orders where id=p_order for update;
 select * into s from commerce67.sessions where order_id=p_order for update;
 if not found or s.state<>'open' or o.payment_status<>'unpaid' or o.status<>'pending'
  or o.stripe_checkout_session_id is not null or s.expires_epoch is null
  or s.attempts>=2 or s.expires_epoch-floor(extract(epoch from at_time))<=1830
  or at_time>s.created_at+interval '2 minutes'
  or (s.attempt_at is not null and s.attempt_at>at_time-interval '10 seconds')
  or p_body is null or octet_length(p_body) not between 1 and 65536
  or (s.request_body is not null and s.request_body is distinct from p_body) then return null; end if;
 update commerce67.sessions set dispatch='sending', attempts=s.attempts+1,attempt_at=at_time,
  request_body=coalesce(s.request_body,p_body) where order_id=p_order;
 insert into commerce67.payment_audit(order_id,transition) values(p_order,'create_authorized');
 return jsonb_build_object('body',coalesce(s.request_body,p_body));
end $$;

-- Only called after a signed Stripe event or a service-authenticated Stripe read.
-- The order row lock serializes attachment, expiry and the existing paid deduction.
create function public.commerce67_payment_observe(p_order uuid,p_session text,p_reference text,p_amount bigint,p_currency text,p_state text)
returns text language plpgsql security definer set search_path='' as $$
declare o public.orders; s commerce67.sessions;
begin
 select * into o from public.orders where id=p_order for update;
 select * into s from commerce67.sessions where order_id=p_order for update;
 if not found then return 'legacy'; end if;
 if p_reference is distinct from o.reference or p_amount is distinct from o.total_pence
  or p_currency is distinct from lower(o.currency) or p_session is null or p_session !~ '^cs_live_[A-Za-z0-9]{8,}$'
  or p_state is null or p_state not in ('open','paid','expired','pending')
  or (o.stripe_checkout_session_id is not null and o.stripe_checkout_session_id is distinct from p_session)
  or s.dispatch='new' then return 'mismatch'; end if;
 if s.state='paid' then return 'paid'; end if;
 if s.state='expired' then return case when p_state='paid' then 'mismatch' else 'expired' end; end if;
 if o.stripe_checkout_session_id is null then
  update public.orders set stripe_checkout_session_id=p_session where id=p_order;
  update commerce67.sessions set dispatch='linked' where order_id=p_order;
  insert into commerce67.payment_audit(order_id,transition) values(p_order,'attached');
 end if;
 if p_state='expired' then
  if not public.commerce67_expire_checkout(p_order,p_session,p_reference) then raise exception 'Stripe expiry could not be reconciled'; end if;
  insert into commerce67.payment_audit(order_id,transition) values(p_order,'expired');
  return 'expired';
 end if;
 return case when p_state='paid' then 'paid_needs_event' else 'linked' end;
end $$;
create function public.commerce67_abandon_never_sent(p_order uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare o public.orders; s commerce67.sessions;
begin
 select * into o from public.orders where id=p_order for update;
 select * into s from commerce67.sessions where order_id=p_order for update;
 -- "new" plus no durable dispatch claim proves no Stripe create was authorized.
 if not found or s.state<>'open' or s.dispatch<>'new' or s.attempts<>0 or s.request_body is not null
  or o.stripe_checkout_session_id is not null or o.payment_status<>'unpaid'
  or clock_timestamp()<s.created_at+interval '2 minutes' then return false; end if;
 delete from commerce67.holds where order_id=p_order;
 update commerce67.matched_sets set state='available',order_id=null where order_id=p_order and state='reserved';
 update commerce67.sessions set state='expired',resolved_at=clock_timestamp() where order_id=p_order;
 insert into commerce67.payment_audit(order_id,transition) values(p_order,'never_sent');
 return true;
end $$;
create function commerce67.audit_paid_transition() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.state='open' and new.state='paid' then
  insert into commerce67.payment_audit(order_id,transition) values(new.order_id,'paid');
 end if;
 return new;
end $$;
create trigger commerce67_payment_paid after update of state on commerce67.sessions for each row execute function commerce67.audit_paid_transition();
create function public.commerce67_reservation_diagnostics() returns jsonb
language plpgsql security definer stable set search_path='' as $$
begin
 perform commerce67.admin_actor();
 return coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at) from
  (select o.reference,s.state,s.dispatch,s.physical_units,s.created_at,to_timestamp(s.expires_epoch) as provider_expiry,
   s.attempts,case when s.dispatch='new' then 'Not sent' when s.dispatch='sending' then 'Needs provider reconciliation'
   else 'Attached; awaiting signed payment or expiry' end as diagnostic
   from commerce67.sessions s join public.orders o on o.id=s.order_id
   where s.state='open' order by s.created_at limit 20)d),'[]'::jsonb);
end $$;
revoke execute on all functions in schema commerce67 from public,anon,authenticated;
revoke all on function public.commerce67_payment_status(uuid),public.commerce67_payment_claim(uuid,text),
 public.commerce67_payment_observe(uuid,text,text,bigint,text,text),public.commerce67_abandon_never_sent(uuid),
 public.commerce67_reservation_diagnostics() from public,anon,authenticated;
grant execute on function public.commerce67_payment_status(uuid),public.commerce67_payment_claim(uuid,text),
 public.commerce67_payment_observe(uuid,text,text,bigint,text,text),public.commerce67_abandon_never_sent(uuid) to service_role;
grant execute on function public.commerce67_reservation_diagnostics() to authenticated;
commit;

-- P08B.2: no SMTP or historical message creation. Existing confirmation columns remain authoritative.
create table public.order_email_deliveries (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id),
 kind text not null check (kind in ('order_confirmed','in_production','ready_to_dispatch','dispatched','full_refund')),
 source_event_id text not null,
 state text not null default 'pending' check (state in ('pending','claimed','sent','failed','unknown')),
 claim_id uuid,
 attempts integer not null default 0 check (attempts>=0),
 created_at timestamptz not null default now(),
 claimed_at timestamptz,
 attempted_at timestamptz,
 sent_at timestamptz,
 failure_reason text,
 unique(order_id,kind),
 unique(order_id,kind,source_event_id),
 check ((state='pending' and claim_id is null and attempts=0)
     or (state='claimed' and claim_id is not null)
     or (state in ('sent','failed','unknown') and claim_id is not null and attempts>0))
);
alter table public.order_email_deliveries enable row level security;
revoke all on public.order_email_deliveries from public,anon,authenticated;
grant select,insert,update on public.order_email_deliveries to service_role;
create policy admin_reads_order_email_deliveries on public.order_email_deliveries for select to authenticated
 using (exists(select 1 from public.admin_members where user_id=(select auth.uid())));
grant select on public.order_email_deliveries to authenticated;

-- A claim is atomic. Unknown outcomes and sent messages cannot be re-claimed.
create function public.claim_order_email_delivery(p_order_id uuid,p_kind text)
returns uuid language plpgsql security definer set search_path='' as $$
declare row_ public.order_email_deliveries%rowtype; order_ public.orders%rowtype; claim uuid;
begin
 select * into row_ from public.order_email_deliveries where order_id=p_order_id and kind=p_kind for update;
 if not found or row_.state<>'pending' then return null; end if;
 select * into order_ from public.orders where id=p_order_id for update;
 if not found or nullif(order_.customer->>'email','') is null then return null; end if;
 if p_kind='full_refund' then
  if order_.payment_status<>'refunded' or not exists(
   select 1 from public.stripe_refund_events where event_id=row_.source_event_id and order_id=p_order_id
  ) then return null; end if;
 elsif p_kind='order_confirmed' then
  -- Existing confirmation path remains authoritative until its deliberate migration.
  return null;
 else
  if order_.payment_status not in ('paid','partially_refunded')
    or (order_.payment_status='partially_refunded' and not exists(
      select 1 from public.partial_refund_reviews where order_id=p_order_id
       and refunded_pence=order_.refunded_pence and refund_at=order_.latest_refund_at))
    or not exists(select 1 from jsonb_array_elements(order_.status_history) event
      where event->>'event_id'=row_.source_event_id and event->>'status'=p_kind)
  then return null; end if;
 end if;
 claim:=gen_random_uuid();
 update public.order_email_deliveries set state='claimed',claim_id=claim,claimed_at=now() where id=row_.id;
 return claim;
end;
$$;
revoke all on function public.claim_order_email_delivery(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_order_email_delivery(uuid,text) to service_role;

create function public.mark_order_email_attempt(p_order_id uuid,p_kind text,p_claim uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.order_email_deliveries set attempted_at=now(),attempts=attempts+1
 where order_id=p_order_id and kind=p_kind and state='claimed' and claim_id=p_claim
  and attempted_at is null;
 return found;
end;
$$;
revoke all on function public.mark_order_email_attempt(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.mark_order_email_attempt(uuid,text,uuid) to service_role;

create function public.finish_order_email_delivery(p_order_id uuid,p_kind text,p_claim uuid,p_state text,p_reason text default null)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_state not in ('sent','failed','unknown') or p_claim is null then
  raise exception 'Invalid email delivery result' using errcode='22023';
 end if;
 update public.order_email_deliveries set state=p_state,
  sent_at=case when p_state='sent' then now() else sent_at end,
  failure_reason=case when p_state='sent' then null else left(coalesce(p_reason,'Delivery outcome unavailable'),160) end
 where order_id=p_order_id and kind=p_kind and state='claimed' and claim_id=p_claim and attempted_at is not null;
 return found;
end;
$$;
revoke all on function public.finish_order_email_delivery(uuid,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.finish_order_email_delivery(uuid,text,uuid,text,text) to service_role;

-- Each acknowledgement is a durable, Admin-attributed review of one refund state.
create table public.partial_refund_reviews (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id),
 refunded_pence bigint not null check (refunded_pence>0),
 refund_at timestamptz not null,
 admin_user_id uuid not null references auth.users(id),
 reviewed_at timestamptz not null default now(),
 unique(order_id,refunded_pence,refund_at)
);
alter table public.partial_refund_reviews enable row level security;
revoke all on public.partial_refund_reviews from public,anon,authenticated;
grant select,insert on public.partial_refund_reviews to service_role;
create policy admin_reads_partial_refund_reviews on public.partial_refund_reviews for select to authenticated
 using (exists(select 1 from public.admin_members where user_id=(select auth.uid())));
grant select on public.partial_refund_reviews to authenticated;

create function public.acknowledge_partial_refund(p_order_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare order_ public.orders%rowtype; actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.admin_members where user_id=actor) then
  raise exception 'Admin membership required' using errcode='42501';
 end if;
 select * into order_ from public.orders where id=p_order_id for update;
 if not found or order_.payment_status<>'partially_refunded' or order_.refunded_pence<=0
  or order_.latest_refund_at is null then
  raise exception 'Current partial refund required' using errcode='22023';
 end if;
 insert into public.partial_refund_reviews(order_id,refunded_pence,refund_at,admin_user_id)
 values(order_.id,order_.refunded_pence,order_.latest_refund_at,actor)
 on conflict(order_id,refunded_pence,refund_at) do nothing;
 return true;
end;
$$;
revoke all on function public.acknowledge_partial_refund(uuid) from public,anon;
grant execute on function public.acknowledge_partial_refund(uuid) to authenticated;

-- The existing one-step state machine and status_history remain intact.
create or replace function public.advance_order_fulfilment(p_order_id uuid,p_next_status text)
returns text language plpgsql security definer set search_path='' as $$
declare order_row public.orders%rowtype; actor uuid:=auth.uid(); transition_id uuid;
begin
 if actor is null or not exists(select 1 from public.admin_members where user_id=actor) then
  raise exception 'Admin membership required' using errcode='42501';
 end if;
 select * into order_row from public.orders where id=p_order_id for update;
 if not found or order_row.payment_status not in ('paid','partially_refunded')
  or order_row.paid_at is null or order_row.fulfillment_applied_at is null then
  raise exception 'Only verified paid Orders can enter fulfilment' using errcode='22023';
 end if;
 if order_row.payment_status='partially_refunded' and not exists(
  select 1 from public.partial_refund_reviews where order_id=p_order_id
   and refunded_pence=order_row.refunded_pence and refund_at=order_row.latest_refund_at
 ) then raise exception 'Partial refund requires Admin review' using errcode='22023'; end if;
 if not ((order_row.status='pending' and p_next_status='in_production')
  or (order_row.status='in_production' and p_next_status='ready_to_dispatch')
  or (order_row.status='ready_to_dispatch' and p_next_status='dispatched')
  or (order_row.status='dispatched' and p_next_status='completed')) then
  raise exception 'Invalid fulfilment transition' using errcode='22023';
 end if;
 transition_id:=gen_random_uuid();
 update public.orders set status=p_next_status,updated_at=now(),
  status_history=status_history||jsonb_build_array(jsonb_build_object(
   'event_id',transition_id,'status',p_next_status,'at',now(),'source','admin','actor',actor))
 where id=p_order_id;
 if p_next_status in ('in_production','ready_to_dispatch','dispatched') then
  insert into public.order_email_deliveries(order_id,kind,source_event_id)
  values(p_order_id,p_next_status,transition_id::text);
 end if;
 return p_next_status;
end;
$$;

-- Preserve Stripe verification and calculations; add only eligibility on a NEW full refund.
do $$
declare body text:=pg_get_functiondef('public.record_verified_stripe_refund(text,text,text,text,bigint,text,text,timestamptz,timestamptz)'::regprocedure);
begin
 if position(' return case when refunded=0 then' in body)=0 then
  raise exception 'Unexpected refund function; review before migration';
 end if;
 body:=replace(body,' return case when refunded=0 then',
  ' if refunded=o.total_pence and o.payment_status<>''refunded'' then '
  ||' insert into public.order_email_deliveries(order_id,kind,source_event_id) '
  ||' values(o.id,''full_refund'',p_event_id) on conflict(order_id,kind) do nothing; '
  ||' end if; return case when refunded=0 then');
 execute body;
end;
$$;

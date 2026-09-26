-- Stripe payment history is retained; refunds never alter inventory or fulfilment.
alter table public.orders drop constraint orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
 check (payment_status in ('unpaid','paid','partially_refunded','refunded'));
alter table public.orders add column refunded_pence bigint not null default 0
 check (refunded_pence>=0 and refunded_pence<=total_pence);
alter table public.orders add column latest_refund_at timestamptz;

create table public.stripe_refunds (
 refund_id text primary key,
 order_id uuid not null references public.orders(id),
 payment_intent_id text not null,
 amount_pence bigint not null check (amount_pence>0),
 status text not null check (status in ('pending','requires_action','succeeded','failed','canceled')),
 refund_created_at timestamptz not null,
 observed_at timestamptz not null,
 last_event_id text not null
);
alter table public.stripe_refunds enable row level security;
revoke all on public.stripe_refunds from public, anon, authenticated;
grant select,insert,update on public.stripe_refunds to service_role;

create table public.stripe_refund_events (
 event_id text primary key,
 refund_id text not null references public.stripe_refunds(refund_id),
 order_id uuid not null references public.orders(id),
 event_type text not null check (event_type in ('refund.created','refund.updated','refund.failed')),
 processed_at timestamptz not null default now()
);
alter table public.stripe_refund_events enable row level security;
revoke all on public.stripe_refund_events from public, anon, authenticated;
grant select,insert on public.stripe_refund_events to service_role;

create function public.record_verified_stripe_refund(
 p_event_id text,p_event_type text,p_refund_id text,p_payment_intent_id text,
 p_amount bigint,p_currency text,p_status text,p_created_at timestamptz,p_observed_at timestamptz
) returns text language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; existing public.stripe_refunds%rowtype; refunded bigint;
begin
 if p_event_id !~ '^evt_[A-Za-z0-9]{8,}$'
  or p_event_type not in ('refund.created','refund.updated','refund.failed')
  or p_refund_id !~ '^re_[A-Za-z0-9]{8,}$'
  or p_payment_intent_id !~ '^pi_[A-Za-z0-9]{8,}$'
  or p_amount is null or p_amount<1 or p_currency<>'gbp'
  or p_status not in ('pending','requires_action','succeeded','failed','canceled')
  or p_created_at is null or p_observed_at is null then
  raise exception 'Invalid verified refund' using errcode='22023';
 end if;
 select * into o from public.orders where stripe_payment_intent_id=p_payment_intent_id for update;
 if not found or o.payment_status not in ('paid','partially_refunded','refunded')
  or o.paid_at is null or o.fulfillment_applied_at is null or o.currency<>'GBP'
  or p_amount>o.total_pence then
  raise exception 'Refund does not match a paid Order' using errcode='22023';
 end if;
 select * into existing from public.stripe_refunds where refund_id=p_refund_id for update;
 if found and (existing.order_id<>o.id or existing.payment_intent_id<>p_payment_intent_id
  or existing.amount_pence<>p_amount or existing.refund_created_at<>p_created_at) then
  raise exception 'Refund identity differs from previously recorded Stripe data' using errcode='22023';
 end if;
 if not found then
  insert into public.stripe_refunds(refund_id,order_id,payment_intent_id,amount_pence,status,refund_created_at,observed_at,last_event_id)
   values(p_refund_id,o.id,p_payment_intent_id,p_amount,p_status,p_created_at,p_observed_at,p_event_id);
 elsif p_observed_at>existing.observed_at then
  update public.stripe_refunds set status=p_status,observed_at=p_observed_at,last_event_id=p_event_id
   where refund_id=p_refund_id;
 end if;
 insert into public.stripe_refund_events(event_id,refund_id,order_id,event_type)
  values(p_event_id,p_refund_id,o.id,p_event_type) on conflict(event_id) do nothing;
 if not exists(select 1 from public.stripe_refund_events where event_id=p_event_id
  and refund_id=p_refund_id and order_id=o.id and event_type=p_event_type) then
  raise exception 'Stripe event belongs to another refund' using errcode='22023';
 end if;
 select coalesce(sum(amount_pence),0) into refunded from public.stripe_refunds
  where order_id=o.id and status='succeeded';
 if refunded>o.total_pence then
  raise exception 'Refunds exceed the original payment' using errcode='22023';
 end if;
 update public.orders set refunded_pence=refunded,
  payment_status=case when refunded=0 then 'paid'
   when refunded=o.total_pence then 'refunded' else 'partially_refunded' end,
  latest_refund_at=(select max(refund_created_at) from public.stripe_refunds
   where order_id=o.id and status='succeeded'),
  updated_at=now()
 where id=o.id;
 return case when refunded=0 then 'paid'
  when refunded=o.total_pence then 'refunded' else 'partially_refunded' end;
end;
$$;
revoke all on function public.record_verified_stripe_refund(text,text,text,text,bigint,text,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.record_verified_stripe_refund(text,text,text,text,bigint,text,text,timestamptz,timestamptz) to service_role;

-- A late replay of the original paid Checkout event remains idempotent after a refund.
do $$
declare body text:=pg_get_functiondef('public.fulfil_paid_stripe_checkout(text,text,uuid,text,text,text,bigint,text)'::regprocedure);
begin
 if position('if order_row.payment_status=''paid'' then' in lower(body))=0 then
  raise exception 'Unexpected payment fulfilment function; review before migration';
 end if;
 body:=replace(body,'if order_row.payment_status=''paid'' then',
  'if order_row.payment_status in (''paid'',''partially_refunded'',''refunded'') then');
 execute body;
end;
$$;

-- Stripe contact on a replay also remains idempotent after the financial state changes.
do $$
declare body text:=pg_get_functiondef('public.save_stripe_order_contact(uuid,text,text,text,jsonb,jsonb)'::regprocedure);
begin
 if position('order_row.payment_status not in (''paid'',''unpaid'')' in body)=0
  or position('(order_row.payment_status=''paid'' and' in body)=0 then
  raise exception 'Unexpected contact function; review before migration';
 end if;
 body:=replace(body,'order_row.payment_status not in (''paid'',''unpaid'')',
  'order_row.payment_status not in (''paid'',''partially_refunded'',''refunded'',''unpaid'')');
 body:=replace(body,'(order_row.payment_status=''paid'' and',
  '(order_row.payment_status in (''paid'',''partially_refunded'',''refunded'') and');
 execute body;
end;
$$;

-- A partially refunded physical Order can continue its existing Admin workflow.
do $$
declare body text:=pg_get_functiondef('public.advance_order_fulfilment(uuid,text)'::regprocedure);
begin
 if position('order_row.payment_status<>''paid''' in body)=0 then
  raise exception 'Unexpected Admin fulfilment function; review before migration';
 end if;
 body:=replace(body,'order_row.payment_status<>''paid''',
  'order_row.payment_status not in (''paid'',''partially_refunded'')');
 execute body;
end;
$$;

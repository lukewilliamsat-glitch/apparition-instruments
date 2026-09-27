-- P08B.5B: explicit, persisted activation. Existing ledger rows default to false.
create table public.transactional_email_activation (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 activated_at timestamptz,
 check ((enabled and activated_at is not null) or (not enabled and activated_at is null))
);
alter table public.transactional_email_activation enable row level security;
revoke all on public.transactional_email_activation from public,anon,authenticated;
insert into public.transactional_email_activation(singleton,enabled) values(true,false);

alter table public.order_email_deliveries
 add column automatic_delivery_eligible boolean not null default false;

-- Only records inserted as the result of a new committed transition or refund
-- while activation is enabled may enter the automatic production queue.
create function public.set_automatic_email_eligibility()
returns trigger language plpgsql set search_path='' as $$
declare active boolean;
begin
 select enabled into active from public.transactional_email_activation
 where singleton=true for share;
 new.automatic_delivery_eligible :=
   new.kind in ('in_production','ready_to_dispatch','dispatched','full_refund')
   and coalesce(active,false);
 return new;
end;
$$;
revoke all on function public.set_automatic_email_eligibility() from public,anon,authenticated;
create trigger set_automatic_email_eligibility_before_insert
 before insert on public.order_email_deliveries for each row
 execute function public.set_automatic_email_eligibility();

create function public.protect_automatic_email_eligibility()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.automatic_delivery_eligible is distinct from old.automatic_delivery_eligible then
  raise exception 'Email activation eligibility is immutable' using errcode='22023';
 end if;
 return new;
end;
$$;
revoke all on function public.protect_automatic_email_eligibility() from public,anon,authenticated;
create trigger protect_automatic_email_eligibility_before_update
 before update of automatic_delivery_eligible on public.order_email_deliveries for each row
 execute function public.protect_automatic_email_eligibility();

-- The claim remains atomic and retains the original payment, event and refund
-- checks. Ineligible historical rows cannot be sent by any service entry point.
create or replace function public.claim_order_email_delivery(p_order_id uuid,p_kind text)
returns uuid language plpgsql security definer set search_path='' as $$
declare row_ public.order_email_deliveries%rowtype; order_ public.orders%rowtype; claim uuid;
begin
 select * into row_ from public.order_email_deliveries where order_id=p_order_id and kind=p_kind for update;
 if not found or row_.state<>'pending' or not row_.automatic_delivery_eligible then return null; end if;
 select * into order_ from public.orders where id=p_order_id for update;
 if not found or nullif(order_.customer->>'email','') is null then return null; end if;
 if p_kind='full_refund' then
  if order_.payment_status<>'refunded' or not exists(
   select 1 from public.stripe_refund_events where event_id=row_.source_event_id and order_id=p_order_id
  ) then return null; end if;
 elsif p_kind='order_confirmed' then
  -- The separate paid-order confirmation claim remains authoritative.
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

-- Separate least-privilege scheduler credential, never placed in a repository
-- file, browser bundle, cron command text, or server-side log.
select vault.create_secret(encode(gen_random_bytes(32),'hex'),'transactional_email_dispatch');
create function public.get_transactional_dispatch_token()
returns text language sql security definer set search_path='' as $$
 select decrypted_secret from vault.decrypted_secrets where name='transactional_email_dispatch'
$$;
revoke all on function public.get_transactional_dispatch_token() from public,anon,authenticated;
grant execute on function public.get_transactional_dispatch_token() to service_role;

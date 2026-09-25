-- Email delivery is separate from Stripe payment and physical fulfilment.
-- Existing paid Orders, including AI-010010, must never be emailed automatically.
alter table public.orders add column confirmation_email_status text not null default 'pending'
 check (confirmation_email_status in ('pending','sending','sent','failed','unknown','legacy'));
alter table public.orders add column confirmation_email_sent_at timestamptz;
alter table public.orders add column confirmation_email_last_attempt_at timestamptz;
alter table public.orders add column confirmation_email_failure text;
alter table public.orders add column confirmation_email_claim_id uuid;
alter table public.orders add column confirmation_email_attempts integer not null default 0;
update public.orders set confirmation_email_status='legacy' where payment_status='paid';

create function public.claim_paid_order_confirmation(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; claim uuid;
begin
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.payment_status<>'paid' or o.paid_at is null or o.fulfillment_applied_at is null
   or o.confirmation_email_status<>'pending' or nullif(o.customer->>'email','') is null
   or jsonb_typeof(o.items)<>'array' or jsonb_array_length(o.items)=0 then return null; end if;
 claim:=gen_random_uuid();
 update public.orders set confirmation_email_status='sending',confirmation_email_claim_id=claim,
   confirmation_email_last_attempt_at=now(),confirmation_email_attempts=confirmation_email_attempts+1
 where id=p_order_id;
 return jsonb_build_object('claim',claim,'order',to_jsonb(o));
end;
$$;
revoke all on function public.claim_paid_order_confirmation(uuid) from public, anon, authenticated;
grant execute on function public.claim_paid_order_confirmation(uuid) to service_role;

create function public.finish_paid_order_confirmation(p_order_id uuid,p_claim uuid,p_state text,p_reason text default null)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_state not in ('sent','failed','unknown') then raise exception 'Invalid email state' using errcode='22023'; end if;
 update public.orders set confirmation_email_status=p_state,
   confirmation_email_sent_at=case when p_state='sent' then now() else confirmation_email_sent_at end,
   confirmation_email_failure=case when p_state='sent' then null else left(coalesce(p_reason,'Delivery outcome unavailable'),160) end
 where id=p_order_id and confirmation_email_status='sending' and confirmation_email_claim_id=p_claim
  and payment_status='paid' and paid_at is not null and fulfillment_applied_at is not null;
 return found;
end;
$$;
revoke all on function public.finish_paid_order_confirmation(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.finish_paid_order_confirmation(uuid,uuid,text,text) to service_role;

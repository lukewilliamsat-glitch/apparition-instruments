-- Extend the existing notification ledger. Historical rows remain original sends.
alter table public.order_email_deliveries add column resend_of uuid references public.order_email_deliveries(id);
alter table public.order_email_deliveries add column operation_id uuid unique;
alter table public.order_email_deliveries add column resend_reason text;
alter table public.order_email_deliveries add constraint resend_audit_check check
 (resend_of is null or (operation_id is not null and length(btrim(resend_reason)) between 5 and 1000 and external_requested_by is not null and recipient_email is not null and order_snapshot is not null));
alter table public.order_email_deliveries drop constraint order_email_deliveries_order_id_kind_key;
create unique index order_email_original_unique on public.order_email_deliveries(order_id,kind) where resend_of is null;

create function public.correct_order_fulfilment(p_order_id uuid,p_expected_updated_at timestamptz,p_previous text,p_target text,p_reason text)
returns boolean language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; actor uuid:=auth.uid(); stages text[]:=array['pending','in_production','ready_to_dispatch','dispatched']; reason text:=btrim(p_reason);
begin
 if actor is null or not exists(select 1 from public.admin_members where user_id=actor) then raise exception 'Admin membership required' using errcode='42501';end if;
 if reason is null or length(reason) not between 5 and 1000 or reason~'[[:cntrl:]]' then raise exception 'Correction reason must contain 5–1000 characters' using errcode='22023';end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.status is distinct from p_previous or p_expected_updated_at is null or o.updated_at is distinct from p_expected_updated_at then raise exception 'Order changed; refresh before correction' using errcode='40001';end if;
 if o.payment_status not in ('paid','partially_refunded') or o.paid_at is null or o.fulfillment_applied_at is null
  or (o.payment_status='partially_refunded' and not exists(select 1 from public.partial_refund_reviews where order_id=o.id and refunded_pence=o.refunded_pence and refund_at=o.latest_refund_at))
  or array_position(stages,p_previous) is null or array_position(stages,p_target) is null or array_position(stages,p_target)>=array_position(stages,p_previous) then
  raise exception 'Unsupported fulfilment correction' using errcode='22023';end if;
 if exists(select 1 from public.order_email_deliveries where order_id=o.id and state in ('pending','claimed') and (automatic_delivery_eligible or external_requested_by is not null)) then raise exception 'Pending or claimed notification requires review before correction' using errcode='40001';end if;
 -- Do not change dispatch metadata, payment, items, prices, inventory or notification rows.
 update public.orders set status=p_target,updated_at=clock_timestamp(),status_history=status_history||jsonb_build_array(jsonb_build_object(
  'type','fulfilment_correction','from_status',p_previous,'status',p_target,'reason',reason,'actor',actor,'source','admin','at',clock_timestamp())) where id=o.id;
 return true;
end;
$$;
revoke all on function public.correct_order_fulfilment(uuid,timestamptz,text,text,text) from public,anon,authenticated;
grant execute on function public.correct_order_fulfilment(uuid,timestamptz,text,text,text) to authenticated;

create function public.request_dispatch_resend(p_order_id uuid,p_operation_id uuid,p_previous_delivery uuid,p_expected_updated_at timestamptz,p_expected_email text,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; d public.order_email_deliveries%rowtype; existing public.order_email_deliveries%rowtype; actor uuid:=auth.uid(); email text; reason text:=btrim(p_reason); result uuid;
begin
 if actor is null or not exists(select 1 from public.admin_members where user_id=actor) then raise exception 'Admin membership required' using errcode='42501';end if;
 if p_operation_id is null or p_previous_delivery is null or reason is null or length(reason) not between 5 and 1000 or reason~'[[:cntrl:]]' then raise exception 'Explicit resend identity and reason required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('dispatch-resend:'||p_operation_id::text,0));
 select * into o from public.orders where id=p_order_id for update;
 if not found then raise exception 'Order unavailable' using errcode='22023';end if;
 select * into existing from public.order_email_deliveries where operation_id=p_operation_id;
 if found then
  if existing.order_id<>p_order_id or existing.resend_of<>p_previous_delivery or existing.recipient_email is distinct from lower(btrim(p_expected_email)) or existing.resend_reason<>reason or existing.external_requested_by<>actor then raise exception 'Resend identity reused with different details' using errcode='23505';end if;
  return existing.id;
 end if;
 email:=lower(btrim(coalesce(o.customer->>'email','')));
 if p_expected_updated_at is null or o.updated_at is distinct from p_expected_updated_at then raise exception 'Order changed; refresh before resend' using errcode='40001';end if;
 if o.status<>'dispatched' or o.payment_status not in ('paid','partially_refunded') or o.paid_at is null or o.fulfillment_applied_at is null
  or (o.payment_status='partially_refunded' and not exists(select 1 from public.partial_refund_reviews where order_id=o.id and refunded_pence=o.refunded_pence and refund_at=o.latest_refund_at))
  or not public.external_dispatch_recipient_allowed(email,o.sales_channel) or email is distinct from lower(btrim(p_expected_email)) then raise exception 'Current dispatched Order and matching eligible recipient required' using errcode='22023';end if;
 select * into d from public.order_email_deliveries where order_id=o.id and kind='dispatched' order by created_at desc,id desc limit 1;
 if not found or d.id<>p_previous_delivery or d.state<>'sent' then raise exception 'A current successful dispatch notification is required; pending or uncertain attempts must be reviewed' using errcode='40001';end if;
 insert into public.order_email_deliveries(order_id,kind,source_event_id,external_requested_by,recipient_email,order_snapshot,resend_of,operation_id,resend_reason)
 values(o.id,'dispatched','resend:'||p_operation_id,actor,email,to_jsonb(o),d.id,p_operation_id,reason) returning id into result;
 return result;
end;
$$;
revoke all on function public.request_dispatch_resend(uuid,uuid,uuid,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.request_dispatch_resend(uuid,uuid,uuid,timestamptz,text,text) to authenticated;

-- Preserve native and external first-send authority, selecting original rows only.
do $migration$
declare body text;
begin
 body:=pg_get_functiondef('public.request_external_dispatch(uuid,boolean,boolean,text)'::regprocedure);
 body:=replace(body,'on conflict(order_id,kind) do nothing','on conflict(order_id,kind) where resend_of is null do nothing');
 body:=replace(body,'where order_id=o.id and kind=''dispatched'';','where order_id=o.id and kind=''dispatched'' and resend_of is null;');execute body;
 body:=pg_get_functiondef('public.claim_order_email_delivery(uuid,text)'::regprocedure);
 body:=replace(body,'where order_id=p_order_id and kind=p_kind for update','where order_id=p_order_id and kind=p_kind and resend_of is null for update');execute body;
 body:=pg_get_functiondef('public.claim_external_dispatch(uuid)'::regprocedure);
 body:=replace(body,'or d.order_snapshot->>''sales_channel''=''WEBSITE''','or (d.order_snapshot->>''sales_channel''=''WEBSITE'' and d.resend_of is null)');execute body;
 -- Re-advancing after correction records a new transition without replaying email.
 body:=pg_get_functiondef('public.advance_order_fulfilment(uuid,text)'::regprocedure);
 body:=replace(body,'values(p_order_id,p_next_status,transition_id::text);','values(p_order_id,p_next_status,transition_id::text) on conflict(order_id,kind) where resend_of is null do nothing;');execute body;
 if to_regprocedure('public.record_verified_stripe_refund(text,text,text,text,bigint,text,text,timestamptz,timestamptz)') is not null then
  body:=pg_get_functiondef('public.record_verified_stripe_refund(text,text,text,text,bigint,text,text,timestamptz,timestamptz)'::regprocedure);
  body:=replace(body,'on conflict(order_id,kind) do nothing','on conflict(order_id,kind) where resend_of is null do nothing');execute body;
 end if;
end $migration$;

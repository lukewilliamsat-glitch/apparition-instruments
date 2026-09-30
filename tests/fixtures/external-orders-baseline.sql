-- Deployed order functions restored to the pre-external boundary for local tests.
CREATE OR REPLACE FUNCTION public.advance_order_fulfilment(p_order_id uuid, p_next_status text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.claim_order_email_delivery(p_order_id uuid, p_kind text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.claim_paid_order_confirmation(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.fulfil_paid_stripe_checkout(p_event_id text, p_event_type text, p_order_id uuid, p_reference text, p_session_id text, p_payment_intent_id text, p_amount bigint, p_currency text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 order_row public.orders%rowtype;
 item jsonb; part jsonb; wanted record; quantity_needed bigint;
 required_stock jsonb:='{}'::jsonb; component_id text; item_quantity bigint;
begin
 if p_event_id !~ '^evt_[A-Za-z0-9]{8,}$'
   or p_event_type not in ('checkout.session.completed','checkout.session.async_payment_succeeded')
   or p_session_id !~ '^cs_live_[A-Za-z0-9]{8,}$'
   or p_payment_intent_id !~ '^pi_[A-Za-z0-9]{8,}$'
   or p_reference !~ '^AI-[0-9]+$' or p_currency<>'gbp'
   or p_amount is null or p_amount<=0 then
  raise exception 'Invalid verified payment reference' using errcode='22023';
 end if;
 select * into order_row from public.orders where id=p_order_id for update;
 if not found or order_row.reference<>p_reference or order_row.stripe_checkout_session_id<>p_session_id
    or order_row.total_pence<>p_amount or order_row.currency<>'GBP' then
  raise exception 'Verified payment differs from its Order' using errcode='22023';
 end if;
 if order_row.payment_status in ('paid','partially_refunded','refunded') then
  if order_row.stripe_payment_intent_id is distinct from p_payment_intent_id
    or order_row.fulfillment_applied_at is null then
   raise exception 'Existing paid Order has different payment details' using errcode='22023';
  end if;
  insert into public.stripe_webhook_events(event_id,order_id,event_type)
    values(p_event_id,p_order_id,p_event_type) on conflict (event_id) do nothing;
  if (select order_id from public.stripe_webhook_events where event_id=p_event_id)<>p_order_id then
   raise exception 'Stripe event belongs to another Order' using errcode='22023'; end if;
  return 'already_paid';
 end if;
 if order_row.payment_status<>'unpaid' or order_row.status<>'pending'
    or exists(select 1 from public.stripe_webhook_events where event_id=p_event_id) then
  raise exception 'Stripe payment event cannot be processed' using errcode='22023'; end if;

 for item in select value from jsonb_array_elements(order_row.items) loop
  if (item->>'quantity') !~ '^[1-9][0-9]*$' then
   raise exception 'Invalid saved Order quantity' using errcode='22023'; end if;
  item_quantity:=(item->>'quantity')::bigint;
  if item->>'type' in ('kit','assembly') then
   if jsonb_typeof(item->'snapshot'->'stockRequirements')<>'array' then
    raise exception 'Kit has no validated physical requirements' using errcode='22023'; end if;
   for part in select value from jsonb_array_elements(item->'snapshot'->'stockRequirements') loop
    component_id:=part->>'componentId';
    if component_id is null or (part->>'quantity') !~ '^[1-9][0-9]*$' then
     raise exception 'Invalid kit physical requirement' using errcode='22023'; end if;
    quantity_needed:=(part->>'quantity')::bigint*item_quantity;
    required_stock:=jsonb_set(required_stock,array[component_id],
     to_jsonb(coalesce((required_stock->>component_id)::bigint,0)+quantity_needed),true);
   end loop;
  elsif item->>'type'='component' then
   component_id:=item->>'productId';
   if component_id is null or component_id='' then
    raise exception 'Component identity is missing from Order' using errcode='22023'; end if;
   required_stock:=jsonb_set(required_stock,array[component_id],
    to_jsonb(coalesce((required_stock->>component_id)::bigint,0)+item_quantity),true);
  else
   raise exception 'Unsupported Order item' using errcode='22023';
  end if;
 end loop;
 if required_stock='{}'::jsonb then raise exception 'Order has no physical requirements' using errcode='22023'; end if;
 -- Conditional UPDATE locks each stock row. A failed update rolls back every prior deduction.
 for wanted in select key,value from jsonb_each_text(required_stock) order by key loop
  update public.inventory inventory_row set quantity=inventory_row.quantity-wanted.value::bigint,updated_at=now()
   where inventory_row.component_id=wanted.key and inventory_row.quantity>=wanted.value::bigint;
  if not found then raise exception 'Insufficient stock for paid Order; manual fulfilment required' using errcode='22023'; end if;
 end loop;
 update public.orders set payment_status='paid',stripe_payment_intent_id=p_payment_intent_id,
  paid_at=now(),fulfillment_applied_at=now(),updated_at=now() where id=p_order_id;
 insert into public.stripe_webhook_events(event_id,order_id,event_type)
  values(p_event_id,p_order_id,p_event_type);
 return 'paid';
end;
$function$
;


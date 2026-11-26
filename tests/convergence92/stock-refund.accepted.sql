CREATE OR REPLACE FUNCTION public.apply_order_inventory(p_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare item jsonb; part jsonb; wanted record; quantity_needed bigint;
 required_stock jsonb:='{}'::jsonb; component_id text; item_quantity bigint;
begin
 for item in select value from jsonb_array_elements(p_items) loop
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
end;
$function$
;
CREATE OR REPLACE FUNCTION public.record_verified_stripe_refund(p_event_id text, p_event_type text, p_refund_id text, p_payment_intent_id text, p_amount bigint, p_currency text, p_status text, p_created_at timestamp with time zone, p_observed_at timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 if refunded=o.total_pence and o.payment_status<>'refunded' then  insert into public.order_email_deliveries(order_id,kind,source_event_id)  values(o.id,'full_refund',p_event_id) on conflict(order_id,kind) where resend_of is null do nothing;  end if; return case when refunded=0 then 'paid'
  when refunded=o.total_pence then 'refunded' else 'partially_refunded' end;
end;
$function$
;

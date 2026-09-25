-- P07B.2A: signed Stripe webhook calls this service-only transactional boundary.
-- Customer checkout remains in its existing test-only state until a later cutover.
alter table public.orders drop constraint orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (payment_status in ('unpaid','paid'));
alter table public.orders add column stripe_payment_intent_id text unique;
alter table public.orders add column paid_at timestamptz;
alter table public.orders add column fulfillment_applied_at timestamptz;

create table public.stripe_webhook_events (
 event_id text primary key,
 order_id uuid not null references public.orders(id),
 event_type text not null check (event_type in ('checkout.session.completed','checkout.session.async_payment_succeeded')),
 processed_at timestamptz not null default now()
);
alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from public, anon, authenticated;

create function public.fulfil_paid_stripe_checkout(
 p_event_id text,p_event_type text,p_order_id uuid,p_reference text,
 p_session_id text,p_payment_intent_id text,p_amount bigint,p_currency text
) returns text language plpgsql security definer set search_path = '' as $$
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
 if order_row.payment_status='paid' then
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
  if item->>'type'='kit' then
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
$$;
revoke execute on function public.fulfil_paid_stripe_checkout(text,text,uuid,text,text,text,bigint,text) from public, anon, authenticated;
grant execute on function public.fulfil_paid_stripe_checkout(text,text,uuid,text,text,text,bigint,text) to service_role;

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
   or p_session_id !~ '^cs_test_[A-Za-z0-9]{8,}$'
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

 perform commerce67.consume(p_order_id);
 perform public.apply_order_inventory(order_row.items);
 update public.orders set payment_status='paid',stripe_payment_intent_id=p_payment_intent_id,
  paid_at=now(),fulfillment_applied_at=now(),updated_at=now() where id=p_order_id;
 insert into public.stripe_webhook_events(event_id,order_id,event_type)
  values(p_event_id,p_order_id,p_event_type);
 return 'paid';
end;
$function$
;

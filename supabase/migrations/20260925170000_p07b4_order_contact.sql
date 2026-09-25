-- Service-only, verified Stripe contact handoff. No payment, status or stock writes.
create function public.save_stripe_order_contact(
 p_order_id uuid,p_reference text,p_session_id text,p_payment_intent_id text,
 p_customer jsonb,p_delivery jsonb
) returns text language plpgsql security definer set search_path = '' as $$
declare order_row public.orders%rowtype;
begin
 if p_session_id !~ '^cs_live_[A-Za-z0-9]{8,}$'
  or p_payment_intent_id !~ '^pi_[A-Za-z0-9]{8,}$'
  or p_reference !~ '^AI-[0-9]+$'
  or jsonb_typeof(p_customer)<>'object' or jsonb_typeof(p_delivery)<>'object'
  or not coalesce(length(trim(p_customer->>'name')) between 1 and 300,false)
  or not coalesce(length(trim(p_customer->>'email')) between 3 and 300,false)
  or not coalesce(position('@' in p_customer->>'email')>=2,false)
  or not coalesce(length(trim(p_delivery->>'recipient')) between 1 and 300,false)
  or not coalesce(length(trim(p_delivery->>'line1')) between 1 and 300,false)
  or not coalesce(length(trim(p_delivery->>'city')) between 1 and 300,false)
  or not coalesce(length(trim(p_delivery->>'postcode')) between 1 and 30,false)
  or p_delivery->>'country' is distinct from 'GB'
  or length(coalesce(p_delivery->>'line2',''))>300 then
  raise exception 'Invalid verified customer or delivery information' using errcode='22023';
 end if;
 select * into order_row from public.orders where id=p_order_id for update;
 if not found or order_row.reference<>p_reference
  or order_row.stripe_checkout_session_id<>p_session_id
  or order_row.payment_status not in ('paid','unpaid')
  or (order_row.payment_status='paid' and order_row.stripe_payment_intent_id<>p_payment_intent_id)
  or (order_row.payment_status='unpaid' and order_row.status<>'pending') then
  raise exception 'Verified Session does not match Order' using errcode='22023';
 end if;
 if order_row.customer<>'{}'::jsonb or order_row.delivery<>'{"country":"GB"}'::jsonb then
  if order_row.customer=p_customer and order_row.delivery=p_delivery then return 'already_saved'; end if;
  raise exception 'Order contact is already recorded' using errcode='22023';
 end if;
 update public.orders set customer=p_customer,delivery=p_delivery,updated_at=now() where id=p_order_id;
 return 'saved';
end;
$$;
revoke execute on function public.save_stripe_order_contact(uuid,text,text,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.save_stripe_order_contact(uuid,text,text,text,jsonb,jsonb) to service_role;

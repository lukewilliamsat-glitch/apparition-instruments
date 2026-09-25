-- Execute BEGIN + this fixture + ROLLBACK on the live schema. No durable test Order or stock change.
do $test$
declare
 part_id text; original_quantity bigint; current_quantity bigint; order_id uuid;
 reference text; status text; intent text:='pi_0123456789abcdef'; session text:='cs_live_0123456789abcdef';
begin
 select component_id,quantity into part_id,original_quantity
 from public.inventory where quantity>=3 order by component_id limit 1;
 if part_id is null then raise exception 'No in-stock Component available for rollback fixture';end if;
 insert into public.orders(request_id,request_hash,subtotal_pence,delivery_pence,total_pence,
  customer,delivery,stripe_checkout_session_id,items)
 values(gen_random_uuid(),'rollback-fixture',5000,0,5000,'{}'::jsonb,'{"country":"GB"}'::jsonb,
  session,jsonb_build_array(
   jsonb_build_object('type','kit','quantity',1,'unitPrice',4000,'snapshot',
    jsonb_build_object('stockRequirements',jsonb_build_array(jsonb_build_object('componentId',part_id,'quantity',2)))),
   jsonb_build_object('type','component','quantity',1,'unitPrice',1000,'productId',part_id)))
 returning id,orders.reference into order_id,reference;
 if (select payment_status from public.orders where id=order_id)<>'unpaid' then raise exception 'Order was paid before webhook';end if;
 status:=public.fulfil_paid_stripe_checkout('evt_0123456789abcdef','checkout.session.completed',order_id,reference,session,intent,5000,'gbp');
 if status<>'paid' then raise exception 'Paid event was not processed';end if;
 select quantity into current_quantity from public.inventory where component_id=part_id;
 if current_quantity<>original_quantity-3 then raise exception 'Mixed order did not deduct aggregate stock exactly once';end if;
 if not exists(select 1 from public.orders where id=order_id and payment_status='paid'
  and stripe_payment_intent_id=intent and paid_at is not null and fulfillment_applied_at is not null) then
  raise exception 'Payment state was not saved';end if;
 status:=public.fulfil_paid_stripe_checkout('evt_0123456789abcdef','checkout.session.completed',order_id,reference,session,intent,5000,'gbp');
 if status<>'already_paid' then raise exception 'Repeated event was not idempotent';end if;
 status:=public.fulfil_paid_stripe_checkout('evt_fedcba9876543210','checkout.session.async_payment_succeeded',order_id,reference,session,intent,5000,'gbp');
 if status<>'already_paid' then raise exception 'Later successful event was not idempotent';end if;
 if (select quantity from public.inventory where component_id=part_id)<>original_quantity-3 then
  raise exception 'Webhook replay deducted stock twice';end if;
 begin
  perform public.fulfil_paid_stripe_checkout('evt_aabbccddeeff0011','checkout.session.completed',order_id,reference,session,intent,4999,'gbp');
  raise exception 'Wrong amount was accepted';
 exception when sqlstate '22023' then null; end;
 begin
  perform public.fulfil_paid_stripe_checkout('evt_aabbccddeeff0011','checkout.session.completed',order_id,reference,session,'pi_aaaaaaaaaaaaaaaa',5000,'gbp');
  raise exception 'Different payment was accepted';
 exception when sqlstate '22023' then null; end;
 if has_function_privilege('anon','public.fulfil_paid_stripe_checkout(text,text,uuid,text,text,text,bigint,text)','EXECUTE')
    or has_table_privilege('anon','public.orders','UPDATE')
    or has_table_privilege('anon','public.inventory','UPDATE') then
  raise exception 'Anonymous clients have a paid-order or Inventory write permission';end if;
end $test$;

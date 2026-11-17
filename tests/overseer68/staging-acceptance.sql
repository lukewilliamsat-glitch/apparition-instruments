-- Run once through a tool pinned to staging prwmowexhonguvtiywsy.
-- Persistent synthetic orders, actors and audit evidence. Never run in production.
do $$
declare
 actor uuid:='68a00000-0000-4000-8000-000000000001'; buyer uuid:='68a00000-0000-4000-8000-000000000002';
 old_order uuid:='68a00000-0000-4000-8000-000000000003'; synthetic_email text:='overseer-buyer@example.invalid';
 c jsonb; s jsonb; existing bigint; conf jsonb:='{"methods":[{"id":"standard","name":"UK Standard","description":"Royal Mail standard service","price":325,"dispatchDays":1,"deliveryDays":3,"minOrder":0,"minUnits":0},{"id":"tracked","name":"UK Tracked","description":"Tracked Royal Mail","price":575,"dispatchDays":1,"deliveryDays":2,"minOrder":1000,"minUnits":2}],"freeEnabled":true,"freeThreshold":4500,"overrides":[{"productId":"fixture-staging-cap","minUnits":3,"price":425}],"promo":null}';
 quote jsonb; c68 jsonb; info jsonb; res jsonb;
begin
 if not exists(select from public.components where id='fixture-staging-cap' and sku='STAGING-CAP') or exists(select from public.orders where coalesce(customer->>'email','') not in ('',synthetic_email)) then raise exception 'Not a clean synthetic project';end if;
 if not exists(select from auth.users where id=actor) then insert into auth.users(id,email,aud,role) values(actor,'overseer-checks@example.invalid','authenticated','authenticated');end if;
 if not exists(select from auth.users where id=buyer) then insert into auth.users(id,email,aud,role) values(buyer,synthetic_email,'authenticated','authenticated');end if;
 insert into public.admin_members(user_id) values(actor) on conflict do nothing;
 if not exists(select from public.orders where id=old_order) then
  insert into public.orders(id,request_id,request_hash,status,payment_status,sales_channel,external_reference,order_date,subtotal_pence,delivery_pence,total_pence,currency,customer,delivery,items,status_history,paid_at,fulfillment_applied_at)
  values(old_order,old_order,repeat('0',32),'dispatched','paid','EBAY','OV68-SYNTHETIC',(now()-interval '11 days')::date,
   750,399,1149,'GBP',jsonb_build_object('name','Synthetic Buyer','email',synthetic_email),'{"country":"GB"}',
   '[{"type":"component","sku":"STAGING-CAP","productId":"fixture-staging-cap","quantity":1,"unitPrice":750,"lineTotal":750}]',
   jsonb_build_array(jsonb_build_object('status','dispatched','event_id','overseer-fixture','at',now()-interval '10 days')),now()-interval '11 days',now()-interval '11 days');
 end if;
 select delivery_pence into existing from public.orders where id=old_order;
 perform set_config('request.jwt.claim.sub',buyer::text,true);
 begin perform public.overseer_delivery_admin_read();raise exception 'Buyer accessed private settings';exception when insufficient_privilege then null;end;
 begin perform public.overseer_aftercare_history(old_order);raise exception 'Buyer accessed private history';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 s:=public.overseer_delivery_admin_read();
 if s->'active'<>'null' then raise exception 'Expected launch-disabled delivery settings';end if;
 quote:=public.overseer_delivery_options(4499,'[]');if (quote#>>'{0,price}')::int<>399 then raise exception 'Legacy default changed';end if;
 res:=public.overseer_delivery_admin_write((s->>'revision')::int,'draft',conf);
 if res->'draft' is distinct from conf or res->'active'<>'null' then raise exception 'Draft receipt incorrect';end if;
 begin perform public.overseer_delivery_admin_write((s->>'revision')::int,'activate',null);raise exception 'Stale activation succeeded';exception when serialization_failure then null;end;
 res:=public.overseer_delivery_admin_write((res->>'revision')::int,'activate',null);
 quote:=public.overseer_delivery_options(4500,'[{"productId":"fixture-staging-cap","quantity":2}]');
 if (quote#>>'{0,price}')::int<>0 or (quote#>>'{1,price}')::int<>575 then raise exception 'Free threshold or tracked rate incorrect';end if;
 quote:=public.overseer_delivery_options(5000,'[{"productId":"fixture-staging-cap","quantity":2},{"productId":"fixture-staging-cap","quantity":1}]');
 if (quote#>>'{0,price}')::int<>425 then raise exception 'Product floor or aggregation incorrect';end if;
 quote:=public.overseer_delivery_admin_preview(jsonb_set(conf,'{promo}',jsonb_build_object('start',to_char((now()-interval '1 hour') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'end',to_char((now()+interval '1 hour') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'))),100,'[]');
 if (quote#>>'{0,price}')::int<>0 then raise exception 'Temporary promotion preview incorrect';end if;
 info:=public.create_guest_kit_order(jsonb_build_object('requestId','68a00000-0000-4000-8000-000000000004','items','[{"product":"component","sku":"STAGING-CAP","quantity":3}]'::jsonb,'checkoutMode','stripe','deliveryMethod','standard'));
 if not exists(select from public.orders where id=(info->>'id')::uuid and delivery_pence=425 and subtotal_pence=480 and total_pence=905) then raise exception 'Legacy checkout did not persist authoritative charge';end if;
 res:=public.overseer_delivery_admin_write((res->>'revision')::int,'legacy',null);
 if res->'active'<>'null' or res->'draft' is distinct from conf or existing<> (select delivery_pence from public.orders where id=old_order) then raise exception 'Rollback or historical amounts incorrect';end if;
 update overseer_aftercare.control set mode='sink' where id;
 c68:=public.overseer_aftercare_context(old_order,actor,'sink');
 if c68->>'recipient'<>synthetic_email then raise exception 'Saved recipient binding failed';end if;
 begin perform public.overseer_aftercare_context(old_order,actor,'smtp');raise exception 'Staging SMTP available';exception when insufficient_privilege then null;end;
 begin perform public.overseer_aftercare_context(old_order,buyer,'sink');raise exception 'Buyer accessed direct context';exception when insufficient_privilege then null;end;
 if not public.overseer_aftercare_claim(old_order,actor,'sink','68a00000-0000-4000-8000-000000000005',c68,'Synthetic transaction support',repeat('0',64)) then raise exception 'Sink claim failed';end if;
 if public.overseer_aftercare_claim(old_order,actor,'sink','68a00000-0000-4000-8000-000000000006',c68,'Synthetic duplicate',repeat('1',64)) then raise exception 'Duplicate was allowed';end if;
 if not public.overseer_aftercare_finish(old_order,'68a00000-0000-4000-8000-000000000005','sink','sink_recorded') then raise exception 'Sink audit recording failed';end if;
 s:=public.get_site_operations();
 if s#>>'{store,state}'<>'OPEN' then raise exception 'Expected clean staging OPEN baseline';end if;
 perform public.set_store_operations(jsonb_build_object('desired_state','ORDERS_PAUSED','mode','schedule','pause_from',statement_timestamp()+interval '5 days','resume_at',statement_timestamp()+interval '6 days','expected_updated_at',s#>'{store,updated_at}','customer_title','Synthetic planned closure','customer_message','No customer notice was published.'));
 s:=public.assert_store_accepting_orders();
 if s#>>'{store,state}'<>'OPEN' then raise exception 'Future closure blocks checkout';end if;
 perform public.set_store_operations(jsonb_build_object('desired_state','ORDERS_PAUSED','mode','now','resume_at',statement_timestamp()+interval '2 seconds','expected_updated_at',s#>'{store,updated_at}'));
 begin perform public.assert_store_accepting_orders();raise exception 'Immediate closure did not block checkout';exception when raise_exception then if sqlerrm<>'Orders are temporarily paused' then raise;end if;end;
end $$;
select 'staging persistent delivery draft, activation, legacy checkout, old amounts, synthetic Aftercare sink and duplicate rejection, and scheduled and immediate pauses passed' as result;

-- Target only prwmowexhonguvtiywsy; scope mutations to IRONCLAD synthetic stock.
do $$
declare
 admin uuid:='68a00000-0000-4000-8000-000000000001'; buyer uuid:='68a00000-0000-4000-8000-000000000002';
 cap text:='ironclad69-fixture-cap'; pot text:='ironclad69-fixture-pot';
 o uuid; receipt uuid; site_state jsonb; guest jsonb; s jsonb; n bigint; fin jsonb; this_day date;
begin
 if not exists(select from public.components where id='fixture-staging-cap' and sku='STAGING-CAP')
  or not exists(select from public.components where id=cap and sku='IC69-FIX-CAP')
  or exists(select from commerce67.control where enabled) then raise exception 'Not isolated staging';end if;
 select quantity into strict n from public.inventory where component_id=cap;
 select id into strict receipt from ironclad69.batches where component_id=cap and origin='receipt';
 select jsonb_agg(to_jsonb(f) order by f.order_id) into fin from public.order_financial_records f;
 update public.components set active=true,individually=true,sale_price=450 where id=cap;
 perform set_config('role','authenticated',true);
 perform set_config('request.jwt.claim.sub',admin::text,true);
 this_day:=(now() at time zone 'Europe/London')::date;
 s:=public.create_external_order(jsonb_build_object('requestId',gen_random_uuid(),'channel','DIRECT',
 'externalReference','IC69-ONLY-STAGING-COST-01','orderDate',this_day,'customerName','Fictional staging buyer','postagePence',0,
 'items',jsonb_build_array(jsonb_build_object('type','component','productId',cap,'quantity',1,'unitPricePence',450))));
 o:=(s->>'id')::uuid;
 s:=public.ironclad69_read('inventory',jsonb_build_object('componentId',cap));
 if (s#>>'{0,physical}')::int<>n-1 or (s#>>'{0,reconciliation}')::boolean then raise exception 'Legacy fulfilment failed to keep the same physical quantity and batch balance';end if;
 s:=public.ironclad69_write(gen_random_uuid(),'recordCost',jsonb_build_object('orderId',o,'lineIndex',0,'batchId',receipt,'basis','allocated_batch','evidence','Synthetic end to end order allocation'));
 s:=public.ironclad69_cost_read(o);
 if jsonb_array_length(s)<>1 or s#>>'{0,line_cost_minor}'<>'112' or s#>>'{0,basis}'<>'allocated_batch' then raise exception 'Cost snapshot did not preserve the exact allocated amount';end if;
 begin
  perform public.ironclad69_write(gen_random_uuid(),'recordCost',jsonb_build_object('orderId',o,'lineIndex',0,'batchId',receipt,'basis','verified_physical_trace','evidence','Synthetic duplicate must fail'));
  raise exception 'Historical acquisition snapshot was overwritten';
 exception when unique_violation then null;end;
 perform set_config('request.jwt.claim.sub',buyer::text,true);
 begin perform public.ironclad69_cost_read(o);raise exception 'Buyer accessed a private cost projection';exception when insufficient_privilege then null;end;
 perform set_config('role','none',true);
 if (select jsonb_agg(to_jsonb(f) order by f.order_id) from public.order_financial_records f) is distinct from fin then raise exception 'Cost evidence rewrote finance';end if;
 -- Exercise the legacy checkout draft RPC only, without contacting Stripe.
 guest:=public.create_guest_kit_order(jsonb_build_object('requestId',gen_random_uuid(),'items',jsonb_build_array(jsonb_build_object('product','component','sku','IC69-FIX-CAP','quantity',1)),'checkoutMode','stripe','deliveryMethod','standard'));
 if not exists(select from public.orders where id=(guest->>'id')::uuid and payment_status='unpaid' and stripe_payment_intent_id is null)
 then raise exception 'Legacy draft checkout contract not preserved';end if;
 if (select quantity from public.inventory where component_id=cap)<>n-1 then raise exception 'Unpaid draft deducted inventory';end if;
 update public.components set active=false,individually=false where id=cap;
end $$;
select jsonb_build_object('result','PASS','externalOrderStockDeduction',true,'unpaidLegacyCheckout',true,'costSnapshotMinor',112,'originalEclipseRecordsUnchanged',true,'stripeNetwork',false) as acceptance;

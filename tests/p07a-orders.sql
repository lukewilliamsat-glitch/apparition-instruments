-- Run in an explicit transaction and ROLLBACK. No test Orders survive.
create temp table p07a_test_payload as
with kit as (select a.id,a.name,k.base_price from public.assemblies a join public.kit_definitions k on k.assembly_id=a.id where k.family='les-paul'),
parts as (select id,jsonb_build_object('id',id,'sku',sku,'name',name,'manufacturer',manufacturer,'specification',specs,'kitPrice',kit_price) snapshot from public.components where id in ('pot-short-alpha-a','cde-022','cde-047')),
physical as (select jsonb_build_array(
 jsonb_build_object('role','potentiometers','quantity',4,'componentId','pot-short-alpha-a','unitKitPrice',0,'priceContribution',0,'component',(select snapshot from parts where id='pot-short-alpha-a')),
 jsonb_build_object('role','neckToneCapacitor','quantity',1,'componentId','cde-022','unitKitPrice',0,'priceContribution',0,'component',(select snapshot from parts where id='cde-022')),
 jsonb_build_object('role','bridgeToneCapacitor','quantity',1,'componentId','cde-047','unitKitPrice',0,'priceContribution',0,'component',(select snapshot from parts where id='cde-047')),
 jsonb_build_object('role','trebleBleeds','quantity',0,'componentId',null,'unitKitPrice',null,'priceContribution',0),
 jsonb_build_object('role','outputJack','quantity',0,'componentId',null,'unitKitPrice',null,'priceContribution',0),
 jsonb_build_object('role','selector','quantity',0,'componentId',null,'unitKitPrice',null,'priceContribution',0)) rows),
lines as (select jsonb_agg(jsonb_build_object('key',v.key,'price',case when v.key='base' then (select base_price from kit) else 0 end) order by v.ordering) rows
 from (values (1,'base'),(2,'wiring'),(3,'pots'),(4,'shaft'),(5,'matching'),(6,'capacitors'),(7,'bleed'),(8,'jack'),(9,'selector')) v(ordering,key))
select jsonb_build_object('requestId',gen_random_uuid(),'customer',jsonb_build_object('name','P07A rollback check','email','p07a@example.invalid'),
 'delivery',jsonb_build_object('line1','Test Street','postcode','NG1 1AA','country','United Kingdom'),'items',jsonb_build_array(jsonb_build_object('product','les-paul','quantity',1,'record',
 jsonb_build_object('schemaVersion',3,'kitType','les-paul','kitDefinitionId',kit.id,'kitName',kit.name,'configuration',
 jsonb_build_object('wiring','modern','pots','Alpha','shaft','short','matching','standard','caps','mixed','neckCap','cde-022','bridgeCap','cde-047','bleed','none','jack','none','selector','none'),
 'specification',jsonb_build_object('wiring','Modern wiring'),'basePrice',kit.base_price,'components',physical.rows,
 'stockRequirements',jsonb_build_array(jsonb_build_object('componentId','pot-short-alpha-a','quantity',4),jsonb_build_object('componentId','cde-022','quantity',1),jsonb_build_object('componentId','cde-047','quantity',1)),
 'pricing',jsonb_build_object('currency','GBP','basePrice',kit.base_price,'total',kit.base_price,'lines',lines.rows))))) payload from kit,physical,lines;

do $$ declare receipt jsonb; previous_stock bigint; after_stock bigint; begin
 select quantity into previous_stock from public.inventory where component_id='pot-short-alpha-a';
 select public.create_guest_kit_order(payload) into receipt from p07a_test_payload;
 if receipt->>'reference' !~ '^AI-[0-9]{6,}$' or receipt->>'paymentStatus'<>'unpaid' then raise exception 'Order reference/payment invalid'; end if;
 if not exists (select 1 from public.orders o where id=(receipt->>'id')::uuid and total_pence=(receipt->>'totalPence')::bigint
 and items->0->'snapshot'->'components'->0->>'componentId'='pot-short-alpha-a' and items->0->'snapshot'->'components'->0->>'quantity'='4') then raise exception 'Snapshot not persisted'; end if;
 select quantity into after_stock from public.inventory where component_id='pot-short-alpha-a';
 if previous_stock<>after_stock then raise exception 'Stock changed'; end if;
 begin
  perform public.create_guest_kit_order(jsonb_set(jsonb_set((select payload from p07a_test_payload),'{requestId}',to_jsonb(gen_random_uuid()::text)),'{items,0,record,pricing,total}','1'::jsonb));
  raise exception 'Tampered order accepted';
 exception when sqlstate '22023' then null; end;
 begin
  perform public.create_guest_kit_order(jsonb_set(jsonb_set((select payload from p07a_test_payload),'{requestId}',to_jsonb(gen_random_uuid()::text)),'{items,0,record,components,0,quantity}','3'::jsonb));
  raise exception 'Tampered physical quantity accepted';
 exception when sqlstate '22023' then null; end;
 begin
  perform public.create_guest_kit_order(jsonb_set(jsonb_set((select payload from p07a_test_payload),'{requestId}',to_jsonb(gen_random_uuid()::text)),'{items,0,record,components,0,componentId}',to_jsonb('cde-022'::text)));
  raise exception 'Tampered Component ID accepted';
 exception when sqlstate '22023' then null; end;
end $$;
grant select on p07a_test_payload to anon, authenticated;
set local role anon;
do $$ begin
 if (select has_table_privilege('anon','public.orders','SELECT')) then raise exception 'Anonymous Orders table read is granted'; end if;
 perform public.create_guest_kit_order((select payload from p07a_test_payload));
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
do $$ begin if (select count(*) from public.orders)<>0 then raise exception 'Non-Admin could read Orders'; end if; end $$;
select set_config('request.jwt.claim.sub','1c893207-37fb-42d4-8b79-125fa573cb3b',true);
do $$ begin if (select count(*) from public.orders)<1 then raise exception 'Explicit Admin could not read Orders'; end if; end $$;
reset role;

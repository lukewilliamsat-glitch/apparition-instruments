-- Run inside BEGIN / ROLLBACK on live schema. No test business data retained.
create temp table p07b_test_payload as
with kit as (select a.id,a.name,k.base_price from public.assemblies a join public.kit_definitions k on k.assembly_id=a.id where k.family='les-paul'),
parts as (select id,jsonb_build_object('id',id,'sku',sku,'name',name,'manufacturer',manufacturer,'specification',specs,'kitPrice',kit_price) snapshot from public.components where id in ('pot-short-alpha-a','cde-022','cde-047','bleed-prs')),
physical as (select jsonb_build_array(
 jsonb_build_object('role','potentiometers','quantity',4,'componentId','pot-short-alpha-a','unitKitPrice',0,'priceContribution',0,'component',(select snapshot from parts where id='pot-short-alpha-a')),
 jsonb_build_object('role','neckToneCapacitor','quantity',1,'componentId','cde-022','unitKitPrice',0,'priceContribution',0,'component',(select snapshot from parts where id='cde-022')),
 jsonb_build_object('role','bridgeToneCapacitor','quantity',1,'componentId','cde-047','unitKitPrice',0,'priceContribution',0,'component',(select snapshot from parts where id='cde-047')),
 jsonb_build_object('role','trebleBleeds','quantity',2,'componentId','bleed-prs','unitKitPrice',400,'priceContribution',800,'component',(select snapshot from parts where id='bleed-prs')),
 jsonb_build_object('role','outputJack','quantity',0,'componentId',null,'unitKitPrice',null,'priceContribution',0),
 jsonb_build_object('role','selector','quantity',0,'componentId',null,'unitKitPrice',null,'priceContribution',0)) rows),
lines as (select jsonb_agg(jsonb_build_object('key',v.key,'price',case when v.key='base' then (select base_price from kit) when v.key='matching' then 999 when v.key='bleed' then 800 else 0 end) order by v.ordering) rows
 from (values (1,'base'),(2,'wiring'),(3,'pots'),(4,'shaft'),(5,'matching'),(6,'capacitors'),(7,'bleed'),(8,'jack'),(9,'selector')) v(ordering,key))
select jsonb_build_object('requestId',gen_random_uuid(),'checkoutMode','stripe','customer',jsonb_build_object('name','P07B rollback check','email','p07b@example.invalid'),
 'delivery',jsonb_build_object('line1','Test Street','postcode','NG1 1AA','country','United Kingdom'),'items',jsonb_build_array(jsonb_build_object('product','les-paul','quantity',1,'record',
 jsonb_build_object('schemaVersion',3,'kitType','les-paul','kitDefinitionId',kit.id,'kitName',kit.name,'configuration',
 jsonb_build_object('wiring','modern','pots','Alpha','shaft','short','matching','precision','caps','mixed','neckCap','cde-022','bridgeCap','cde-047','bleed','bleed-prs','jack','none','selector','none'),
 'specification',jsonb_build_object('wiring','Modern wiring'),'basePrice',kit.base_price,'components',physical.rows,
 'stockRequirements',jsonb_build_array(jsonb_build_object('componentId','pot-short-alpha-a','quantity',4),jsonb_build_object('componentId','cde-022','quantity',1),jsonb_build_object('componentId','cde-047','quantity',1),jsonb_build_object('componentId','bleed-prs','quantity',2)),
 'pricing',jsonb_build_object('currency','GBP','basePrice',kit.base_price,'total',kit.base_price+1799,'lines',lines.rows))))) payload from kit,physical,lines;

do $$ declare result jsonb; low jsonb; component_stock bigint; part_sku text; part_price integer; part_quantity bigint; single jsonb; mixed jsonb; begin
 select quantity into component_stock from public.inventory where component_id='bleed-prs';
 select public.create_guest_kit_order(payload) into result from p07b_test_payload;
 if result->>'totalPence'<>'5798' then raise exception 'Expected authoritative 5798p total, got %',result; end if;
 if not exists(select 1 from public.orders where id=(result->>'id')::uuid and subtotal_pence=5798 and delivery_pence=0 and total_pence=5798 and status='pending' and payment_status='unpaid') then raise exception 'Order amounts/status invalid'; end if;
 begin
  perform public.create_guest_kit_order(jsonb_set(jsonb_set((select payload from p07b_test_payload),'{requestId}',to_jsonb(gen_random_uuid()::text)),'{items,0,record,pricing,total}','5797'::jsonb));
  raise exception 'Tampered total was accepted';
 exception when sqlstate '22023' then null; end;
 begin
  perform public.create_guest_kit_order(jsonb_set(jsonb_set((select payload from p07b_test_payload),'{requestId}',to_jsonb(gen_random_uuid()::text)),'{items,0,record,components,0,quantity}','3'::jsonb));
  raise exception 'Tampered quantity was accepted';
 exception when sqlstate '22023' then null; end;
 begin
  perform public.create_guest_kit_order(jsonb_set(jsonb_set((select payload from p07b_test_payload),'{requestId}',to_jsonb(gen_random_uuid()::text)),'{items,0,record,components,0,componentId}',to_jsonb('cde-022'::text)));
  raise exception 'Tampered Component ID was accepted';
 exception when sqlstate '22023' then null; end;
 begin
  perform public.create_guest_kit_order(jsonb_set(jsonb_set((select payload from p07b_test_payload),'{requestId}',to_jsonb(gen_random_uuid()::text)),'{items,0,record,pricing,basePrice}','4500'::jsonb));
  raise exception 'Stale base price was accepted';
 exception when sqlstate '22023' then null; end;
 low:=(select payload from p07b_test_payload);
 low:=jsonb_set(low,'{requestId}',to_jsonb(gen_random_uuid()::text));
 low:=jsonb_set(low,'{items,0,record,configuration,matching}','"standard"'::jsonb);
 low:=jsonb_set(low,'{items,0,record,configuration,bleed}','"none"'::jsonb);
 low:=jsonb_set(low,'{items,0,record,components,3}',jsonb_build_object('role','trebleBleeds','quantity',0,'componentId',null,'unitKitPrice',null,'priceContribution',0));
 low:=jsonb_set(low,'{items,0,record,stockRequirements}',(low#>'{items,0,record,stockRequirements}')-3);
 low:=jsonb_set(low,'{items,0,record,pricing,lines,4,price}','0'::jsonb);
 low:=jsonb_set(low,'{items,0,record,pricing,lines,6,price}','0'::jsonb);
 low:=jsonb_set(low,'{items,0,record,pricing,total}','3999'::jsonb);
 select public.create_guest_kit_order(low) into result;
 if result->>'totalPence'<>'4398' then raise exception 'Expected 3999p plus 399p shipping, got %',result;end if;
 if not exists(select 1 from public.orders where id=(result->>'id')::uuid and subtotal_pence=3999 and delivery_pence=399 and total_pence=4398) then raise exception 'Shipping threshold invalid';end if;
 select c.sku,c.sale_price,i.quantity into part_sku,part_price,part_quantity
 from public.components c join public.inventory i on i.component_id=c.id
 where c.active and c.individually and c.sale_price>0 and i.quantity>=2 order by c.id limit 1;
 if part_sku is null then raise exception 'No in-stock individually sold Component to test';end if;
 single:=jsonb_build_object('requestId',gen_random_uuid(),'checkoutMode','stripe','items',
  jsonb_build_array(jsonb_build_object('product','component','sku',part_sku,'quantity',1)));
 select public.create_guest_kit_order(single) into result;
 if result->>'totalPence'<> (part_price+case when part_price>=5000 then 0 else 399 end)::text
 or not exists(select 1 from public.orders where id=(result->>'id')::uuid
 and items->0->>'type'='component' and (items->0->>'unitPrice')::int=part_price) then
  raise exception 'Component only price/identity/delivery invalid';end if;
 mixed:=jsonb_set((select payload from p07b_test_payload),'{requestId}',to_jsonb(gen_random_uuid()::text));
 mixed:=jsonb_set(mixed,'{items}',(mixed->'items') || (single->'items'));
 select public.create_guest_kit_order(mixed) into result;
 if result->>'totalPence'<>(5798+part_price)::text or not exists(select 1 from public.orders where id=(result->>'id')::uuid
 and jsonb_array_length(items)=2 and subtotal_pence=5798+part_price and delivery_pence=0) then
  raise exception 'Mixed basket price or delivery invalid';end if;
 begin
  perform public.create_guest_kit_order(jsonb_set(single,'{items,0,quantity}',to_jsonb(part_quantity+1)) || jsonb_build_object('requestId',gen_random_uuid()));
  raise exception 'Excess Component quantity was accepted';
 exception when sqlstate '22023' then null; end;
 begin
  perform public.create_guest_kit_order(jsonb_set(single,'{items,0,sku}','"nonexistent-component"'::jsonb) || jsonb_build_object('requestId',gen_random_uuid()));
  raise exception 'Unknown Component SKU was accepted';
 exception when sqlstate '22023' then null; end;
 if (select quantity from public.inventory where component_id='bleed-prs')<>component_stock then raise exception 'Inventory changed';end if;
end $$;

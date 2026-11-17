do $$
declare who uuid:='68a00000-0000-4000-8000-000000000001'; buyer uuid:='68a00000-0000-4000-8000-000000000002';
 c text:='ironclad69-fixture-pot'; d text:='ironclad69-fixture-cap'; supplier uuid; po uuid; quick uuid:=gen_random_uuid(); day text;
 b uuid; snap jsonb; initial bigint; baseline bigint; req jsonb; x jsonb; t text; cost bigint;
begin
 if not exists(select from public.components where id=c and sku='IC69-FIX-POT') or ironclad69.commerce_enabled() then raise exception 'Not isolated IRONCLAD staging'; end if;
 select quantity into initial from public.inventory where component_id=c;
 select quantity into baseline from public.inventory where component_id=d;
 select to_jsonb(z) into snap from (select count(*) as rows,max(updated_at) as last_updated from public.order_financial_records) z;
 select id into strict b from ironclad69.batches where component_id=c and origin='opening';
 day:=to_char(now() at time zone 'Europe/London','YYYY-MM-DD');
 perform set_config('role','authenticated',true);
 perform set_config('request.jwt.claim.sub',buyer::text,true);
 begin perform public.ironclad69_read('purchaseChoices');raise exception 'non-admin choice allowed';exception when insufficient_privilege then null;end;
 begin perform public.ironclad69_write(gen_random_uuid(),'quickPurchase','{}');raise exception 'non-admin quick allowed';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',who::text,true);
 supplier:=(public.ironclad69_write(gen_random_uuid(),'supplier','{"name":"Fictional Forge Vendor","reference":"TEST69A","currency":"GBP"}')->>'id')::uuid;
 req:=jsonb_build_object('supplierId',supplier,'reference','IC69A-EDIT-01','date',day,'method','quantity','currency','GBP','charges','{"freight":120}'::jsonb,
  'lines',jsonb_build_array(jsonb_build_object('componentId',c,'partNo','POT-69A','quantity',3,'unitMinor',225)));
 po:=(public.ironclad69_write(gen_random_uuid(),'purchase',req)->>'id')::uuid;
 req:=req||jsonb_build_object('id',po,'revision',0,'lines',jsonb_build_array(jsonb_build_object('componentId',c,'partNo','POT-69A','quantity',3,'unitMinor',225),jsonb_build_object('componentId',d,'quantity',2,'unitMinor',45)));
 perform public.ironclad69_write(gen_random_uuid(),'purchaseEdit',req);
 x:=public.ironclad69_read('purchases',jsonb_build_object('id',po));
 if jsonb_array_length(x)<>1 or x#>>'{0,revision}'<>'1' or x#>>'{0,total_minor}'<>'885' or x#>>'{0,ordered_qty}'<>'5' then raise exception 'Draft projection mismatch: %',x;end if;
 begin perform public.ironclad69_write(gen_random_uuid(),'purchaseEdit',req);raise exception 'Stale edit saved';exception when serialization_failure then null;end;
 perform public.ironclad69_write(gen_random_uuid(),'purchaseState',jsonb_build_object('id',po,'state','ordered'));
 begin perform public.ironclad69_write(gen_random_uuid(),'purchaseEdit',req||'{"revision":2}');raise exception 'Ordered draft editable';
 exception when raise_exception then if sqlerrm<>'Only unreceived drafts can be edited' then raise;end if;end;
 x:=public.ironclad69_read('purchaseChoices',jsonb_build_object('q','IC69-FIX-POT','supplierId',supplier));
 if x#>>'{0,part_no}'<>'POT-69A' then raise exception 'Known supplier part not returned';end if;
 req:=jsonb_build_object('supplierId',supplier,'reference','','date',day,'currency','USD','evidence','Actual fictional card conversion','method','quantity','charges','{"freight":101}'::jsonb,
 'lines',jsonb_build_array(jsonb_build_object('componentId',c,'quantity',2,'unitMinor',330,'gbpMinor',515),jsonb_build_object('componentId',d,'quantity',1,'unitMinor',130,'gbpMinor',97)));
 x:=public.ironclad69_write(quick,'quickPurchase',req);
 if x->>'state'<>'received' or (x#>>'{batches,0,costMinor}')::bigint+(x#>>'{batches,1,costMinor}')::bigint<>713 then raise exception 'Quick landed cost mismatch';end if;
 if public.ironclad69_write(quick,'quickPurchase',req)->>'replayed'<>'true' then raise exception 'Retry not replayed';end if;
 begin perform public.ironclad69_write(gen_random_uuid(),'quickPurchase',req);raise exception 'Duplicate quick stock';exception when unique_violation then null;end;
 begin perform public.ironclad69_write(gen_random_uuid(),'quickPurchase',req||'{"reference":"INVALID","lines":[{"componentId":"missing","quantity":1,"unitMinor":1,"gbpMinor":1}]}');raise exception 'Invalid quick receipt accepted';
 exception when raise_exception then if sqlerrm<>'Component requires existing item inventory' then raise;end if;end;
 perform public.ironclad69_write(gen_random_uuid(),'openingEvidence',jsonb_build_object('batchId',b,'totalMinor',500,'date',day,'evidence','Fictional source invoice retained separately'));
 begin perform public.ironclad69_write(gen_random_uuid(),'openingEvidence',jsonb_build_object('batchId',b,'totalMinor',1,'date',day,'evidence','Attempt to overwrite original evidence'));raise exception 'Opening evidence overwritten';
 exception when raise_exception then if sqlerrm<>'Only a previously unknown opening batch can be evidenced' then raise;end if;end;
 perform set_config('role','none',true);
 if (select quantity from public.inventory where component_id=c)<>initial+2 or (select quantity from public.inventory where component_id=d)<>baseline+1 then raise exception 'Stock changed more than one quick purchase';end if;
 if (select to_jsonb(z) from (select count(*) as rows,max(updated_at) as last_updated from public.order_financial_records) z) is distinct from snap then raise exception 'Historic finance changed';end if;
end $$;
select 'PASS: GBP, multiproduct stale edits, known supplier part, exact foreign landed cost, quick replay/missing component atomicity, stock, opening evidence and finance isolation' as acceptance;

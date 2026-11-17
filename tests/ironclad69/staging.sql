-- Fixture-only acceptance, bound to the earlier staging marker and local synthetic IDs.
do $$
declare
 admin uuid:='68a00000-0000-4000-8000-000000000001'; buyer uuid:='68a00000-0000-4000-8000-000000000002';
 pot text:='ironclad69-fixture-pot'; cap text:='ironclad69-fixture-cap'; 
 sid uuid; pid uuid; lid uuid; lid2 uuid; bid uuid; mid uuid; tid uuid; rid uuid:=gen_random_uuid();
 po jsonb; arr jsonb; rec jsonb; avail_ids jsonb; units jsonb; payload jsonb; err text; initial_finance jsonb;
begin
 if not exists(select from public.components where id='fixture-staging-cap' and sku='STAGING-CAP')
 or not exists(select from public.admin_members where user_id=admin)
 or exists(select from commerce67.control where enabled)
 then raise exception 'Not the dedicated synthetic staging project';end if;
 select jsonb_agg(to_jsonb(f) order by f.order_id) into initial_finance from public.order_financial_records f;
 insert into public.components(id,sku,name,category,active,individually,in_kits) values
 (pot,'IC69-FIX-POT','Fictional 500k short-shaft potentiometer','potentiometers',false,false,false),
 (cap,'IC69-FIX-CAP','Fictional 22nF capacitor','capacitors',false,false,false);
 insert into public.inventory(component_id,quantity) values(pot,2),(cap,6);
 perform set_config('role','authenticated',true);perform set_config('request.jwt.claim.sub',buyer::text,true);
 begin perform public.ironclad69_read('inventory'); raise exception 'Non-admin read allowed';exception when insufficient_privilege then null;end;
 begin perform public.ironclad69_write(gen_random_uuid(),'supplier','{"name":"not allowed"}');raise exception 'Non-admin write allowed';exception when insufficient_privilege then null;end;
 begin perform count(*) from ironclad69.suppliers;raise exception 'Direct table read allowed';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',admin::text,true);
 rec:=public.ironclad69_write(gen_random_uuid(),'supplier','{"name":"Fictional Coil Hardware","reference":"TEST","currency":"USD","location":"Synthetic","notes":"IRONCLAD staged acceptance"}');
 sid:=(rec->>'id')::uuid;
 rec:=public.ironclad69_write(gen_random_uuid(),'purchase',jsonb_build_object('supplierId',sid,'reference','IC69-FIXTURE-PO','method','quantity','currency','USD','evidence','Fictional bank conversion receipt','charges','{"freight":301,"duty":80,"credit":11}'::jsonb,
 'lines',jsonb_build_array(jsonb_build_object('componentId',pot,'partNo','TEST-500','quantity',8,'unitMinor',400,'gbpMinor',2500),jsonb_build_object('componentId',cap,'quantity',2,'unitMinor',100,'gbpMinor',150))));
 pid:=(rec->>'id')::uuid;if (rec->>'allocatedMinor')::int<>370 then raise exception 'Shared cost mismatch';end if;
 perform public.ironclad69_write(gen_random_uuid(),'purchaseState',jsonb_build_object('id',pid,'state','ordered'));
 arr:=public.ironclad69_read('purchaseLines',jsonb_build_object('id',pid));
 lid:=(arr#>>'{0,id}')::uuid;lid2:=(arr#>>'{1,id}')::uuid;
 if (arr#>>'{0,allocation_minor}')::int<>296 then raise exception 'Wrong weighted allocation';end if;
 rec:=public.ironclad69_read('inventory',jsonb_build_object('componentId',pot));
 if (rec#>>'{0,physical}')::int<>2 or (rec#>>'{0,incoming}')::int<>8 then raise exception 'Ordering changed physical or missing incoming';end if;
 payload:=jsonb_build_object('id',pid,'reference','IC69-TRANCHE-A','lines',jsonb_build_array(jsonb_build_object('lineId',lid,'quantity',4,'lot','TEST-A')));
 rec:=public.ironclad69_write(rid,'receive',payload);
 bid:=(rec#>>'{batches,0,batchId}')::uuid;
 if rec->>'state'<>'partial' or (rec#>>'{batches,0,costMinor}')::int<>1398 then raise exception 'Partial receipt or lot cost failed';end if;
 rec:=public.ironclad69_write(rid,'receive',payload);
 if rec->>'replayed'<>'true' or (rec#>>'{batches,0,batchId}')::uuid<>bid then raise exception 'Duplicate request not replayed';end if;
 begin
  perform public.ironclad69_write(gen_random_uuid(),'receive',payload);
  raise exception 'Repeated delivery accepted';
 exception when unique_violation then null;end;
 begin
  perform public.ironclad69_write(gen_random_uuid(),'receive',jsonb_build_object('id',pid,'reference','OVER','lines',jsonb_build_array(jsonb_build_object('lineId',lid,'quantity',5))));
  raise exception 'Excess delivery accepted';
 exception when raise_exception then if sqlerrm<>'Receipt exceeds outstanding purchase quantity' then raise;end if;end;
 rec:=public.ironclad69_write(gen_random_uuid(),'receive',jsonb_build_object('id',pid,'reference','IC69-TRANCHE-B','lines',jsonb_build_array(jsonb_build_object('lineId',lid,'quantity',4),jsonb_build_object('lineId',lid2,'quantity',2))));
 if rec->>'state'<>'received' then raise exception 'Final receipt failed';end if;
 arr:=public.ironclad69_read('batches',jsonb_build_object('componentId',pot));
 if jsonb_array_length(arr)<>3 or not exists(select from jsonb_array_elements(arr) x where x->>'origin'='opening' and x->'cost_minor'='null') then raise exception 'Opening or second acquired batch missing';end if;
 units:='[{"slot":1,"ohm":497900},{"slot":2,"ohm":498200},{"slot":3,"ohm":498500},{"slot":4,"ohm":498700}]';
 rec:=public.ironclad69_write(gen_random_uuid(),'measure',jsonb_build_object('batchId',bid,'nominalOhm',500000,'taper','A','shaft','short split','units',units));
 if (rec->>'measured')::int<>4 then raise exception 'Measurements did not persist';end if;
 arr:=public.ironclad69_read('measurements',jsonb_build_object('batchId',bid));
 select jsonb_agg(x->'id') into avail_ids from jsonb_array_elements(arr) x;
 rec:=public.ironclad69_write(gen_random_uuid(),'allocate',jsonb_build_object('componentId',pot,'toleranceBp',100,'unitIds',avail_ids));mid:=(rec->>'id')::uuid;
 begin
  perform public.ironclad69_write(gen_random_uuid(),'allocate',jsonb_build_object('componentId',pot,'toleranceBp',100,'unitIds',avail_ids));
  raise exception 'Overlapping set accepted';
 exception when raise_exception then if sqlerrm<>'Units are unavailable, incompatible, or exceed the tolerance' then raise;end if;end;
 arr:=public.ironclad69_read('inventory',jsonb_build_object('componentId',pot));
 if (arr#>>'{0,physical}')::int<>10 or (arr#>>'{0,available}')::int<>6 or (arr#>>'{0,allocated}')::int<>4 then raise exception 'Allocation double counted/deducted stock';end if;
 begin
  perform public.ironclad69_write(gen_random_uuid(),'adjust',jsonb_build_object('componentId',pot,'expected',10,'expectedRevision',(arr#>>'{0,revision}')::int,'quantity',3,'kind','damage','reason','Synthetic protected lower count'));
  raise exception 'Protected set stock removed';
 exception when check_violation then null;end;
 perform public.ironclad69_write(gen_random_uuid(),'release',jsonb_build_object('id',mid,'reason','Synthetic bench release'));
 rec:=public.ironclad69_write(gen_random_uuid(),'stocktakeOpen',jsonb_build_object('componentIds',jsonb_build_array(pot,cap),'reason','Synthetic stocktake'));
 tid:=(rec->>'id')::uuid;
 arr:=public.ironclad69_read('inventory',jsonb_build_object('componentId',pot));
 perform public.ironclad69_write(gen_random_uuid(),'adjust',jsonb_build_object('componentId',pot,'expected',10,'expectedRevision',(arr#>>'{0,revision}')::int,'quantity',11,'kind','return','reason','Synthetic return during stocktake'));
 begin
  perform public.ironclad69_write(gen_random_uuid(),'stocktakeApply',jsonb_build_object('id',tid,'confirmed',true,'counts',jsonb_build_object(pot,9,cap,7),'reason','Synthetic stale correction'));
  raise exception 'Stale stocktake applied';
 exception when serialization_failure then null;end;
 rec:=public.ironclad69_write(gen_random_uuid(),'stocktakeOpen',jsonb_build_object('componentIds',jsonb_build_array(pot,cap),'reason','Synthetic verified recount'));
 tid:=(rec->>'id')::uuid;
 perform public.ironclad69_write(gen_random_uuid(),'stocktakeApply',jsonb_build_object('id',tid,'confirmed',true,'counts',jsonb_build_object(pot,9,cap,7),'reason','Synthetic approved recount'));
 arr:=public.ironclad69_read('stocktakeLines',jsonb_build_object('id',tid));
 if jsonb_array_length(arr)<>2 or (arr#>>'{1,counted}')::int<>9 then raise exception 'Stocktake history mismatch';end if;
 perform public.ironclad69_write(gen_random_uuid(),'threshold',jsonb_build_object('componentId',pot,'low',10,'target',20));
 arr:=public.ironclad69_read('inventory',jsonb_build_object('componentId',pot,'status','low','supplierId',sid,'measured',true));
 if (arr#>>'{0,suggested}')::int<>11 or (arr#>>'{0,reconciliation}')::boolean then raise exception 'Threshold or stock reconciliation failed';end if;
 perform public.ironclad69_write(gen_random_uuid(),'supplierArchive',jsonb_build_object('id',sid));
 arr:=public.ironclad69_read('suppliers','{"q":"Fictional Coil Hardware"}');
 if arr#>>'{0,active}'<>'false' or (arr#>>'{0,purchase_count}')::int<>1 then raise exception 'Supplier archival lost history';end if;
 perform set_config('role','none',true);
 if (select jsonb_agg(to_jsonb(f) order by f.order_id) from public.order_financial_records f) is distinct from initial_finance then raise exception 'IRONCLAD altered historical finance';end if;
 if (select quantity from public.inventory where component_id=pot)<>9 then raise exception 'Existing authority disagreed with workspace counts';end if;
end $$;
select jsonb_build_object('result','PASS','tracked',2,'scope','synthetic staging; supplier, PO, partial/final receipts, duplicate and over-receipt protection, exact costs, opening lots, measurements, allocation, stocktake, reorder, private access, unchanged financial documents') as acceptance;

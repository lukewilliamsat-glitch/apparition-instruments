import {exampleDocument,exampleOrders,exampleLibrary} from './examples.mjs';
const [ebay,website]=exampleOrders;
const sqlJSON=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb";
console.log(`
do $$
declare
 admin uuid:='68a00000-0000-4000-8000-000000000001';buyer uuid:='68a00000-0000-4000-8000-000000000002';
 e uuid:='${ebay.id}';w uuid:='${website.id}';
 op_e uuid:='68b00000-0000-4000-8000-000000000002';op_w uuid:='68b00000-0000-4000-8000-000000000003';
 x jsonb; y jsonb; z jsonb; r jsonb; h text; initial_orders jsonb; initial_stock text; initial_mail bigint;
begin
 if not exists(select from public.components where id='fixture-staging-cap' and sku='STAGING-CAP')
  or not exists(select from public.orders where id=e and sales_channel='EBAY' and order_date='2026-10-31')
  or exists(select from public.orders where coalesce(customer->>'email','') not in ('','overseer-buyer@example.invalid')) then raise exception 'Not the isolated synthetic staging project';end if;
 if not exists(select from public.orders where id=w) then
  insert into public.orders(id,request_id,request_hash,status,payment_status,sales_channel,subtotal_pence,delivery_pence,total_pence,currency,customer,delivery,items,status_history,paid_at,fulfillment_applied_at,stripe_payment_intent_id)
  values(w,w,repeat('b',32),'dispatched','paid','WEBSITE',750,399,1149,'GBP','{"name":"Synthetic Buyer","email":"overseer-buyer@example.invalid"}','{"country":"GB"}',
   '[{"type":"component","name":"Workshop capacitor","sku":"STAGING-CAP","productId":"fixture-staging-cap","quantity":1,"unitPrice":750,"lineTotal":750}]','[]',
   '2026-11-03T13:15:00Z','2026-11-03T13:15:00Z','pi_EclipseFixtureNotAProviderPayment');
 end if;
 select jsonb_agg(to_jsonb(o) order by id) into initial_orders from public.orders o where id in(e,w);
 select md5(string_agg(to_jsonb(c)::text,',' order by id)) into initial_stock from public.components c;
 select count(*) into initial_mail from public.order_email_deliveries;
 perform set_config('role','authenticated',true);
 perform set_config('request.jwt.claim.sub',buyer::text,true);
 begin perform public.eclipse_fulfilment_library();raise exception 'Buyer read private library';exception when insufficient_privilege then null;end;
 begin perform public.eclipse_save_fulfilment_library(0,'[]','[]');raise exception 'Buyer saved private library';exception when insufficient_privilege then null;end;
 begin perform public.command63_financial_read(w);raise exception 'Buyer read private order finance';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',admin::text,true);
 r:=public.eclipse_fulfilment_library();if (r->>'revision')::int<>0 then raise exception 'Expected fresh Eclipse fixture library';end if;
 x:=public.eclipse_save_fulfilment_library(0,${sqlJSON(exampleLibrary.items)},${sqlJSON(exampleLibrary.presets)});
 if (x->>'revision')::int<>1 then raise exception 'No current library revision';end if;
 begin perform public.eclipse_save_fulfilment_library(0,'[]','[]');raise exception 'Stale library edit accepted';exception when serialization_failure then null;end;
 x:=public.command63_financial_read(e);
 h:=x->>'orderBasisHash';
 if (x->>'revision')::bigint<>0 then raise exception 'Expected no financial revision on synthetic eBay order';end if;
 begin
  perform public.command63_financial_save(e,0,h,op_e,jsonb_set(${sqlJSON(exampleDocument(ebay))},'{costs,packaging,minor}','999'::jsonb));
  raise exception 'Mismatched packaging snapshot accepted';
 exception when invalid_parameter_value then null;end;
 y:=public.command63_financial_save(e,0,h,op_e,${sqlJSON(exampleDocument(ebay))});
 if y->>'outcome' is distinct from 'committed' or y#>>'{document,fulfilmentSnapshot,libraryRevision}' is distinct from '1' then raise exception 'eBay revision was not committed';end if;
 z:=public.command63_financial_save(e,0,h,op_e,${sqlJSON(exampleDocument(ebay))});
 if z->>'outcome' is distinct from 'committed' or z->>'requestId' is distinct from y->>'requestId'
  or z->>'revision' is distinct from y->>'revision' or z->'document' is distinct from y->'document'
 then raise exception 'Matching replay changed the committed identity or document: %',jsonb_build_object('outcome',z->>'outcome','revision',z->>'revision','requestMatches',z->>'requestId'=y->>'requestId','documentMatches',z->'document'=y->'document');end if;
 z:=public.command63_financial_save(e,0,h,'68b00000-0000-4000-8000-000000000004',${sqlJSON(exampleDocument(ebay))});
 if z->>'outcome' is distinct from 'conflict' then raise exception 'Concurrent financial revision accepted';end if;
 x:=public.command63_financial_read(w);
 y:=public.command63_financial_save(w,0,x->>'orderBasisHash',op_w,${sqlJSON(exampleDocument(website))});
 if y->>'outcome' is distinct from 'committed' then raise exception 'Website revision was not committed';end if;
 begin perform public.command63_financial_read((select id from public.orders where request_id='68a00000-0000-4000-8000-000000000004'));raise exception 'Unpaid website order allowed';exception when invalid_parameter_value then null;end;
 x:=public.eclipse_save_fulfilment_library(1,jsonb_set(${sqlJSON(exampleLibrary.items)},'{0,unitMinor}','27'),${sqlJSON(exampleLibrary.presets)});
 if (x->>'revision')::int<>2 or x#>>'{items,0,unitMinor}' is distinct from '27' then raise exception 'Library update failed';end if;
 x:=public.command63_financial_read(e);
 if x#>>'{document,fulfilmentSnapshot,items,0,unitMinor}' is distinct from '15' or (x->>'revision')::bigint<>1 or jsonb_array_length(x->'history')<>1
  then raise exception 'Historical eBay snapshot changed';end if;
 x:=public.command63_financial_batch(array[e,w]);
 if (x->>'returned')::int<>2 or (x->>'complete')::boolean is distinct from true then raise exception 'Private summary projection omitted a paid order';end if;
 perform set_config('role','none',true);
 if (select jsonb_agg(to_jsonb(o) order by id) from public.orders o where id in(e,w)) is distinct from initial_orders
  or (select md5(string_agg(to_jsonb(c)::text,',' order by id)) from public.components c) is distinct from initial_stock
  or (select count(*) from public.order_email_deliveries) is distinct from initial_mail then raise exception 'Unexpected order, stock or communication change';end if;
end $$;
select set_config('request.jwt.claim.sub','68a00000-0000-4000-8000-000000000001',true);
select jsonb_build_object('fixtureOrderRevisions',(select jsonb_agg(jsonb_build_object('id',f.id,'revision',r->'revision','snapshotMinor',r#>'{document,costs,packaging,minor}'))
 from (select unnest(array['${ebay.id}'::uuid,'${website.id}'::uuid]) id) f
 cross join lateral (select public.command63_financial_read(f.id) r) m),'verified','same request replay, stale revision rejected, buyer denied, private two-order batch, historical packaging, no domain side effects');
`);

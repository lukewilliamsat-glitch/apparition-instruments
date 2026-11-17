-- Run once against prwmowexhonguvtiywsy only, after the Authorisation 68 synthetic fixture.
do $stage$
declare
 actor uuid:='68a00000-0000-4000-8000-000000000001'; buyer uuid:='68a00000-0000-4000-8000-000000000002';
 external_id uuid:='68a00000-0000-4000-8000-000000000003'; request_id68 uuid:='68a00000-0000-4000-8000-000000000081';
 website_id uuid; website_version timestamptz; old_row public.orders%rowtype; new_row public.orders%rowtype;
 earlier date; receipt jsonb; dates jsonb; ledger_before text; inventory_before jsonb; mail_before bigint; finances_before bigint;
begin
 if not exists(select from public.components where id='fixture-staging-cap' and sku='STAGING-CAP')
 or not exists(select from public.orders where id=external_id and external_reference='OV68-SYNTHETIC'
 and customer->>'email'='overseer-buyer@example.invalid') then raise exception 'Unexpected staging fixtures';end if;
 if (select enabled from public.transactional_email_activation where singleton) or (select mode from overseer_aftercare.control where id)<>'sink' then
  raise exception 'Staging email is not isolated';end if;
 if has_function_privilege('anon','public.overseer_correct_order_date(uuid,timestamptz,date,text,uuid)','EXECUTE')
 or has_function_privilege('anon','public.overseer_order_date_history(uuid)','EXECUTE')
 or has_schema_privilege('authenticated','overseer_order_dates','USAGE') then
  raise exception 'Insufficient correction ACL';end if;
 select * into strict old_row from public.orders where id=external_id;
 select id,updated_at into strict website_id,website_version from public.orders where request_id='68a00000-0000-4000-8000-000000000004' and sales_channel='WEBSITE';
 select public.command63_finance_basis(old_row) into ledger_before;
 select jsonb_agg(to_jsonb(i) order by component_id) into inventory_before from public.inventory i;
 select count(*) into mail_before from public.order_email_deliveries;
 select count(*) into finances_before from public.order_financial_records;
 earlier:=(date_trunc('month',old_row.order_date::timestamp)::date-1);
 perform set_config('role','authenticated',true);
 perform set_config('request.jwt.claim.sub',buyer::text,true);
 begin
  perform public.overseer_correct_order_date(external_id,old_row.updated_at,earlier,'Unauthorised test',request_id68);
  raise exception 'Non-Admin ran correction';
 exception when insufficient_privilege then null;end;
 begin
  perform public.overseer_order_date_history(external_id);
  raise exception 'Non-Admin read history';
 exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 begin
  perform public.overseer_correct_order_date(website_id,website_version,earlier,'Website order test',gen_random_uuid());
  raise exception 'Website correction was accepted';
 exception when invalid_parameter_value then null;end;
 begin
  perform public.overseer_correct_order_date(external_id,old_row.updated_at,(now() at time zone 'Europe/London')::date+1,'Future date test',gen_random_uuid());
  raise exception 'Future date was accepted';
 exception when invalid_parameter_value then null;end;
 begin
  perform public.overseer_correct_order_date(external_id,old_row.updated_at,(old_row.created_at at time zone 'Europe/London')::date+1,'Recorded date boundary test',gen_random_uuid());
  raise exception 'Date after recording was accepted';
 exception when invalid_parameter_value then null;end;
 begin
  perform public.overseer_correct_order_date(external_id,old_row.updated_at,earlier,'  no ',gen_random_uuid());
  raise exception 'Missing substantive reason accepted';
 exception when invalid_parameter_value then null;end;
 receipt:=public.overseer_correct_order_date(external_id,old_row.updated_at,earlier,'Correct synthetic external sale reporting month',request_id68);
 if (receipt->>'orderDate')::date is distinct from earlier or (receipt->>'duplicate')::boolean then raise exception 'First correction failed';end if;
 receipt:=public.overseer_correct_order_date(external_id,old_row.updated_at,earlier,'Correct synthetic external sale reporting month',request_id68);
 if not (receipt->>'duplicate')::boolean then raise exception 'Identical retry was not idempotent';end if;
 begin
  perform public.overseer_correct_order_date(external_id,old_row.updated_at,earlier,'Reused correction operation',request_id68);
  raise exception 'Divergent duplicate was accepted';
 exception when serialization_failure then null;end;
 begin
  perform public.overseer_correct_order_date(external_id,old_row.updated_at,earlier-1,'Stale concurrent editor',gen_random_uuid());
  raise exception 'Stale correction was accepted';
 exception when serialization_failure then null;end;
 dates:=public.overseer_order_date_history(external_id);
 if jsonb_array_length(dates)<>1 or (dates#>>'{0,previousDate}')::date is distinct from old_row.order_date
 or (dates#>>'{0,correctedDate}')::date is distinct from earlier or (dates#>>'{0,actor}')::uuid is distinct from actor
 or dates#>>'{0,reason}'<>'Correct synthetic external sale reporting month' or (dates#>>'{0,correctedAt}')::timestamptz<statement_timestamp()
 then raise exception 'Missing complete audit';end if;
 perform set_config('role','postgres',true);
 select * into strict new_row from public.orders where id=external_id;
 if (to_jsonb(new_row)-array['order_date','updated_at']) is distinct from (to_jsonb(old_row)-array['order_date','updated_at'])
 or public.command63_finance_basis(new_row) is distinct from ledger_before
 or (select jsonb_agg(to_jsonb(i) order by component_id) from public.inventory i) is distinct from inventory_before
 or (select count(*) from public.order_email_deliveries)<>mail_before
 or (select count(*) from public.order_financial_records)<>finances_before then raise exception 'Date correction mutated independently preserved data';end if;
 if date_trunc('month',new_row.order_date::timestamp)=date_trunc('month',old_row.order_date::timestamp) then raise exception 'Reporting month failed to move';end if;
end
$stage$;
select 'Synthetic staging order correction, ACL, idempotency, concurrency, audit and preservation passed' as result;

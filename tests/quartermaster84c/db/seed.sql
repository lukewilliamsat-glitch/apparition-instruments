-- Every inserted business row has an explicit 84C namespace and fixture identity.
-- Stage seats attach to confirmed synthetic Auth users. Finance alone uses the
-- existing general staging Admin authority. Operator and observer use 84C scope.
insert into ironclad69.suppliers(id,name,currency,reference)
 values ('84000000-0000-4000-8000-000000000001','84C Fixture Packaging Supplier','GBP','84C-FIXTURE');
insert into quartermaster84c.fixture_suppliers values ('84000000-0000-4000-8000-000000000001');
insert into public.orders(id,reference,request_id,request_hash,status,payment_status,currency,subtotal_pence,delivery_pence,total_pence,
 customer,delivery,items,paid_at,fulfillment_applied_at,confirmation_email_status,sales_channel,external_reference,order_date)
select ('84000000-0000-4000-8000-00000000001'||n)::uuid,
 '84C-FIXTURE-'||n,('84000000-0000-4000-8000-00000000002'||n)::uuid,
 md5('84C-SYNTHETIC-'||n),'ready_to_dispatch','paid','GBP',1000,0,1000,
 '{}'::jsonb,'{}'::jsonb,
 '[{"type":"component","productId":"fixture-staging-pot","name":"84C fixture potentiometer","quantity":2,"unitPrice":500}]'::jsonb,
 statement_timestamp(),statement_timestamp(),'legacy','DIRECT','84C-SYNTHETIC-'||n,current_date
from generate_series(1,4) n;
insert into quartermaster84c.fixture_orders
select ('84000000-0000-4000-8000-00000000001'||n)::uuid from generate_series(1,4) n;

insert into quartermaster79.material(sku,title,reorder_at,quantity,inner_mm,outer_mm,tare_grams)
values('84C-MAILER','84C Fixture mailer',1,0,array[30,20,9],array[34,24,13],10);

-- Distinct seats and no credential material. Reserved test identities must already
-- exist and be confirmed as password users through Supabase Auth before install.
do $roles$
declare
 operator_id uuid;
 finance_id uuid;
 observer_id uuid;
begin
  select id into strict operator_id from auth.users where email='84c-operator@fixtures.example' and email_confirmed_at is not null
      and coalesce(encrypted_password,'')<>'';
  select id into strict finance_id from auth.users where email='84c-finance@fixtures.example' and email_confirmed_at is not null
      and coalesce(encrypted_password,'')<>'';
  select id into strict observer_id from auth.users where email='84c-observer@fixtures.example' and email_confirmed_at is not null
      and coalesce(encrypted_password,'')<>'';
  if exists(select from public.admin_members where user_id in(operator_id,observer_id)) then
    raise exception '84C operator and observer must have stage-only membership';
  end if;
  insert into public.admin_members(user_id) values(finance_id) on conflict do nothing;
  insert into quartermaster84c.test_members values(operator_id),(finance_id),(observer_id);
  insert into quartermaster84w.staff(user_id,can_pack,can_receive,can_record_postage)
    values(operator_id,true,true,true);
  insert into quartermaster84c.finance_staff values(operator_id,true,false),(finance_id,true,true);
end
$roles$;

update quartermaster79.rollout set mode='observe' where singleton and mode='disabled';
update quartermaster84w.gate set mode='workshop' where singleton and mode='disabled';

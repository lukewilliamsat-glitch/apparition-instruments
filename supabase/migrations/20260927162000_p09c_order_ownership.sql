-- P09C: ownership is written only by the service-only checkout creation RPC.
-- Existing Orders start unowned. A later, explicitly authenticated visit can
-- claim matching guest Orders through the verified-email service-only function.
-- Customer retrieval uses a fixed summary projection; Orders RLS stays Admin-only.
-- Restrict Auth-user deletion until an explicit controlled retention/deletion
-- decision; deleting a user must never silently make their Orders claimable.
alter table public.orders add column owner_user_id uuid references auth.users(id) on delete restrict;
create index orders_owner_created_idx on public.orders(owner_user_id,created_at desc) where owner_user_id is not null;

do $$
declare definition text; old_columns text; old_values text;
begin
 definition:=pg_get_functiondef('public.create_guest_kit_order(jsonb)'::regprocedure);
 old_columns:='insert into public.orders(request_id,request_hash,subtotal_pence,delivery_pence,total_pence,customer,delivery,items)';
 old_values:='values(request_uuid,request_hash_value,subtotal,shipping_price,subtotal+shipping_price,safe_customer,safe_delivery,stored_items)';
 if strpos(definition,old_columns)=0 or strpos(definition,old_values)=0
   or strpos(substr(definition,strpos(definition,old_columns)+length(old_columns)),old_columns)>0 then
  raise exception 'Unexpected production checkout function; ownership migration refused';
 end if;
 definition:=replace(definition,old_columns,
  'insert into public.orders(request_id,request_hash,subtotal_pence,delivery_pence,total_pence,customer,delivery,items,owner_user_id)');
 definition:=replace(definition,old_values,
  'values(request_uuid,request_hash_value,subtotal,shipping_price,subtotal+shipping_price,safe_customer,safe_delivery,stored_items,case when p_request->>''checkoutMode''=''stripe'' then nullif(p_request->>''ownerUserId'','''')::uuid else null end)');
 execute definition;
end $$;

-- Do not grant customer SELECT on the raw Orders table: it contains private
-- customer details, provider identifiers, internal snapshots and operational data.
revoke execute on function public.create_guest_kit_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_guest_kit_order(jsonb) to service_role;

create function public.claim_verified_email_guest_orders(p_owner uuid,p_email text)
returns integer language plpgsql security definer set search_path='' as $$
declare trusted_email text; confirmed timestamptz; claimed integer;
begin
 select email,email_confirmed_at into trusted_email,confirmed from auth.users where id=p_owner for share;
 if confirmed is null or trusted_email is null or length(btrim(trusted_email))=0
    or lower(btrim(trusted_email)) is distinct from lower(btrim(p_email)) then
  raise exception 'Verified identity required' using errcode='42501';
 end if;
 update public.orders set owner_user_id=p_owner
  where owner_user_id is null
    and lower(btrim(customer->>'email'))=lower(btrim(trusted_email));
 get diagnostics claimed=row_count;
 return claimed;
end;
$$;
revoke execute on function public.claim_verified_email_guest_orders(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_verified_email_guest_orders(uuid,text) to service_role;

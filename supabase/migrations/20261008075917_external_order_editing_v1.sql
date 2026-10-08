-- External Order Editing V1: metadata only; no historical/business-row backfill.
alter table public.order_email_deliveries add column external_requested_by uuid references auth.users(id);
alter table public.order_email_deliveries add column recipient_email text;
alter table public.order_email_deliveries add column order_snapshot jsonb;
alter table public.order_email_deliveries add constraint external_dispatch_snapshot check
 (external_requested_by is null or (kind='dispatched' and recipient_email is not null and order_snapshot is not null));

-- External requests are explicit-only and never enter the automatic scheduler.
create or replace function public.set_automatic_email_eligibility()
returns trigger language plpgsql set search_path='' as $$
declare active boolean;
begin
 select enabled into active from public.transactional_email_activation where singleton=true for share;
 new.automatic_delivery_eligible := new.external_requested_by is null
  and exists(select 1 from public.orders where id=new.order_id and sales_channel='WEBSITE')
  and new.kind in ('in_production','ready_to_dispatch','dispatched','full_refund') and coalesce(active,false);
 return new;
end;
$$;

create function public.edit_external_order(p_order_id uuid,p_expected_updated_at timestamptz,p_change jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; actor uuid:=auth.uid(); email text; name text; channel text; ref text;
 address jsonb; dispatch jsonb; k text; v text;
begin
 if actor is null or not exists(select 1 from public.admin_members where user_id=actor) then
  raise exception 'Admin membership required' using errcode='42501'; end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.sales_channel='WEBSITE' then raise exception 'External Order required' using errcode='22023'; end if;
 if p_expected_updated_at is null or o.updated_at is distinct from p_expected_updated_at then
  raise exception 'Order changed. Refresh before editing.' using errcode='40001'; end if;
 if p_change is null or jsonb_typeof(p_change)<>'object' or length(p_change::text)>15000
  or exists(select 1 from jsonb_object_keys(p_change) key where key not in ('customerName','email','channel','externalReference','notes','delivery','dispatch')) then
  raise exception 'Unsupported Order edit; item amendments are unavailable' using errcode='22023'; end if;
 name:=btrim(p_change->>'customerName');email:=lower(btrim(coalesce(p_change->>'email','')));
 channel:=p_change->>'channel';ref:=btrim(p_change->>'externalReference');
 if coalesce(length(name),0) not between 1 and 150 or name~'[[:cntrl:]]'
  or length(email)>254 or (email<>'' and email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$')
  or channel is null or channel not in ('EBAY','DIRECT','OTHER') or coalesce(length(ref),0) not between 1 and 150
  or ref~'[[:cntrl:]]' or length(coalesce(p_change->>'notes',''))>2000 then
  raise exception 'Invalid external Order details' using errcode='22023'; end if;
 address:=p_change->'delivery';dispatch:=p_change->'dispatch';
 if jsonb_typeof(address) is distinct from 'object' or jsonb_typeof(dispatch) is distinct from 'object' then
  raise exception 'Invalid delivery details' using errcode='22023'; end if;
 for k,v in select key,value from jsonb_each_text(address) loop
  if k not in ('recipient','line1','line2','city','region','postcode','country') or v is null or length(v)>200 or v~'[[:cntrl:]]' then
   raise exception 'Invalid delivery address' using errcode='22023'; end if;
 end loop;
 for k,v in select key,value from jsonb_each_text(dispatch) loop
  if k not in ('carrier','tracking_reference','tracking_url') or v is null or v~'[[:cntrl:]]'
   or length(v)>(case k when 'carrier' then 100 when 'tracking_reference' then 150 else 500 end)
   or (k='tracking_url' and v<>'' and v !~* '^https://[^[:space:]@/]+(/[^[:space:]]*)?$') then
   raise exception 'Invalid dispatch details' using errcode='22023'; end if;
 end loop;
 update public.orders set customer=o.customer||jsonb_build_object('name',name,'email',email),delivery=address,
  dispatch_details=dispatch,sales_channel=channel,external_reference=ref,internal_notes=coalesce(p_change->>'notes',''),
  updated_at=clock_timestamp(),status_history=status_history||jsonb_build_array(jsonb_build_object(
   'type','external_details','at',clock_timestamp(),'source','admin','actor',actor)) where id=p_order_id;
 return true;
end;
$$;
revoke all on function public.edit_external_order(uuid,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.edit_external_order(uuid,timestamptz,jsonb) to authenticated;

-- One existing ledger row per order/kind. No implicit retry or resend.
create function public.request_external_dispatch(p_order_id uuid,p_dispatch boolean,p_send boolean,p_expected_email text)
returns uuid language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; actor uuid:=auth.uid(); delivery_id uuid; email text;
begin
 if actor is null or not exists(select 1 from public.admin_members where user_id=actor) then
  raise exception 'Admin membership required' using errcode='42501'; end if;
 if p_dispatch is null or p_send is null then raise exception 'Explicit dispatch choice required' using errcode='22023';end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.sales_channel='WEBSITE' then raise exception 'External Order required' using errcode='22023';end if;
 email:=lower(btrim(coalesce(o.customer->>'email','')));
 if p_send and (email='' or length(email)>254 or email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
  or email is distinct from p_expected_email or email~* '@([^@]*\.)?(members\.ebay\.[a-z.]+|ebay\.com)$') then
  raise exception 'Confirm a valid direct customer email; marketplace relay addresses are unavailable' using errcode='22023';end if;
 if p_dispatch and o.status='ready_to_dispatch' then
  perform public.advance_order_fulfilment(p_order_id,'dispatched');
  select * into o from public.orders where id=p_order_id;
 elsif o.status not in ('dispatched','completed') then
  raise exception 'Order must be ready to dispatch or already dispatched' using errcode='22023';end if;
 if not p_send then
  update public.orders set updated_at=clock_timestamp(),status_history=status_history||jsonb_build_array(jsonb_build_object('type','external_dispatch_no_email','at',clock_timestamp(),'source','admin','actor',actor)) where id=p_order_id;
  return null;end if;
 if o.payment_status not in ('paid','partially_refunded') or o.paid_at is null or o.fulfillment_applied_at is null
  or (o.payment_status='partially_refunded' and not exists(select 1 from public.partial_refund_reviews
   where order_id=o.id and refunded_pence=o.refunded_pence and refund_at=o.latest_refund_at)) then
  raise exception 'Eligible paid Order required' using errcode='22023';end if;
 insert into public.order_email_deliveries(order_id,kind,source_event_id,external_requested_by,recipient_email,order_snapshot)
 values(o.id,'dispatched','external-dispatch:'||o.id,actor,email,to_jsonb(o)) on conflict(order_id,kind) do nothing;
 select id into delivery_id from public.order_email_deliveries where order_id=o.id and kind='dispatched';
 return delivery_id;
end;
$$;
revoke all on function public.request_external_dispatch(uuid,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.request_external_dispatch(uuid,boolean,boolean,text) to authenticated;

create function public.claim_external_dispatch(p_delivery_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.order_email_deliveries%rowtype; claim uuid;
begin
 select * into d from public.order_email_deliveries where id=p_delivery_id for update;
 if not found or d.kind<>'dispatched' or d.external_requested_by is null or d.state<>'pending'
  or d.automatic_delivery_eligible or d.order_snapshot->>'sales_channel'='WEBSITE' then return null;end if;
 claim:=gen_random_uuid();
 update public.order_email_deliveries set state='claimed',claim_id=claim,claimed_at=clock_timestamp() where id=d.id;
 return jsonb_build_object('claim',claim,'order',d.order_snapshot,'recipient',d.recipient_email,'orderId',d.order_id);
end;
$$;
revoke all on function public.claim_external_dispatch(uuid) from public,anon,authenticated;
grant execute on function public.claim_external_dispatch(uuid) to service_role;

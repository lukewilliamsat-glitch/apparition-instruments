-- Exact 20 Nov 2026 reviewed release contract definitions; no application records.
do $$ begin
 if current_database()<>'dominion79_fixture' then raise exception 'Disposable DOMINION database required';end if;
end $$;
CREATE OR REPLACE FUNCTION public.acknowledge_partial_refund(p_order_id uuid, p_expected_pence bigint, p_expected_refund_at timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare order_ public.orders%rowtype; actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.admin_members where user_id=actor) then
  raise exception 'Admin membership required' using errcode='42501';
 end if;
 select * into order_ from public.orders where id=p_order_id for update;
 if not found or order_.payment_status<>'partially_refunded' or order_.refunded_pence<=0
  or order_.latest_refund_at is null or order_.refunded_pence is distinct from p_expected_pence
  or order_.latest_refund_at is distinct from p_expected_refund_at then
  raise exception 'Partial refund changed; reload and review the current amount' using errcode='22023';
 end if;
 insert into public.partial_refund_reviews(order_id,refunded_pence,refund_at,admin_user_id)
 values(order_.id,order_.refunded_pence,order_.latest_refund_at,actor)
 on conflict(order_id,refunded_pence,refund_at) do nothing;
 return true;
end;
$function$;
revoke all on function public.acknowledge_partial_refund(uuid,bigint,timestamp with time zone) from public,anon,authenticated,service_role;
grant execute on function public.acknowledge_partial_refund(uuid,bigint,timestamp with time zone) to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.advance_order_fulfilment(p_order_id uuid, p_next_status text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare order_row public.orders%rowtype; actor uuid:=auth.uid(); transition_id uuid;
begin
 if actor is null or not exists(select 1 from public.admin_members where user_id=actor) then
  raise exception 'Admin membership required' using errcode='42501';
 end if;
 select * into order_row from public.orders where id=p_order_id for update;
 if not found or order_row.payment_status not in ('paid','partially_refunded')
  or order_row.paid_at is null or order_row.fulfillment_applied_at is null then
  raise exception 'Only verified paid Orders can enter fulfilment' using errcode='22023';
 end if;
 if order_row.payment_status='partially_refunded' and not exists(
  select 1 from public.partial_refund_reviews where order_id=p_order_id
   and refunded_pence=order_row.refunded_pence and refund_at=order_row.latest_refund_at
 ) then raise exception 'Partial refund requires Admin review' using errcode='22023'; end if;
 if not ((order_row.status='pending' and p_next_status='in_production')
  or (order_row.status='in_production' and p_next_status='ready_to_dispatch')
  or (order_row.status='ready_to_dispatch' and p_next_status='dispatched')
  or (order_row.status='dispatched' and p_next_status='completed')) then
  raise exception 'Invalid fulfilment transition' using errcode='22023';
 end if;
 transition_id:=gen_random_uuid();
 update public.orders set status=p_next_status,updated_at=now(),
  status_history=status_history||jsonb_build_array(jsonb_build_object(
   'event_id',transition_id,'status',p_next_status,'at',now(),'source','admin','actor',actor))
 where id=p_order_id;
 if order_row.sales_channel='WEBSITE' and p_next_status in ('in_production','ready_to_dispatch','dispatched') then
  insert into public.order_email_deliveries(order_id,kind,source_event_id)
  values(p_order_id,p_next_status,transition_id::text) on conflict(order_id,kind) where resend_of is null do nothing;
 end if;
 return p_next_status;
end;
$function$;
revoke all on function public.advance_order_fulfilment(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.advance_order_fulfilment(uuid,text) to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.correct_order_fulfilment(p_order_id uuid, p_expected_updated_at timestamp with time zone, p_previous text, p_target text, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.orders%rowtype; actor uuid:=auth.uid(); stages text[]:=array['pending','in_production','ready_to_dispatch','dispatched']; reason text:=btrim(p_reason);
begin
 if actor is null or not exists(select 1 from public.admin_members where user_id=actor) then raise exception 'Admin membership required' using errcode='42501';end if;
 if reason is null or length(reason) not between 5 and 1000 or reason~'[[:cntrl:]]' then raise exception 'Correction reason must contain 5–1000 characters' using errcode='22023';end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.status is distinct from p_previous or p_expected_updated_at is null or o.updated_at is distinct from p_expected_updated_at then raise exception 'Order changed; refresh before correction' using errcode='40001';end if;
 if o.payment_status not in ('paid','partially_refunded') or o.paid_at is null or o.fulfillment_applied_at is null
  or (o.payment_status='partially_refunded' and not exists(select 1 from public.partial_refund_reviews where order_id=o.id and refunded_pence=o.refunded_pence and refund_at=o.latest_refund_at))
  or array_position(stages,p_previous) is null or array_position(stages,p_target) is null or array_position(stages,p_target)>=array_position(stages,p_previous) then
  raise exception 'Unsupported fulfilment correction' using errcode='22023';end if;
 if exists(select 1 from public.order_email_deliveries where order_id=o.id and state in ('pending','claimed') and (automatic_delivery_eligible or external_requested_by is not null)) then raise exception 'Pending or claimed notification requires review before correction' using errcode='40001';end if;
 -- Do not change dispatch metadata, payment, items, prices, inventory or notification rows.
 update public.orders set status=p_target,updated_at=clock_timestamp(),status_history=status_history||jsonb_build_array(jsonb_build_object(
  'type','fulfilment_correction','from_status',p_previous,'status',p_target,'reason',reason,'actor',actor,'source','admin','at',clock_timestamp())) where id=o.id;
 return true;
end;
$function$;
revoke all on function public.correct_order_fulfilment(uuid,timestamp with time zone,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.correct_order_fulfilment(uuid,timestamp with time zone,text,text,text) to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.delete_unused_component(p_component_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare blockers jsonb; target public.components%rowtype;
begin
 if (select auth.uid()) is null or not exists
  (select 1 from public.admin_members where user_id = (select auth.uid())) then
  raise exception 'Explicit Admin membership required' using errcode = '42501';
 end if;
 select * into target from public.components where id = p_component_id for update;
 if not found then return jsonb_build_object('deleted',false,'reason','Component no longer exists.'); end if;
 -- Prevent concurrent Kit Definition edits while JSON dependencies are checked.
 perform 1 from public.kit_definitions for update;
 select coalesce(jsonb_agg(jsonb_build_object('assembly',a.name,'reason',dep.reason)
  order by a.name,dep.reason),'[]'::jsonb) into blockers
 from (
  select assembly_id,'Assembly BOM' as reason from public.assembly_bom where component_id=p_component_id
  union all select assembly_id,'Permitted Component' from public.kit_permitted_components where component_id=p_component_id
  union all select k.assembly_id,'Default Component' from public.kit_definitions k
   where exists (select 1 from jsonb_each_text(coalesce(k.defaults->'componentIds','{}'::jsonb)) v where v.value=p_component_id)
  union all select k.assembly_id,'Potentiometer resolver' from public.kit_definitions k
   where exists (select 1 from jsonb_array_elements(k.component_resolvers) r,
    lateral jsonb_array_elements(r->'mappings') m where m->>'componentId'=p_component_id)
 ) dep join public.assemblies a on a.id=dep.assembly_id;
 if jsonb_array_length(blockers)>0 then return jsonb_build_object('deleted',false,'dependencies',blockers); end if;
 -- A PostgREST RPC executes within one database transaction. An error in
 -- either statement rolls back both, and component_internal cascades.
 delete from public.inventory where component_id=p_component_id;
 delete from public.components where id=p_component_id;
 if not found then raise exception 'Component changed while deleting; no data was removed'; end if;
 return jsonb_build_object('deleted',true,'componentId',p_component_id);
end;
$function$;
revoke all on function public.delete_unused_component(text) from public,anon,authenticated,service_role;
grant execute on function public.delete_unused_component(text) to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.edit_external_order(p_order_id uuid, p_expected_updated_at timestamp with time zone, p_change jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;
revoke all on function public.edit_external_order(uuid,timestamp with time zone,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.edit_external_order(uuid,timestamp with time zone,jsonb) to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.record_order_dispatch_details(p_order_id uuid, p_carrier text DEFAULT NULL::text, p_tracking_reference text DEFAULT NULL::text, p_tracking_url text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.orders%rowtype; actor uuid:=auth.uid(); carrier text:=nullif(btrim(p_carrier),''); tracking text:=nullif(btrim(p_tracking_reference),''); url text:=nullif(btrim(p_tracking_url),'');
begin
 if actor is null or not exists(select 1 from public.admin_members where user_id=actor) then
  raise exception 'Admin membership required' using errcode='42501';
 end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.payment_status not in ('paid','partially_refunded') or o.status not in ('ready_to_dispatch','dispatched') then
  raise exception 'Dispatch details require an eligible Order' using errcode='22023';
 end if;
 if (carrier is not null and (length(carrier)>100 or carrier~'[\r\n]'))
    or (tracking is not null and (length(tracking)>150 or tracking~'[\r\n]'))
    or (url is not null and (length(url)>500 or url !~* '^https://[^[:space:]@/]+(/[^[:space:]]*)?$')) then
  raise exception 'Invalid dispatch detail' using errcode='22023';
 end if;
 update public.orders set dispatch_details=jsonb_strip_nulls(jsonb_build_object('carrier',carrier,'tracking_reference',tracking,'tracking_url',url)),updated_at=now(),
  status_history=status_history||jsonb_build_array(jsonb_build_object('type','dispatch_details','at',now(),'source','admin','actor',actor))
 where id=p_order_id;
 return true;
end;
$function$;
revoke all on function public.record_order_dispatch_details(uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.record_order_dispatch_details(uuid,text,text,text) to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.record_verified_stripe_refund(p_event_id text, p_event_type text, p_refund_id text, p_payment_intent_id text, p_amount bigint, p_currency text, p_status text, p_created_at timestamp with time zone, p_observed_at timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.orders%rowtype; existing public.stripe_refunds%rowtype; refunded bigint;
begin
 if p_event_id !~ '^evt_[A-Za-z0-9]{8,}$'
  or p_event_type not in ('refund.created','refund.updated','refund.failed')
  or p_refund_id !~ '^re_[A-Za-z0-9]{8,}$'
  or p_payment_intent_id !~ '^pi_[A-Za-z0-9]{8,}$'
  or p_amount is null or p_amount<1 or p_currency<>'gbp'
  or p_status not in ('pending','requires_action','succeeded','failed','canceled')
  or p_created_at is null or p_observed_at is null then
  raise exception 'Invalid verified refund' using errcode='22023';
 end if;
 select * into o from public.orders where stripe_payment_intent_id=p_payment_intent_id for update;
 if not found or o.payment_status not in ('paid','partially_refunded','refunded')
  or o.paid_at is null or o.fulfillment_applied_at is null or o.currency<>'GBP'
  or p_amount>o.total_pence then
  raise exception 'Refund does not match a paid Order' using errcode='22023';
 end if;
 select * into existing from public.stripe_refunds where refund_id=p_refund_id for update;
 if found and (existing.order_id<>o.id or existing.payment_intent_id<>p_payment_intent_id
  or existing.amount_pence<>p_amount or existing.refund_created_at<>p_created_at) then
  raise exception 'Refund identity differs from previously recorded Stripe data' using errcode='22023';
 end if;
 if not found then
  insert into public.stripe_refunds(refund_id,order_id,payment_intent_id,amount_pence,status,refund_created_at,observed_at,last_event_id)
   values(p_refund_id,o.id,p_payment_intent_id,p_amount,p_status,p_created_at,p_observed_at,p_event_id);
 elsif p_observed_at>existing.observed_at then
  update public.stripe_refunds set status=p_status,observed_at=p_observed_at,last_event_id=p_event_id
   where refund_id=p_refund_id;
 end if;
 insert into public.stripe_refund_events(event_id,refund_id,order_id,event_type)
  values(p_event_id,p_refund_id,o.id,p_event_type) on conflict(event_id) do nothing;
 if not exists(select 1 from public.stripe_refund_events where event_id=p_event_id
  and refund_id=p_refund_id and order_id=o.id and event_type=p_event_type) then
  raise exception 'Stripe event belongs to another refund' using errcode='22023';
 end if;
 select coalesce(sum(amount_pence),0) into refunded from public.stripe_refunds
  where order_id=o.id and status='succeeded';
 if refunded>o.total_pence then
  raise exception 'Refunds exceed the original payment' using errcode='22023';
 end if;
 update public.orders set refunded_pence=refunded,
  payment_status=case when refunded=0 then 'paid'
   when refunded=o.total_pence then 'refunded' else 'partially_refunded' end,
  latest_refund_at=(select max(refund_created_at) from public.stripe_refunds
   where order_id=o.id and status='succeeded'),
  updated_at=now()
 where id=o.id;
 if refunded=o.total_pence and o.payment_status<>'refunded' then  insert into public.order_email_deliveries(order_id,kind,source_event_id)  values(o.id,'full_refund',p_event_id) on conflict(order_id,kind) where resend_of is null do nothing;  end if; return case when refunded=0 then 'paid'
  when refunded=o.total_pence then 'refunded' else 'partially_refunded' end;
end;
$function$;
revoke all on function public.record_verified_stripe_refund(text,text,text,text,bigint,text,text,timestamp with time zone,timestamp with time zone) from public,anon,authenticated,service_role;
grant execute on function public.record_verified_stripe_refund(text,text,text,text,bigint,text,text,timestamp with time zone,timestamp with time zone) to service_role;


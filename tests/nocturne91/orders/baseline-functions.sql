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
$function$
;
CREATE OR REPLACE FUNCTION public.external_dispatch_recipient_allowed(p_email text, p_channel text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select coalesce(length(p_email)<=254
  and p_email ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+[.][^[:space:]@<>]+$'
  and case when lower(split_part(p_email,'@',2))='members.ebay.com' then p_channel='EBAY'
   else lower(split_part(p_email,'@',2)) !~ '(members[.-]ebay|(^|[.])ebay[.])' end,false)
$function$
;
CREATE OR REPLACE FUNCTION public.request_external_dispatch(p_order_id uuid, p_dispatch boolean, p_send boolean, p_expected_email text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.orders%rowtype; actor uuid:=auth.uid(); delivery_id uuid; email text;
begin
 if actor is null or not exists(select 1 from public.admin_members where user_id=actor) then
  raise exception 'Admin membership required' using errcode='42501'; end if;
 if p_dispatch is null or p_send is null then raise exception 'Explicit dispatch choice required' using errcode='22023';end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.sales_channel='WEBSITE' then raise exception 'External Order required' using errcode='22023';end if;
 email:=lower(btrim(coalesce(o.customer->>'email','')));
 if p_send and (not public.external_dispatch_recipient_allowed(email,o.sales_channel)
  or email is distinct from lower(btrim(p_expected_email))) then
  raise exception 'Recipient must match this Order; only exact members.ebay.com relay addresses on EBAY orders are supported' using errcode='22023';end if;
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
 values(o.id,'dispatched','external-dispatch:'||o.id,actor,email,to_jsonb(o)) on conflict(order_id,kind) where resend_of is null do nothing;
 select id into delivery_id from public.order_email_deliveries where order_id=o.id and kind='dispatched' and resend_of is null;
 return delivery_id;
end;
$function$
;

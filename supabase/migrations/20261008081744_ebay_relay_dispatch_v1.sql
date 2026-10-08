-- Targeted relay eligibility; no existing order, stock or notification-row mutations.
create function public.external_dispatch_recipient_allowed(p_email text,p_channel text)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(length(p_email)<=254
  and p_email ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+[.][^[:space:]@<>]+$'
  and case when lower(split_part(p_email,'@',2))='members.ebay.com' then p_channel='EBAY'
   else lower(split_part(p_email,'@',2)) !~ '(members[.-]ebay|(^|[.])ebay[.])' end,false)
$$;
revoke all on function public.external_dispatch_recipient_allowed(text,text) from public,anon,authenticated;
grant execute on function public.external_dispatch_recipient_allowed(text,text) to authenticated,service_role;

create or replace function public.request_external_dispatch(p_order_id uuid,p_dispatch boolean,p_send boolean,p_expected_email text)
returns uuid language plpgsql security definer set search_path='' as $$
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
 values(o.id,'dispatched','external-dispatch:'||o.id,actor,email,to_jsonb(o)) on conflict(order_id,kind) do nothing;
 select id into delivery_id from public.order_email_deliveries where order_id=o.id and kind='dispatched';
 return delivery_id;
end;
$$;
revoke all on function public.request_external_dispatch(uuid,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.request_external_dispatch(uuid,boolean,boolean,text) to authenticated;


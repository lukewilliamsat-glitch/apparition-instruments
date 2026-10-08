-- Read-only preparation and one atomic confirmation on the existing ledger.
-- No new tables, business-row backfills, activation flags or inventory/payment changes.
create function public.dispatch_preview_state(p_order_id uuid,p_resend boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; latest public.order_email_deliveries%rowtype; deliveries jsonb; email text;
begin
 if p_resend is null then raise exception 'Explicit notification mode required' using errcode='22023';end if;
 select * into o from public.orders where id=p_order_id;
 if not found then raise exception 'Order unavailable' using errcode='22023';end if;
 email:=lower(btrim(coalesce(o.customer->>'email','')));
 if o.payment_status not in ('paid','partially_refunded') or o.paid_at is null or o.fulfillment_applied_at is null
  or (o.payment_status='partially_refunded' and not exists(select 1 from public.partial_refund_reviews where order_id=o.id and refunded_pence=o.refunded_pence and refund_at=o.latest_refund_at))
  or not public.external_dispatch_recipient_allowed(email,o.sales_channel)
  or (p_resend and o.status<>'dispatched') or (not p_resend and o.status not in ('dispatched','completed')) then
  raise exception 'Eligible dispatched order and saved recipient required' using errcode='22023';end if;
 select * into latest from public.order_email_deliveries where order_id=o.id and kind='dispatched' order by created_at desc,id desc limit 1;
 if p_resend then
  if latest.id is null or latest.state<>'sent' then raise exception 'Current successful dispatch required' using errcode='40001';end if;
 else
  if latest.id is not null and (latest.state<>'pending' or latest.resend_of is not null or latest.automatic_delivery_eligible) then raise exception 'First send unavailable' using errcode='40001';end if;
  -- A native first send must have its real dispatch transition record; never invent one.
  if o.sales_channel='WEBSITE' and latest.id is null then raise exception 'Native dispatch record required' using errcode='40001';end if;
 end if;
 select coalesce(jsonb_agg(to_jsonb(d) order by d.created_at,d.id),'[]'::jsonb) into deliveries from public.order_email_deliveries d where order_id=o.id and kind='dispatched';
 return jsonb_build_object('order',to_jsonb(o),'deliveries',deliveries,'resend',p_resend,'recipientPolicy','exact-ebay-relay-v1');
end;
$$;
revoke all on function public.dispatch_preview_state(uuid,boolean) from public,anon,authenticated;
grant execute on function public.dispatch_preview_state(uuid,boolean) to service_role;

create function public.get_dispatch_preview_context(p_order_id uuid,p_resend boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin membership required' using errcode='42501';end if;
 return public.dispatch_preview_state(p_order_id,p_resend);
end;
$$;
revoke all on function public.get_dispatch_preview_context(uuid,boolean) from public,anon,authenticated;
grant execute on function public.get_dispatch_preview_context(uuid,boolean) to authenticated;

-- Only the Edge service can call this after signature, expiry, actor, renderer and content checks.
-- Lock the order and its dispatch ledger before comparing the full authoritative snapshot.
create function public.confirm_dispatch_preview(p_order_id uuid,p_actor uuid,p_resend boolean,p_context jsonb,p_operation_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_context jsonb; o public.orders%rowtype; d public.order_email_deliveries%rowtype; latest public.order_email_deliveries%rowtype; claim uuid:=gen_random_uuid(); email text; reason text:=btrim(p_reason);
begin
 if p_actor is null or not exists(select 1 from public.admin_members where user_id=p_actor) then raise exception 'Admin membership required' using errcode='42501';end if;
 if p_operation_id is null or p_resend is null or p_context is null then raise exception 'Prepared identity required' using errcode='22023';end if;
 if p_resend and (reason is null or length(reason) not between 5 and 1000 or reason~'[[:cntrl:]]') then raise exception 'Resend reason required' using errcode='22023';end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found then raise exception 'Order unavailable' using errcode='22023';end if;
 perform id from public.order_email_deliveries where order_id=o.id and kind='dispatched' order by id for update;
 current_context:=public.dispatch_preview_state(o.id,p_resend);
 if current_context is distinct from p_context then raise exception 'Preview out of date' using errcode='40001';end if;
 if exists(select 1 from public.order_email_deliveries where operation_id=p_operation_id) then raise exception 'Preview already confirmed' using errcode='40001';end if;
 email:=lower(btrim(o.customer->>'email'));
 if p_resend then
  select * into latest from public.order_email_deliveries where order_id=o.id and kind='dispatched' order by created_at desc,id desc limit 1;
  insert into public.order_email_deliveries(order_id,kind,source_event_id,external_requested_by,recipient_email,order_snapshot,resend_of,operation_id,resend_reason)
  values(o.id,'dispatched','resend:'||p_operation_id,p_actor,email,to_jsonb(o),latest.id,p_operation_id,reason) returning * into d;
 else
  select * into d from public.order_email_deliveries where order_id=o.id and kind='dispatched' and resend_of is null;
  if d.id is null then
   insert into public.order_email_deliveries(order_id,kind,source_event_id,external_requested_by,recipient_email,order_snapshot,operation_id)
   values(o.id,'dispatched','external-dispatch:'||o.id,p_actor,email,to_jsonb(o),p_operation_id) returning * into d;
  else
   -- Freeze the current reviewed data, rather than sending a historic pending snapshot.
   update public.order_email_deliveries set external_requested_by=p_actor,recipient_email=email,order_snapshot=to_jsonb(o),operation_id=p_operation_id where id=d.id;
  end if;
 end if;
 update public.order_email_deliveries set state='claimed',claim_id=claim,claimed_at=clock_timestamp() where id=d.id and state='pending';
 if not found then raise exception 'Notification already claimed' using errcode='40001';end if;
 return jsonb_build_object('claim',claim,'deliveryId',d.id,'orderId',o.id);
end;
$$;
revoke all on function public.confirm_dispatch_preview(uuid,uuid,boolean,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.confirm_dispatch_preview(uuid,uuid,boolean,jsonb,uuid,text) to service_role;

-- Manual support reminders only. No order/customer/payment/stock backfill or scheduler.
create table public.order_aftercare (
 order_id uuid primary key references public.orders(id),
 dispatch_at timestamptz not null,
 due_date date not null,
 state text not null default 'pending' check(state in ('pending','claimed','sent','failed','unknown','handled','skipped')),
 history jsonb not null default '[]'::jsonb check(jsonb_typeof(history)='array'),
 updated_at timestamptz not null default clock_timestamp()
);
create table public.aftercare_email_suppressions (
 email text primary key check(email=lower(btrim(email)) and length(email) between 3 and 254),
 actor uuid not null references auth.users(id),
 reason text not null check(length(btrim(reason)) between 5 and 1000),
 created_at timestamptz not null default clock_timestamp()
);
alter table public.order_aftercare enable row level security;
alter table public.aftercare_email_suppressions enable row level security;
revoke all on public.order_aftercare,public.aftercare_email_suppressions from anon,authenticated;
grant select on public.order_aftercare,public.aftercare_email_suppressions to authenticated;
create policy aftercare_admin_read on public.order_aftercare for select to authenticated using(exists(select 1 from public.admin_members where user_id=(select auth.uid())));
create policy aftercare_suppression_admin_read on public.aftercare_email_suppressions for select to authenticated using(exists(select 1 from public.admin_members where user_id=(select auth.uid())));
grant all on public.order_aftercare,public.aftercare_email_suppressions to service_role;
-- Extend the existing notification audit; automatic eligibility's explicit kind allowlist excludes aftercare.
alter table public.order_email_deliveries drop constraint order_email_deliveries_kind_check;
alter table public.order_email_deliveries add constraint order_email_deliveries_kind_check check(kind in ('order_confirmed','in_production','ready_to_dispatch','dispatched','full_refund','aftercare'));
alter table public.order_email_deliveries drop constraint external_dispatch_snapshot;
alter table public.order_email_deliveries add constraint external_dispatch_snapshot check(external_requested_by is null or(kind in ('dispatched','aftercare') and recipient_email is not null and order_snapshot is not null));

create function public.aftercare_dispatch_at(p_history jsonb)
returns timestamptz language plpgsql immutable set search_path='' as $$
declare e jsonb; candidate timestamptz; result timestamptz;
begin
 for e in select value from jsonb_array_elements(p_history) loop
  if e->>'status'='dispatched' and e->>'event_id' is not null and coalesce(e->>'type','')<>'fulfilment_correction' then
   begin
    if e->>'at' ~ '^\d{4}-\d{2}-\d{2}[T ][0-9:.]+(Z|[+-]\d{2}:\d{2})$' then
     candidate:=(e->>'at')::timestamptz;
     if isfinite(candidate) and (result is null or candidate>result) then result:=candidate;end if;
    end if;
   exception when invalid_datetime_format or datetime_field_overflow then null;
   end;
  end if;
 end loop;
 return result;
end;
$$;
revoke all on function public.aftercare_dispatch_at(jsonb) from public,anon,authenticated;
grant execute on function public.aftercare_dispatch_at(jsonb) to service_role;

create function public.aftercare_state(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; a public.order_aftercare%rowtype; dispatch_at timestamptz; due date; eligible boolean; blocked text; saved_email text; suppressed boolean; route text; ledger jsonb;
begin
 select * into o from public.orders where id=p_order_id;
 if not found then raise exception 'Order unavailable' using errcode='22023';end if;
 select * into a from public.order_aftercare where order_id=o.id;
 dispatch_at:=public.aftercare_dispatch_at(o.status_history);
 due:=coalesce(a.due_date,(dispatch_at at time zone 'Europe/London')::date+7);
 eligible:=o.status in ('dispatched','completed') and dispatch_at is not null and dispatch_at<=clock_timestamp()
  and o.payment_status in ('paid','partially_refunded') and o.paid_at is not null and o.fulfillment_applied_at is not null
  and (o.payment_status<>'partially_refunded' or exists(select 1 from public.partial_refund_reviews where order_id=o.id and refunded_pence=o.refunded_pence and refund_at=o.latest_refund_at));
 if not coalesce(eligible,false) then blocked:='A paid, dispatched order with a valid recorded dispatch date and current refund review is required.';end if;
 if a.order_id is not null and a.dispatch_at is distinct from dispatch_at then eligible:=false;blocked:='Dispatch history changed. Review the existing aftercare record; a second follow-up is not created.';end if;
 saved_email:=lower(btrim(coalesce(o.customer->>'email','')));
 suppressed:=exists(select 1 from public.aftercare_email_suppressions where aftercare_email_suppressions.email=saved_email)
  or coalesce(o.customer->>'aftercare_opt_out','false')='true' or coalesce(o.customer->>'do_not_contact','false')='true';
 route:=case when o.sales_channel in ('WEBSITE','DIRECT') and public.external_dispatch_recipient_allowed(saved_email,o.sales_channel) and not suppressed then 'email' else 'manual' end;
 if suppressed then blocked:='Aftercare email suppressed: respect the customer contact preference.';
 elsif route='manual' then blocked:=case when o.sales_channel='EBAY' then 'Copy an order-related support draft and send manually through the eBay order conversation. Aftercare relay sending is disabled.' else 'No verified direct email route. Handle through the existing order communication channel.' end;end if;
 select coalesce(jsonb_agg(to_jsonb(d) order by created_at,id),'[]'::jsonb) into ledger from public.order_email_deliveries d where order_id=o.id and kind='aftercare';
 -- eBay/other drafts expose no underlying buyer email or delivery address.
 if o.sales_channel not in ('WEBSITE','DIRECT') then o.customer:=o.customer-'email';o.delivery:='{}'::jsonb;end if;
 return jsonb_build_object('order',to_jsonb(o),'followup',case when a.order_id is null then null else to_jsonb(a) end,'dispatchAt',dispatch_at,'defaultDue',(dispatch_at at time zone 'Europe/London')::date+7,'dueDate',due,'eligible',coalesce(eligible,false),'route',route,'suppressed',suppressed,'policy','order-support-v1/manual-ebay-v1','notice',blocked,'deliveries',ledger);
end;
$$;
revoke all on function public.aftercare_state(uuid) from public,anon,authenticated;
grant execute on function public.aftercare_state(uuid) to service_role;

create function public.aftercare_summary(p_context jsonb)
returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('orderId',p_context#>>'{order,id}','reference',p_context#>>'{order,reference}','customerName',p_context#>>'{order,customer,name}','recipient',case when p_context#>>'{order,sales_channel}' in ('WEBSITE','DIRECT') then lower(btrim(p_context#>>'{order,customer,email}')) else null end,'channel',p_context#>>'{order,sales_channel}','dispatchAt',p_context->'dispatchAt','defaultDue',p_context->'defaultDue','dueDate',p_context->'dueDate','state',case when coalesce(p_context#>>'{followup,state}','pending')='pending' then case when not (p_context->>'eligible')::boolean then 'blocked' when (p_context->>'dueDate')::date<=(clock_timestamp() at time zone 'Europe/London')::date then 'due' else 'upcoming' end else p_context#>>'{followup,state}' end,'eligible',p_context->'eligible','route',p_context->'route','suppressed',p_context->'suppressed','notice',p_context->'notice','shippingService',p_context#>>'{order,dispatch_details,carrier}','tracking',case when coalesce(p_context#>>'{order,dispatch_details,tracking_reference}','') not in ('','N/A','n/a') then 'Tracking reference recorded' when coalesce(p_context#>>'{order,dispatch_details,carrier}','') ~* '(untracked|1st class|2nd class)' and coalesce(p_context#>>'{order,dispatch_details,carrier}','') !~* '(signed|tracked)' then 'Untracked service' else 'Tracking not recorded' end,'history',coalesce(p_context#>'{followup,history}','[]'::jsonb),'updatedAt',p_context#>'{followup,updated_at}');
$$;
revoke all on function public.aftercare_summary(jsonb) from public,anon,authenticated;
grant execute on function public.aftercare_summary(jsonb) to service_role;

create function public.get_customer_aftercare()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin membership required' using errcode='42501';end if;
 select coalesce(jsonb_agg(public.aftercare_summary(public.aftercare_state(o.id))),'[]'::jsonb) into result from public.orders o where o.status in ('dispatched','completed') or exists(select 1 from public.order_aftercare where order_id=o.id);
 return result;
end;
$$;
revoke all on function public.get_customer_aftercare() from public,anon,authenticated;
grant execute on function public.get_customer_aftercare() to authenticated;

create function public.get_aftercare_preview_context(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin membership required' using errcode='42501';end if;
 c:=public.aftercare_state(p_order_id);
 if not (c->>'eligible')::boolean or coalesce(c#>>'{followup,state}','pending')<>'pending' or jsonb_array_length(c->'deliveries')<>0 or (c->>'dueDate')::date>(clock_timestamp() at time zone 'Europe/London')::date or (c->>'suppressed')::boolean then raise exception 'Aftercare unavailable. Review due date, eligibility and contact preferences.' using errcode='22023';end if;
 return c;
end;
$$;
revoke all on function public.get_aftercare_preview_context(uuid) from public,anon,authenticated;
grant execute on function public.get_aftercare_preview_context(uuid) to authenticated;

create function public.update_customer_aftercare(p_order_id uuid,p_expected jsonb,p_action text,p_due_date date,p_reason text)
returns boolean language plpgsql security definer set search_path='' as $$
declare c jsonb; actor uuid:=auth.uid(); a public.order_aftercare%rowtype; reason text:=btrim(p_reason); event jsonb; saved_email text;
begin
 if actor is null or not exists(select 1 from public.admin_members where user_id=actor) then raise exception 'Admin membership required' using errcode='42501';end if;
 if p_action is null or p_action not in ('reschedule','handled','skip','suppress') or reason is null or length(reason) not between 5 and 1000 or reason~'[[:cntrl:]]' then raise exception 'Action and a 5–1000 character reason required' using errcode='22023';end if;
 perform id from public.orders where id=p_order_id for update;
 c:=public.aftercare_state(p_order_id);
 if p_expected is null or public.aftercare_summary(c) is distinct from p_expected then raise exception 'Aftercare changed; refresh before acting' using errcode='40001';end if;
 if c->>'dispatchAt' is null or not (c->>'eligible')::boolean then raise exception 'Valid dispatched order required' using errcode='22023';end if;
 if coalesce(c#>>'{followup,state}','pending') not in ('pending','failed','unknown') or (p_action='reschedule' and jsonb_array_length(c->'deliveries')>0) or exists(select 1 from public.order_email_deliveries where order_id=p_order_id and kind='aftercare' and state='claimed') then raise exception 'Aftercare outcome requires review; no repeat send is available' using errcode='40001';end if;
 if p_action='reschedule' and (p_due_date is null or p_due_date<((c->>'dispatchAt')::timestamptz at time zone 'Europe/London')::date or p_due_date>'2100-12-31'::date) then raise exception 'Valid follow-up date required' using errcode='22023';end if;
 insert into public.order_aftercare(order_id,dispatch_at,due_date) values(p_order_id,(c->>'dispatchAt')::timestamptz,(c->>'dueDate')::date) on conflict(order_id) do nothing;
 select * into a from public.order_aftercare where order_id=p_order_id for update;
 event:=jsonb_build_object('action',p_action,'actor',actor,'at',clock_timestamp(),'reason',reason,'channel',c#>>'{order,sales_channel}','fromDue',a.due_date,'toDue',case when p_action='reschedule' then p_due_date else a.due_date end,'manualConfirmation',p_action='handled');
 if p_action='suppress' then
  if c#>>'{order,sales_channel}' not in ('WEBSITE','DIRECT') then raise exception 'Direct customer contact preference required' using errcode='22023';end if;
  saved_email:=lower(btrim(c#>>'{order,customer,email}'));
  if not public.external_dispatch_recipient_allowed(saved_email,c#>>'{order,sales_channel}') then raise exception 'Verified saved direct recipient required' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended('aftercare-email:'||saved_email,0));
  insert into public.aftercare_email_suppressions(email,actor,reason) values(saved_email,actor,reason) on conflict(email) do nothing;
 end if;
 update public.order_aftercare set due_date=case when p_action='reschedule' then p_due_date else due_date end,state=case when p_action='handled' then 'handled' when p_action in ('skip','suppress') then 'skipped' else state end,history=history||jsonb_build_array(event),updated_at=clock_timestamp() where order_id=p_order_id;
 return true;
end;
$$;
revoke all on function public.update_customer_aftercare(uuid,jsonb,text,date,text) from public,anon,authenticated;
grant execute on function public.update_customer_aftercare(uuid,jsonb,text,date,text) to authenticated;

create function public.confirm_aftercare_preview(p_order_id uuid,p_actor uuid,p_context jsonb,p_operation_id uuid,p_template text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c jsonb; claim uuid:=gen_random_uuid(); d uuid; saved_email text;
begin
 if p_actor is null or not exists(select 1 from public.admin_members where user_id=p_actor) then raise exception 'Admin membership required' using errcode='42501';end if;
 if p_operation_id is null or p_template is distinct from 'aftercare-support-v1/prepared-v1' then raise exception 'Prepared aftercare identity required' using errcode='22023';end if;
 perform id from public.orders where id=p_order_id for update;
 select lower(btrim(customer->>'email')) into saved_email from public.orders where id=p_order_id;
 perform pg_advisory_xact_lock(hashtextextended('aftercare-email:'||coalesce(saved_email,''),0));
 c:=public.aftercare_state(p_order_id);
 if p_context is null or c is distinct from p_context or not (c->>'eligible')::boolean or c->>'route'<>'email' or coalesce(c#>>'{followup,state}','pending')<>'pending' or jsonb_array_length(c->'deliveries')<>0 or (c->>'dueDate')::date>(clock_timestamp() at time zone 'Europe/London')::date then raise exception 'Preview out of date or email route unavailable' using errcode='40001';end if;
 insert into public.order_aftercare(order_id,dispatch_at,due_date,state) values(p_order_id,(c->>'dispatchAt')::timestamptz,(c->>'dueDate')::date,'claimed') on conflict(order_id) do update set state='claimed',updated_at=clock_timestamp();
 insert into public.order_email_deliveries(order_id,kind,source_event_id,external_requested_by,recipient_email,order_snapshot,operation_id,state,claim_id,claimed_at)
 values(p_order_id,'aftercare',p_template||':'||p_operation_id,p_actor,saved_email,c->'order',p_operation_id,'claimed',claim,clock_timestamp()) returning id into d;
 return jsonb_build_object('claim',claim,'deliveryId',d,'orderId',p_order_id);
end;
$$;
revoke all on function public.confirm_aftercare_preview(uuid,uuid,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.confirm_aftercare_preview(uuid,uuid,jsonb,uuid,text) to service_role;

create function public.finish_aftercare_delivery(p_order_id uuid,p_claim uuid,p_state text,p_reason text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.finish_order_email_delivery(p_order_id,'aftercare',p_claim,p_state,p_reason) then return false;end if;
 update public.order_aftercare set state=p_state,updated_at=clock_timestamp() where order_id=p_order_id and state='claimed';
 if not found then raise exception 'Aftercare outcome requires review' using errcode='40001';end if;
 return true;
end;
$$;
revoke all on function public.finish_aftercare_delivery(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.finish_aftercare_delivery(uuid,uuid,text,text) to service_role;

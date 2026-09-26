-- P08B.4 optional dispatch metadata. No mail trigger, email schedule, or historic eligibility.
alter table public.orders add column dispatch_details jsonb not null default '{}'::jsonb
 check (jsonb_typeof(dispatch_details)='object');

create function public.record_order_dispatch_details(p_order_id uuid,p_carrier text default null,p_tracking_reference text default null,p_tracking_url text default null)
returns boolean language plpgsql security definer set search_path='' as $$
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
$$;
revoke all on function public.record_order_dispatch_details(uuid,text,text,text) from public,anon;
grant execute on function public.record_order_dispatch_details(uuid,text,text,text) to authenticated;

-- Off on creation. SMTP requires a separately approved release and transport mode.
create schema overseer_aftercare;
revoke all on schema overseer_aftercare from public,anon,authenticated,service_role;
create table overseer_aftercare.control (id boolean primary key default true check(id), mode text not null default 'off' check(mode in ('off','sink','smtp')));
insert into overseer_aftercare.control default values;
create table overseer_aftercare.messages (
 id uuid primary key, order_id uuid not null references public.orders(id), actor uuid not null,
 mode text not null check(mode in ('sink','smtp')), recipient text not null, subject text not null, body_hash text not null,
 state text not null default 'claimed' check(state in ('claimed','sink_recorded','submitted','failed','unknown')),
 created_at timestamptz not null default clock_timestamp(), finished_at timestamptz,
 unique(order_id,mode)
);
alter table overseer_aftercare.control enable row level security;
alter table overseer_aftercare.messages enable row level security;
revoke all on all tables in schema overseer_aftercare from public,anon,authenticated,service_role;

create function overseer_aftercare.context(p_order uuid,p_actor uuid,p_mode text)
returns jsonb language plpgsql set search_path='' as $$
declare c jsonb; o public.orders%rowtype; recipient text; m text;
begin
 if p_actor is null or not exists(select from public.admin_members where user_id=p_actor) then
  raise exception 'Admin membership required' using errcode='42501';
 end if;
 select mode into m from overseer_aftercare.control where id for share;
 if p_mode not in ('sink','smtp') or p_mode is distinct from m or
   (m='sink' and not exists(select from public.components where id='fixture-staging-cap' and sku='STAGING-CAP')) then
  raise exception 'Direct transport is disabled' using errcode='42501';
 end if;
 select * into o from public.orders where id=p_order;
 if not found or o.sales_channel<>'EBAY' or nullif(btrim(o.external_reference),'') is null then
  raise exception 'Only saved eBay orders are eligible' using errcode='22023';
 end if;
 c:=public.aftercare_state(p_order);
 if not coalesce((c->>'eligible')::boolean,false) or coalesce((c->>'suppressed')::boolean,true)
  or coalesce(c#>>'{followup,state}','pending')<>'pending'
  or coalesce(jsonb_array_length(c->'deliveries'),1)>0
  or (c->>'dueDate')::date is null or (c->>'dueDate')::date>(statement_timestamp() at time zone 'Europe/London')::date then
  raise exception 'Order follow-up is unavailable or already handled' using errcode='22023';
 end if;
 recipient:=lower(btrim(coalesce(o.customer->>'email','')));
 if length(recipient)>254 or
 ((m='smtp' and recipient !~ '^[a-z0-9._%+-]+@members[.]ebay[.]com$') or
 (m='sink' and recipient !~ '^[a-z0-9._%+-]+@example[.]invalid$')) then
  raise exception 'Saved eBay recipient is not verified for this route' using errcode='22023';
 end if;
 return jsonb_build_object('orderId',o.id,'reference',o.reference,'recipient',recipient,'firstName',left(split_part(btrim(coalesce(o.customer->>'name','')), ' ',1),60),
   'updatedAt',o.updated_at,'followupAt',c#>'{followup,updated_at}');
end $$;

create function public.overseer_aftercare_context(p_order uuid,p_actor uuid,p_mode text)
returns jsonb language sql security definer set search_path='' as $$
 select overseer_aftercare.context(p_order,p_actor,p_mode);
$$;

create function public.overseer_aftercare_claim(p_order uuid,p_actor uuid,p_mode text,p_id uuid,p_context jsonb,p_subject text,p_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
declare c jsonb; base jsonb;
begin
 if p_id is null or coalesce(length(p_subject),0) not between 1 and 160 or p_subject~'[[:cntrl:]]'
   or coalesce(p_hash,'') !~ '^[a-f0-9]{64}$' then
   raise exception 'Incomplete message confirmation' using errcode='22023';
 end if;
 perform id from public.orders where id=p_order for update;
 c:=overseer_aftercare.context(p_order,p_actor,p_mode);
 perform pg_advisory_xact_lock(hashtextextended('aftercare-email:'||(c->>'recipient'),0));
 c:=overseer_aftercare.context(p_order,p_actor,p_mode);
 if c is distinct from p_context then raise exception 'Saved order details changed' using errcode='40001'; end if;
 insert into overseer_aftercare.messages(id,order_id,actor,mode,recipient,subject,body_hash)
 values(p_id,p_order,p_actor,p_mode,c->>'recipient',p_subject,p_hash)
 on conflict do nothing;
 if not found then return false;end if;
 if p_mode='smtp' then
  base:=public.aftercare_state(p_order);
  insert into public.order_aftercare(order_id,dispatch_at,due_date,state)
  values(p_order,(base->>'dispatchAt')::timestamptz,(base->>'dueDate')::date,'claimed')
  on conflict(order_id) do update set state='claimed',updated_at=clock_timestamp();
 end if;
 return true;
end $$;

create function public.overseer_aftercare_finish(p_order uuid,p_id uuid,p_mode text,p_state text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_mode='sink' and p_state='sink_recorded' or p_mode='smtp' and p_state in ('submitted','failed','unknown') then
  update overseer_aftercare.messages set state=p_state,finished_at=clock_timestamp()
   where id=p_id and order_id=p_order and mode=p_mode and state='claimed';
  if not found then return false;end if;
  if p_mode='smtp' then
   update public.order_aftercare set state=case when p_state='submitted' then 'sent' else p_state end,updated_at=clock_timestamp()
    where order_id=p_order and state='claimed';
   if not found then raise exception 'Aftercare requires manual review' using errcode='40001';end if;
  end if;
  return true;
 end if;
 return false;
end $$;
create function public.overseer_aftercare_history(p_order uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select from public.admin_members where user_id=auth.uid()) then
  raise exception 'Admin membership required' using errcode='42501';
 end if;
 return (select coalesce(jsonb_agg(to_jsonb(m) order by created_at desc),'[]')
 from (select mode,state,subject,created_at,finished_at from overseer_aftercare.messages
       where order_id=p_order order by created_at desc limit 10) m);
end $$;
revoke all on all functions in schema overseer_aftercare from public,anon,authenticated,service_role;
revoke all on function public.overseer_aftercare_context(uuid,uuid,text),public.overseer_aftercare_claim(uuid,uuid,text,uuid,jsonb,text,text),
 public.overseer_aftercare_finish(uuid,uuid,text,text),public.overseer_aftercare_history(uuid) from public,anon,authenticated,service_role;
grant execute on function public.overseer_aftercare_context(uuid,uuid,text),public.overseer_aftercare_claim(uuid,uuid,text,uuid,jsonb,text,text),
 public.overseer_aftercare_finish(uuid,uuid,text,text) to service_role;
grant execute on function public.overseer_aftercare_history(uuid) to authenticated;

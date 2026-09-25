-- Existing pending + paid orders display as Awaiting Fulfilment. Unpaid
-- pending rows remain checkout attempts. Payment and stock are untouched.
alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check check
 (status in ('pending','in_production','ready_to_dispatch','dispatched','completed','cancelled'));
alter table public.orders add column status_history jsonb not null default '[]'::jsonb
 check (jsonb_typeof(status_history)='array');

create function public.advance_order_fulfilment(p_order_id uuid,p_next_status text)
returns text language plpgsql security definer set search_path = '' as $$
declare order_row public.orders%rowtype; actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.admin_members where user_id=actor) then
  raise exception 'Admin membership required' using errcode='42501';
 end if;
 select * into order_row from public.orders where id=p_order_id for update;
 if not found or order_row.payment_status<>'paid' or order_row.paid_at is null
  or order_row.fulfillment_applied_at is null then
  raise exception 'Only verified paid Orders can enter fulfilment' using errcode='22023';
 end if;
 if not ((order_row.status='pending' and p_next_status='in_production')
  or (order_row.status='in_production' and p_next_status='ready_to_dispatch')
  or (order_row.status='ready_to_dispatch' and p_next_status='dispatched')
  or (order_row.status='dispatched' and p_next_status='completed')) then
  raise exception 'Invalid fulfilment transition' using errcode='22023';
 end if;
 update public.orders set status=p_next_status,updated_at=now(),
  status_history=status_history||jsonb_build_array(jsonb_build_object(
   'status',p_next_status,'at',now(),'source','admin','actor',actor))
  where id=p_order_id;
 return p_next_status;
end;
$$;
revoke execute on function public.advance_order_fulfilment(uuid,text) from public, anon;
grant execute on function public.advance_order_fulfilment(uuid,text) to authenticated;

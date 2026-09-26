-- A stale Admin page must never acknowledge a newer refund that was not displayed.
drop function public.acknowledge_partial_refund(uuid);
create function public.acknowledge_partial_refund(p_order_id uuid,p_expected_pence bigint,p_expected_refund_at timestamptz)
returns boolean language plpgsql security definer set search_path='' as $$
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
$$;
revoke all on function public.acknowledge_partial_refund(uuid,bigint,timestamptz) from public,anon;
grant execute on function public.acknowledge_partial_refund(uuid,bigint,timestamptz) to authenticated;

create function public.nocturne91_advance_order(
  p_order_id uuid, p_expected_updated_at timestamptz, p_previous text, p_target text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_order public.orders%rowtype;
begin
  if actor is null or not exists (select 1 from public.admin_members where user_id = actor) then
    raise exception 'Admin membership required' using errcode = '42501';
  end if;

  select * into current_order from public.orders where id = p_order_id for update;
  if not found or p_expected_updated_at is null or p_previous is null or p_target is null
    or current_order.updated_at is distinct from p_expected_updated_at
    or current_order.status is distinct from p_previous then
    raise exception 'Order changed. Refresh Orders and check the current stage.' using errcode = '40001';
  end if;

  if p_previous = 'ready_to_dispatch' and p_target = 'dispatched' and current_order.sales_channel <> 'WEBSITE' then
    perform public.request_external_dispatch(p_order_id, true, false, null);
  else
    perform public.advance_order_fulfilment(p_order_id, p_target);
  end if;
  select * into current_order from public.orders where id = p_order_id;
  return jsonb_build_object('status', current_order.status, 'updatedAt', current_order.updated_at);
end;
$$;

create function public.nocturne91_complete_external_orders(p_orders jsonb, p_reason text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  reason text := btrim(p_reason);
  expected record;
  current_order public.orders%rowtype;
  corrected_at timestamptz;
begin
  if actor is null or not exists (select 1 from public.admin_members where user_id = actor) then
    raise exception 'Admin membership required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_orders) is distinct from 'array' or octet_length(p_orders::text) > 8000 then
    raise exception 'Select between 1 and 25 eligible orders' using errcode = '22023';
  end if;
  if jsonb_array_length(p_orders) not between 1 and 25
    or reason is null or length(reason) not between 5 and 1000 or reason ~ '[[:cntrl:]]' then
    raise exception 'Select between 1 and 25 orders and enter a correction reason of 5 to 1000 characters' using errcode = '22023';
  end if;
  if (select count(distinct e.id) from jsonb_to_recordset(p_orders) as e(id uuid))
    <> jsonb_array_length(p_orders) then
    raise exception 'Select distinct orders' using errcode = '22023';
  end if;

  -- QUARTERMASTER also locks the order before changing pack state.
  for expected in select * from jsonb_to_recordset(p_orders) as e(id uuid, updated_at timestamptz, status text) order by id loop
    select * into current_order from public.orders where id = expected.id for update;
    if not found or expected.updated_at is null or expected.status is null
      or current_order.updated_at is distinct from expected.updated_at
      or current_order.status is distinct from expected.status then
      raise exception 'One or more orders changed. Refresh Orders and check your selection.' using errcode = '40001';
    end if;

    if current_order.sales_channel is null or current_order.sales_channel not in ('EBAY', 'OTHER')
      or nullif(btrim(current_order.external_reference), '') is null
      or current_order.payment_status <> 'paid' or current_order.paid_at is null
      or current_order.fulfillment_applied_at is null
      or current_order.status not in ('pending', 'in_production', 'ready_to_dispatch', 'dispatched')
      or exists (select 1 from quartermaster79.packing where order_id = current_order.id and state = 'reserved')
      or exists (
        select 1 from public.order_email_deliveries where order_id = current_order.id
          and state in ('pending', 'claimed') and (automatic_delivery_eligible or external_requested_by is not null)
      ) then
      raise exception 'An order is ineligible. Check payment, marketplace reference, active packing and notifications.' using errcode = '22023';
    end if;

    corrected_at := clock_timestamp();
    update public.orders
    set status = 'completed', updated_at = corrected_at,
      status_history = status_history || jsonb_build_array(jsonb_build_object(
        'type', 'fulfilment_correction', 'correction', 'external_completion',
        'from_status', current_order.status, 'status', 'completed',
        'reason', reason, 'source', 'admin', 'actor', actor, 'at', corrected_at
      ))
    where id = current_order.id;
  end loop;

  return jsonb_array_length(p_orders);
end;
$$;

revoke all on function public.nocturne91_advance_order(uuid,timestamptz,text,text),
  public.nocturne91_complete_external_orders(jsonb,text) from public, anon, authenticated, service_role;
grant execute on function public.nocturne91_advance_order(uuid,timestamptz,text,text),
  public.nocturne91_complete_external_orders(jsonb,text) to authenticated;

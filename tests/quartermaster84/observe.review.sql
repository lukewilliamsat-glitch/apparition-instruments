-- Exact 84B review candidate. Run only in a disposable database under 84A.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '8s';

do $$
begin
  if (select mode from quartermaster79.rollout where singleton) is distinct from 'disabled'
     or (select mode from dominion79.lifecycle_control where singleton) is distinct from 'paused'
     or to_regprocedure('ironclad69.actor()') is null
     or to_regprocedure('public.dominion81_status()') is null
     or exists (select from pg_catalog.pg_proc p
       join pg_catalog.pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'quartermaster79' or n.nspname = 'public' and p.proname ~ '^quartermaster')
  then
    raise exception 'Expected the dormant FIRST LIGHT database';
  end if;
end;
$$;

-- Retains the accepted saved-BOM rules from dominion79.requirements without
-- installing a UNITY runtime, consulting the current catalogue BOM or writing stock.
create function quartermaster79.saved_bom(items jsonb) returns jsonb
language plpgsql immutable set search_path = ''
as $$
declare
  item jsonb;
  part jsonb;
  wanted jsonb := '{}';
  component text;
  ordered_quantity bigint;
  component_quantity bigint;
  kind text;
begin
  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) not between 1 and 100 then
    raise exception 'Invalid saved BOM' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item->'quantity') is distinct from 'number'
       or coalesce(item->>'quantity', '') !~ '^[1-9][0-9]{0,3}$' then
      raise exception 'Invalid saved quantity' using errcode = '22023';
    end if;
    ordered_quantity := (item->>'quantity')::bigint;
    kind := item->>'type';
    if kind = 'component' then
      item := jsonb_build_array(jsonb_build_object('componentId', item->>'productId', 'quantity', 1));
    elsif kind in ('kit', 'assembly') then
      item := item#>'{snapshot,stockRequirements}';
    else
      raise exception 'Unsupported saved order item' using errcode = '22023';
    end if;
    if jsonb_typeof(item) is distinct from 'array' or jsonb_array_length(item) not between 1 and 100 then
      raise exception 'Invalid saved component requirements' using errcode = '22023';
    end if;
    for part in select value from jsonb_array_elements(item) loop
      component := part->>'componentId';
      if coalesce(component, '') !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$'
         or jsonb_typeof(part->'quantity') is distinct from 'number'
         or coalesce(part->>'quantity', '') !~ '^[1-9][0-9]{0,3}$' then
        raise exception 'Invalid saved component requirement' using errcode = '22023';
      end if;
      component_quantity := coalesce((wanted->>component)::bigint, 0) + ordered_quantity * (part->>'quantity')::bigint;
      if component_quantity > 10000 then
        raise exception 'Saved BOM exceeds quantity limits' using errcode = '22023';
      end if;
      wanted := jsonb_set(wanted, array[component], to_jsonb(component_quantity));
    end loop;
    if (select count(*) from jsonb_object_keys(wanted)) > 100 then
      raise exception 'Saved BOM exceeds component limit' using errcode = '22023';
    end if;
  end loop;
  return wanted;
end;
$$;
revoke all on function quartermaster79.saved_bom(jsonb) from public, anon, authenticated, service_role;

create function public.quartermaster84_review(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  rollout_mode text;
  order_record record;
  packed quartermaster79.packing%rowtype;
  saved_bom jsonb;
  saved_picks jsonb;
  material_stock jsonb;
  response jsonb;
begin
  perform ironclad69.actor();
  select mode into strict rollout_mode from quartermaster79.rollout where singleton;
  if rollout_mode <> 'observe' then
    return jsonb_build_object('schema', 1, 'mode', 'disabled', 'order', null);
  end if;

  select reference, status, payment_status, items, refunded_pence, latest_refund_at
    into order_record from public.orders
    where id = p_order and payment_status in ('paid', 'partially_refunded') and fulfillment_applied_at is not null;
  if not found then
    raise exception 'No accessible packing record' using errcode = '22023';
  end if;
  select * into packed from quartermaster79.packing where order_id = p_order;
  saved_bom := quartermaster79.saved_bom(order_record.items);
  select jsonb_agg(jsonb_build_object('name', left(coalesce(c.name, part.key), 120),
      'quantity', part.value::int, 'picked', case when p.picked between 0 and part.value::int then p.picked else 0 end)
      order by part.key)
    into saved_picks
    from jsonb_each_text(saved_bom) part
    left join public.components c on c.id = part.key
    left join quartermaster79.pick_progress p on p.order_id = p_order and p.component_id = part.key
      and packed.picked = saved_bom
      and packed.state in ('reserved', 'packed');

  select coalesce(jsonb_agg(jsonb_build_object('title', left(m.title, 120),
      'available', greatest(0, m.quantity - (select count(*) from quartermaster79.packing k
        where k.sku = m.sku and k.state = 'reserved'))) order by m.sku), '[]'::jsonb)
    into material_stock from (select sku, title, quantity from quartermaster79.material order by sku limit 25) m;

  response := jsonb_build_object('schema', 1, 'mode', rollout_mode, 'order', jsonb_build_object(
    'reference', left(order_record.reference, 64), 'picks', saved_picks, 'materials', material_stock,
    'cost', jsonb_build_object(
      'packagingActualMinor', case when packed.state = 'packed' then packed.actual_material_minor end,
      'postageEstimatedMinor', case when packed.state = 'packed' then packed.estimated_postage_minor end,
      'postageActualMinor', case when packed.state = 'packed' then
        (select minor from quartermaster79.postage_evidence where order_id = p_order) end),
    'parcel', case when packed.state = 'packed' then jsonb_build_object(
      'format', packed.postal_class, 'tracking', packed.tracking,
      'grams', packed.measured_grams, 'outerMm', packed.measured_mm) end,
    'readyForReview', coalesce(packed.state = 'packed'
      and packed.picked = saved_bom
      and order_record.status in ('pending', 'in_production', 'ready_to_dispatch')
      and (order_record.payment_status = 'paid' or exists (
        select from public.partial_refund_reviews r where r.order_id = p_order
          and r.refunded_pence = order_record.refunded_pence and r.refund_at = order_record.latest_refund_at)), false)
  ));
  if octet_length(response::text) > 96000 then
    raise exception 'Packing response exceeds the approved size' using errcode = '22023';
  end if;
  return response;
end;
$$;
revoke all on function public.quartermaster84_review(uuid) from public, anon, authenticated, service_role;
grant execute on function public.quartermaster84_review(uuid) to authenticated;
commit;

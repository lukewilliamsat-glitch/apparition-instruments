-- Isolated review draft. Requires the pinned Stage A schema, 84B read code and
-- the private 79 receive/complete functions. Fixture mode is owned by the test runner.
begin;

create schema quartermaster84w;
revoke all on schema quartermaster84w from public, anon, authenticated, service_role;

create table quartermaster84w.staff (
  user_id uuid primary key references auth.users,
  can_pack boolean not null,
  can_receive boolean not null,
  can_record_postage boolean not null
);
create table quartermaster84w.gate (
  singleton boolean primary key default true check (singleton),
  mode text not null check (mode in ('disabled', 'workshop', 'drain'))
);
insert into quartermaster84w.gate(mode) values ('disabled');

create table quartermaster84w.revision (
  order_id uuid primary key references quartermaster79.packing,
  generation bigint not null check (generation > 0),
  revision bigint not null check (revision >= 0)
);
create table quartermaster84w.command_log (
  request_id uuid primary key,
  order_id uuid not null references public.orders,
  actor uuid not null references auth.users,
  generation bigint not null,
  revision bigint not null,
  action jsonb not null,
  result jsonb not null,
  recorded_at timestamptz not null default statement_timestamp()
);
create table quartermaster84w.receipt_actor (
  purchase_id uuid primary key references quartermaster79.purchase(id),
  actor uuid not null references auth.users,
  recorded_at timestamptz not null default statement_timestamp()
);

alter table quartermaster84w.staff enable row level security;
alter table quartermaster84w.gate enable row level security;
alter table quartermaster84w.revision enable row level security;
alter table quartermaster84w.command_log enable row level security;
alter table quartermaster84w.receipt_actor enable row level security;
revoke all on all tables in schema quartermaster84w from public, anon, authenticated, service_role;

create function quartermaster84w.actor(required_capability text) returns uuid
language plpgsql stable set search_path = '' as $$
declare
  member uuid := ironclad69.actor();
begin
  if not exists (
    select 1 from quartermaster84w.staff s where s.user_id = member and
      case required_capability
        when 'pack' then s.can_pack
        when 'receive' then s.can_receive
        when 'postage' then s.can_record_postage
        else false
      end
  ) then
    raise exception 'Workshop staff permission required' using errcode = '42501';
  end if;
  return member;
end;
$$;

create function quartermaster84w.check_mode(release_only boolean) returns void
language plpgsql set search_path = '' as $$
declare
  current_mode text;
begin
  select mode into strict current_mode from quartermaster84w.gate where singleton for share;
  if current_mode <> 'workshop' and not (release_only and current_mode = 'drain') then
    raise exception 'Workshop operation unavailable' using errcode = '42501';
  end if;
end;
$$;

create function public.quartermaster84w_receive(
  p_id uuid, p_sku text, p_supplier uuid, p_ref text, p_qty integer, p_total bigint
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  member uuid := quartermaster84w.actor('receive');
  created boolean;
begin
  perform quartermaster84w.check_mode(false);
  created := quartermaster79.receive(p_id, p_sku, p_supplier, p_ref, p_qty, p_total);
  if created then
    insert into quartermaster84w.receipt_actor(purchase_id, actor) values (p_id, member);
  elsif not exists (
    select 1 from quartermaster84w.receipt_actor where purchase_id = p_id and actor = member
  ) then
    raise exception 'Receipt request is already claimed' using errcode = '23505';
  end if;
  return created;
end;
$$;

create function public.quartermaster84w_pack(
  p_order uuid, p_request uuid, p_generation bigint, p_revision bigint, p_action jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  operation text := p_action ->> 'kind';
  member uuid := quartermaster84w.actor(case when operation = 'postage' then 'postage' else 'pack' end);
  order_record public.orders%rowtype;
  pack quartermaster79.packing%rowtype;
  current_rev quartermaster84w.revision%rowtype;
  replay quartermaster84w.command_log%rowtype;
  wanted jsonb;
  result jsonb;
  material_sku text;
  available bigint;
  component text;
  quantity integer;
  previous integer;
  measured integer[];
  next_generation bigint := p_generation;
  next_revision bigint;
  allowed_fields text[];
  next_state text;
begin
  if p_request is null or p_generation is null or p_generation not between 0 and 9007199254740990
     or p_revision is null or p_revision not between 0 and 9007199254740990
     or jsonb_typeof(p_action) is distinct from 'object' or octet_length(p_action::text) > 4096
     or operation is null or operation not in ('reserve','pick','complete','release','postage') then
    raise exception 'Invalid workshop request' using errcode = '22023';
  end if;
  allowed_fields := case operation
    when 'reserve' then array['kind','sku']
    when 'pick' then array['kind','component','quantity']
    when 'release' then array['kind']
    when 'complete' then array['kind','purchase','mm','grams','format','tracking','estimate']
    when 'postage' then array['kind','minor','receipt']
  end;
  if exists (select 1 from jsonb_object_keys(p_action) key where not (key = any(allowed_fields))) then
    raise exception 'Unrecognised workshop field' using errcode = '22023';
  end if;
  next_revision := p_revision + 1;
  perform quartermaster84w.check_mode(operation = 'release');

  -- Lock the authoritative order before packing and materials. Orders still
  -- owns its payment, refund and dispatch fields and is never updated here.
  select * into order_record from public.orders where id = p_order for update;
  if not found then
    raise exception 'No accessible order' using errcode = '22023';
  end if;
  select * into replay from quartermaster84w.command_log where request_id = p_request;
  if found then
    if (replay.order_id, replay.actor, replay.generation, replay.revision, replay.action)
       is distinct from (p_order, member, p_generation, p_revision, p_action) then
      raise exception 'Workshop request conflict' using errcode = '23505';
    end if;
    return replay.result;
  end if;

  select * into pack from quartermaster79.packing where order_id = p_order for update;
  select * into current_rev from quartermaster84w.revision where order_id = p_order for update;
  if (coalesce(current_rev.generation, 0),coalesce(current_rev.revision, 0))
     is distinct from (p_generation,p_revision) then
    raise exception 'Packing generation or revision changed' using errcode = '40001';
  end if;

  if operation in ('reserve','pick','complete') then
    if order_record.fulfillment_applied_at is null
       or order_record.status not in ('pending','in_production','ready_to_dispatch')
       or (order_record.payment_status = 'paid' or order_record.payment_status = 'partially_refunded'
           and exists(select 1 from public.partial_refund_reviews r where r.order_id = p_order
             and r.refunded_pence = order_record.refunded_pence and r.refund_at = order_record.latest_refund_at)) is not true then
      raise exception 'Review the current paid, undispatched order first' using errcode = '23514';
    end if;
    wanted := quartermaster79.saved_bom(order_record.items);
  end if;

  if operation = 'reserve' then
    if pack.state is not null and pack.state <> 'released' then
      raise exception 'Order already has an active or completed pack' using errcode = '23514';
    end if;
    material_sku := p_action ->> 'sku';
    perform 1 from quartermaster79.material where sku = material_sku for update;
    if not found then
      raise exception 'Unknown packaging SKU' using errcode = '22023';
    end if;
    select m.quantity - (select count(*) from quartermaster79.packing k where k.sku=m.sku and k.state='reserved')
      into available from quartermaster79.material m where m.sku=material_sku;
    if available < 1 then
      raise exception 'No available packaging' using errcode = '23514';
    end if;
    insert into quartermaster79.packing(order_id, request_id, sku, picked, state)
      values (p_order, p_request, material_sku, wanted, 'reserved')
      on conflict (order_id) do update set request_id = excluded.request_id,
        sku = excluded.sku, picked = excluded.picked, state = excluded.state;
    delete from quartermaster79.pick_progress where order_id = p_order;
    next_generation := p_generation + 1;
    next_revision := 0;
    next_state := 'reserved';

  elsif operation = 'postage' then
    if pack.state is distinct from 'packed' or jsonb_typeof(p_action->'minor') is distinct from 'number'
       or (p_action->>'minor') !~ '^[0-9]{1,7}$'
       or coalesce(p_action->>'receipt','') !~ '^[A-Za-z0-9][A-Za-z0-9_.-]{2,99}$' then
      raise exception 'A completed pack and bounded postage evidence are required' using errcode = '23514';
    end if;
    insert into quartermaster79.postage_evidence(id, order_id, minor, receipt, actor)
    values (p_request,p_order,(p_action->>'minor')::integer,p_action->>'receipt',member);
    next_state := 'packed';

  elsif pack.state is distinct from 'reserved' then
    raise exception 'An active packing reservation is required' using errcode = '23514';

  elsif operation = 'release' then
    perform 1 from quartermaster79.material where sku = pack.sku for update;
    update quartermaster79.packing set state = 'released' where order_id = p_order;
    delete from quartermaster79.pick_progress where order_id = p_order;
    next_state := 'released';

  elsif pack.picked is distinct from wanted then
    raise exception 'The saved BOM has changed' using errcode = '40001';

  elsif operation = 'pick' then
    component := p_action ->> 'component';
    if component is null or not (wanted ? component) or jsonb_typeof(p_action->'quantity') is distinct from 'number'
       or (p_action->>'quantity') !~ '^[0-9]{1,5}$' then
      raise exception 'Invalid saved-BOM pick' using errcode = '22023';
    end if;
    quantity := (p_action->>'quantity')::integer;
    if quantity > (wanted->>component)::integer then
      raise exception 'Pick exceeds saved BOM' using errcode = '22023';
    end if;
    select picked into previous from quartermaster79.pick_progress where order_id=p_order and component_id=component;
    insert into quartermaster79.pick_progress(order_id,component_id,picked) values (p_order,component,quantity)
      on conflict (order_id,component_id) do update set picked=excluded.picked;
    insert into quartermaster79.pick_events(id,order_id,component_id,previous,picked,actor)
      values (p_request,p_order,component,coalesce(previous,0),quantity,member);
    next_state := 'reserved';

  else
    if exists (
      select 1 from jsonb_each_text(wanted) item
      left join quartermaster79.pick_progress picks on picks.order_id=p_order and picks.component_id=item.key
      where picks.picked is distinct from item.value::integer
    ) then
      raise exception 'Complete all saved-BOM picks before packing' using errcode = '23514';
    end if;
    if jsonb_typeof(p_action->'mm') is distinct from 'array' then
      raise exception 'Measured outer dimensions are required' using errcode = '22023';
    end if;
    measured := array(select value::integer from jsonb_array_elements_text(p_action->'mm'));
    next_state := quartermaster79.complete(p_order,pack.request_id,(p_action->>'purchase')::uuid,measured,
      (p_action->>'grams')::integer,p_action->>'format',p_action->>'tracking',(p_action->>'estimate')::bigint);
  end if;

  insert into quartermaster84w.revision values (p_order,next_generation,next_revision)
    on conflict (order_id) do update set generation=excluded.generation,revision=excluded.revision;
  result := jsonb_build_object('generation', next_generation, 'revision', next_revision, 'state', next_state);
  insert into quartermaster84w.command_log(request_id,order_id,actor,generation,revision,action,result)
    values (p_request,p_order,member,p_generation,p_revision,p_action,result);
  return result;
end;
$$;

create function public.quartermaster84w_command_result(p_request uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  member uuid := ironclad69.actor();
  receipt quartermaster84w.command_log%rowtype;
begin
  select * into receipt from quartermaster84w.command_log where request_id = p_request and actor = member;
  if not found then
    return null;
  end if;
  perform quartermaster84w.actor(case when receipt.action->>'kind' = 'postage' then 'postage' else 'pack' end);
  return receipt.result;
end;
$$;

revoke all on all functions in schema quartermaster84w from public,anon,authenticated,service_role;
revoke all on function public.quartermaster84w_receive(uuid,text,uuid,text,integer,bigint),
  public.quartermaster84w_pack(uuid,uuid,bigint,bigint,jsonb),
  public.quartermaster84w_command_result(uuid) from public,anon,authenticated,service_role;
grant execute on function public.quartermaster84w_receive(uuid,text,uuid,text,integer,bigint),
  public.quartermaster84w_pack(uuid,uuid,bigint,bigint,jsonb),
  public.quartermaster84w_command_result(uuid) to authenticated;
commit;

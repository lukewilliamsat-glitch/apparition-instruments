begin;
set local lock_timeout = '3s';
set local statement_timeout = '20s';

-- Abort an upgrade against unexpected production contracts or existing writer state.
do $$
declare
  item record;
begin
  if to_regnamespace('quartermaster84w') is not null or to_regnamespace('quartermaster84c') is not null
    or exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      where (n.nspname='quartermaster79' and proname in ('receive','complete'))
         or (n.nspname='public' and (left(proname,16)='quartermaster84w' or left(proname,16)='quartermaster84d')))
    or (select mode from dominion79.lifecycle_control where singleton) is distinct from 'paused'
    or (select mode from quartermaster79.rollout where singleton) is distinct from 'observe'
    or exists(select from quartermaster79.packing where state='reserved') then
    raise exception 'Unexpected release baseline';
  end if;
  for item in select * from (values
      ('ironclad69.actor()', 'dfd0d21e2b3f4f16701b8deb7f5953c4'),
      ('public.dominion81_status()', '46709eee25d4a13232a6d51c1f5028f1'),
      ('public.quartermaster84_review(uuid)', '594670c01dea054008251b29e1a5b856'),
      ('quartermaster79.saved_bom(jsonb)', 'e25ca99aeea98828ecba08c7a2f3e608'),
      ('public.command63_financial_read(uuid)', '13c440e3341d1550a9798a6f8361d508'),
      ('public.command63_financial_save(uuid,bigint,text,uuid,jsonb)', 'e7226e9772be861465e0cd7f9b377f59'),
      ('public.omniscience74_orders(date,date,date,uuid)', 'b728d8e8b2a23d4a08319aa316684d7c')
    ) defs(signature,digest)
  loop
    if md5(pg_get_functiondef(to_regprocedure(item.signature))) is distinct from item.digest then
      raise exception 'Changed release prerequisite: %',item.signature;
    end if;
  end loop;
end $$;


create function quartermaster79.receive(p_id uuid,p_sku text,p_supplier uuid,p_ref text,p_qty integer,p_total bigint) returns boolean
language plpgsql security definer set search_path='' as $$
declare prior quartermaster79.purchase%rowtype; n bigint;
begin
 perform 1 from quartermaster79.material where sku=p_sku for update;
 if not found then raise exception 'Unknown packaging SKU';end if;
 select * into prior from quartermaster79.purchase where id=p_id;
 if found then
  if (prior.sku,prior.supplier,prior.reference,prior.quantity,prior.total_minor) is distinct from (p_sku,p_supplier,p_ref,p_qty,p_total) then
   raise exception 'Purchase idempotency conflict' using errcode='23505';
  end if;
  return false;
 end if;
 insert into quartermaster79.purchase(id,sku,supplier,reference,quantity,remaining,total_minor)
 values(p_id,p_sku,p_supplier,p_ref,p_qty,p_qty,p_total);
 update quartermaster79.material set quantity=quantity+p_qty where sku=p_sku returning quantity into n;
 insert into quartermaster79.movement(sku,quantity_delta,resulting,kind,purchase_id) values(p_sku,p_qty,n,'purchase',p_id);
 return true;
end $$;

create function quartermaster79.complete(p_order uuid,p_request uuid,p_purchase uuid,p_mm integer[],p_grams integer,
 p_service text,p_tracking text,p_estimate bigint) returns text
language plpgsql security definer set search_path='' as $$
declare k quartermaster79.packing%rowtype; m quartermaster79.material%rowtype; b quartermaster79.purchase%rowtype;
 n bigint; cost bigint; used integer; cap_mm integer[]; cap_grams integer; parcel integer[];
begin
 perform 1 from public.orders where id=p_order and payment_status in ('paid','partially_refunded') and fulfillment_applied_at is not null
    and status in ('pending','in_production','ready_to_dispatch') for share;
 if not found then raise exception 'Use an eligible paid unshipped order';end if;
 select * into strict k from quartermaster79.packing where order_id=p_order for update;
 if k.request_id<>p_request then raise exception 'Packing request mismatch';end if;
 if k.state='packed' then
  if (k.purchase_id,k.measured_mm,k.measured_grams,k.postal_class,k.tracking,k.estimated_postage_minor)
   is distinct from (p_purchase,p_mm,p_grams,p_service,p_tracking,p_estimate) then raise exception 'Conflicting packing replay';end if;
  return k.state;
 end if;
 if k.state<>'reserved' or array_ndims(p_mm) is distinct from 1 or array_length(p_mm,1) is distinct from 3
   or exists(select 1 from unnest(p_mm) d where d is null or d not between 1 and 1500) or p_grams is null or p_grams not between 1 and 25000
   or coalesce(p_service,'') !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$'
   or (p_tracking is not null and p_tracking !~ '^[A-Za-z0-9][A-Za-z0-9 -]{3,47}$') then raise exception 'Invalid measured parcel';end if;
 select * into strict m from quartermaster79.material where sku=k.sku for update;
 select * into strict b from quartermaster79.purchase where id=p_purchase and sku=k.sku and remaining>0 for update;
 if m.quantity<1 then raise exception 'No physical packaging to consume';end if;
 if p_grams<m.tare_grams or exists(select 1 from generate_subscripts(p_mm,1) i where p_mm[i]<m.outer_mm[i]) then
  raise exception 'Measured parcel cannot be smaller than its material';end if;
 -- Initial eligible formats are the existing UK fixture only; estimates remain separate from purchased postage.
 case p_service
  when 'letter' then cap_mm:=array[240,165,5];cap_grams:=100;
  when 'large-letter' then cap_mm:=array[353,250,25];cap_grams:=750;
  when 'small-parcel' then cap_mm:=array[450,350,160];cap_grams:=2000;
  else raise exception 'Unreviewed postal class';
 end case;
 parcel:=array(select d from unnest(p_mm) d order by d desc);
 if p_grams>cap_grams or exists(select 1 from generate_subscripts(parcel,1) i where parcel[i]>cap_mm[i])
  then raise exception 'Measured parcel exceeds postal class';end if;
 used:=b.quantity-b.remaining;
 -- Explicit evidence of the actual packaging batch and deterministic minor-unit allocation over that batch.
 cost:=(b.total_minor*(used+1))/b.quantity-(b.total_minor*used)/b.quantity;
 update quartermaster79.purchase set remaining=remaining-1 where id=b.id;
 update quartermaster79.material set quantity=quantity-1 where sku=k.sku returning quantity into n;
 insert into quartermaster79.movement(sku,quantity_delta,resulting,kind,purchase_id,order_id) values(k.sku,-1,n,'packed',b.id,p_order);
 update quartermaster79.packing set purchase_id=b.id,measured_mm=p_mm,measured_grams=p_grams,postal_class=p_service,tracking=p_tracking,
  estimated_postage_minor=p_estimate,actual_material_minor=cost,packed_at=clock_timestamp(),state='packed' where order_id=p_order;
 return 'packed'; -- Never update public.orders dispatch or send a communication here.
end $$;

revoke all on all functions in schema quartermaster79 from public,anon,authenticated,service_role;


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
  if not exists(select from quartermaster84w.receipt_actor where purchase_id=p_id and actor=member) then
    perform 1 from ironclad69.suppliers where id=p_supplier and active for share;
    if not found then raise exception 'Select an active supplier' using errcode='22023'; end if;
  end if;
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

create function public.quartermaster84w_create_material(
  p_sku text,p_title text,p_inner integer[],p_outer integer[],p_tare integer,p_reorder integer
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  prior quartermaster79.material%rowtype;
begin
  perform quartermaster84w.actor('receive');
  perform quartermaster84w.check_mode(false);
  if coalesce(length(trim(p_title)),0) not between 1 and 120
     or array_ndims(p_inner) is distinct from 1 or array_ndims(p_outer) is distinct from 1
     or array_length(p_inner,1) is distinct from 3 or array_length(p_outer,1) is distinct from 3
     or array_lower(p_inner,1) is distinct from 1 or array_lower(p_outer,1) is distinct from 1
     or array_position(p_inner,null) is not null or array_position(p_outer,null) is not null then
    raise exception 'Invalid packaging dimensions or title' using errcode = '22023';
  end if;
  insert into quartermaster79.material (sku,title,inner_mm,outer_mm,tare_grams,reorder_at)
    values (p_sku,trim(p_title),p_inner,p_outer,p_tare,p_reorder)
    on conflict (sku) do nothing;
  if found then return true; end if;
  select * into strict prior from quartermaster79.material where sku = p_sku;
  if (prior.title,prior.inner_mm,prior.outer_mm,prior.tare_grams,prior.reorder_at)
     is distinct from (trim(p_title),p_inner,p_outer,p_tare,p_reorder) then
    raise exception 'Packaging SKU already exists with different details' using errcode = '23505';
  end if;
  return false;
end;
$$;

create function public.quartermaster84w_workspace(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  member uuid := ironclad69.actor();
  seats quartermaster84w.staff%rowtype;
  rollout text;
  ord public.orders%rowtype;
  pack quartermaster79.packing%rowtype;
  current_rev quartermaster84w.revision%rowtype;
  can_use_order boolean;
  wanted jsonb;
  picks jsonb := '[]';
  materials jsonb := '[]';
  batches jsonb := '[]';
  response jsonb;
begin
  select * into seats from quartermaster84w.staff where user_id=member;
  if not found or not (seats.can_pack or seats.can_receive or seats.can_record_postage) then
    raise exception 'Workshop staff permission required' using errcode = '42501';
  end if;
  select mode into strict rollout from quartermaster84w.gate where singleton;
  if rollout = 'disabled' then return jsonb_build_object('schema',1,'mode',rollout,'order',null); end if;
  select * into ord from public.orders where id=p_order and fulfillment_applied_at is not null;
  if not found then raise exception 'No accessible order' using errcode = '22023'; end if;
  select * into pack from quartermaster79.packing where order_id=p_order;
  select * into current_rev from quartermaster84w.revision where order_id=p_order;
  can_use_order := (ord.status in ('pending','in_production','ready_to_dispatch') and (
    ord.payment_status='paid' or ord.payment_status='partially_refunded' and exists(
      select 1 from public.partial_refund_reviews r where r.order_id=p_order and
        r.refunded_pence=ord.refunded_pence and r.refund_at=ord.latest_refund_at)
  )) is true;
  if rollout='workshop' and can_use_order and seats.can_pack then
    wanted := quartermaster79.saved_bom(ord.items);
    select coalesce(jsonb_agg(jsonb_build_object('id',i.key,'title',left(coalesce(c.name,i.key),120),
      'quantity',i.value::integer,'picked',coalesce(p.picked,0)) order by i.key),'[]')
      into picks from jsonb_each_text(wanted) i
      left join public.components c on c.id=i.key
      left join quartermaster79.pick_progress p on p.order_id=p_order and p.component_id=i.key and pack.picked=wanted;
    select coalesce(jsonb_agg(jsonb_build_object('sku',m.sku,'title',left(m.title,120),
      'available',greatest(0,m.quantity - (select count(*) from quartermaster79.packing p
        where p.sku=m.sku and p.state='reserved'))) order by m.sku),'[]')
      into materials from (select * from quartermaster79.material order by sku limit 25) m;
    if pack.state='reserved' then
      select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'remaining',b.remaining) order by b.received_at,b.id),'[]')
      into batches from (
        select id, remaining, received_at from quartermaster79.purchase
        where sku=pack.sku and remaining>0 order by received_at,id limit 25
      ) b;
    end if;
  end if;
  response := jsonb_build_object('schema',1,'mode',rollout,'order',jsonb_build_object(
    'reference',left(ord.reference,64),'generation',coalesce(current_rev.generation,0),'revision',coalesce(current_rev.revision,0),
    'state',coalesce(pack.state,'none'),'picks',picks,'materials',materials,'batches',batches,
    'canReserve',rollout='workshop' and can_use_order and seats.can_pack and coalesce(pack.state,'none') in ('none','released'),
    'canPick',rollout='workshop' and can_use_order and seats.can_pack and pack.state is not distinct from 'reserved'
      and pack.picked is not distinct from wanted,
    'canRelease',seats.can_pack and pack.state is not distinct from 'reserved',
    'canReceive',rollout='workshop' and seats.can_receive,
    'canRecordPostage',rollout='workshop' and seats.can_record_postage and pack.state is not distinct from 'packed'
      and not exists(select 1 from quartermaster79.postage_evidence where order_id=p_order),
    'cost',jsonb_build_object('material',pack.actual_material_minor,'estimate',pack.estimated_postage_minor,
      'actual',(select minor from quartermaster79.postage_evidence where order_id=p_order)),
    'parcel',case when pack.state='packed' then jsonb_build_object(
      'mm',pack.measured_mm,'grams',pack.measured_grams,'format',pack.postal_class,'tracking',pack.tracking) end));
  if octet_length(response::text)>96000 then raise exception 'Workshop response exceeds limit' using errcode='22023'; end if;
  return response;
end;
$$;
revoke all on function public.quartermaster84w_create_material(text,text,integer[],integer[],integer,integer),
  public.quartermaster84w_workspace(uuid) from public,anon,authenticated,service_role;
grant execute on function public.quartermaster84w_create_material(text,text,integer[],integer[],integer,integer),
  public.quartermaster84w_workspace(uuid) to authenticated;

alter table quartermaster84w.staff add column can_approve_finance boolean not null default false;
create table quartermaster84w.finance_receipts (
  actor uuid not null references auth.users,
  request_id uuid not null,
  order_id uuid not null references public.orders,
  inputs jsonb not null,
  result jsonb not null,
  primary key(actor,request_id)
);
alter table quartermaster84w.finance_receipts enable row level security;
revoke all on quartermaster84w.finance_receipts from public,anon,authenticated,service_role;

create function public.quartermaster84d_access() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  member uuid := ironclad69.actor();
  seats quartermaster84w.staff%rowtype;
  gate text;
begin
  select mode into strict gate from quartermaster84w.gate where singleton;
  select * into seats from quartermaster84w.staff where user_id=member;
  return jsonb_build_object('mode',gate,
    'packing',coalesce(seats.can_pack or seats.can_receive or seats.can_record_postage,false),
    'receive',coalesce(seats.can_receive,false),'finance',coalesce(seats.can_approve_finance,false));
end $$;

create function public.quartermaster84d_suppliers() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  perform quartermaster84w.actor('receive');
  perform quartermaster84w.check_mode(false);
  return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name,id),'[]')
    from (select id,left(name,120) as name from ironclad69.suppliers
      where active order by name,id limit 100) directory);
end $$;

create function quartermaster84w.finance_actor() returns uuid
language plpgsql stable set search_path='' as $$
declare member uuid:=ironclad69.actor();
begin
  if not exists(select from quartermaster84w.staff where user_id=member and can_approve_finance) then
    raise exception 'Finance approval role required' using errcode='42501';
  end if;
  return member;
end $$;

create function quartermaster84w.finance_proposal(p_order uuid) returns jsonb
language plpgsql stable set search_path='' as $$
declare
  packed quartermaster79.packing%rowtype;
  postage quartermaster79.postage_evidence%rowtype;
  movement bigint;
  book jsonb;
  saved jsonb;
  proposed jsonb;
  inputs jsonb;
begin
  perform quartermaster84w.finance_actor();
  if (select mode from quartermaster84w.gate where singleton) is distinct from 'workshop' then
    raise exception 'Finance approval unavailable' using errcode='42501';
  end if;
  select * into packed from quartermaster79.packing where order_id=p_order and state='packed';
  if not found then return jsonb_build_object('state','needs-pack'); end if;
  select * into postage from quartermaster79.postage_evidence where order_id=p_order;
  if not found then return jsonb_build_object('state','needs-postage'); end if;
  select id into strict movement from quartermaster79.movement where order_id=p_order and kind='packed';
  book:=public.command63_financial_read(p_order);
  saved:=book->'document';
  if jsonb_typeof(saved) is distinct from 'object' then return jsonb_build_object('state','needs-record'); end if;
  if book->>'orderBasisMatches' is distinct from 'true' or
    (saved ? 'fulfilmentSnapshot' and saved->'fulfilmentSnapshot'<>'null'::jsonb) then
    return jsonb_build_object('state','needs-finance-review');
  end if;
  proposed:=jsonb_set(saved,'{costs,packaging}',jsonb_build_object('minor',packed.actual_material_minor,
    'state','confirmed','source','QUARTERMASTER movement '||movement));
  proposed:=jsonb_set(proposed,'{costs,shipping}',jsonb_build_object('minor',postage.minor,
    'state','confirmed','source','QUARTERMASTER postage '||postage.id));
  if proposed=saved then return jsonb_build_object('state','already-recorded'); end if;
  inputs:=jsonb_build_object('movement',movement,'postage',postage.id,'document',proposed);
  return jsonb_build_object('state','ready','packaging',packed.actual_material_minor,'postage',postage.minor,
    'revision',book->'revision','basis',book->'orderBasisHash','document',proposed,
    'evidence',encode(sha256(convert_to(inputs::text,'UTF8')),'hex'));
end $$;

create function public.quartermaster84d_finance_proposal(p_order uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select quartermaster84w.finance_proposal(p_order) - 'document';
$$;

create function public.quartermaster84d_finance_save(p_order uuid,p_revision bigint,p_basis text,p_evidence text,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  member uuid:=quartermaster84w.finance_actor();
  proposal jsonb;
  receipt quartermaster84w.finance_receipts%rowtype;
  inputs jsonb:=jsonb_build_object('order',p_order,'revision',p_revision,'basis',p_basis,'evidence',p_evidence);
  outcome jsonb;
begin
  if p_request is null or p_order is null or p_revision is null or p_revision not between 1 and 999999999
    or coalesce(p_basis,'') !~ '^[0-9a-f]{64}$' or coalesce(p_evidence,'') !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid finance approval' using errcode='22023';
  end if;
  -- Use the same gate-before-order lock ordering as packing commands.
  perform quartermaster84w.check_mode(false);
  perform 1 from public.orders where id=p_order for update;
  select * into receipt from quartermaster84w.finance_receipts where actor=member and request_id=p_request;
  if found then
    if receipt.inputs is distinct from inputs then raise exception 'Request already used' using errcode='22023'; end if;
    return receipt.result;
  end if;
  proposal:=quartermaster84w.finance_proposal(p_order);
  if proposal->>'state' is distinct from 'ready' or proposal->>'evidence' is distinct from p_evidence
    or proposal->>'basis' is distinct from p_basis or (proposal->>'revision')::bigint is distinct from p_revision then
    raise exception 'Finance evidence changed' using errcode='40001';
  end if;
  outcome:=public.command63_financial_save(p_order,p_revision,p_basis,p_request,proposal->'document');
  insert into quartermaster84w.finance_receipts values(member,p_request,p_order,inputs,outcome);
  return outcome;
end $$;

create function public.quartermaster84d_finance_status(p_order uuid,p_request uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare member uuid:=quartermaster84w.finance_actor();
begin
  return (select result from quartermaster84w.finance_receipts
    where actor=member and order_id=p_order and request_id=p_request);
end $$;

revoke all on all functions in schema quartermaster84w from public,anon,authenticated,service_role;
revoke all on function public.quartermaster84d_access(),public.quartermaster84d_suppliers(),
  public.quartermaster84d_finance_proposal(uuid),public.quartermaster84d_finance_save(uuid,bigint,text,text,uuid),
  public.quartermaster84d_finance_status(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.quartermaster84d_access(),public.quartermaster84d_suppliers(),
  public.quartermaster84d_finance_proposal(uuid),public.quartermaster84d_finance_save(uuid,bigint,text,text,uuid),
  public.quartermaster84d_finance_status(uuid,uuid) to authenticated;


commit;


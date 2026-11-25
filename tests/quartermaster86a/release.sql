begin;
set local lock_timeout = '3s';
set local statement_timeout = '20s';

do $preflight$
begin
  if to_regnamespace('quartermaster84c') is not null
    or (select mode from dominion79.lifecycle_control where singleton) is distinct from 'paused'
    or (select mode from quartermaster79.rollout where singleton) is distinct from 'observe'
    or md5(pg_get_functiondef(to_regprocedure('public.quartermaster84d_suppliers()')))
      is distinct from '75dfcd82b2d6b8a7ccdcca8e5a48eb62'
    or md5(pg_get_functiondef(to_regprocedure('quartermaster84w.check_mode(boolean)')))
      is distinct from 'e9ef59c0297f28dcd405bad1f4445a5a' then
    raise exception 'Expected the 85C workspace baseline';
  end if;
end $preflight$;

create schema quartermaster86;
revoke all on schema quartermaster86 from public, anon, authenticated, service_role;

create view quartermaster86.eligible_orders as
select o.id,o.reference,o.sales_channel,coalesce(o.order_date,(o.created_at at time zone 'Europe/London')::date) as order_day,
  coalesce(p.state,'none') as pack_state,p.sku,
  case when p.state='reserved' then 'packing' when p.state='packed' then 'packed' else 'awaiting' end as stage,
  e.id as postage_id
from public.orders o
left join quartermaster79.packing p on p.order_id=o.id
left join quartermaster79.postage_evidence e on e.order_id=o.id
where o.fulfillment_applied_at is not null and o.status in ('pending','in_production','ready_to_dispatch')
  and (o.payment_status='paid' or o.payment_status='partially_refunded' and exists (
    select from public.partial_refund_reviews r where r.order_id=o.id
    and r.refunded_pence=o.refunded_pence and r.refund_at=o.latest_refund_at));

create view quartermaster86.stock as
select m.*,coalesce(r.units,0)::bigint as reserved,
  greatest(m.quantity-coalesce(r.units,0),0) as available
from quartermaster79.material m
left join (select sku,count(*) as units from quartermaster79.packing where state='reserved' group by sku) r using(sku);

create table quartermaster86.descriptions (
  sku text primary key references quartermaster79.material(sku),
  description text not null check (length(description) between 1 and 240)
);
alter table quartermaster86.descriptions enable row level security;
revoke all on all tables in schema quartermaster86 from public, anon, authenticated, service_role;

create function public.quartermaster86_register(
  p_sku text,p_title text,p_inner integer[],p_outer integer[],p_tare integer,p_reorder integer,p_description text default ''
) returns boolean
language plpgsql security definer set search_path='' as $$
declare
  description_text text := trim(coalesce(p_description,''));
  created boolean;
begin
  if length(description_text)>240 then
    raise exception 'Packaging description exceeds 240 characters' using errcode='22023';
  end if;
  created:=public.quartermaster84w_create_material(p_sku,p_title,p_inner,p_outer,p_tare,p_reorder);
  if created and description_text<>'' then
    insert into quartermaster86.descriptions values(p_sku,description_text);
  elsif not created and coalesce((select description from quartermaster86.descriptions where sku=p_sku),'')<>description_text then
    raise exception 'Packaging SKU already exists with a different description' using errcode='23505';
  end if;
  return created;
end $$;
revoke all on function public.quartermaster86_register(text,text,integer[],integer[],integer,integer,text) from public,anon,authenticated,service_role;
grant execute on function public.quartermaster86_register(text,text,integer[],integer[],integer,integer,text) to authenticated;

create function public.quartermaster86_page(
  p_section text, p_query text default '', p_filter text default 'all',
  p_sort text default 'newest', p_page integer default 0, p_sku text default null, p_supplier uuid default null
) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  actor_id uuid := ironclad69.actor();
  rights quartermaster84w.staff%rowtype;
  mode_now text;
  query_text text := lower(trim(coalesce(p_query,'')));
  rows jsonb := '[]';
  totals jsonb;
  page_size constant integer := 25;
  matched_count integer;
  response jsonb;
begin
  select * into rights from quartermaster84w.staff where user_id=actor_id;
  if not found or not (rights.can_pack or rights.can_receive or rights.can_record_postage or rights.can_approve_finance) then
    raise exception 'QUARTERMASTER staff permission required' using errcode='42501';
  end if;
  if p_section is null or p_section not in ('overview','packaging','purchasing','queue','suppliers','activity','choices')
    or length(query_text)>80 or p_page is null or p_page not between 0 and 399
    or p_filter is null or p_filter not in ('all','low','awaiting','packing','packed')
    or p_sort is null or p_sort not in ('newest','oldest','name')
    or (p_sku is not null and p_sku !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$') then
    raise exception 'Invalid QUARTERMASTER query' using errcode='22023';
  end if;
  if (p_section in ('purchasing','suppliers','choices') and not rights.can_receive)
    or (p_section='packaging' and not (rights.can_pack or rights.can_receive))
    or (p_section='queue' and not (rights.can_pack or rights.can_record_postage or rights.can_approve_finance)) then
    raise exception 'QUARTERMASTER section permission required' using errcode='42501';
  end if;
  select mode into strict mode_now from quartermaster84w.gate where singleton;

  if p_section='overview' then
    totals:=jsonb_build_object(
      'awaiting',case when rights.can_pack or rights.can_record_postage or rights.can_approve_finance then (select count(*) from quartermaster86.eligible_orders where stage='awaiting') end,
      'packing',case when rights.can_pack or rights.can_record_postage or rights.can_approve_finance then (select count(*) from quartermaster86.eligible_orders where stage='packing') end,
      'packed',case when rights.can_pack or rights.can_record_postage or rights.can_approve_finance then (select count(*) from quartermaster86.eligible_orders where stage='packed') end,
      'available',case when rights.can_pack or rights.can_receive then (select coalesce(sum(available),0) from quartermaster86.stock) end,
      'reserved',case when rights.can_pack or rights.can_receive then (select coalesce(sum(reserved),0) from quartermaster86.stock) end,
      'low',case when rights.can_pack or rights.can_receive then (select count(*) from quartermaster86.stock where available<=reorder_at) end,
      'purchases',case when rights.can_receive then (
        select coalesce(jsonb_agg(to_jsonb(k) order by received_at desc,id desc),'[]')
        from (select p.id,p.sku,left(s.name,120) supplier,p.quantity,p.total_minor,p.received_at
          from quartermaster79.purchase p join ironclad69.suppliers s on s.id=p.supplier
          order by p.received_at desc,p.id desc limit 5) k) end);
  end if;
  if p_section in ('packaging','choices') then
    select coalesce(jsonb_agg(x order by lower(x->>'title'),x->>'sku'),'[]'),count(*) into rows,matched_count
    from (select jsonb_build_object('sku',m.sku,'title',left(m.title,120),'inner_mm',m.inner_mm,
      'outer_mm',m.outer_mm,'tare_grams',m.tare_grams,'available',m.available,'reserved',m.reserved,
      'reorder_at',m.reorder_at,'low',m.available<=m.reorder_at,'description',d.description,
      'latest_batch_minor',b.total_minor,'latest_batch_qty',b.quantity) x
      from quartermaster86.stock m
      left join quartermaster86.descriptions d using(sku)
      left join lateral (select p.total_minor,p.quantity from quartermaster79.purchase p
        where rights.can_receive and p_section='packaging' and p.sku=m.sku
        order by p.received_at desc,p.id desc limit 1) b on true
      where (p_sku is null or m.sku=p_sku) and (p_filter<>'low' or m.available<=m.reorder_at)
        and strpos(lower(m.sku||' '||m.title),query_text)>0
      order by lower(m.title),m.sku limit 26 offset p_page*page_size) page;
  elsif p_section='purchasing' then
    select coalesce(jsonb_agg(rowdata order by seq),'[]'),count(*) into rows,matched_count
    from (select row_number() over (order by
        case when p_sort='oldest' then p.received_at end, p.received_at desc,p.id desc) seq,
      jsonb_build_object('sku',p.sku,'title',left(m.title,120),'supplier',left(s.name,120),'reference',p.reference,
        'quantity',p.quantity,'remaining',p.remaining,'total_minor',p.total_minor,'received_at',p.received_at) rowdata
      from quartermaster79.purchase p join ironclad69.suppliers s on s.id=p.supplier
      join quartermaster79.material m on m.sku=p.sku
      where (p_sku is null or p.sku=p_sku) and (p_supplier is null or p.supplier=p_supplier)
      and strpos(lower(p.reference||' '||p.sku||' '||s.name),query_text)>0
      order by seq limit 26 offset p_page*page_size) page;
  elsif p_section='suppliers' then
    select coalesce(jsonb_agg(x order by lower(x->>'name'),x->>'id'),'[]'),count(*) into rows,matched_count
    from (select jsonb_build_object('id',s.id,'name',left(s.name,120),'active',s.active,'currency',s.currency,
      'purchases',(select count(*) from quartermaster79.purchase p where p.supplier=s.id)) x
      from ironclad69.suppliers s where strpos(lower(s.name),query_text)>0
      order by lower(s.name),s.id limit 26 offset p_page*page_size) page;
  elsif p_section='queue' then
    with page as (
      select o.* from quartermaster86.eligible_orders o
      where (p_filter='all' or o.stage=p_filter)
        and strpos(lower(o.reference||' '||coalesce(o.sales_channel,'')),query_text)>0
      order by case when p_sort='oldest' then o.order_day end,o.order_day desc,o.reference desc,o.id
      limit 26 offset p_page*page_size
    )
    select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'reference',left(o.reference,64),'sales_channel',left(o.sales_channel,40),
      'order_day',o.order_day,'stage',o.stage,'pack_state',o.pack_state,'sku',o.sku,
      'postage_recorded',o.postage_id is not null,'picked',progress.picked,'required',progress.required,
      'finance',case when rights.can_approve_finance and o.stage='packed' then
        case when o.postage_id is null then 'needs-postage'
          when exists(select from quartermaster84w.finance_receipts fr join public.order_financial_records f on f.order_id=fr.order_id
            where fr.order_id=o.id and fr.result->>'outcome'='committed' and fr.result->>'revision'=f.revision::text) then 'approved'
          else 'review' end end)
      order by case when p_sort='oldest' then o.order_day end,o.order_day desc,o.reference desc,o.id),'[]'),count(*)
    into rows,matched_count from page o
    left join quartermaster79.packing pack on pack.order_id=o.id
    left join lateral (
      select sum(case when pack.state='packed' then wanted.value::int else coalesce(pp.picked,0) end) picked,
        sum(wanted.value::int) required
      from jsonb_each_text(case when pack.state in ('reserved','packed') then pack.picked else '{}'::jsonb end) wanted
      left join quartermaster79.pick_progress pp on pp.order_id=o.id and pp.component_id=wanted.key
    ) progress on true;
  elsif p_section in ('activity','overview') then
    with entries as (
      select 'receipt' kind,p.received_at happened,p.id::text key,null::text order_ref,p.sku,p.quantity,null::bigint amount
      from quartermaster79.purchase p where rights.can_receive
      union all
      select case l.action->>'kind' when 'reserve' then 'reservation' when 'release' then 'release' else 'pack' end,
        l.recorded_at,l.request_id::text,o.reference,null,null,null
      from quartermaster84w.command_log l join public.orders o on o.id=l.order_id
      where rights.can_pack and l.action->>'kind' in ('reserve','release','complete')
      union all
      select 'postage',e.at,e.id::text,o.reference,null,null,e.minor
      from quartermaster79.postage_evidence e join public.orders o on o.id=e.order_id where rights.can_record_postage
      union all
      select 'finance',r.recorded_at,f.request_id::text,o.reference,null,null,null
      from quartermaster84w.finance_receipts f join public.orders o on o.id=f.order_id
      join public.order_financial_revisions r on r.order_id=f.order_id and r.revision::text=f.result->>'revision'
      where rights.can_approve_finance and f.result->>'outcome'='committed'
    ), page as (
      select * from entries
      where strpos(lower(kind||' '||coalesce(order_ref,'')||' '||coalesce(sku,'')),query_text)>0
      order by happened desc,kind,key limit case when p_section='overview' then 5 else 26 end
      offset case when p_section='overview' then 0 else p_page*page_size end
    )
    select coalesce(jsonb_agg(to_jsonb(p)-'key' order by happened desc,kind,key),'[]'),count(*)
      into rows,matched_count from page p;
  end if;
  if matched_count>page_size then rows:=rows-page_size; end if;
  response:=jsonb_build_object('schema',1,'mode',mode_now,'totals',totals,'rows',rows,
    'has_more',coalesce(matched_count>page_size,false) and p_page<399,
    'capabilities',jsonb_build_object('pack',rights.can_pack,'receive',rights.can_receive,
      'postage',rights.can_record_postage,'finance',rights.can_approve_finance));
  if octet_length(response::text)>96000 then raise exception 'QUARTERMASTER page exceeds limit' using errcode='22023'; end if;
  return response;
end $$;
revoke all on function public.quartermaster86_page(text,text,text,text,integer,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.quartermaster86_page(text,text,text,text,integer,text,uuid) to authenticated;

create table quartermaster86.material_state (
  sku text primary key references quartermaster79.material(sku),
  display_sku text not null,
  archived boolean not null default false
);
create table quartermaster86.sku_names (
  name text primary key,
  sku text not null references quartermaster79.material(sku)
);
create table quartermaster86.purchase_names (
  supplier uuid not null,
  sku text not null,
  reference text not null,
  purchase_id uuid not null references quartermaster79.purchase(id) deferrable initially deferred,
  primary key(supplier,sku,reference)
);
create table quartermaster86.inventory_audit (
  request_id uuid primary key,
  actor uuid not null references auth.users,
  sku text not null references quartermaster79.material(sku),
  purchase_id uuid references quartermaster79.purchase(id),
  action text not null,
  reason text not null check (length(reason) between 3 and 240),
  arguments jsonb not null,
  before_state jsonb,
  after_state jsonb not null,
  recorded_at timestamptz not null default clock_timestamp()
);
create index quartermaster86_inventory_history on quartermaster86.inventory_audit(sku,recorded_at desc,request_id);
create index quartermaster86_cost_replacements on quartermaster86.inventory_audit((after_state#>>'{replacement,id}'))
where action='batch-cost';
alter table quartermaster86.material_state enable row level security;
alter table quartermaster86.sku_names enable row level security;
alter table quartermaster86.purchase_names enable row level security;
alter table quartermaster86.inventory_audit enable row level security;
revoke all on all tables in schema quartermaster86 from public,anon,authenticated,service_role;

-- Keep internal SKU and receipt IDs immutable. Old names remain reserved to the original rows.
lock table quartermaster79.material,quartermaster79.purchase in share row exclusive mode;
insert into quartermaster86.sku_names select sku,sku from quartermaster79.material;
insert into quartermaster86.purchase_names select supplier,sku,reference,id from quartermaster79.purchase;

create function quartermaster86.reserve_names() returns trigger
language plpgsql security definer set search_path='' as $$
declare claimed uuid;
begin
  if tg_table_name='material' then
    insert into quartermaster86.sku_names values(new.sku,new.sku);
  else
    if tg_op='INSERT' and exists(select from quartermaster86.material_state where sku=new.sku and archived) then
      raise exception 'Reactivate this packaging before receiving stock' using errcode='23514';
    end if;
    insert into quartermaster86.purchase_names values(new.supplier,new.sku,new.reference,new.id)
      on conflict do nothing;
    select purchase_id into claimed from quartermaster86.purchase_names
      where supplier=new.supplier and sku=new.sku and reference=new.reference;
    if claimed is distinct from new.id then
      raise exception 'Purchase reference is already used by another receipt' using errcode='23505';
    end if;
  end if;
  return new;
end $$;
create trigger quartermaster86_sku_name after insert on quartermaster79.material
for each row execute function quartermaster86.reserve_names();
create trigger quartermaster86_purchase_name after insert or update of reference on quartermaster79.purchase
for each row execute function quartermaster86.reserve_names();

create function quartermaster86.check_active_reservation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.state='reserved' and exists(select from quartermaster86.material_state where sku=new.sku and archived) then
    raise exception 'This packaging is archived' using errcode='23514';
  end if;
  return new;
end $$;
create trigger quartermaster86_active_reservation before insert or update of sku,state on quartermaster79.packing
for each row execute function quartermaster86.check_active_reservation();

create function quartermaster86.snapshot(p_sku text,p_batch uuid default null) returns jsonb
language sql stable set search_path='' as $$
  select jsonb_build_object('sku',m.sku,'displaySku',coalesce(s.display_sku,m.sku),
    'archived',coalesce(s.archived,false),'title',m.title,'description',coalesce(d.description,''),
    'inner',m.inner_mm,'outer',m.outer_mm,'tare',m.tare_grams,'reorder',m.reorder_at,
    'physical',m.quantity,'reserved',(select count(*) from quartermaster79.packing where sku=m.sku and state='reserved'),
    'batch',case when b.id is not null then jsonb_build_object('id',b.id,'supplier',b.supplier,
      'supplierName',sup.name,'reference',b.reference,'received',b.quantity,'remaining',b.remaining,
      'totalMinor',b.total_minor,'receivedAt',b.received_at,
      'usedMinor',(select coalesce(sum(k.actual_material_minor),0) from quartermaster79.packing k where k.purchase_id=b.id),
      'usedUnits',(select count(*) from quartermaster79.packing k where k.purchase_id=b.id))
      end)
  from quartermaster79.material m
  left join quartermaster86.material_state s using(sku)
  left join quartermaster86.descriptions d using(sku)
  left join quartermaster79.purchase b on b.id=p_batch and b.sku=m.sku
  left join ironclad69.suppliers sup on sup.id=b.supplier
  where m.sku=p_sku;
$$;

create function public.quartermaster86a_detail(p_sku text,p_batch uuid default null,p_page integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  data jsonb;
  evidence jsonb;
begin
  perform quartermaster84w.actor('receive');
  if p_page is null or p_page not between 0 and 399 then raise exception 'Invalid history page' using errcode='22023'; end if;
  data:=quartermaster86.snapshot(p_sku,p_batch);
  if data is null or (p_batch is not null and data->'batch'='null'::jsonb) then
    raise exception 'Packaging or batch could not be found' using errcode='22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('action',a.action,'reason',a.reason,'at',a.recorded_at,
    'before',a.before_state,'after',a.after_state) order by a.recorded_at desc,a.request_id),'[]') into evidence
  from (select * from quartermaster86.inventory_audit where sku=p_sku
    and (p_batch is null or purchase_id=p_batch)
    order by recorded_at desc,request_id limit 11 offset p_page*10) a;
  return jsonb_build_object('state',data,'revision',md5(data::text),
    'mode',(select mode from quartermaster84w.gate where singleton),
    'history',case when jsonb_array_length(evidence)>10 then evidence-10 else evidence end,
    'hasMore',jsonb_array_length(evidence)>10 and p_page<399);
end $$;

create function public.quartermaster86a_change(
  p_request uuid,p_sku text,p_batch uuid,p_expected text,p_action text,p_reason text,p_values jsonb
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  member uuid:=quartermaster84w.actor('receive');
  why text:=trim(coalesce(p_reason,''));
  input jsonb:=jsonb_build_array(p_sku,p_batch,p_expected,p_action,why,p_values);
  replay quartermaster86.inventory_audit%rowtype;
  prev jsonb;
  current jsonb;
  m quartermaster79.material%rowtype;
  batch quartermaster79.purchase%rowtype;
  corrected_sku text;
  material_title text;
  description_text text;
  ref text;
  inner_size integer[];
  outer_size integer[];
  tare integer;
  reorder integer;
  reserved bigint;
  delta integer;
  cost bigint;
  used_cost bigint;
  used_count bigint;
  new_batch uuid;
begin
  perform quartermaster84w.check_mode(false);
  if p_request is null or length(why) not between 3 and 240 or coalesce(p_expected,'') !~ '^[0-9a-f]{32}$'
     or jsonb_typeof(p_values) is distinct from 'object' or octet_length(p_values::text)>4000
     or p_action is null or p_action not in ('edit','archive','reactivate','stocktake-in','stocktake-out','opening',
       'damaged','lost','missing','supplier-return','receipt-overcount','receipt-undercount','reverse-receipt','reference','batch-cost') then
    raise exception 'A valid operation and an explicit reason are required' using errcode='22023';
  end if;
  select * into strict m from quartermaster79.material where sku=p_sku for update;
  select * into replay from quartermaster86.inventory_audit where request_id=p_request;
  if found then
    if replay.actor is distinct from member or replay.arguments is distinct from input then
      raise exception 'Request already used with different details' using errcode='23505';
    end if;
    return replay.after_state;
  end if;
  if p_batch is not null then
    select * into strict batch from quartermaster79.purchase where id=p_batch and sku=p_sku for update;
  end if;
  prev:=quartermaster86.snapshot(p_sku,p_batch);
  if md5(prev::text) is distinct from p_expected then raise exception 'Packaging changed. Reload before retrying.' using errcode='40001'; end if;
  reserved:=(prev->>'reserved')::bigint;

  if p_action='edit' then
    corrected_sku:=trim(p_values->>'displaySku');
    material_title:=trim(p_values->>'title');
    description_text:=trim(coalesce(p_values->>'description',''));
    if coalesce(corrected_sku,'') !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$'
      or coalesce(length(material_title),0) not between 1 and 120 or length(description_text)>240
      or jsonb_typeof(p_values->'inner') is distinct from 'array' or jsonb_typeof(p_values->'outer') is distinct from 'array' then
      raise exception 'Invalid packaging details' using errcode='22023';
    end if;
    inner_size:=array(select value::integer from jsonb_array_elements_text(p_values->'inner'));
    outer_size:=array(select value::integer from jsonb_array_elements_text(p_values->'outer'));
    tare:=(p_values->>'tare')::integer;
    reorder:=(p_values->>'reorder')::integer;
    if cardinality(inner_size)<>3 or cardinality(outer_size)<>3 or array_position(inner_size,null) is not null
      or array_position(outer_size,null) is not null or tare is null or reorder is null then
      raise exception 'All dimensions, tare and reorder level are required' using errcode='22023';
    end if;
    if reserved>0 and (m.inner_mm,m.outer_mm,m.tare_grams) is distinct from (inner_size,outer_size,tare) then
      raise exception 'Release unconsumed reservations before correcting dimensions or tare' using errcode='23514';
    end if;
    insert into quartermaster86.sku_names values(corrected_sku,p_sku) on conflict do nothing;
    if not exists(select from quartermaster86.sku_names where name=corrected_sku and sku=p_sku) then
      raise exception 'This SKU is already used or retained in history' using errcode='23505';
    end if;
    insert into quartermaster86.material_state(sku,display_sku) values(p_sku,corrected_sku)
      on conflict(sku) do update set display_sku=excluded.display_sku;
    update quartermaster79.material set title=material_title,inner_mm=inner_size,outer_mm=outer_size,
      tare_grams=tare,reorder_at=reorder where sku=p_sku;
    if description_text='' then
      delete from quartermaster86.descriptions where sku=p_sku;
    else
      insert into quartermaster86.descriptions values(p_sku,description_text)
        on conflict(sku) do update set description=excluded.description;
    end if;
  elsif p_action in ('archive','reactivate') then
    if p_action='archive' and reserved>0 then
      raise exception 'Release unconsumed reservations before archiving' using errcode='23514';
    end if;
    insert into quartermaster86.material_state(sku,display_sku,archived)
      values(p_sku,prev->>'displaySku',p_action='archive')
      on conflict(sku) do update set archived=excluded.archived;
  elsif p_action in ('stocktake-in','opening','receipt-undercount') then
    delta:=(p_values->>'quantity')::integer;
    cost:=(p_values->>'totalMinor')::bigint;
    ref:=trim(p_values->>'reference');
    if delta is null or delta not between 1 and 10000 or cost is null or cost not between 0 and 10000000
       or coalesce(length(ref),0) not between 3 and 100 then
      raise exception 'A positive count, source reference and assessed batch cost are required' using errcode='22023';
    end if;
    if p_action='opening' and (m.quantity<>0 or exists(select from quartermaster79.purchase where sku=p_sku)) then
      raise exception 'Opening stock requires an unused SKU. Use a stocktake correction instead.' using errcode='23514';
    end if;
    if p_action='receipt-undercount' and (batch.id is null or batch.supplier is distinct from (p_values->>'supplier')::uuid) then
      raise exception 'An undercount correction must use the original supplier' using errcode='23514';
    end if;
    new_batch:=p_request;
    if public.quartermaster84w_receive(new_batch,p_sku,(p_values->>'supplier')::uuid,ref,delta,cost) is distinct from true then
      raise exception 'A different receipt already uses this request' using errcode='23505';
    end if;
  else
    if batch.id is null then raise exception 'Select the affected batch' using errcode='22023'; end if;
    if p_action='reference' then
      ref:=trim(p_values->>'reference');
      if coalesce(length(ref),0) not between 3 and 100 then raise exception 'A purchase reference is required' using errcode='22023'; end if;
      update quartermaster79.purchase set reference=ref where id=batch.id;
    elsif p_action='batch-cost' then
      perform quartermaster84w.finance_actor();
      cost:=(p_values->>'totalMinor')::bigint;
      used_cost:=(prev#>>'{batch,usedMinor}')::bigint;
      used_count:=(prev#>>'{batch,usedUnits}')::bigint;
      if cost is null or cost not between 0 and 10000000 or cost<used_cost or batch.remaining=0
         or batch.quantity-batch.remaining<>used_count then
        raise exception 'Cost correction requires remaining stock with a reconciled consumption history' using errcode='23514';
      end if;
      if used_count=0 then
        update quartermaster79.purchase set total_minor=cost where id=batch.id;
      else
        -- Revalue only the physical remainder. Past packs keep their original batch and cost.
        ref:=trim(p_values->>'reference');
        if coalesce(length(ref),0) not between 3 and 100 then
          raise exception 'Enter a distinct correction reference for the remainder' using errcode='22023';
        end if;
        new_batch:=p_request;
        update quartermaster79.purchase set remaining=0 where id=batch.id;
        insert into quartermaster79.purchase(id,sku,supplier,reference,quantity,remaining,total_minor)
          values(new_batch,p_sku,batch.supplier,ref,batch.remaining,batch.remaining,cost-used_cost);
      end if;
    else
      if p_action='reverse-receipt' and not exists(
          select from quartermaster79.movement where purchase_id=batch.id and kind='purchase') then
        raise exception 'A cost replacement is not an acquisition receipt' using errcode='23514';
      end if;
      delta:=case when p_action='reverse-receipt' then batch.quantity else (p_values->>'quantity')::integer end;
      if delta is null or delta<1 or delta>batch.remaining or m.quantity-delta<reserved then
        raise exception 'The change would remove consumed or reserved packaging' using errcode='23514';
      end if;
      update quartermaster79.purchase set remaining=remaining-delta where id=batch.id;
      update quartermaster79.material set quantity=quantity-delta where sku=p_sku;
    end if;
  end if;

  current:=quartermaster86.snapshot(p_sku,coalesce(p_batch,new_batch));
  if new_batch is not null and p_batch is not null then
    current:=current||jsonb_build_object('replacement',quartermaster86.snapshot(p_sku,new_batch)->'batch');
  end if;
  insert into quartermaster86.inventory_audit(request_id,actor,sku,purchase_id,action,reason,arguments,before_state,after_state)
    values(p_request,member,p_sku,coalesce(p_batch,new_batch),p_action,why,input,prev,current);
  return current;
end $$;

revoke all on all functions in schema quartermaster86 from public,anon,authenticated,service_role;
revoke all on function public.quartermaster86a_detail(text,uuid,integer),
  public.quartermaster86a_change(uuid,text,uuid,text,text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.quartermaster86a_detail(text,uuid,integer),
  public.quartermaster86a_change(uuid,text,uuid,text,text,text,jsonb) to authenticated;

create or replace function public.quartermaster86_page(
  p_section text, p_query text default '', p_filter text default 'all',
  p_sort text default 'newest', p_page integer default 0, p_sku text default null, p_supplier uuid default null
) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  actor_id uuid := ironclad69.actor();
  rights quartermaster84w.staff%rowtype;
  mode_now text;
  query_text text := lower(trim(coalesce(p_query,'')));
  rows jsonb := '[]';
  totals jsonb;
  page_size constant integer := 25;
  matched_count integer;
  response jsonb;
begin
  select * into rights from quartermaster84w.staff where user_id=actor_id;
  if not found or not (rights.can_pack or rights.can_receive or rights.can_record_postage or rights.can_approve_finance) then
    raise exception 'QUARTERMASTER staff permission required' using errcode='42501';
  end if;
  if p_section is null or p_section not in ('overview','packaging','purchasing','queue','suppliers','activity','choices')
    or length(query_text)>80 or p_page is null or p_page not between 0 and 399
    or p_filter is null or p_filter not in ('all','low','archived','awaiting','packing','packed')
    or p_sort is null or p_sort not in ('newest','oldest','name')
    or (p_sku is not null and p_sku !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$') then
    raise exception 'Invalid QUARTERMASTER query' using errcode='22023';
  end if;
  if (p_section in ('purchasing','suppliers','choices') and not rights.can_receive)
    or (p_section='packaging' and not (rights.can_pack or rights.can_receive))
    or (p_section='queue' and not (rights.can_pack or rights.can_record_postage or rights.can_approve_finance)) then
    raise exception 'QUARTERMASTER section permission required' using errcode='42501';
  end if;
  select mode into strict mode_now from quartermaster84w.gate where singleton;

  if p_section='overview' then
    totals:=jsonb_build_object(
      'awaiting',case when rights.can_pack or rights.can_record_postage or rights.can_approve_finance then (select count(*) from quartermaster86.eligible_orders where stage='awaiting') end,
      'packing',case when rights.can_pack or rights.can_record_postage or rights.can_approve_finance then (select count(*) from quartermaster86.eligible_orders where stage='packing') end,
      'packed',case when rights.can_pack or rights.can_record_postage or rights.can_approve_finance then (select count(*) from quartermaster86.eligible_orders where stage='packed') end,
      'available',case when rights.can_pack or rights.can_receive then (select coalesce(sum(available),0) from quartermaster86.stock where not exists(select from quartermaster86.material_state a where a.sku=stock.sku and a.archived)) end,
      'reserved',case when rights.can_pack or rights.can_receive then (select coalesce(sum(reserved),0) from quartermaster86.stock where not exists(select from quartermaster86.material_state a where a.sku=stock.sku and a.archived)) end,
      'low',case when rights.can_pack or rights.can_receive then (select count(*) from quartermaster86.stock where available<=reorder_at and not exists(select from quartermaster86.material_state a where a.sku=stock.sku and a.archived)) end,
      'purchases',case when rights.can_receive then (
        select coalesce(jsonb_agg(to_jsonb(k) order by received_at desc,id desc),'[]')
        from (select p.id,p.sku,left(s.name,120) supplier,p.quantity,p.total_minor,p.received_at
          from quartermaster79.purchase p join ironclad69.suppliers s on s.id=p.supplier
          where exists(select from quartermaster79.movement mv where mv.purchase_id=p.id and mv.kind='purchase')
          order by p.received_at desc,p.id desc limit 5) k) end);
  end if;
  if p_section in ('packaging','choices') then
    select coalesce(jsonb_agg(x order by lower(x->>'title'),x->>'sku'),'[]'),count(*) into rows,matched_count
    from (select jsonb_build_object('sku',m.sku,'title',left(m.title,120),'inner_mm',m.inner_mm,
      'outer_mm',m.outer_mm,'tare_grams',m.tare_grams,'available',m.available,'reserved',m.reserved,
      'reorder_at',m.reorder_at,'low',m.available<=m.reorder_at,'description',d.description,
      'display_sku',coalesce(ms.display_sku,m.sku),'archived',coalesce(ms.archived,false),'latest_batch_minor',b.total_minor,'latest_batch_qty',b.quantity) x
      from quartermaster86.stock m
      left join quartermaster86.descriptions d using(sku)
      left join quartermaster86.material_state ms using(sku)
      left join lateral (select p.total_minor,p.quantity from quartermaster79.purchase p
        where rights.can_receive and p_section='packaging' and p.sku=m.sku
        order by p.received_at desc,p.id desc limit 1) b on true
      where (p_sku is null or m.sku=p_sku) and (p_filter<>'low' or m.available<=m.reorder_at and not coalesce(ms.archived,false))
        and (p_filter<>'archived' or coalesce(ms.archived,false))
        and (p_section<>'choices' or not coalesce(ms.archived,false))
        and (strpos(lower(m.sku||' '||m.title||' '||coalesce(ms.display_sku,'')),query_text)>0
          or exists(select from quartermaster86.sku_names a where a.sku=m.sku and strpos(lower(a.name),query_text)>0))
      order by lower(m.title),m.sku limit 26 offset p_page*page_size) page;
  elsif p_section='purchasing' then
    select coalesce(jsonb_agg(rowdata order by seq),'[]'),count(*) into rows,matched_count
    from (select row_number() over (order by
        case when p_sort='oldest' then p.received_at end, p.received_at desc,p.id desc) seq,
      jsonb_build_object('id',p.id,'sku',p.sku,'display_sku',coalesce(ms.display_sku,p.sku),
        'replacement',exists(select from quartermaster86.inventory_audit a where a.action='batch-cost' and a.after_state#>>'{replacement,id}'=p.id::text),
        'reversed',exists(select from quartermaster86.inventory_audit a where a.action='reverse-receipt' and a.purchase_id=p.id),'title',left(m.title,120),'supplier',left(s.name,120),'reference',p.reference,
        'quantity',p.quantity,'remaining',p.remaining,'total_minor',p.total_minor,'received_at',p.received_at) rowdata
      from quartermaster79.purchase p join ironclad69.suppliers s on s.id=p.supplier
      join quartermaster79.material m on m.sku=p.sku
      left join quartermaster86.material_state ms on ms.sku=p.sku
      where (p_sku is null or p.sku=p_sku) and (p_supplier is null or p.supplier=p_supplier)
      and (strpos(lower(p.reference||' '||p.sku||' '||coalesce(ms.display_sku,'')||' '||s.name),query_text)>0
          or exists(select from quartermaster86.purchase_names n where n.purchase_id=p.id and strpos(lower(n.reference),query_text)>0))
      order by seq limit 26 offset p_page*page_size) page;
  elsif p_section='suppliers' then
    select coalesce(jsonb_agg(x order by lower(x->>'name'),x->>'id'),'[]'),count(*) into rows,matched_count
    from (select jsonb_build_object('id',s.id,'name',left(s.name,120),'active',s.active,'currency',s.currency,
      'purchases',(select count(*) from quartermaster79.purchase p where p.supplier=s.id)) x
      from ironclad69.suppliers s where strpos(lower(s.name),query_text)>0
      order by lower(s.name),s.id limit 26 offset p_page*page_size) page;
  elsif p_section='queue' then
    with page as (
      select o.* from quartermaster86.eligible_orders o
      where (p_filter='all' or o.stage=p_filter)
        and strpos(lower(o.reference||' '||coalesce(o.sales_channel,'')),query_text)>0
      order by case when p_sort='oldest' then o.order_day end,o.order_day desc,o.reference desc,o.id
      limit 26 offset p_page*page_size
    )
    select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'reference',left(o.reference,64),'sales_channel',left(o.sales_channel,40),
      'order_day',o.order_day,'stage',o.stage,'pack_state',o.pack_state,'sku',o.sku,
      'postage_recorded',o.postage_id is not null,'picked',progress.picked,'required',progress.required,
      'finance',case when rights.can_approve_finance and o.stage='packed' then
        case when o.postage_id is null then 'needs-postage'
          when exists(select from quartermaster84w.finance_receipts fr join public.order_financial_records f on f.order_id=fr.order_id
            where fr.order_id=o.id and fr.result->>'outcome'='committed' and fr.result->>'revision'=f.revision::text) then 'approved'
          else 'review' end end)
      order by case when p_sort='oldest' then o.order_day end,o.order_day desc,o.reference desc,o.id),'[]'),count(*)
    into rows,matched_count from page o
    left join quartermaster79.packing pack on pack.order_id=o.id
    left join lateral (
      select sum(case when pack.state='packed' then wanted.value::int else coalesce(pp.picked,0) end) picked,
        sum(wanted.value::int) required
      from jsonb_each_text(case when pack.state in ('reserved','packed') then pack.picked else '{}'::jsonb end) wanted
      left join quartermaster79.pick_progress pp on pp.order_id=o.id and pp.component_id=wanted.key
    ) progress on true;
  elsif p_section in ('activity','overview') then
    with entries as (
      select 'receipt' kind,p.received_at happened,p.id::text key,null::text order_ref,p.sku,p.quantity,null::bigint amount
      from quartermaster79.purchase p where rights.can_receive
      union all
      select case l.action->>'kind' when 'reserve' then 'reservation' when 'release' then 'release' else 'pack' end,
        l.recorded_at,l.request_id::text,o.reference,null,null,null
      from quartermaster84w.command_log l join public.orders o on o.id=l.order_id
      where rights.can_pack and l.action->>'kind' in ('reserve','release','complete')
      union all
      select 'postage',e.at,e.id::text,o.reference,null,null,e.minor
      from quartermaster79.postage_evidence e join public.orders o on o.id=e.order_id where rights.can_record_postage
      union all
      select 'finance',r.recorded_at,f.request_id::text,o.reference,null,null,null
      from quartermaster84w.finance_receipts f join public.orders o on o.id=f.order_id
      join public.order_financial_revisions r on r.order_id=f.order_id and r.revision::text=f.result->>'revision'
      where rights.can_approve_finance and f.result->>'outcome'='committed'
      union all
      select 'adjustment',a.recorded_at,a.request_id::text,null,a.sku,null,null
      from quartermaster86.inventory_audit a where rights.can_receive
    ), page as (
      select * from entries
      where strpos(lower(kind||' '||coalesce(order_ref,'')||' '||coalesce(sku,'')),query_text)>0
      order by happened desc,kind,key limit case when p_section='overview' then 5 else 26 end
      offset case when p_section='overview' then 0 else p_page*page_size end
    )
    select coalesce(jsonb_agg(to_jsonb(p)-'key' order by happened desc,kind,key),'[]'),count(*)
      into rows,matched_count from page p;
  end if;
  if matched_count>page_size then rows:=rows-page_size; end if;
  response:=jsonb_build_object('schema',1,'mode',mode_now,'totals',totals,'rows',rows,
    'has_more',coalesce(matched_count>page_size,false) and p_page<399,
    'capabilities',jsonb_build_object('pack',rights.can_pack,'receive',rights.can_receive,
      'postage',rights.can_record_postage,'finance',rights.can_approve_finance));
  if octet_length(response::text)>96000 then raise exception 'QUARTERMASTER page exceeds limit' using errcode='22023'; end if;
  return response;
end $$;
create or replace function public.quartermaster84w_workspace(p_order uuid) returns jsonb
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
    select coalesce(jsonb_agg(jsonb_build_object('sku',m.sku,'title',left(coalesce(ms.display_sku || ' · ', '') || m.title,120),
      'available',greatest(0,m.quantity - (select count(*) from quartermaster79.packing p
        where p.sku=m.sku and p.state='reserved'))) order by m.sku),'[]')
      into materials from (select m.* from quartermaster79.material m
      where not exists (select from quartermaster86.material_state s where s.sku=m.sku and s.archived)
      order by (m.quantity-(select count(*) from quartermaster79.packing p where p.sku=m.sku and p.state='reserved')>0) desc,m.sku
      limit 25) m
      left join quartermaster86.material_state ms using(sku);
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
commit;

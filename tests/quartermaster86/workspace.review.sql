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
commit;

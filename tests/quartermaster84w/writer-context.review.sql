-- Companion to writer-core.review.sql. Isolated review only.
begin;
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
commit;

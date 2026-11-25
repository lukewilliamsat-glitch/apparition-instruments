-- Review only. Verify GET, Admin denial, and retained reservations in staging before release.
do $guard$
begin
  if md5(pg_get_functiondef('public.quartermaster84w_workspace(uuid)'::regprocedure))
    is distinct from '1b71c963f5d86a8007558b813a48db0e' then
    raise exception 'Unexpected QUARTERMASTER workspace definition';
  end if;
end;
$guard$;

CREATE OR REPLACE FUNCTION public.quartermaster84w_workspace(p_order uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  reserved_packaging jsonb;
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
      'outerMm',m.outer_mm,'tareGrams',m.tare_grams,
      'available',greatest(0,m.quantity - (select count(*) from quartermaster79.packing p
        where p.sku=m.sku and p.state='reserved'))) order by m.sku),'[]')
      into materials from (select m.* from quartermaster79.material m
      where not exists (select from quartermaster86.material_state s where s.sku=m.sku and s.archived)
      order by (m.quantity-(select count(*) from quartermaster79.packing p where p.sku=m.sku and p.state='reserved')>0) desc,m.sku
      limit 25) m
      left join quartermaster86.material_state ms using(sku);
    if pack.state='reserved' then
      select jsonb_build_object('outerMm',m.outer_mm,'tareGrams',m.tare_grams)
        into reserved_packaging from quartermaster79.material m where m.sku=pack.sku;
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
    'reservedPackaging',reserved_packaging,
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
$function$;

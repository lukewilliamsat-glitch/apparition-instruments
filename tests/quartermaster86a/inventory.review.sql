begin;
set local lock_timeout='3s';
set local statement_timeout='20s';

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
commit;

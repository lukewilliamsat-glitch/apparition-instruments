-- Isolated fixture only. Packaging material is consumable stock, never public.inventory.
begin;
do $$ begin
 if current_database()<>'dominion79_fixture' or to_regclass('dominion79.provenance') is null then raise exception 'Disposable DOMINION database required';end if;
end $$;
create schema quartermaster79;
revoke all on schema quartermaster79 from public,anon,authenticated,service_role;
create table quartermaster79.material (
 sku text primary key check(sku ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$'),
 title text not null, reorder_at integer not null check(reorder_at between 0 and 100000),
 quantity bigint not null default 0 check(quantity between 0 and 1000000),
 inner_mm integer[] not null, outer_mm integer[] not null, tare_grams integer not null check(tare_grams between 0 and 25000),
 check(array_length(inner_mm,1)=3 and array_length(outer_mm,1)=3
 and inner_mm[1] between 1 and outer_mm[1] and inner_mm[2] between 1 and outer_mm[2] and inner_mm[3] between 1 and outer_mm[3]
 and outer_mm[1]<=1500 and outer_mm[2]<=1500 and outer_mm[3]<=1500)
);
create table quartermaster79.purchase(
 id uuid primary key, sku text not null references quartermaster79.material,
 supplier uuid not null references ironclad69.suppliers(id),
 reference text not null check(length(trim(reference)) between 3 and 100),
 quantity integer not null check(quantity between 1 and 10000),
 remaining integer not null check(remaining between 0 and quantity),
 total_minor bigint not null check(total_minor between 0 and 10000000),
 received_at timestamptz not null default clock_timestamp(),
 unique (supplier,reference,sku)
);
create table quartermaster79.packing(
 order_id uuid primary key references public.orders,
 request_id uuid not null unique,
 sku text not null references quartermaster79.material, purchase_id uuid references quartermaster79.purchase,
 picked jsonb not null, state text not null check(state in ('reserved','packed','released')),
 measured_mm integer[], measured_grams integer, postal_class text, tracking text,
 packed_at timestamptz, actual_material_minor bigint, estimated_postage_minor bigint, 
 check((state='packed')=(packed_at is not null)), check(actual_material_minor between 0 and 10000000),
 check(estimated_postage_minor between 0 and 1000000)
);
create unique index on quartermaster79.packing(lower(tracking)) where tracking is not null;
create index on quartermaster79.packing (sku,state);
create table quartermaster79.movement(
 id bigint generated always as identity primary key, sku text not null references quartermaster79.material,
 quantity_delta bigint not null, resulting bigint not null check(resulting>=0),
 kind text not null check(kind in ('purchase','packed')),
 purchase_id uuid not null references quartermaster79.purchase,
 order_id uuid references public.orders, recorded_at timestamptz not null default clock_timestamp()
);
do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='quartermaster79' loop
  execute format('alter table quartermaster79.%I enable row level security',t);
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

create function quartermaster79.reserve(p_order uuid,p_request uuid,p_sku text,p_picked jsonb) returns text
language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; old quartermaster79.packing%rowtype; n bigint;
begin
 select * into strict o from public.orders where id=p_order for share;
 if o.payment_status not in ('paid','partially_refunded') or o.fulfillment_applied_at is null
    or o.status not in ('pending','in_production','ready_to_dispatch') then raise exception 'Use an eligible paid unshipped order';end if;
 if p_picked is distinct from dominion79.requirements(o.items) then raise exception 'Pick against the complete saved component BOM';end if;
 perform 1 from quartermaster79.material where sku=p_sku for update;
 if not found then raise exception 'Unknown packaging SKU';end if;
 select * into old from quartermaster79.packing where order_id=p_order;
 if found then
  if (old.request_id,old.sku,old.picked) is distinct from (p_request,p_sku,p_picked) then
   raise exception 'Packing reservation conflict' using errcode='23505';
  end if;
  return old.state;
 end if;
 select m.quantity-(select count(*) from quartermaster79.packing where sku=p_sku and state='reserved') into n
 from quartermaster79.material m where m.sku=p_sku;
 if n<1 then raise exception 'No unreserved packaging' using errcode='23514';end if;
 insert into quartermaster79.packing(order_id,request_id,sku,picked,state) values(p_order,p_request,p_sku,p_picked,'reserved');
 return 'reserved';
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

create function quartermaster79.release(p_order uuid,p_request uuid) returns text
language plpgsql security definer set search_path='' as $$
declare k quartermaster79.packing%rowtype; begin
 select * into strict k from quartermaster79.packing where order_id=p_order for update;
 if k.request_id<>p_request or k.state='packed' then raise exception 'Can't release completed or unrelated packing';end if;
 perform 1 from quartermaster79.material where sku=k.sku for update;
 update quartermaster79.packing set state='released' where order_id=p_order;
 return 'released';
end $$;

create function quartermaster79.ready_stock(p_sku text) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('sku',m.sku,'physical',m.quantity,'available',s.available,'reorder',s.available<=m.reorder_at)
 from quartermaster79.material m
 cross join lateral (select m.quantity-(select count(*) from quartermaster79.packing p where p.sku=m.sku and state='reserved') as available) s
 where m.sku=p_sku;
$$;

create function quartermaster79.cost_evidence(p_order uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('orderId',p_order,'currency','GBP','packagingActualMinor',k.actual_material_minor,
  'postageEstimatedMinor',k.estimated_postage_minor,'postageActualMinor',null,
  'purchaseReference',b.reference,'packageStockMovement',m.id,'readyForDispatchReview',true,'dispatched',false)
 from quartermaster79.packing k join quartermaster79.purchase b on b.id=k.purchase_id
 join quartermaster79.movement m on m.order_id=k.order_id and m.kind='packed'
 where k.order_id=p_order and k.state='packed';
$$;
revoke all on all tables in schema quartermaster79 from public,anon,authenticated,service_role;
revoke all on all sequences in schema quartermaster79 from public,anon,authenticated,service_role;
revoke all on all functions in schema quartermaster79 from public,anon,authenticated,service_role;
grant usage on schema quartermaster79 to service_role;
grant execute on all functions in schema quartermaster79 to service_role;
commit;

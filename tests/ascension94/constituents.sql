-- ASCENSION 94: additive immutable constituent evidence; no stock/financial writes.
create table ironclad69.constituent_snapshots (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id), line_index integer not null check(line_index between 0 and 99),
 component_id text not null references public.components(id), batch_id uuid not null references ironclad69.batches(id),
 quantity integer not null check(quantity between 1 and 10000),
 batch_total_minor bigint not null check(batch_total_minor between 0 and 1000000000000),
 batch_quantity bigint not null check(batch_quantity>0),
 basis text not null check(basis in ('allocated_batch','verified_physical_trace')),
 evidence text not null check(length(evidence) between 8 and 300),
 actor uuid not null, captured_at timestamptz not null default clock_timestamp(), items_hash bytea not null,
 unique(order_id,line_index,component_id,batch_id)
);
alter table ironclad69.constituent_snapshots enable row level security;
revoke all on ironclad69.constituent_snapshots from public,anon,authenticated,service_role;

create function ironclad69.constituent_immutable() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Constituent evidence is immutable' using errcode='55000';end $$;
revoke all on function ironclad69.constituent_immutable() from public,anon,authenticated,service_role;
create trigger immutable before update or delete on ironclad69.constituent_snapshots
 for each row execute function ironclad69.constituent_immutable();

create function ironclad69.capture_constituent(a uuid,d jsonb) returns jsonb language plpgsql set search_path='' as $$
declare o public.orders%rowtype; b ironclad69.batches%rowtype; item jsonb; pos integer; comp text;
 wanted bigint; used bigint; qty integer; ref uuid; basis text;
begin
 select * into strict o from public.orders where id=(d->>'orderId')::uuid for update;
 if o.currency<>'GBP' or o.payment_status not in ('paid','partially_refunded','refunded') or o.fulfillment_applied_at is null then
  raise exception 'A recorded fulfilled GBP order is required' using errcode='22023';end if;
 pos:=ironclad69.integer(d->'lineIndex',0,99);item:=o.items->pos;
 if item->>'type' not in ('assembly','kit') or jsonb_typeof(item#>'{snapshot,stockRequirements}') is distinct from 'array'
  or jsonb_array_length(item#>'{snapshot,stockRequirements}') not between 1 and 100 then raise exception 'Saved assembly or kit BOM required';end if;
 comp:=ironclad69.clean(d->>'componentId',1,120);
 select sum(ironclad69.integer(value->'quantity',1,10000)) into wanted
  from jsonb_array_elements(item#>'{snapshot,stockRequirements}') where value->>'componentId'=comp;
 wanted:=wanted*ironclad69.integer(item->'quantity',1,99);
 if wanted is null or wanted>10000 then raise exception 'Component is not in the bounded saved BOM';end if;
 qty:=ironclad69.integer(d->'quantity',1,10000);
 select coalesce(sum(quantity),0) into used from ironclad69.constituent_snapshots where order_id=o.id and line_index=pos and component_id=comp;
 if used+qty>wanted or exists(select from ironclad69.constituent_snapshots where order_id=o.id and items_hash<>sha256(convert_to(o.items::text,'UTF8'))) then
  raise exception 'Constituent evidence is already complete or the saved BOM changed' using errcode='40001';end if;
 select * into strict b from ironclad69.batches where id=(d->>'batchId')::uuid and component_id=comp for share;
 if b.cost_minor is null or qty>b.quantity or b.quantity-b.remaining<qty or
  (case when b.origin='opening' and b.cost_evidence_date is not null then b.cost_evidence_date>(o.fulfillment_applied_at at time zone 'Europe/London')::date else b.received_at>o.fulfillment_applied_at end) then
  raise exception 'The batch does not provide attributable historical expenditure';end if;
 basis:=d->>'basis';
 insert into ironclad69.constituent_snapshots(order_id,line_index,component_id,batch_id,quantity,batch_total_minor,batch_quantity,basis,evidence,actor,items_hash)
 values(o.id,pos,comp,b.id,qty,b.cost_minor,b.quantity,basis,ironclad69.clean(d->>'evidence',8,300),a,sha256(convert_to(o.items::text,'UTF8'))) returning id into ref;
 return jsonb_build_object('id',ref,'basis',basis,'componentId',comp,'quantity',qty);
end $$;
revoke all on function ironclad69.capture_constituent(uuid,jsonb) from public,anon,authenticated,service_role;

-- Pure bounded projection. A complete saved BOM is required; no current catalogue costs.
create function ironclad69.constituent_projection(items jsonb, traces jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare item jsonb; part record; trace jsonb; rows jsonb; costs jsonb:='[]'; pos integer:=0; q integer;
 total numeric; used bigint; wanted bigint; part_cost numeric; complete boolean; verified boolean; minor bigint; identity text;
begin
 if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items)>100 or jsonb_typeof(traces) is distinct from 'array'
  or jsonb_array_length(traces)>1000 or octet_length(traces::text)>500000 then raise exception 'Constituent projection exceeds bounds';end if;
 for item in select value from jsonb_array_elements(items) loop
  if item->>'type' in ('assembly','kit') then
   q:=ironclad69.integer(item->'quantity',1,99);total:=0;complete:=true;verified:=true;
   if jsonb_typeof(item#>'{snapshot,stockRequirements}') is distinct from 'array' or jsonb_array_length(item#>'{snapshot,stockRequirements}') not between 1 and 100 then
    pos:=pos+1;continue;end if;
   for part in select value->>'componentId' component,sum(ironclad69.integer(value->'quantity',1,10000)) quantity
    from jsonb_array_elements(item#>'{snapshot,stockRequirements}') group by value->>'componentId' loop
    wanted:=part.quantity*q;used:=0;part_cost:=0;
    select coalesce(jsonb_agg(value order by value->>'batch_id'),'[]') into rows from jsonb_array_elements(traces)
     where value->>'line_index'=pos::text and value->>'component_id'=part.component;
    for trace in select value from jsonb_array_elements(rows) loop
     used:=used+ironclad69.integer(trace->'quantity',1,10000);
     part_cost:=part_cost+ironclad69.integer(trace->'batch_total_minor',0,1000000000000)::numeric*ironclad69.integer(trace->'quantity',1,10000)/ironclad69.integer(trace->'batch_quantity',1,1000000000);
     if trace->>'basis' is distinct from 'verified_physical_trace' then verified:=false;end if;
    end loop;
    if used<>wanted then complete:=false;end if;
    total:=total+part_cost;
   end loop;
   -- Extra or duplicated identities invalidate attribution instead of silently inflating costs.
   if exists(select from jsonb_array_elements(traces) t where t->>'line_index'=pos::text and not exists
    (select from jsonb_array_elements(item#>'{snapshot,stockRequirements}') p where p->>'componentId'=t->>'component_id')) then complete:=false;end if;
   if complete and total<=1000000000000 then
    minor:=round(total);identity:=encode(sha256(convert_to(items::text||traces::text||pos::text,'UTF8')),'hex');
    costs:=costs||jsonb_build_array(jsonb_build_object('line_index',pos,'component_id',coalesce(item->>'productId',item#>>'{snapshot,assemblyId}',''),
     'quantity',q,'batch_id','constituents:'||identity,'batch_total_minor',minor,'batch_quantity',q,'line_cost_minor',minor,
     'basis',case when verified then 'verified_physical_trace' else 'allocated_batch' end,
     'evidence',case when verified then 'Saved BOM and immutable constituent batch trace' else 'Saved BOM and recorded batch allocation; physical trace unverified' end));
   end if;
  end if;
  pos:=pos+1;
 end loop;
 return costs;
end $$;
revoke all on function ironclad69.constituent_projection(jsonb,jsonb) from public,anon,authenticated,service_role;

create or replace function public.ironclad69_cost_read(p_order uuid) returns jsonb language plpgsql stable security definer set search_path='' set statement_timeout='5s' as $$
declare a uuid:=ironclad69.actor();o public.orders%rowtype;outcome jsonb;traces jsonb;derived jsonb;h record;p record;
begin
 select * into o from public.orders where id=p_order;
 if not found then return '[]';end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into outcome from (
  select line_index,component_id,batch_id,quantity,batch_total_minor,batch_quantity,line_cost_minor,basis,evidence
   from ironclad69.cost_snapshots where order_id=p_order order by line_index limit 100)x;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into traces from (
  select line_index,component_id,batch_id,quantity,batch_total_minor,batch_quantity,basis
   from ironclad69.constituent_snapshots where order_id=p_order and items_hash=sha256(convert_to(o.items::text,'UTF8')) order by line_index,component_id,batch_id limit 1001)x;
 if jsonb_array_length(traces)>1000 then raise exception 'Constituent history exceeds bounds';end if;
 -- UNITY is optional: never force a payment runtime installation for financial evidence.
 -- Existing accepted provenance is an allocated accounting basis, not physical batch proof.
 if to_regclass('dominion79.provenance') is not null and o.payment_status in ('paid','partially_refunded','refunded') then
  for p in execute $q$
   with wanted as (
    select ordinality-1 line_index,i->>'productId' product,
     coalesce(i->'snapshot'->'stockRequirements',jsonb_build_array(jsonb_build_object('componentId',i->>'productId','quantity',1))) parts,(i->>'quantity')::bigint units
     from public.orders o,jsonb_array_elements(o.items) with ordinality t(i,ordinality) where o.id=$1),
   flat as (select line_index,part->>'componentId' component_id,sum((part->>'quantity')::bigint*units) quantity from wanted,jsonb_array_elements(parts) part group by 1,2),
   totals as (select component_id,sum(quantity) quantity from flat group by 1)
   select f.line_index::int,f.component_id,f.quantity,t.quantity total_quantity,p.batches,coalesce((select sum(z.quantity) from flat z where z.component_id=f.component_id and z.line_index<f.line_index),0) before_quantity
    from flat f join totals t using(component_id) join dominion79.provenance p on p.order_id=$1 and p.component_id=f.component_id and p.quantity=t.quantity
    join dominion79.holds h on h.order_id=p.order_id and h.state='consumed' and h.order_items_hash=sha256(convert_to($2::jsonb::text,'UTF8'))
  $q$ using p_order,o.items loop
   if not exists(select from jsonb_array_elements(traces) t where (t->>'line_index')::int=p.line_index and t->>'component_id'=p.component_id)
    and jsonb_typeof(p.batches)='array' and jsonb_array_length(p.batches) between 1 and 250
    and not exists(select from jsonb_array_elements(p.batches) b where b->'batchCostMinor'='null' or not b?'batchCostMinor' or b->>'basis' is distinct from 'estimated-batch')
    and (select sum((b->>'quantity')::bigint) from jsonb_array_elements(p.batches)b)=p.total_quantity then
    -- Cumulative minor-unit allocation reconciles all lines to the frozen consumed total.
    select jsonb_build_array(jsonb_build_object('line_index',p.line_index,'component_id',p.component_id,'batch_id','unity-consumption',
     'quantity',p.quantity,'batch_total_minor',floor(round(sum((b->>'batchCostMinor')::numeric*(b->>'quantity')::numeric/(b->>'batchUnits')::numeric))*(p.before_quantity+p.quantity)/p.total_quantity)
      -floor(round(sum((b->>'batchCostMinor')::numeric*(b->>'quantity')::numeric/(b->>'batchUnits')::numeric))*p.before_quantity/p.total_quantity),
     'batch_quantity',p.quantity,'basis','allocated_batch')) into derived from jsonb_array_elements(p.batches)b;
    traces:=traces||derived;
   end if;
  end loop;
 end if;
 if o.currency='GBP' then outcome:=outcome||ironclad69.constituent_projection(o.items,traces);end if;
 if octet_length(outcome::text)>100000 or jsonb_array_length(outcome)>100 then raise exception 'Cost response exceeds bounds';end if;
 return outcome;
end $$;
revoke all on function public.ironclad69_cost_read(uuid) from public,anon,service_role;
grant execute on function public.ironclad69_cost_read(uuid) to authenticated;

CREATE OR REPLACE FUNCTION ironclad69.capture_cost(a uuid, d jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare o public.orders%rowtype; b ironclad69.batches%rowtype; line jsonb;
 pos int; qty int; comp text; basis text; ref uuid;
begin
 select * into strict o from public.orders where id=(d->>'orderId')::uuid for share;
 if o.payment_status not in('paid','partially_refunded','refunded') or o.fulfillment_applied_at is null
 then raise exception 'Use a recorded fulfilment, not a quote or unpaid order';end if;
 pos:=ironclad69.integer(d->'lineIndex',0,249);line:=o.items->pos;
 if line->>'type' in ('assembly','kit') then return ironclad69.capture_constituent(a,d);end if;
 if jsonb_typeof(line) is distinct from 'object' or line->>'type' is distinct from 'component' or line->>'productId' is null
 then raise exception 'The selected order line is not a directly identified component';end if;
 qty:=ironclad69.integer(line->'quantity',1,100000);comp:=line->>'productId';
 select * into strict b from ironclad69.batches where id=(d->>'batchId')::uuid and component_id=comp for share;
 if b.cost_minor is null or (case when b.origin='opening' and b.cost_evidence_date is not null then b.cost_evidence_date>(o.fulfillment_applied_at at time zone 'Europe/London')::date else b.received_at>o.fulfillment_applied_at end) or qty>b.quantity
 then raise exception 'The chosen batch does not provide valid evidence for this sale';end if;
 basis:=d->>'basis';
 insert into ironclad69.cost_snapshots(order_id,line_index,component_id,batch_id,quantity,batch_total_minor,batch_quantity,line_cost_minor,basis,evidence,actor)
 values(o.id,pos,comp,b.id,qty,b.cost_minor,b.quantity,round(b.cost_minor::numeric*qty/b.quantity)::bigint,basis,ironclad69.clean(d->>'evidence',8,300),a)
 returning id into ref;
 return jsonb_build_object('id',ref,'basis',basis);
end $function$

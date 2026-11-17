-- 69A: preserve accepted purchase and inventory transactions; add a guarded draft/quick workflow.
alter table ironclad69.purchase_orders
 add column purchase_date date,
 add column notes text not null default '',
 add column revision bigint not null default 0;
alter table ironclad69.receipts add column effective_date date;
alter table ironclad69.batches add column cost_evidence_date date;
create table ironclad69.opening_evidence(
 batch_id uuid primary key references ironclad69.batches(id), total_minor bigint not null check(total_minor>=0),
 effective_date date not null, evidence text not null, actor uuid not null, recorded_at timestamptz not null default now()
);
alter table ironclad69.opening_evidence enable row level security;
revoke all on ironclad69.opening_evidence from public,anon,authenticated,service_role;

create function ironclad69.business_date(value text) returns date language plpgsql stable set search_path='' as $$
declare current_day date:=(now() at time zone 'Europe/London')::date; chosen date;
begin
 if value is null or value='' then return current_day;end if;
 if value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Enter a valid purchase or receipt date';end if;
 chosen:=value::date;
 if chosen<date '1900-01-01' or chosen>current_day then raise exception 'Date must not be in the future';end if;
 return chosen;
end $$;

-- An absent deferred Commerce schema is an explicit disabled state.
-- A partially installed or incompatible schema fails closed.
create function ironclad69.reservations(c text) returns bigint language plpgsql stable set search_path='' as $$
declare total bigint;
begin
 if to_regnamespace('commerce67') is null then return 0;end if;
 execute 'select coalesce(sum(quantity),0)::bigint from commerce67.holds where component_id=$1' into total using c;
 return total;
end $$;
create function ironclad69.commerce_enabled() returns boolean language plpgsql stable set search_path='' as $$
declare enabled boolean;
begin
 if to_regnamespace('commerce67') is null then return false;end if;
 execute 'select enabled from commerce67.control' into strict enabled;
 return enabled is distinct from false;
end $$;
revoke all on function ironclad69.reservations(text),ironclad69.commerce_enabled(),ironclad69.business_date(text)
 from public,anon,authenticated,service_role;
create or replace function ironclad69.require_bench(c text) returns void language plpgsql set search_path='' as $$
begin
  if not exists(select from public.components q where q.id=c and not q.active and not q.individually and not q.in_kits for update)
   or exists(select from public.assembly_bom where component_id=c)
   or exists(select from public.kit_permitted_components where component_id=c)
   or ironclad69.reservations(c)>0
   or ironclad69.commerce_enabled()
   or exists(select from public.orders z where z.payment_status='unpaid' and z.items::text like '%'||c||'%')
   then raise exception 'Set allocation requires an isolated, non-selling component with no outstanding checkout or hold' using errcode='23514';end if;
end $$;

create or replace function ironclad69.capture_cost(a uuid,d jsonb) returns jsonb language plpgsql set search_path='' as $$
declare o public.orders%rowtype; b ironclad69.batches%rowtype; line jsonb;
 pos int; qty int; comp text; basis text; ref uuid;
begin
 select * into strict o from public.orders where id=(d->>'orderId')::uuid for share;
 if o.payment_status not in('paid','partially_refunded','refunded') or o.fulfillment_applied_at is null
 then raise exception 'Use a recorded fulfilment, not a quote or unpaid order';end if;
 pos:=ironclad69.integer(d->'lineIndex',0,249);line:=o.items->pos;
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
end $$;

create or replace function public.ironclad69_read(p_view text,p_filter jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare who uuid:=ironclad69.actor(); lim int; off int; q text; cat_filter text; c text; batch uuid; supplier uuid; status text;
 selected uuid; result jsonb; 
begin
 if jsonb_typeof(p_filter) is distinct from 'object' or octet_length(p_filter::text)>2000 then raise exception 'Invalid query';end if;
 lim:=case when p_filter?'limit' then ironclad69.integer(p_filter->'limit',1,100) else 25 end;
 off:=case when p_filter?'offset' then ironclad69.integer(p_filter->'offset',0,10000) else 0 end;
 q:=lower(ironclad69.clean(p_filter->>'q',0,100));cat_filter:=p_filter->>'category';c:=p_filter->>'componentId';
 batch:=(nullif(p_filter->>'batchId',''))::uuid;supplier:=(nullif(p_filter->>'supplierId',''))::uuid;
 status:=p_filter->>'status';selected:=(nullif(p_filter->>'id',''))::uuid;
 case p_view
 when 'inventory' then
  with base as (
   select i.component_id,cp.sku,cp.name,cp.category,i.quantity as physical,i.stock_unit,t.revision,t.low,t.target,
    ironclad69.reservations(i.component_id) as reserved,
    coalesce((select sum(pl.quantity-pl.received) from ironclad69.purchase_lines pl join ironclad69.purchase_orders po on po.id=pl.po_id
       where pl.component_id=i.component_id and po.state in('ordered','partial')),0) as incoming,
    coalesce((select count(*) from ironclad69.batches b join ironclad69.measurements m on m.batch_id=b.id
     where b.component_id=i.component_id and m.quality<>'retired'),0) as measured,
    coalesce((select count(*) from ironclad69.batches b join ironclad69.measurements m on m.batch_id=b.id
     where b.component_id=i.component_id and m.quality in('quarantine','rejected')),0) as quality_held,
    coalesce((select count(*) from ironclad69.sets s join ironclad69.set_members sm on sm.set_id=s.id and sm.active
     where s.component_id=i.component_id and s.state='allocated'),0) as allocated,
    (select sum(b.remaining) from ironclad69.batches b where b.component_id=i.component_id) as covered,
    (select sum(b.remaining) from ironclad69.batches b where b.component_id=i.component_id and b.cost_minor is not null) as known_units,
    (select round(sum(b.cost_minor::numeric*b.remaining/b.quantity)) from ironclad69.batches b
     where b.component_id=i.component_id and b.cost_minor is not null and b.remaining>0) as known_value_minor
   from public.inventory i join public.components cp on cp.id=i.component_id left join ironclad69.tracking t using(component_id)
   where (q='' or strpos(lower(cp.name||' '||cp.sku),q)>0) and (cat_filter is null or cp.category=cat_filter) and (c is null or i.component_id=c)
   and (supplier is null or exists(select from ironclad69.supplier_parts sp where sp.supplier_id=supplier and sp.component_id=i.component_id)
        or exists(select from ironclad69.purchase_orders p join ironclad69.purchase_lines l on l.po_id=p.id where p.supplier_id=supplier and l.component_id=i.component_id))
   and (batch is null or exists(select from ironclad69.batches bt where bt.id=batch and bt.component_id=i.component_id))
  ), counted as (
   select *,greatest(physical-reserved-allocated-quality_held,0) as available,
   (revision is not null and coalesce(covered,0)<>physical) or reserved+allocated+quality_held>physical as reconciliation
   from base
  ) select coalesce(jsonb_agg(to_jsonb(v)),'[]') into result
  from (select *,case when target is not null and available<=low then greatest(target-available-incoming,0) end as suggested
   from counted where (not coalesce((p_filter->>'measured')::boolean,false) or measured>0)
   and (status is null or case status when 'low' then available>0 and available<=low when 'out' then available=0
         when 'incoming' then incoming>0 when 'reconciliation' then reconciliation else false end)
   order by component_id limit lim offset off) v;
 when 'suppliers' then
  select coalesce(jsonb_agg(to_jsonb(v)),'[]') into result from(
   select s.id,s.name,s.reference,s.site,s.contact,s.location,s.currency,s.notes,s.active,
    (select count(*) from ironclad69.purchase_orders o where o.supplier_id=s.id) as purchase_count,
    (select count(distinct p.component_id) from ironclad69.supplier_parts p where p.supplier_id=s.id) as linked_components
   from ironclad69.suppliers s where q='' or strpos(lower(s.name||' '||s.reference),q)>0 order by s.active desc,s.name,s.id limit lim offset off) v;
 when 'purchaseChoices' then
  select coalesce(jsonb_agg(to_jsonb(v)),'[]') into result from(
   select i.component_id,cp.name,cp.sku,cp.manufacturer,
   (select case when count(distinct pl.part_no)=1 then min(pl.part_no) end
     from ironclad69.purchase_lines pl join ironclad69.purchase_orders po on po.id=pl.po_id
     where pl.component_id=i.component_id and po.supplier_id=supplier and po.state in('ordered','partial','received') and pl.part_no<>'') as part_no
   from public.inventory i join public.components cp on cp.id=i.component_id
   where i.stock_unit='item' and (q='' or strpos(lower(cp.name||' '||cp.sku||' '||cp.manufacturer),q)>0)
   order by (not cp.active),cp.name,i.component_id limit least(lim,25) offset off) v;
 when 'purchases' then
  select coalesce(jsonb_agg(to_jsonb(v)),'[]') into result from(
   select o.id,o.reference,o.state,s.name as supplier,o.supplier_id,o.currency,o.method,o.charges,o.evidence,o.notes,o.revision,
   coalesce(o.purchase_date,(o.created_at at time zone 'Europe/London')::date) as purchase_date,
   (select sum(pl.quantity) from ironclad69.purchase_lines pl where pl.po_id=o.id) as ordered_qty,
   (select sum(pl.received) from ironclad69.purchase_lines pl where pl.po_id=o.id) as received_qty,
   (select coalesce(sum(pl.merchandise_minor+pl.allocation_minor),0) from ironclad69.purchase_lines pl where pl.po_id=o.id) as total_minor
   from ironclad69.purchase_orders o join ironclad69.suppliers s on s.id=o.supplier_id
   where (supplier is null or o.supplier_id=supplier) and (status is null or o.state=status) and (q='' or strpos(lower(o.reference||' '||s.name),q)>0)
   order by o.created_at desc,o.id limit lim offset off) v;
 when 'purchaseLines' then
  select coalesce(jsonb_agg(to_jsonb(v)),'[]') into result from(
   select l.id,l.component_id,c0.name,l.part_no,l.quantity,l.received,l.supplier_unit_minor,l.merchandise_minor,l.allocation_minor
   from ironclad69.purchase_lines l join public.components c0 on c0.id=l.component_id where l.po_id=selected order by l.seq) v;
 when 'batches' then
  select coalesce(jsonb_agg(to_jsonb(v)),'[]') into result from(
   select b.id,b.component_id,b.origin,b.quantity,b.remaining,b.cost_minor,b.lot,b.evidence,b.notes,b.received_at,
    r.reference as receipt_ref,o.reference as purchase_ref,s.name as supplier,l.part_no,
    (select count(*) from ironclad69.measurements m where m.batch_id=b.id and m.quality<>'retired') as measured
   from ironclad69.batches b left join ironclad69.receipts r on r.id=b.receipt_id left join ironclad69.purchase_orders o on o.id=r.po_id
   left join ironclad69.suppliers s on s.id=o.supplier_id left join ironclad69.purchase_lines l on l.id=b.line_id
   where (c is null or b.component_id=c) and (supplier is null or o.supplier_id=supplier) order by b.received_at desc,b.id limit lim offset off) v;
 when 'measurements' then
  if batch is null and c is null then raise exception 'Choose a batch or component';end if;
  select coalesce(jsonb_agg(to_jsonb(v)),'[]') into result from(
   select m.id,m.batch_id,b.component_id,m.slot,m.nominal_ohm,m.resistance_ohm,m.quality,m.taper,m.shaft,m.measured_at,m.notes,
    b.cost_minor,b.quantity as batch_quantity,exists(select from ironclad69.set_members sm where sm.unit_id=m.id and sm.active) as allocated
   from ironclad69.measurements m join ironclad69.batches b on b.id=m.batch_id
   where (batch is null or m.batch_id=batch) and (c is null or b.component_id=c) order by m.slot,m.id limit lim offset off) v;
 when 'sets' then
  select coalesce(jsonb_agg(to_jsonb(v)),'[]') into result from(
   select s.id,s.component_id,s.state,s.tolerance_bp,s.created_at,
   (select jsonb_agg(jsonb_build_object('id',m.id,'ohm',m.resistance_ohm) order by m.resistance_ohm,m.id)
      from ironclad69.set_members sm join ironclad69.measurements m on m.id=sm.unit_id where sm.set_id=s.id) as units
   from ironclad69.sets s where c is null or s.component_id=c order by s.created_at desc,s.id limit lim offset off) v;
 when 'movements' then
  if c is null then raise exception 'Choose a component';end if;
  select coalesce(jsonb_agg(to_jsonb(v)),'[]') into result from(
   select id,component_id,kind,previous,delta,resulting,reason,source,actor,created_at from ironclad69.movements
   where component_id=c order by id desc limit lim offset off) v;
 when 'stocktakes' then
  select coalesce(jsonb_agg(to_jsonb(v)),'[]') into result from(
   select t.id,t.state,t.reason,t.created_at,t.applied_at from ironclad69.stocktakes t
   order by t.created_at desc,t.id limit lim offset off) v;
 when 'stocktakeLines' then
  select coalesce(jsonb_agg(to_jsonb(v)),'[]') into result from(
   select l.component_id,cp.name,l.expected,l.counted,l.revision,l.revision<>t.revision as stale
   from ironclad69.stocktake_lines l join public.components cp on cp.id=l.component_id join ironclad69.tracking t on t.component_id=l.component_id
   where l.stocktake_id=selected order by l.component_id) v;
 else raise exception 'Unknown inventory view';
 end case;
 return result;
end $$;

create or replace function public.ironclad69_write(p_id uuid,p_action text,p_body jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
<<draft_work>>
declare a uuid:=ironclad69.actor(); old_req ironclad69.requests%rowtype; h bytea; o ironclad69.purchase_orders%rowtype;
 l ironclad69.purchase_lines%rowtype; b ironclad69.batches%rowtype; s ironclad69.sets%rowtype; x jsonb; y jsonb;
 id uuid; supplier uuid; rid uuid; sid uuid; c text; why text; currency_code text; method text; part text;
 n bigint; prev bigint; expected bigint; total bigint:=0; weights bigint:=0; cumulative bigint:=0; assigned bigint:=0; nw bigint;
 qty int; price bigint; merch bigint; alloc bigint; count_lines int:=0; seq int:=0; live_count int;
 chosen uuid[]; incoming jsonb; items jsonb:='[]'; response jsonb; r record; quick_ref text; quick_lines jsonb; quick_order uuid; quick_receipt jsonb;
begin
 if p_id is null or jsonb_typeof(p_body) is distinct from 'object' or octet_length(p_body::text)>25000 then raise exception 'Invalid request size or type';end if;
 h:=sha256(convert_to(p_body::text,'UTF8'));
 insert into ironclad69.requests(id,actor,action,body_hash) values(p_id,a,p_action,h) on conflict do nothing;
 if not found then
  select * into strict old_req from ironclad69.requests where ironclad69.requests.id=p_id;
  if old_req.actor<>a or old_req.action<>p_action or old_req.body_hash<>h then raise exception 'Request already used for different inputs' using errcode='23505';end if;
  return old_req.result||jsonb_build_object('replayed',true);
 end if;
 case p_action
 when 'recordCost' then
  response:=ironclad69.capture_cost(a,p_body);
 when 'supplier' then
  if coalesce(p_body->>'site','')<>'' and p_body->>'site' !~ '^https?://[^[:space:]]+$' then raise exception 'Enter an HTTP(S) supplier URL';end if;
  insert into ironclad69.suppliers(name,reference,site,contact,location,currency,notes)
  values(ironclad69.clean(p_body->>'name',1,120),ironclad69.clean(p_body->>'reference',0,100),ironclad69.clean(p_body->>'site',0,250),
   ironclad69.clean(p_body->>'contact',0,200),ironclad69.clean(p_body->>'location',0,120),
   upper(ironclad69.clean(p_body->>'currency',3,3)),ironclad69.clean(p_body->>'notes',0,600)) returning ironclad69.suppliers.id into id;
  response:=jsonb_build_object('id',id);
 when 'supplierArchive' then
  update ironclad69.suppliers set active=false where ironclad69.suppliers.id=(p_body->>'id')::uuid returning ironclad69.suppliers.id into strict id;
  response:=jsonb_build_object('id',id,'active',false);
 when 'openingEvidence' then
  select * into strict b from ironclad69.batches q where q.id=(p_body->>'batchId')::uuid for update;
  if b.origin<>'opening' or b.cost_minor is not null then raise exception 'Only a previously unknown opening batch can be evidenced';end if;
  n:=ironclad69.integer(p_body->'totalMinor',0,1000000000000);
  why:=ironclad69.clean(p_body->>'evidence',8,300);
  insert into ironclad69.opening_evidence(batch_id,total_minor,effective_date,evidence,actor)
   values(b.id,n,ironclad69.business_date(p_body->>'date'),why,a);
  update ironclad69.batches q set cost_minor=n,evidence=why,cost_evidence_date=ironclad69.business_date(p_body->>'date') where q.id=b.id;
  response:=jsonb_build_object('id',b.id,'costMinor',n);
 when 'quickPurchase' then
  if nullif(p_body->>'date','') is null then raise exception 'Choose the actual purchase or receipt date';end if;
  quick_ref:=nullif(ironclad69.clean(p_body->>'reference',0,100),'');
  if quick_ref is null then
    -- No second stock increment for a duplicate unreferenced purchase.
    quick_ref:='QS-'||left(md5((p_body-'notes'-'reference')::text),24);
  end if;
  quick_order:=(public.ironclad69_write(md5(p_id::text||':draft')::uuid,'purchase',
   p_body||jsonb_build_object('reference',quick_ref))->>'id')::uuid;
  perform public.ironclad69_write(md5(p_id::text||':order')::uuid,'purchaseState',jsonb_build_object('id',quick_order,'state','ordered'));
  select jsonb_agg(jsonb_build_object('lineId',pl.id,'quantity',pl.quantity) order by pl.seq)
   into quick_lines from ironclad69.purchase_lines pl where pl.po_id=quick_order;
  quick_receipt:=public.ironclad69_write(md5(p_id::text||':receive')::uuid,'receive',
   jsonb_build_object('id',quick_order,'reference',quick_ref,'date',p_body->>'date','notes',p_body->>'notes','lines',quick_lines));
  response:=quick_receipt||jsonb_build_object('purchaseId',quick_order,'reference',quick_ref);
 when 'purchase','purchaseEdit' then
  supplier:=(p_body->>'supplierId')::uuid;
  select currency into strict currency_code from ironclad69.suppliers where ironclad69.suppliers.id=supplier and active for share;
  currency_code:=upper(ironclad69.clean(coalesce(p_body->>'currency',currency_code),3,3));
  why:=ironclad69.clean(p_body->>'evidence',case when currency_code='GBP' then 0 else 5 end,300);
  method:=p_body->>'method';
  if method is null or method not in('quantity','value','manual') then raise exception 'Choose an allocation method';end if;
  y:=coalesce(p_body->'charges','{}');if jsonb_typeof(y)<>'object' or exists(select key from jsonb_object_keys(y) key where key not in('freight','duty','nonRecoverableTax','extra','credit')) then raise exception 'Invalid charge classification';end if;
  for x in select value from jsonb_each(y) loop perform ironclad69.integer(x,0,1000000000);end loop;
  select coalesce(sum(case when key='credit' then -(value::text)::bigint else (value::text)::bigint end),0) into total from jsonb_each(y);
  incoming:=p_body->'lines';
  if jsonb_typeof(incoming) is distinct from 'array' or jsonb_array_length(incoming) not between 1 and 30 then raise exception 'Enter one to 30 purchase lines';end if;
  for x in select value from jsonb_array_elements(incoming) loop
   qty:=ironclad69.integer(x->'quantity',1,100000);price:=ironclad69.integer(x->'unitMinor',0,100000000);
   merch:=case when currency_code='GBP' then qty*price else ironclad69.integer(x->'gbpMinor',0,1000000000000) end;
   weights:=weights+case when method='quantity' then qty when method='value' then merch else 0 end;
  end loop;
  if method='value' and weights=0 and total<>0 then raise exception 'Value allocation requires positive merchandise';end if;
  if p_action='purchaseEdit' then
   select * into strict o from ironclad69.purchase_orders q where q.id=(p_body->>'id')::uuid for update;
   if o.state<>'draft' or exists(select from ironclad69.purchase_lines where po_id=o.id and received<>0) then
    raise exception 'Only unreceived drafts can be edited';
   end if;
   if o.revision<>ironclad69.integer(p_body->'revision',0,9007199254740991) then
    raise exception 'Purchase draft changed; reload before saving' using errcode='40001';
   end if;
   id:=o.id;
   update ironclad69.purchase_orders q set supplier_id=supplier,reference=ironclad69.clean(p_body->>'reference',1,100),
    currency=currency_code,method=draft_work.method,charges=y,evidence=why,
    purchase_date=ironclad69.business_date(p_body->>'date'),notes=ironclad69.clean(p_body->>'notes',0,300),revision=o.revision+1 where q.id=id;
   delete from ironclad69.purchase_lines pl where pl.po_id=id;
  else
   insert into ironclad69.purchase_orders(supplier_id,reference,currency,method,charges,evidence,actor,purchase_date,notes)
   values(supplier,ironclad69.clean(p_body->>'reference',1,100),currency_code,method,y,why,a,
    ironclad69.business_date(p_body->>'date'),ironclad69.clean(p_body->>'notes',0,300)) returning ironclad69.purchase_orders.id into id;
  end if;
  for x in select value from jsonb_array_elements(incoming) loop
   seq:=seq+1;c:=ironclad69.clean(x->>'componentId',1,120);part:=ironclad69.clean(x->>'partNo',0,100);
   if not exists(select from public.inventory where component_id=c and stock_unit='item') then raise exception 'Component requires existing item inventory';end if;
   qty:=ironclad69.integer(x->'quantity',1,100000);price:=ironclad69.integer(x->'unitMinor',0,100000000);
   merch:=case when currency_code='GBP' then qty*price else ironclad69.integer(x->'gbpMinor',0,1000000000000) end;
   if method='manual' then alloc:=ironclad69.integer(x->'allocationMinor',-10000000000,10000000000);
   elsif weights=0 then alloc:=0;
   else
    cumulative:=cumulative+case when method='quantity' then qty else merch end;
    nw:=trunc(total::numeric*cumulative/weights)::bigint;alloc:=nw-assigned;
   end if;
   assigned:=assigned+alloc;
   insert into ironclad69.purchase_lines(po_id,seq,component_id,part_no,quantity,supplier_unit_minor,merchandise_minor,allocation_minor)
   values(id,seq,c,part,qty,price,merch,alloc);
   if part<>'' then insert into ironclad69.supplier_parts values(supplier,c,part) on conflict do nothing;end if;
  end loop;
  if assigned<>total then raise exception 'Shared costs must reconcile to the purchase total';end if;
  response:=jsonb_build_object('id',id,'state','draft','allocatedMinor',assigned);
 when 'purchaseState' then
  select * into strict o from ironclad69.purchase_orders q where q.id=(p_body->>'id')::uuid for update;
  why:=p_body->>'state';
  if why is null or not ((o.state='draft' and why in('ordered','cancelled')) or (o.state='ordered' and why='cancelled')) then raise exception 'Purchase state cannot be changed';end if;
  update ironclad69.purchase_orders q set state=why,revision=q.revision+1 where q.id=o.id;response:=jsonb_build_object('id',o.id,'state',why);
 when 'receive' then
  select * into strict o from ironclad69.purchase_orders q where q.id=(p_body->>'id')::uuid for update;
  if o.state not in('ordered','partial') then raise exception 'Only an outstanding purchase can be received';end if;
  incoming:=p_body->'lines';
  if jsonb_typeof(incoming) is distinct from 'array' or jsonb_array_length(incoming) not between 1 and 30 then raise exception 'Enter one to 30 receipt lines';end if;
  if (select count(distinct v->>'lineId') from jsonb_array_elements(incoming) v)<>jsonb_array_length(incoming) then raise exception 'Duplicate receipt line';end if;
  -- Global lock order: purchase header then component_id across all receipts.
  perform 1 from public.inventory i where i.component_id in(select pl.component_id from ironclad69.purchase_lines pl where pl.po_id=o.id)
   order by i.component_id for update;
  why:=ironclad69.clean(p_body->>'notes',0,300);
  insert into ironclad69.receipts(po_id,actor,reference,notes,effective_date) values(o.id,a,ironclad69.clean(p_body->>'reference',1,100),why,ironclad69.business_date(p_body->>'date'))
  returning ironclad69.receipts.id into rid;
  for x in select value from jsonb_array_elements(incoming) loop
   select * into strict l from ironclad69.purchase_lines pl where pl.id=(x->>'lineId')::uuid and pl.po_id=o.id for update;
   qty:=ironclad69.integer(x->'quantity',1,100000);
   if qty>l.quantity-l.received then raise exception 'Receipt exceeds outstanding purchase quantity';end if;
   select quantity into strict prev from public.inventory where component_id=l.component_id;
   merch:=l.merchandise_minor+l.allocation_minor;
   alloc:=trunc(merch::numeric*(l.received+qty)/l.quantity)::bigint-trunc(merch::numeric*l.received/l.quantity)::bigint;
   perform ironclad69.change_qty(l.component_id,prev,prev+qty,'receipt','Purchase receipt: '||coalesce(nullif(why,''),'stock received'),a,rid,l.id,
    alloc,ironclad69.clean(x->>'lot',0,100),'Purchase '||o.reference||case when o.evidence<>'' then ' · '||o.evidence else '' end);
   update ironclad69.purchase_lines pl set received=received+qty where pl.id=l.id;
   select q.id into strict id from ironclad69.batches q where q.receipt_id=rid and q.line_id=l.id;
   items:=items||jsonb_build_array(jsonb_build_object('batchId',id,'quantity',qty,'costMinor',alloc));
  end loop;
  why:=case when exists(select from ironclad69.purchase_lines where po_id=o.id and received<quantity) then 'partial' else 'received' end;
  update ironclad69.purchase_orders q set state=why,revision=q.revision+1 where q.id=o.id;
  response:=jsonb_build_object('id',rid,'state',why,'batches',items);
 when 'adjust' then
  c:=p_body->>'componentId';n:=ironclad69.integer(p_body->'quantity',0,9007199254740991);
  expected:=ironclad69.integer(p_body->'expected',0,9007199254740991);why:=ironclad69.clean(p_body->>'reason',5,300);
  if p_body->>'kind' is null or p_body->>'kind' not in('adjustment','damage','return') then raise exception 'Invalid adjustment type';end if;
  if (p_body->>'kind'='damage' and n>=expected) or (p_body->>'kind'='return' and n<=expected) then raise exception 'Quantity direction does not match adjustment type';end if;
  perform 1 from public.inventory where component_id=c for update;
  select revision into prev from ironclad69.tracking t where t.component_id=c;
  if prev is not null and (not p_body?'expectedRevision' or p_body->'expectedRevision'='null' or
   ironclad69.integer(p_body->'expectedRevision',0,9007199254740991)<>prev) then
   raise exception 'Stock revision changed; refresh before adjusting' using errcode='40001';
  end if;
  perform ironclad69.change_qty(c,expected,n,p_body->>'kind',why,a,p_id);response:=jsonb_build_object('quantity',n);
 when 'threshold' then
  c:=p_body->>'componentId';perform ironclad69.enrol(c);
  qty:=ironclad69.integer(p_body->'low',0,1000000);n:=ironclad69.integer(p_body->'target',qty,1000000);
  update ironclad69.tracking set low=qty,target=n where component_id=c;
  response:=jsonb_build_object('componentId',c,'low',qty,'target',n);
 when 'measure' then
  select * into strict b from ironclad69.batches q where q.id=(p_body->>'batchId')::uuid;
  perform 1 from public.inventory where component_id=b.component_id for update;
  select * into strict b from ironclad69.batches q where q.id=b.id for update;
  if not exists(select from public.components q where q.id=b.component_id and lower(q.category) in('potentiometer','potentiometers')) then raise exception 'Precision measurements require a potentiometer';end if;
  incoming:=p_body->'units';if jsonb_typeof(incoming) is distinct from 'array' or jsonb_array_length(incoming) not between 1 and 100 then raise exception 'Enter one to 100 readings';end if;
  n:=ironclad69.integer(p_body->'nominalOhm',100,10000000);
  part:=ironclad69.clean(p_body->>'taper',1,40);why:=ironclad69.clean(p_body->>'shaft',1,60);
  for x in select value from jsonb_array_elements(incoming) loop
   qty:=ironclad69.integer(x->'slot',1,1000000);price:=ironclad69.integer(x->'ohm',100,10000000);
   y:=jsonb_build_object('quality',coalesce(x->>'quality','accepted'));
   if y->>'quality' not in ('accepted','quarantine','rejected') then raise exception 'Unknown measurement quality';end if;
   if y->>'quality'<>'accepted' then perform ironclad69.require_bench(b.component_id);end if;
   if exists(select from ironclad69.measurements m join ironclad69.set_members sm on sm.unit_id=m.id and sm.active where m.batch_id=b.id and m.slot=qty)
    or exists(select from ironclad69.measurements m where m.batch_id=b.id and m.slot=qty and m.quality='retired')
    then raise exception 'Allocated or retired readings cannot be changed';end if;
   insert into ironclad69.measurements(batch_id,slot,nominal_ohm,resistance_ohm,quality,taper,shaft,notes,actor)
   values(b.id,qty,n,price,y->>'quality',part,why,ironclad69.clean(x->>'notes',0,250),a)
   on conflict(batch_id,slot) do update set nominal_ohm=excluded.nominal_ohm,resistance_ohm=excluded.resistance_ohm,
    quality=excluded.quality,taper=excluded.taper,shaft=excluded.shaft,notes=excluded.notes,actor=excluded.actor,measured_at=now();
  end loop;
  select count(*) into live_count from ironclad69.measurements where batch_id=b.id and quality<>'retired';
  if live_count>b.remaining then raise exception 'Recorded readings would exceed remaining batch quantity';end if;
  update ironclad69.tracking set revision=revision+1 where component_id=b.component_id;
  response:=jsonb_build_object('batchId',b.id,'measured',live_count);
 when 'allocate' then
  c:=ironclad69.clean(p_body->>'componentId',1,120);qty:=ironclad69.integer(p_body->'toleranceBp',0,2000);
  perform 1 from public.inventory where component_id=c for update;
  -- Physical bench commitments are isolated from all current sales paths.
  perform ironclad69.require_bench(c);
  incoming:=p_body->'unitIds';
  if jsonb_typeof(incoming) is distinct from 'array' or jsonb_array_length(incoming) not in(2,4) then raise exception 'Select two or four units';end if;
  select array_agg(v::uuid order by v) into chosen from jsonb_array_elements_text(incoming) v;
  select count(*),count(distinct (m.nominal_ohm,lower(m.taper),lower(m.shaft))),min(m.resistance_ohm),max(m.resistance_ohm)
   into count_lines,live_count,prev,n
   from ironclad69.measurements m join ironclad69.batches q on q.id=m.batch_id
   where m.id=any(chosen) and q.component_id=c and m.quality='accepted'
   and not exists(select from ironclad69.set_members sm where sm.unit_id=m.id and sm.active);
  if count_lines<>cardinality(chosen) or live_count<>1 or (n-prev)*10000>prev*qty then raise exception 'Units are unavailable, incompatible, or exceed the tolerance';end if;
  insert into ironclad69.sets(component_id,tolerance_bp,state,actor) values(c,qty,'allocated',a) returning ironclad69.sets.id into id;
  insert into ironclad69.set_members(set_id,unit_id) select id,u from unnest(chosen) u;
  select quantity into strict n from public.inventory where component_id=c;
  update ironclad69.tracking set revision=revision+1 where component_id=c;
  insert into ironclad69.movements(component_id,kind,previous,delta,resulting,reason,actor,source)
  values(c,'set_allocation',n,0,n,'Bench set allocated; no physical deduction',a,id);
  response:=jsonb_build_object('id',id,'state','allocated','unitIds',chosen);
 when 'release' then
  select * into strict s from ironclad69.sets q where q.id=(p_body->>'id')::uuid;
  perform 1 from public.inventory where component_id=s.component_id for update;
  select * into strict s from ironclad69.sets q where q.id=s.id for update;
  why:=ironclad69.clean(p_body->>'reason',5,300);if s.state<>'allocated' then raise exception 'Set already released';end if;
  if ironclad69.reservations(s.component_id)>0 then raise exception 'Resolve the Commerce hold before releasing bench units';end if;
  update ironclad69.set_members set active=false where set_id=s.id;
  update ironclad69.sets q set state='released',released_at=now() where q.id=s.id;
  select quantity into strict n from public.inventory where component_id=s.component_id;
  update ironclad69.tracking set revision=revision+1 where component_id=s.component_id;
  insert into ironclad69.movements(component_id,kind,previous,delta,resulting,reason,actor,source)
  values(s.component_id,'set_release',n,0,n,why,a,s.id);response:=jsonb_build_object('id',s.id,'state','released');
 when 'stocktakeOpen' then
  incoming:=p_body->'componentIds';
  if jsonb_typeof(incoming) is distinct from 'array' or jsonb_array_length(incoming) not between 1 and 50
   or (select count(distinct v) from jsonb_array_elements_text(incoming) v)<>jsonb_array_length(incoming) then raise exception 'Select one to 50 distinct components';end if;
  insert into ironclad69.stocktakes(actor,reason) values(a,ironclad69.clean(p_body->>'reason',5,300)) returning ironclad69.stocktakes.id into sid;
  for c in select v from jsonb_array_elements_text(incoming) v order by v loop
   perform ironclad69.enrol(c);
   insert into ironclad69.stocktake_lines(stocktake_id,component_id,expected,revision)
   select sid,c,i.quantity,t.revision from public.inventory i join ironclad69.tracking t using(component_id) where i.component_id=c;
  end loop;
  response:=jsonb_build_object('id',sid,'state','open');
 when 'stocktakeApply' then
  sid:=(p_body->>'id')::uuid;perform 1 from ironclad69.stocktakes q where q.id=sid and state='open' for update;
  if not found then raise exception 'Stocktake is not open';end if;
  why:=ironclad69.clean(p_body->>'reason',5,300);
  incoming:=p_body->'counts';
  if p_body->'confirmed' is distinct from 'true'::jsonb or jsonb_typeof(incoming) is distinct from 'object'
   or (select count(*) from jsonb_object_keys(incoming))<>(select count(*) from ironclad69.stocktake_lines where stocktake_id=sid) then raise exception 'Review and confirm all counts';end if;
  for r in select * from ironclad69.stocktake_lines where stocktake_id=sid order by component_id loop
   perform 1 from public.inventory where component_id=r.component_id for update;
   if not exists(select from ironclad69.tracking where component_id=r.component_id and revision=r.revision) then raise exception 'Stock changed during the count; reopen the stocktake' using errcode='40001';end if;
   n:=ironclad69.integer(incoming->r.component_id,0,9007199254740991);
   perform ironclad69.change_qty(r.component_id,r.expected,n,'stocktake',why,a,sid);
   update ironclad69.stocktake_lines set counted=n where stocktake_id=sid and component_id=r.component_id;
  end loop;
  update ironclad69.stocktakes q set state='applied',applied_at=now() where q.id=sid;
  response:=jsonb_build_object('id',sid,'state','applied');
 else raise exception 'Unknown inventory operation';
 end case;
 update ironclad69.requests set result=response where ironclad69.requests.id=p_id;
 return response;
end $$;

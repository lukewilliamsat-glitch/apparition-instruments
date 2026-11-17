-- Append-only order cost evidence. Capturing evidence does not write BLACK LEDGER
-- revisions; a reviewer decides whether to use it on a subsequent finance save.
create table ironclad69.cost_snapshots(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id), line_index int not null check(line_index>=0),
 component_id text not null references public.components(id), batch_id uuid not null references ironclad69.batches(id),
 quantity int not null check(quantity>0), batch_total_minor bigint not null check(batch_total_minor>=0),
 batch_quantity bigint not null check(batch_quantity>0), line_cost_minor bigint not null check(line_cost_minor>=0),
 basis text not null check(basis in('verified_physical_trace','allocated_batch')), evidence text not null,
 actor uuid not null, captured_at timestamptz not null default now(),unique(order_id,line_index)
);
alter table ironclad69.cost_snapshots enable row level security;
revoke all on ironclad69.cost_snapshots from public,anon,authenticated,service_role;
create function ironclad69.capture_cost(a uuid,d jsonb) returns jsonb language plpgsql set search_path='' as $$
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
 if b.cost_minor is null or b.received_at>o.fulfillment_applied_at or qty>b.quantity
 then raise exception 'The chosen batch does not provide valid evidence for this sale';end if;
 basis:=d->>'basis';
 insert into ironclad69.cost_snapshots(order_id,line_index,component_id,batch_id,quantity,batch_total_minor,batch_quantity,line_cost_minor,basis,evidence,actor)
 values(o.id,pos,comp,b.id,qty,b.cost_minor,b.quantity,round(b.cost_minor::numeric*qty/b.quantity)::bigint,basis,ironclad69.clean(d->>'evidence',8,300),a)
 returning id into ref;
 return jsonb_build_object('id',ref,'basis',basis);
end $$;
revoke all on function ironclad69.capture_cost(uuid,jsonb) from public,anon,authenticated,service_role;
create function public.ironclad69_cost_read(p_order uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a uuid:=ironclad69.actor();outcome jsonb;
begin
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into outcome from(
  select line_index,component_id,batch_id,quantity,batch_total_minor,batch_quantity,line_cost_minor,basis,evidence from ironclad69.cost_snapshots
   where order_id=p_order order by line_index limit 100) x;
 return outcome;
end $$;
revoke all on function public.ironclad69_cost_read(uuid) from public,anon,authenticated,service_role;
grant execute on function public.ironclad69_cost_read(uuid) to authenticated;

-- Committed sets and deliberately held units may not be returned to the legacy
-- sale catalogue without releasing the commitment or resolving the quality state.
create function ironclad69.no_unreviewed_relist() returns trigger
language plpgsql security definer set search_path='' as $$
declare c text;
begin
 if tg_table_name='components' then
  c:=new.id;
  if not(new.active or new.individually or new.in_kits) then return new;end if;
 else
  c:=new.component_id;
 end if;
 perform 1 from public.components where id=c for update;
 if exists(select from ironclad69.sets where component_id=c and state='allocated')
  or exists(select from ironclad69.batches b join ironclad69.measurements m on m.batch_id=b.id
     where b.component_id=c and m.quality in('quarantine','rejected')) then
  raise exception 'Release bench allocations and resolve quality holds before listing this component' using errcode='23514';
 end if;
 return new;
end $$;
revoke all on function ironclad69.no_unreviewed_relist() from public,anon,authenticated,service_role;
create trigger ironclad69_relist before update of active,individually,in_kits on public.components
 for each row when (new.active or new.individually or new.in_kits) execute function ironclad69.no_unreviewed_relist();
create trigger ironclad69_stock_bom before insert or update of component_id on public.assembly_bom
 for each row execute function ironclad69.no_unreviewed_relist();
create trigger ironclad69_stock_kit before insert or update of component_id on public.kit_permitted_components
 for each row execute function ironclad69.no_unreviewed_relist();

create or replace function ironclad69.require_bench(c text) returns void language plpgsql set search_path='' as $$
begin
  if not exists(select from public.components q where q.id=c and not q.active and not q.individually and not q.in_kits for update)
   or exists(select from public.assembly_bom where component_id=c)
   or exists(select from public.kit_permitted_components where component_id=c)
   or exists(select from commerce67.holds where component_id=c)
   or exists(select from commerce67.control where enabled)
   or exists(select from public.orders z where z.payment_status='unpaid' and z.items::text like '%'||c||'%')
   then raise exception 'Set allocation requires an isolated, non-selling component with no outstanding checkout or hold' using errcode='23514';end if;
end $$;

create or replace function public.ironclad69_write(p_id uuid,p_action text,p_body jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a uuid:=ironclad69.actor(); old_req ironclad69.requests%rowtype; h bytea; o ironclad69.purchase_orders%rowtype;
 l ironclad69.purchase_lines%rowtype; b ironclad69.batches%rowtype; s ironclad69.sets%rowtype; x jsonb; y jsonb;
 id uuid; supplier uuid; rid uuid; sid uuid; c text; why text; currency_code text; method text; part text;
 n bigint; prev bigint; expected bigint; total bigint:=0; weights bigint:=0; cumulative bigint:=0; assigned bigint:=0; nw bigint;
 qty int; price bigint; merch bigint; alloc bigint; count_lines int:=0; seq int:=0; live_count int;
 chosen uuid[]; incoming jsonb; items jsonb:='[]'; response jsonb; r record;
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
 when 'purchase' then
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
  insert into ironclad69.purchase_orders(supplier_id,reference,currency,method,charges,evidence,actor)
  values(supplier,ironclad69.clean(p_body->>'reference',1,100),currency_code,method,y,why,a) returning ironclad69.purchase_orders.id into id;
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
  update ironclad69.purchase_orders q set state=why where q.id=o.id;response:=jsonb_build_object('id',o.id,'state',why);
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
  insert into ironclad69.receipts(po_id,actor,reference,notes) values(o.id,a,ironclad69.clean(p_body->>'reference',1,100),why)
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
  update ironclad69.purchase_orders q set state=why where q.id=o.id;
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
  if exists(select from commerce67.holds where component_id=s.component_id) then raise exception 'Resolve the Commerce hold before releasing bench units';end if;
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

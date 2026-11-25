-- Review only. Rehearse GBP and foreign drafts, receipts and duplicate handling before release.
do $guard$
begin
  if md5(pg_get_functiondef('public.ironclad69_write(uuid,text,jsonb)'::regprocedure))
    is distinct from '34331946d5e945dc78a6b63f2dbf033b' then
    raise exception 'Unexpected IRONCLAD writer definition';
  end if;
end;
$guard$;

CREATE OR REPLACE FUNCTION public.ironclad69_write(p_id uuid, p_action text, p_body jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  why:=ironclad69.clean(p_body->>'evidence',0,300);
  method:=p_body->>'method';
  if method is null or method not in('quantity','value','manual') then raise exception 'Choose an allocation method';end if;
  y:=coalesce(p_body->'charges','{}');if jsonb_typeof(y)<>'object' or exists(select key from jsonb_object_keys(y) key where key not in('freight','duty','nonRecoverableTax','extra','credit')) then raise exception 'Invalid charge classification';end if;
  for x in select value from jsonb_each(y) loop perform ironclad69.integer(x,0,1000000000);end loop;
  select coalesce(sum(case when key='credit' then -(value::text)::bigint else (value::text)::bigint end),0) into total from jsonb_each(y);
  incoming:=p_body->'lines';
  if jsonb_typeof(incoming) is distinct from 'array' or jsonb_array_length(incoming) not between 1 and 30 then raise exception 'Enter one to 30 purchase lines';end if;
  for x in select value from jsonb_array_elements(incoming) loop
   qty:=ironclad69.integer(x->'quantity',1,100000);price:=ironclad69.integer(x->'unitMinor',0,100000000);
   merch:=case
     when currency_code='GBP' and coalesce(jsonb_typeof(x->'gbpMinor'),'null')='null' then qty*price
     else ironclad69.integer(x->'gbpMinor',0,1000000000000) end;
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
    purchase_date=ironclad69.business_date(p_body->>'date'),notes=ironclad69.clean(p_body->>'notes',0,300),revision=o.revision+1 where q.id=draft_work.id;
   delete from ironclad69.purchase_lines pl where pl.po_id=draft_work.id;
  else
   insert into ironclad69.purchase_orders(supplier_id,reference,currency,method,charges,evidence,actor,purchase_date,notes)
   values(supplier,ironclad69.clean(p_body->>'reference',1,100),currency_code,method,y,why,a,
    ironclad69.business_date(p_body->>'date'),ironclad69.clean(p_body->>'notes',0,300)) returning ironclad69.purchase_orders.id into id;
  end if;
  for x in select value from jsonb_array_elements(incoming) loop
   seq:=seq+1;c:=ironclad69.clean(x->>'componentId',1,120);part:=ironclad69.clean(x->>'partNo',0,100);
   if not exists(select from public.inventory where component_id=c and stock_unit='item') then raise exception 'Component requires existing item inventory';end if;
   qty:=ironclad69.integer(x->'quantity',1,100000);price:=ironclad69.integer(x->'unitMinor',0,100000000);
   merch:=case
     when currency_code='GBP' and coalesce(jsonb_typeof(x->'gbpMinor'),'null')='null' then qty*price
     else ironclad69.integer(x->'gbpMinor',0,1000000000000) end;
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
end $function$;

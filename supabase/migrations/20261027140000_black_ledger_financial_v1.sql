-- AUTHORISATION 63. SOURCE ONLY until the exact production-operation gate is approved.
-- Apply as one transaction through the reviewed migration mechanism.
-- Only new private finance objects are created. Existing Orders, Inventory,
-- payments, fulfilment and communications are never updated or invoked.

create function public.command63_finance_keys(p_object jsonb,p_allowed text[])
returns void language plpgsql immutable set search_path=pg_catalog,pg_temp as $$
begin
 if jsonb_typeof(p_object) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_object) k where not(k=any(p_allowed))) then
  raise exception 'Unsupported financial object or field' using errcode='22023';
 end if;
end;$$;

create function public.command63_finance_text(p_value jsonb,p_max integer,p_required boolean default false)
returns text language plpgsql immutable set search_path=pg_catalog,pg_temp as $$
declare v text; units integer;
begin
 if p_value is null or p_value='null'::jsonb then if p_required then raise exception 'Financial evidence text is required' using errcode='22023';end if;return null;end if;
 if jsonb_typeof(p_value)<>'string' then raise exception 'Financial text must be a string' using errcode='22023';end if;
 v:=p_value#>>'{}';
 -- Match JavaScript/HTML UTF-16 length, including supplementary characters.
 units:=length(v)+length(regexp_replace(v,U&'[^\+010000-\+10FFFF]','','g'));
 if units>p_max or p_required and length(btrim(v))=0 then raise exception 'Financial text exceeds its limit or is blank' using errcode='22023';end if;
 return v;
end;$$;

create function public.command63_finance_number(p_value jsonb,p_nullable boolean default false,p_signed boolean default false,p_micro boolean default false)
returns bigint language plpgsql immutable set search_path=pg_catalog,pg_temp as $$
declare v numeric; ceiling numeric:=case when p_micro then 100000000000000 else 1000000000000 end;
begin
 if p_value is null or p_value='null'::jsonb then if p_nullable then return null;end if;raise exception 'Financial amount is required' using errcode='22023';end if;
 if jsonb_typeof(p_value)<>'number' or (p_value#>>'{}')!~'^-?[0-9]+$' then raise exception 'Financial amounts require integer minor units' using errcode='22023';end if;
 v:=(p_value#>>'{}')::numeric;
 if v>ceiling or v<(case when p_signed then -ceiling else 0 end) then raise exception 'Financial amount outside supported range' using errcode='22023';end if;
 return v::bigint;
end;$$;

create function public.command63_finance_evidence(p_state jsonb,p_source jsonb,p_excluded boolean default false)
returns void language plpgsql immutable set search_path=pg_catalog,pg_temp as $$
declare state text:=public.command63_finance_text(p_state,30,true);
begin
 if p_excluded and state='excluded' then return;end if;
 if state not in ('unknown','estimated','confirmed') then raise exception 'Unsupported financial evidence state' using errcode='22023';end if;
 perform public.command63_finance_text(p_source,300,state='confirmed');
end;$$;

create function public.command63_finance_validate(p_document jsonb,p_items jsonb,p_currency text)
returns void language plpgsql immutable set search_path=pg_catalog,pg_temp as $$
declare row jsonb; original jsonb; fee jsonb; cost jsonb; i integer:=0; ids text[]:='{}'; refs text[]:='{}'; ref text; category text; k text; method text; state text; n numeric; q bigint; unit numeric; line_discount numeric; products numeric:=0; cogs numeric:=0; known_cogs boolean:=true; order_discount numeric:=0; postage numeric; actual numeric; pass numeric; seller_gross numeric; fees numeric:=0; fulfilment numeric:=0; refunds numeric:=0; adjustments numeric:=0; return_credit numeric:=0; seller_tax numeric:=0; rate numeric; fee_amount numeric; base numeric; source text; stock_basis text;
begin
 perform public.command63_finance_keys(p_document,array['policyVersion','currency','paymentBreakdownBasis','actualPaidMinor','postageMinor','marketplaceTaxMinor','marketplaceTaxState','marketplaceTaxSource','discount','lines','fees','feesComplete','costs','tax','adjustments','settlement','returnCostCredit','provenance']);
 if octet_length(convert_to(p_document::text,'UTF8'))>32768 or p_document->>'policyVersion' is distinct from 'marketplace-contribution-v2' or p_document->>'currency' is distinct from p_currency or p_currency<>'GBP' or coalesce(p_document->>'paymentBreakdownBasis','') not in ('customer_gross','seller_net','unreviewed') then raise exception 'Financial version, currency, amount basis or size mismatch' using errcode='22023';end if;
 if jsonb_typeof(p_document->'lines') is distinct from 'array' or jsonb_array_length(p_document->'lines') not between 1 and 10 or jsonb_array_length(p_document->'lines')<>jsonb_array_length(p_items) then raise exception 'Financial lines must retain the existing order identities' using errcode='22023';end if;
 for row in select value from jsonb_array_elements(p_document->'lines') loop
  perform public.command63_finance_keys(row,array['id','label','productId','quantity','unitPriceMinor','priceBasis','discountMinor','unitCostMicro','costState','costSource','costProvenance']);original:=p_items->i;
  if row->>'id' is distinct from 'line-'||i::text or row->>'productId' is distinct from coalesce(original->>'productId',original#>>'{snapshot,componentId}',original#>>'{snapshot,assemblyId}','') then raise exception 'Financial line identity changed' using errcode='22023';end if;
  perform public.command63_finance_text(row->'label',500,false);q:=public.command63_finance_number(row->'quantity');
  if q not between 1 and 99 or q::text is distinct from original->>'quantity' then raise exception 'Financial edits cannot change sold stock quantities' using errcode='22023';end if;
  unit:=public.command63_finance_number(row->'unitPriceMinor');line_discount:=public.command63_finance_number(coalesce(row->'discountMinor','0'::jsonb));
  if coalesce(row->>'priceBasis','') not in ('net','before_discount') or unit*q>1000000000000 or row->>'priceBasis'='before_discount' and line_discount>unit*q then raise exception 'Invalid financial selling-price basis' using errcode='22023';end if;
  products:=products+unit*q-case when row->>'priceBasis'='before_discount' then line_discount else 0 end;
  perform public.command63_finance_evidence(row->'costState',row->'costSource');n:=public.command63_finance_number(row->'unitCostMicro',true,false,true);
  if n is null or row->>'costState'='unknown' then known_cogs:=false;else cogs:=cogs+round(n*q/10000);end if;
  if row?'costProvenance' and row->'costProvenance'<>'null'::jsonb then
   cost:=row->'costProvenance';perform public.command63_finance_keys(cost,array['basis','purchaseReference','acquiredAt','originalCurrency','originalUnitCostMicro','gbpPerOriginalRateMicro','exchangeRateSource','notes']);stock_basis:=public.command63_finance_text(cost->'basis',40,true);
   if stock_basis not in ('unknown','current_estimate','assembly_estimate','historical_snapshot','manual_evidenced') or row->>'costState'='confirmed' and stock_basis in ('unknown','current_estimate','assembly_estimate') then raise exception 'Current reference costs cannot be confirmed historical COGS' using errcode='22023';end if;
   perform public.command63_finance_text(cost->'purchaseReference',300,false);perform public.command63_finance_text(cost->'notes',1000,false);source:=public.command63_finance_text(cost->'acquiredAt',10,false);if source is not null and source<>'' then if source!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid acquisition date' using errcode='22023';end if;perform source::date;end if;
   source:=public.command63_finance_text(cost->'originalCurrency',3,false);if source is not null and source not in ('GBP','EUR','USD') then raise exception 'Unsupported historical acquisition currency' using errcode='22023';end if;
   perform public.command63_finance_number(cost->'originalUnitCostMicro',true,false,true);n:=public.command63_finance_number(cost->'gbpPerOriginalRateMicro',true,false,true);
   if source in ('EUR','USD') and (n is null or n<=0) then raise exception 'Historical exchange-rate provenance is required' using errcode='22023';end if;
   perform public.command63_finance_text(cost->'exchangeRateSource',300,source in ('EUR','USD'));
  end if;
  i:=i+1;
 end loop;
 perform public.command63_finance_keys(p_document->'discount',array['kind','minor','percentage']);method:=p_document#>>'{discount,kind}';
 if method not in ('none','manual','percent','included') or method is null then raise exception 'Unsupported order discount' using errcode='22023';end if;
 if method in ('manual','included') then n:=public.command63_finance_number(coalesce(p_document#>'{discount,minor}','0'::jsonb));if method='manual' then order_discount:=n;end if;end if;
 if method='percent' then source:=public.command63_finance_text(p_document#>'{discount,percentage}',24,true);if source!~'^[0-9]+([.][0-9]{1,4})?$' or source::numeric>100 then raise exception 'Invalid discount percentage' using errcode='22023';end if;order_discount:=round(products*source::numeric/100);end if;
 if order_discount>products or products>1000000000000 or cogs>1000000000000 then raise exception 'Financial line totals exceed supported bounds' using errcode='22023';end if;products:=products-order_discount;
 postage:=public.command63_finance_number(p_document->'postageMinor');actual:=public.command63_finance_number(p_document->'actualPaidMinor',true);pass:=public.command63_finance_number(p_document->'marketplaceTaxMinor',true);perform public.command63_finance_evidence(p_document->'marketplaceTaxState',p_document->'marketplaceTaxSource');
 if products+postage>1000000000000 or pass>actual or p_document->>'paymentBreakdownBasis'='customer_gross' and pass>products+postage then raise exception 'Invalid gross payment/pass-through amounts' using errcode='22023';end if;
 seller_gross:=case when actual is not null then actual-coalesce(pass,0) when p_document->>'paymentBreakdownBasis'='customer_gross' then products+postage-coalesce(pass,0) else products+postage end;
 if jsonb_typeof(p_document->'fees') is distinct from 'array' or jsonb_array_length(p_document->'fees')>50 or jsonb_typeof(p_document->'feesComplete') is distinct from 'boolean' then raise exception 'Invalid financial fee collection' using errcode='22023';end if;
 for fee in select value from jsonb_array_elements(p_document->'fees') loop
  perform public.command63_finance_keys(fee,array['id','category','direction','method','actualMinor','amountMinor','percentage','base','baseMinor','state','source','chargeReference','includes','reverses']);ref:=public.command63_finance_text(fee->'id',120,true);
  if ref=any(ids) then raise exception 'Duplicate financial fee identity' using errcode='22023';end if;ids:=array_append(ids,ref);
  category:=public.command63_finance_text(fee->'category',30,true);method:=public.command63_finance_text(fee->'method',20,true);
  if category not in ('marketplace','payment','advertising','conversion','regulatory','other') or coalesce(fee->>'direction','') not in ('charge','credit') or method not in ('fixed','percentage') then raise exception 'Unsupported financial fee type' using errcode='22023';end if;
  perform public.command63_finance_evidence(fee->'state',fee->'source');fee_amount:=public.command63_finance_number(fee->'actualMinor',true);n:=public.command63_finance_number(fee->'amountMinor',true);base:=public.command63_finance_number(fee->'baseMinor',true);
  source:=public.command63_finance_text(fee->'percentage',24,false);if source is not null and source<>'' and (source!~'^[0-9]+([.][0-9]{1,4})?$' or source::numeric>1000) then raise exception 'Invalid fee estimate percentage' using errcode='22023';end if;
  if fee_amount is null and method='fixed' then fee_amount:=n;end if;
  if fee_amount is null and method='percentage' and source is not null and source<>'' then
   if coalesce(fee->>'base','') not in ('products','seller_gross','custom') then raise exception 'Choose an explicit fee percentage base' using errcode='22023';end if;
   base:=case fee->>'base' when 'products' then products when 'seller_gross' then seller_gross else base end;if base is null then raise exception 'Custom fee base is missing' using errcode='22023';end if;fee_amount:=round(base*source::numeric/100);
  end if;
  if fee_amount>1000000000000 then raise exception 'Fee estimate exceeds supported bounds' using errcode='22023';end if;
  if fee->>'state'<>'unknown' and fee_amount is not null then fees:=fees+fee_amount*case when fee->>'direction'='credit' then -1 else 1 end;end if;
  ref:=public.command63_finance_text(fee->'chargeReference',150,false);if ref is not null and ref<>'' then ref:=lower(btrim(ref));if ref='' or ref=any(refs) then raise exception 'Duplicate marketplace charge reference' using errcode='22023';end if;refs:=array_append(refs,ref);end if;
  if fee?'includes' then if jsonb_typeof(fee->'includes')<>'array' or jsonb_array_length(fee->'includes')>5 then raise exception 'Invalid combined fee inclusions' using errcode='22023';end if;
   if (select count(*) from jsonb_array_elements_text(fee->'includes'))<>(select count(distinct value) from jsonb_array_elements_text(fee->'includes')) then raise exception 'Duplicate combined fee inclusion' using errcode='22023';end if;
   for k in select value from jsonb_array_elements_text(fee->'includes') loop
    if k=category or k not in ('marketplace','payment','advertising','conversion','regulatory','other') or exists(select 1 from jsonb_array_elements(p_document->'fees') other where other->>'id'<>fee->>'id' and other->>'category'=k and other->>'direction'='charge') then raise exception 'Combined marketplace fee would double-count a charge' using errcode='22023';end if;
   end loop;
  end if;
  ref:=public.command63_finance_text(fee->'reverses',120,false);if ref is not null and ref<>'' and (fee->>'direction'<>'credit' or not exists(select 1 from jsonb_array_elements(p_document->'fees') other where other->>'id'=ref and other->>'direction'='charge')) then raise exception 'Fee reversal must identify its original charge' using errcode='22023';end if;
 end loop;
 perform public.command63_finance_keys(p_document->'costs',array['shipping','packaging','other','labour']);
 foreach k in array array['shipping','packaging','other','labour'] loop
  cost:=p_document->'costs'->k;if k='labour' and (cost is null or cost->>'state'='excluded') then continue;end if;
  perform public.command63_finance_keys(cost,array['minor','state','source']);perform public.command63_finance_evidence(cost->'state',cost->'source');n:=public.command63_finance_number(cost->'minor',true);if n is not null and cost->>'state'<>'unknown' then fulfilment:=fulfilment+n;end if;
 end loop;
 perform public.command63_finance_keys(p_document->'tax',array['state','minor','source']);state:=p_document#>>'{tax,state}';if coalesce(state,'') not in ('unreviewed','not_applicable','confirmed') then raise exception 'Seller tax review is required' using errcode='22023';end if;
 n:=public.command63_finance_number(p_document#>'{tax,minor}',state<>'confirmed');perform public.command63_finance_text(p_document#>'{tax,source}',300,state='confirmed');if state='confirmed' then seller_tax:=n;end if;
 if jsonb_typeof(p_document->'adjustments') is distinct from 'array' or jsonb_array_length(p_document->'adjustments')>50 then raise exception 'Invalid financial adjustments' using errcode='22023';end if;ids:='{}';
 for row in select value from jsonb_array_elements(p_document->'adjustments') loop
  perform public.command63_finance_keys(row,array['id','kind','minor','state','source']);ref:=public.command63_finance_text(row->'id',120,true);if ref=any(ids) then raise exception 'Duplicate adjustment identity' using errcode='22023';end if;ids:=array_append(ids,ref);
  if coalesce(row->>'kind','') not in ('refund','revenue') then raise exception 'Unsupported financial adjustment' using errcode='22023';end if;
  perform public.command63_finance_evidence(row->'state',row->'source');n:=public.command63_finance_number(row->'minor',false,row->>'kind'='revenue');if row->>'state'<>'unknown' then if row->>'kind'='refund' then refunds:=refunds+n;else adjustments:=adjustments+n;end if;end if;
 end loop;
 if p_document?'returnCostCredit' and p_document->'returnCostCredit'<>'null'::jsonb then row:=p_document->'returnCostCredit';perform public.command63_finance_keys(row,array['minor','state','source']);perform public.command63_finance_evidence(row->'state',row->'source');n:=public.command63_finance_number(row->'minor',true);if n is not null and row->>'state'<>'unknown' then return_credit:=n;end if;if known_cogs and return_credit>cogs then raise exception 'Return cost credit exceeds recorded COGS' using errcode='22023';end if;end if;
 if abs(fees)>1000000000000 or fulfilment>1000000000000 or refunds>1000000000000 or abs(adjustments)>1000000000000 or abs(seller_gross-refunds+adjustments-seller_tax)>1000000000000 or abs(cogs-return_credit+fees+fulfilment)>1000000000000 then raise exception 'Financial aggregate exceeds supported bounds' using errcode='22023';end if;
 if p_document?'settlement' and p_document->'settlement'<>'null'::jsonb then row:=p_document->'settlement';perform public.command63_finance_keys(row,array['minor','state','source','adjustmentMinor','adjustmentSource']);n:=public.command63_finance_number(row->'minor',true);if n is not null then perform public.command63_finance_evidence(row->'state',row->'source');base:=public.command63_finance_number(coalesce(row->'adjustmentMinor','0'::jsonb),false,true);perform public.command63_finance_text(row->'adjustmentSource',300,base<>0);if abs(seller_gross-refunds+adjustments-fees+base)>1000000000000 then raise exception 'Settlement exceeds supported bounds' using errcode='22023';end if;end if;end if;
 if p_document?'provenance' and p_document->'provenance'<>'null'::jsonb then row:=p_document->'provenance';perform public.command63_finance_keys(row,array['notes','reconciliationReference']);perform public.command63_finance_text(row->'notes',1000,false);perform public.command63_finance_text(row->'reconciliationReference',300,false);end if;
end;$$;

create table public.order_financial_records(
 order_id uuid primary key references public.orders(id) on delete restrict,
 revision bigint not null check(revision between 1 and 1000000000),
 document jsonb not null check(jsonb_typeof(document)='object' and document->>'policyVersion'='marketplace-contribution-v2' and octet_length(convert_to(document::text,'UTF8'))<=32768),
 order_basis_hash text not null check(order_basis_hash~'^[a-f0-9]{64}$'),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 updated_by uuid not null
);
create table public.order_financial_revisions(
 order_id uuid not null references public.order_financial_records(order_id) on delete restrict,
 revision bigint not null,actor_id uuid not null,request_id uuid not null,
 before_document jsonb,after_document jsonb not null,order_basis_hash text not null,
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(order_id,revision),unique(actor_id,request_id)
);
create table public.order_financial_requests(
 actor_id uuid not null,request_id uuid not null,order_id uuid not null,
 payload_hash text not null check(payload_hash~'^[a-f0-9]{64}$'),
 result jsonb,created_at timestamptz not null default clock_timestamp(),
 primary key(actor_id,request_id)
);
alter table public.order_financial_records enable row level security;
alter table public.order_financial_revisions enable row level security;
alter table public.order_financial_requests enable row level security;
revoke all on public.order_financial_records,public.order_financial_revisions,public.order_financial_requests from public,anon,authenticated,service_role;
grant select on public.order_financial_records,public.order_financial_revisions to authenticated;
create policy order_financial_records_admin_read on public.order_financial_records for select to authenticated using(exists(select 1 from public.admin_members m where m.user_id=(select auth.uid())));
create policy order_financial_revisions_admin_read on public.order_financial_revisions for select to authenticated using(exists(select 1 from public.admin_members m where m.user_id=(select auth.uid())));

create function public.command63_finance_actor() returns uuid language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
declare actor uuid:=auth.uid();begin if actor is null or not exists(select 1 from public.admin_members m where m.user_id=actor) then raise exception 'Admin membership required' using errcode='42501';end if;return actor;end;$$;
create function public.command63_finance_basis(p_order public.orders) returns text language sql immutable set search_path=pg_catalog,pg_temp as $$
 select encode(sha256(convert_to(jsonb_build_object('items',p_order.items,'currency',p_order.currency,'subtotal',p_order.subtotal_pence,'delivery',p_order.delivery_pence,'total',p_order.total_pence,'channel',p_order.sales_channel,'payment',p_order.payment_status,'refund',p_order.refunded_pence,'refund_at',p_order.latest_refund_at)::text,'UTF8')),'hex');
$$;
create function public.command63_financial_read(p_order_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,pg_temp set lock_timeout='1s' set statement_timeout='5s' as $$
declare actor uuid:=public.command63_finance_actor();o public.orders%rowtype;f public.order_financial_records%rowtype;basis text;history jsonb;
begin
 select * into o from public.orders where id=p_order_id;if not found or o.sales_channel='WEBSITE' then raise exception 'Existing external order required' using errcode='22023';end if;basis:=public.command63_finance_basis(o);
 select * into f from public.order_financial_records where order_id=p_order_id;
 select coalesce(jsonb_agg(x order by x.revision desc),'[]'::jsonb) into history from(select revision,actor_id,recorded_at from public.order_financial_revisions where order_id=p_order_id order by revision desc limit 10)x;
 return jsonb_build_object('version',1,'orderId',p_order_id,'orderBasisHash',basis,'revision',coalesce(f.revision,0),'document',f.document,'savedOrderBasisHash',f.order_basis_hash,'orderBasisMatches',f.order_basis_hash is null or f.order_basis_hash=basis,'updatedAt',f.updated_at,'updatedBy',f.updated_by,'history',history);
end;$$;
create function public.command63_financial_save(p_order_id uuid,p_expected_revision bigint,p_order_basis_hash text,p_request_id uuid,p_document jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,pg_temp set lock_timeout='1s' set statement_timeout='5s' as $$
declare actor uuid:=public.command63_finance_actor();o public.orders%rowtype;f public.order_financial_records%rowtype;r public.order_financial_requests%rowtype;digest text;basis text;v_result jsonb;prior jsonb;inserted integer;next_revision bigint;
begin
 if p_request_id is null or p_order_id is null or p_expected_revision is null or p_expected_revision not between 0 and 999999999 or p_order_basis_hash is null or p_order_basis_hash!~'^[a-f0-9]{64}$' or p_document is null or octet_length(convert_to(p_document::text,'UTF8'))>32768 then raise exception 'Invalid financial mutation identity or bounds' using errcode='22023';end if;
 digest:=encode(sha256(convert_to(jsonb_build_object('order',p_order_id,'expectedRevision',p_expected_revision,'orderBasis',p_order_basis_hash,'document',p_document)::text,'UTF8')),'hex');
 insert into public.order_financial_requests(actor_id,request_id,order_id,payload_hash) values(actor,p_request_id,p_order_id,digest) on conflict(actor_id,request_id) do nothing;get diagnostics inserted=row_count;
 if inserted=0 then
  select * into r from public.order_financial_requests where actor_id=actor and request_id=p_request_id for update;
  if r.payload_hash is distinct from digest or r.order_id is distinct from p_order_id then raise exception 'Financial request identity was reused with different inputs' using errcode='22023';end if;
  if r.result is null then raise exception 'Financial request outcome is unresolved' using errcode='40001';end if;
  return r.result||jsonb_build_object('idempotent',true);
 end if;
 select * into o from public.orders where id=p_order_id for share;
 if not found or o.sales_channel='WEBSITE' then raise exception 'Existing external order required' using errcode='22023';end if;
 perform public.command63_finance_validate(p_document,o.items,o.currency);basis:=public.command63_finance_basis(o);
 select * into f from public.order_financial_records where order_id=p_order_id for update;
 if basis<>p_order_basis_hash then v_result:=jsonb_build_object('version',1,'outcome','order-conflict','orderId',p_order_id,'requestId',p_request_id,'revision',coalesce(f.revision,0),'orderBasisHash',basis);
 elsif f.order_id is not null and f.revision<>p_expected_revision or f.order_id is null and p_expected_revision<>0 then v_result:=jsonb_build_object('version',1,'outcome','conflict','orderId',p_order_id,'requestId',p_request_id,'revision',coalesce(f.revision,0),'orderBasisHash',basis);
 elsif f.order_id is not null and f.document=p_document and f.order_basis_hash=basis then v_result:=jsonb_build_object('version',1,'outcome','committed','unchanged',true,'orderId',p_order_id,'requestId',p_request_id,'revision',f.revision,'orderBasisHash',basis,'updatedAt',f.updated_at,'updatedBy',actor,'document',f.document);
 else
  if f.order_id is null then
   insert into public.order_financial_records(order_id,revision,document,order_basis_hash,updated_by) values(p_order_id,1,p_document,basis,actor) on conflict(order_id) do nothing returning * into f;get diagnostics inserted=row_count;
   if inserted=0 then select * into f from public.order_financial_records where order_id=p_order_id for update;v_result:=jsonb_build_object('version',1,'outcome','conflict','orderId',p_order_id,'requestId',p_request_id,'revision',f.revision,'orderBasisHash',basis);else next_revision:=1;prior:=null;end if;
  else
   prior:=f.document;next_revision:=f.revision+1;
   update public.order_financial_records set revision=next_revision,document=p_document,order_basis_hash=basis,updated_at=clock_timestamp(),updated_by=actor where order_id=p_order_id and revision=p_expected_revision returning * into f;
   if not found then raise exception 'Financial revision changed' using errcode='40001';end if;
  end if;
  if v_result is null then
   insert into public.order_financial_revisions(order_id,revision,actor_id,request_id,before_document,after_document,order_basis_hash) values(p_order_id,next_revision,actor,p_request_id,prior,p_document,basis);
   v_result:=jsonb_build_object('version',1,'outcome','committed','unchanged',false,'orderId',p_order_id,'requestId',p_request_id,'revision',next_revision,'orderBasisHash',basis,'updatedAt',f.updated_at,'updatedBy',actor,'document',p_document);
  end if;
 end if;
 update public.order_financial_requests set result=v_result||jsonb_build_object('idempotent',false) where actor_id=actor and request_id=p_request_id;
 return v_result||jsonb_build_object('idempotent',false);
end;$$;
create function public.command63_financial_status(p_request_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare actor uuid:=public.command63_finance_actor();r public.order_financial_requests%rowtype;
begin select * into r from public.order_financial_requests where actor_id=actor and request_id=p_request_id;
 if not found or r.result is null then return jsonb_build_object('version',1,'outcome','unresolved','requestId',p_request_id);end if;
 return r.result||jsonb_build_object('idempotent',true);end;$$;
create function public.command63_financial_batch(p_order_ids uuid[]) returns jsonb language plpgsql security definer set search_path=pg_catalog,pg_temp set statement_timeout='5s' as $$
declare actor uuid:=public.command63_finance_actor();r record;rows jsonb:='[]';used integer:=0;count integer:=0;truncated boolean:=false;item jsonb;
begin
 if p_order_ids is null or cardinality(p_order_ids)>50 or cardinality(p_order_ids)<>(select count(distinct id) from unnest(p_order_ids) id) then raise exception 'Use at most 50 distinct loaded order identities' using errcode='22023';end if;
 for r in select f.*,public.command63_finance_basis(o) as current_basis from public.order_financial_records f join public.orders o on o.id=f.order_id where f.order_id=any(p_order_ids) and o.sales_channel<>'WEBSITE' order by f.order_id loop
  item:=jsonb_build_object('orderId',r.order_id,'revision',r.revision,'document',r.document,'orderBasisMatches',r.order_basis_hash=r.current_basis,'updatedAt',r.updated_at);used:=used+octet_length(convert_to(item::text,'UTF8'));
  if used>196608 then truncated:=true;exit;end if;rows:=rows||jsonb_build_array(item);count:=count+1;
 end loop;
 return jsonb_build_object('version',1,'records',rows,'requested',cardinality(p_order_ids),'returned',count,'complete',not truncated,'truncated',truncated,'scope','Only the explicitly supplied loaded order identities. Missing financial records remain unknown.');
end;$$;

-- No default PUBLIC or service-role execute path. Actor identity is never a parameter.
revoke all on function public.command63_finance_keys(jsonb,text[]),public.command63_finance_text(jsonb,integer,boolean),public.command63_finance_number(jsonb,boolean,boolean,boolean),public.command63_finance_evidence(jsonb,jsonb,boolean),public.command63_finance_validate(jsonb,jsonb,text),public.command63_finance_actor(),public.command63_finance_basis(public.orders),public.command63_financial_read(uuid),public.command63_financial_save(uuid,bigint,text,uuid,jsonb),public.command63_financial_status(uuid),public.command63_financial_batch(uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.command63_financial_read(uuid),public.command63_financial_save(uuid,bigint,text,uuid,jsonb),public.command63_financial_status(uuid),public.command63_financial_batch(uuid[]) to authenticated;

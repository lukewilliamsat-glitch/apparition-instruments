
-- Disposable fixture prerequisites. Auth and inventory are minimal test doubles.
create role anon; create role authenticated; create role service_role;
create schema commerce67; create schema ironclad69; create schema auth; create schema eclipse_finance;
create table auth.users(id uuid primary key,email text not null unique,email_confirmed_at timestamptz,encrypted_password text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create sequence public.order_reference_seq;
create table public.components(id text primary key,name text not null);
create table public.inventory(component_id text primary key,quantity bigint not null);
create table ironclad69.measurements(id uuid primary key);
insert into public.components values('fixture-staging-pot','84C Fixture Pot');
insert into public.inventory values('fixture-staging-pot',99);
insert into auth.users values
 ('a0000000-0000-4000-8000-000000000001','84c-operator@fixtures.example',now(),'fixture-only'),
 ('a0000000-0000-4000-8000-000000000002','84c-finance@fixtures.example',now(),'fixture-only'),
 ('a0000000-0000-4000-8000-000000000003','84c-observer@fixtures.example',now(),'fixture-only'),
 ('a0000000-0000-4000-8000-000000000004','unrelated@fixtures.example',null,null);


create table public.admin_members (user_id uuid not null, created_at timestamp with time zone default now() not null, constraint admin_members_pkey PRIMARY KEY (user_id), constraint admin_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE);

create table ironclad69.suppliers (id uuid default gen_random_uuid() not null, name text not null, reference text default ''::text not null, site text default ''::text not null, contact text default ''::text not null, location text default ''::text not null, currency text not null, notes text default ''::text not null, active boolean default true not null, created_at timestamp with time zone default now() not null, constraint suppliers_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text)), constraint suppliers_name_check CHECK (((length(name) >= 1) AND (length(name) <= 120))), constraint suppliers_pkey PRIMARY KEY (id));

create table public.orders (id uuid default gen_random_uuid() not null, reference text default ('AI-'::text || lpad((nextval('order_reference_seq'::regclass))::text, 6, '0'::text)) not null, request_id uuid not null, request_hash text not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, status text default 'pending'::text not null, payment_status text default 'unpaid'::text not null, currency text default 'GBP'::text not null, subtotal_pence bigint not null, delivery_pence bigint default 0 not null, total_pence bigint not null, customer jsonb not null, delivery jsonb not null, items jsonb not null, stripe_checkout_session_id text, stripe_payment_intent_id text, paid_at timestamp with time zone, fulfillment_applied_at timestamp with time zone, status_history jsonb default '[]'::jsonb not null, confirmation_email_status text default 'pending'::text not null, confirmation_email_sent_at timestamp with time zone, confirmation_email_last_attempt_at timestamp with time zone, confirmation_email_failure text, confirmation_email_claim_id uuid, confirmation_email_attempts integer default 0 not null, refunded_pence bigint default 0 not null, latest_refund_at timestamp with time zone, dispatch_details jsonb default '{}'::jsonb not null, owner_user_id uuid, sales_channel text default 'WEBSITE'::text not null, external_reference text, external_reference_key text generated always as (lower(btrim(external_reference))) stored, order_date date, internal_notes text default ''::text not null, constraint orders_check CHECK ((total_pence = (subtotal_pence + delivery_pence))), constraint orders_check1 CHECK (((refunded_pence >= 0) AND (refunded_pence <= total_pence))), constraint orders_confirmation_email_status_check CHECK ((confirmation_email_status = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'failed'::text, 'unknown'::text, 'legacy'::text]))), constraint orders_currency_check CHECK ((currency = 'GBP'::text)), constraint orders_customer_check CHECK ((jsonb_typeof(customer) = 'object'::text)), constraint orders_delivery_check CHECK ((jsonb_typeof(delivery) = 'object'::text)), constraint orders_delivery_pence_check CHECK (((delivery_pence >= 0) AND (delivery_pence <= 1000000000))), constraint orders_dispatch_details_check CHECK ((jsonb_typeof(dispatch_details) = 'object'::text)), constraint orders_external_identity_check CHECK ((((sales_channel = 'WEBSITE'::text) AND (external_reference IS NULL) AND (order_date IS NULL)) OR ((sales_channel <> 'WEBSITE'::text) AND (external_reference IS NOT NULL) AND ((length(btrim(external_reference)) >= 1) AND (length(btrim(external_reference)) <= 150)) AND (order_date IS NOT NULL)))), constraint orders_items_check CHECK (((jsonb_typeof(items) = 'array'::text) AND ((jsonb_array_length(items) >= 1) AND (jsonb_array_length(items) <= 10)))), constraint orders_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT, constraint orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'paid'::text, 'partially_refunded'::text, 'refunded'::text]))), constraint orders_pkey PRIMARY KEY (id), constraint orders_reference_key UNIQUE (reference), constraint orders_request_id_key UNIQUE (request_id), constraint orders_sales_channel_check CHECK ((sales_channel = ANY (ARRAY['WEBSITE'::text, 'EBAY'::text, 'DIRECT'::text, 'OTHER'::text]))), constraint orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_production'::text, 'ready_to_dispatch'::text, 'dispatched'::text, 'completed'::text, 'cancelled'::text]))), constraint orders_status_history_check CHECK ((jsonb_typeof(status_history) = 'array'::text)), constraint orders_stripe_checkout_session_id_key UNIQUE (stripe_checkout_session_id), constraint orders_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id), constraint orders_subtotal_pence_check CHECK (((subtotal_pence >= 0) AND (subtotal_pence <= 1000000000))));

create table public.partial_refund_reviews (id uuid default gen_random_uuid() not null, order_id uuid not null, refunded_pence bigint not null, refund_at timestamp with time zone not null, admin_user_id uuid not null, reviewed_at timestamp with time zone default now() not null, constraint partial_refund_reviews_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES auth.users(id), constraint partial_refund_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id), constraint partial_refund_reviews_order_id_refunded_pence_refund_at_key UNIQUE (order_id, refunded_pence, refund_at), constraint partial_refund_reviews_pkey PRIMARY KEY (id), constraint partial_refund_reviews_refunded_pence_check CHECK ((refunded_pence > 0)));

create table public.order_financial_records (order_id uuid not null, revision bigint not null, document jsonb not null, order_basis_hash text not null, created_at timestamp with time zone default clock_timestamp() not null, updated_at timestamp with time zone default clock_timestamp() not null, updated_by uuid not null, constraint order_financial_records_document_check CHECK (((jsonb_typeof(document) = 'object'::text) AND ((document ->> 'policyVersion'::text) = 'marketplace-contribution-v2'::text) AND (octet_length(convert_to((document)::text, 'UTF8'::name)) <= 32768))), constraint order_financial_records_order_basis_hash_check CHECK ((order_basis_hash ~ '^[a-f0-9]{64}$'::text)), constraint order_financial_records_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT, constraint order_financial_records_pkey PRIMARY KEY (order_id), constraint order_financial_records_revision_check CHECK (((revision >= 1) AND (revision <= 1000000000))));

create table public.order_financial_requests (actor_id uuid not null, request_id uuid not null, order_id uuid not null, payload_hash text not null, result jsonb, created_at timestamp with time zone default clock_timestamp() not null, constraint order_financial_requests_payload_hash_check CHECK ((payload_hash ~ '^[a-f0-9]{64}$'::text)), constraint order_financial_requests_pkey PRIMARY KEY (actor_id, request_id));

create table public.order_financial_revisions (order_id uuid not null, revision bigint not null, actor_id uuid not null, request_id uuid not null, before_document jsonb, after_document jsonb not null, order_basis_hash text not null, recorded_at timestamp with time zone default clock_timestamp() not null, constraint order_financial_revisions_actor_id_request_id_key UNIQUE (actor_id, request_id), constraint order_financial_revisions_order_id_fkey FOREIGN KEY (order_id) REFERENCES order_financial_records(order_id) ON DELETE RESTRICT, constraint order_financial_revisions_pkey PRIMARY KEY (order_id, revision));

CREATE OR REPLACE FUNCTION ironclad69.actor()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare a uuid:=auth.uid();
begin
 if a is null or not exists(select from public.admin_members where user_id=a) then
  raise exception 'Admin membership required' using errcode='42501';
 end if;
 return a;
end $function$
;

CREATE OR REPLACE FUNCTION eclipse_finance.item_id(val text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select coalesce(val ~ '^[a-z][a-z0-9-]{1,29}$',false);
$function$
;

CREATE OR REPLACE FUNCTION eclipse_finance.valid_snapshot(p_document jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare snap jsonb:=p_document->'fulfilmentSnapshot'; item jsonb; total bigint:=0; ids text[]:='{}'; key text;
begin
 if snap is null then return;end if;
 perform public.command63_finance_keys(snap,array['presetId','presetName','libraryRevision','items']);
 if not eclipse_finance.item_id(snap->>'presetId') then raise exception 'Invalid preset snapshot' using errcode='22023';end if;
 perform public.command63_finance_text(snap->'presetName',60,true);
 perform eclipse_finance.whole(snap->'libraryRevision',0,99999999);
 if jsonb_typeof(snap->'items') is distinct from 'array' or jsonb_array_length(snap->'items') not between 1 and 20 then
  raise exception 'Invalid snapshot item count' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(snap->'items') loop
  perform public.command63_finance_keys(item,array['id','name','unitMinor','quantity']);
  key:=item->>'id';if not eclipse_finance.item_id(key) or key=any(ids) then
   raise exception 'Invalid or duplicate snapshot item' using errcode='22023';end if;
  ids:=array_append(ids,key);perform public.command63_finance_text(item->'name',60,true);
  total:=total+eclipse_finance.whole(item->'unitMinor',0,99999)::bigint*eclipse_finance.whole(item->'quantity',1,99);
 end loop;
 if total is distinct from public.command63_finance_number(p_document#>'{costs,packaging,minor}',true)
  or coalesce(p_document#>>'{costs,packaging,state}','') not in ('estimated','confirmed') then
  raise exception 'Packaging total and evidence must match the snapshot' using errcode='22023';end if;
end $function$
;

CREATE OR REPLACE FUNCTION eclipse_finance.whole(val jsonb, lowest integer, highest integer)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
begin
 if jsonb_typeof(val) is distinct from 'number' or val::text !~ '^[0-9]{1,8}$' or (val::text)::int not between lowest and highest
 then raise exception 'Invalid fulfilment quantity or unit cost' using errcode='22023';end if;
 return (val::text)::int;
end $function$
;

CREATE OR REPLACE FUNCTION public.command63_finance_actor()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare actor uuid:=auth.uid();begin if actor is null or not exists(select 1 from public.admin_members m where m.user_id=actor) then raise exception 'Admin membership required' using errcode='42501';end if;return actor;end;$function$
;

CREATE OR REPLACE FUNCTION public.command63_finance_basis(p_order orders)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
 select encode(sha256(convert_to(jsonb_build_object('items',p_order.items,'currency',p_order.currency,'subtotal',p_order.subtotal_pence,'delivery',p_order.delivery_pence,'total',p_order.total_pence,'channel',p_order.sales_channel,'payment',p_order.payment_status,'refund',p_order.refunded_pence,'refund_at',p_order.latest_refund_at)::text,'UTF8')),'hex');
$function$
;

CREATE OR REPLACE FUNCTION public.command63_finance_evidence(p_state jsonb, p_source jsonb, p_excluded boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare state text:=public.command63_finance_text(p_state,30,true);
begin
 if p_excluded and state='excluded' then return;end if;
 if state not in ('unknown','estimated','confirmed') then raise exception 'Unsupported financial evidence state' using errcode='22023';end if;
 perform public.command63_finance_text(p_source,300,state='confirmed');
end;$function$
;

CREATE OR REPLACE FUNCTION public.command63_finance_keys(p_object jsonb, p_allowed text[])
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
begin
 if jsonb_typeof(p_object) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_object) k where not(k=any(p_allowed))) then
  raise exception 'Unsupported financial object or field' using errcode='22023';
 end if;
end;$function$
;

CREATE OR REPLACE FUNCTION public.command63_finance_number(p_value jsonb, p_nullable boolean DEFAULT false, p_signed boolean DEFAULT false, p_micro boolean DEFAULT false)
 RETURNS bigint
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare v numeric; ceiling numeric:=case when p_micro then 100000000000000 else 1000000000000 end;
begin
 if p_value is null or p_value='null'::jsonb then if p_nullable then return null;end if;raise exception 'Financial amount is required' using errcode='22023';end if;
 if jsonb_typeof(p_value)<>'number' or (p_value#>>'{}')!~'^-?[0-9]+$' then raise exception 'Financial amounts require integer minor units' using errcode='22023';end if;
 v:=(p_value#>>'{}')::numeric;
 if v>ceiling or v<(case when p_signed then -ceiling else 0 end) then raise exception 'Financial amount outside supported range' using errcode='22023';end if;
 return v::bigint;
end;$function$
;

CREATE OR REPLACE FUNCTION public.command63_finance_text(p_value jsonb, p_max integer, p_required boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare v text; units integer;
begin
 if p_value is null or p_value='null'::jsonb then if p_required then raise exception 'Financial evidence text is required' using errcode='22023';end if;return null;end if;
 if jsonb_typeof(p_value)<>'string' then raise exception 'Financial text must be a string' using errcode='22023';end if;
 v:=p_value#>>'{}';
 -- Match JavaScript/HTML UTF-16 length, including supplementary characters.
 units:=length(v)+length(regexp_replace(v,U&'[^\+010000-\+10FFFF]','','g'));
 if units>p_max or p_required and length(btrim(v))=0 then raise exception 'Financial text exceeds its limit or is blank' using errcode='22023';end if;
 return v;
end;$function$
;

CREATE OR REPLACE FUNCTION public.command63_finance_validate(p_document jsonb, p_items jsonb, p_currency text)
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare row jsonb; original jsonb; fee jsonb; cost jsonb; i integer:=0; ids text[]:='{}'; refs text[]:='{}'; ref text; category text; k text; method text; state text; n numeric; q bigint; unit numeric; line_discount numeric; products numeric:=0; cogs numeric:=0; known_cogs boolean:=true; order_discount numeric:=0; postage numeric; actual numeric; pass numeric; seller_gross numeric; fees numeric:=0; fulfilment numeric:=0; refunds numeric:=0; adjustments numeric:=0; return_credit numeric:=0; seller_tax numeric:=0; rate numeric; fee_amount numeric; base numeric; source text; stock_basis text;
begin
 perform public.command63_finance_keys(p_document,array['policyVersion','currency','paymentBreakdownBasis','actualPaidMinor','postageMinor','marketplaceTaxMinor','marketplaceTaxState','marketplaceTaxSource','discount','lines','fees','feesComplete','costs','tax','adjustments','settlement','returnCostCredit','provenance','fulfilmentSnapshot']);
 perform eclipse_finance.valid_snapshot(p_document);
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
end;$function$
;

CREATE OR REPLACE FUNCTION public.command63_financial_read(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
 SET lock_timeout TO '1s'
 SET statement_timeout TO '5s'
AS $function$
declare actor uuid:=public.command63_finance_actor();o public.orders%rowtype;f public.order_financial_records%rowtype;basis text;history jsonb;
begin
 select * into o from public.orders where id=p_order_id;if not found or (o.sales_channel='WEBSITE' and (o.paid_at is null or o.stripe_payment_intent_id is null or o.payment_status not in ('paid','partially_refunded','refunded'))) then raise exception 'A recorded external sale or verified website payment is required' using errcode='22023';end if;basis:=public.command63_finance_basis(o);
 select * into f from public.order_financial_records where order_id=p_order_id;
 select coalesce(jsonb_agg(x order by x.revision desc),'[]'::jsonb) into history from(select revision,actor_id,recorded_at from public.order_financial_revisions where order_id=p_order_id order by revision desc limit 10)x;
 return jsonb_build_object('version',1,'orderId',p_order_id,'orderBasisHash',basis,'revision',coalesce(f.revision,0),'document',f.document,'savedOrderBasisHash',f.order_basis_hash,'orderBasisMatches',f.order_basis_hash is null or f.order_basis_hash=basis,'updatedAt',f.updated_at,'updatedBy',f.updated_by,'history',history);
end;$function$
;

CREATE OR REPLACE FUNCTION public.command63_financial_save(p_order_id uuid, p_expected_revision bigint, p_order_basis_hash text, p_request_id uuid, p_document jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
 SET lock_timeout TO '1s'
 SET statement_timeout TO '5s'
AS $function$
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
 if not found or (o.sales_channel='WEBSITE' and (o.paid_at is null or o.stripe_payment_intent_id is null or o.payment_status not in ('paid','partially_refunded','refunded'))) then raise exception 'A recorded external sale or verified website payment is required' using errcode='22023';end if;
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
end;$function$
;

CREATE OR REPLACE FUNCTION public.omniscience74_orders(p_from date, p_to date, p_cursor_day date DEFAULT NULL::date, p_cursor_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '5s'
AS $function$
begin
 perform public.command63_finance_actor();
 if p_from is null or p_to is null or p_from<'1900-01-01' or p_to-p_from not between 0 and 365
  or ((p_cursor_day is null) <> (p_cursor_id is null)) or (p_cursor_day is not null and p_cursor_day not between p_from and p_to)
  then raise exception 'Invalid reporting window or cursor' using errcode='22023';
 end if;
 return (with sale as (
  select o.id,case when o.sales_channel='WEBSITE' then (o.paid_at at time zone 'Europe/London')::date
       else coalesce(o.order_date,(o.created_at at time zone 'Europe/London')::date) end as day
  from public.orders o where o.payment_status in('paid','partially_refunded','refunded') and (o.sales_channel<>'WEBSITE' or o.paid_at is not null)
 ), paged as materialized (
  select s.* from sale s where s.day between p_from and p_to and (p_cursor_day is null or (s.day,s.id)<(p_cursor_day,p_cursor_id))
  order by s.day desc,s.id desc limit 11
 ), records as (
  select s.day,s.id,jsonb_build_object('id',o.id,'day',s.day,'reference',left(o.reference,80),'channel',o.sales_channel,'currency',o.currency,
   'total',o.total_pence,'refund',o.refunded_pence,'finance',f.document,'current',f.order_basis_hash=public.command63_finance_basis(o),
   'items',coalesce((select jsonb_agg(jsonb_build_object('productId',left(coalesce(a.v->>'productId',a.v#>>'{snapshot,componentId}',a.v#>>'{snapshot,assemblyId}',''),120),
     'sku',left(a.v->>'sku',96),'name',left(a.v->>'name',160),'lineTotal',a.v->'lineTotal','quantity',a.v->'quantity') order by a.n)
     from jsonb_array_elements(case when jsonb_typeof(o.items)='array' then o.items else '[]'::jsonb end) with ordinality a(v,n) where a.n<=10),'[]'::jsonb)) as body
  from (select * from paged order by day desc,id desc limit 10) s join public.orders o on o.id=s.id
  left join public.order_financial_records f on f.order_id=o.id
 ) select jsonb_build_object('rows',coalesce((select jsonb_agg(r.body order by r.day desc,r.id desc) from records r),'[]'::jsonb),
  'next',case when (select count(*) from paged)>10 then (select jsonb_build_object('day',r.day,'id',r.id) from records r order by r.day,r.id limit 1) end));
end $function$
;

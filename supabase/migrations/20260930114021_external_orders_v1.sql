-- External Orders V1. No historical order edits, stock movements or email sends.
alter table public.orders add column sales_channel text not null default 'WEBSITE'
 check (sales_channel in ('WEBSITE','EBAY','DIRECT','OTHER'));
alter table public.orders add column external_reference text;
alter table public.orders add column external_reference_key text generated always as (lower(btrim(external_reference))) stored;
alter table public.orders add column order_date date;
alter table public.orders add column internal_notes text not null default '';
alter table public.orders add constraint orders_external_identity_check check (
 (sales_channel='WEBSITE' and external_reference is null and order_date is null)
 or (sales_channel<>'WEBSITE' and external_reference is not null and length(btrim(external_reference)) between 1 and 150 and order_date is not null));
create unique index orders_external_identity_unique on public.orders(sales_channel,external_reference_key)
 where sales_channel<>'WEBSITE';

-- Extract the existing paid-order engine, preserving aggregation, sorted row locks,
-- conditional deductions and transaction rollback. No browser can call this helper.
create function public.apply_order_inventory(p_items jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare item jsonb; part jsonb; wanted record; quantity_needed bigint;
 required_stock jsonb:='{}'::jsonb; component_id text; item_quantity bigint;
begin
 for item in select value from jsonb_array_elements(p_items) loop
  if (item->>'quantity') !~ '^[1-9][0-9]*$' then
   raise exception 'Invalid saved Order quantity' using errcode='22023'; end if;
  item_quantity:=(item->>'quantity')::bigint;
  if item->>'type' in ('kit','assembly') then
   if jsonb_typeof(item->'snapshot'->'stockRequirements')<>'array' then
    raise exception 'Kit has no validated physical requirements' using errcode='22023'; end if;
   for part in select value from jsonb_array_elements(item->'snapshot'->'stockRequirements') loop
    component_id:=part->>'componentId';
    if component_id is null or (part->>'quantity') !~ '^[1-9][0-9]*$' then
     raise exception 'Invalid kit physical requirement' using errcode='22023'; end if;
    quantity_needed:=(part->>'quantity')::bigint*item_quantity;
    required_stock:=jsonb_set(required_stock,array[component_id],
     to_jsonb(coalesce((required_stock->>component_id)::bigint,0)+quantity_needed),true);
   end loop;
  elsif item->>'type'='component' then
   component_id:=item->>'productId';
   if component_id is null or component_id='' then
    raise exception 'Component identity is missing from Order' using errcode='22023'; end if;
   required_stock:=jsonb_set(required_stock,array[component_id],
    to_jsonb(coalesce((required_stock->>component_id)::bigint,0)+item_quantity),true);
  else
   raise exception 'Unsupported Order item' using errcode='22023';
  end if;
 end loop;
 if required_stock='{}'::jsonb then raise exception 'Order has no physical requirements' using errcode='22023'; end if;
 -- Conditional UPDATE locks each stock row. A failed update rolls back every prior deduction.
 for wanted in select key,value from jsonb_each_text(required_stock) order by key loop
  update public.inventory inventory_row set quantity=inventory_row.quantity-wanted.value::bigint,updated_at=now()
   where inventory_row.component_id=wanted.key and inventory_row.quantity>=wanted.value::bigint;
  if not found then raise exception 'Insufficient stock for paid Order; manual fulfilment required' using errcode='22023'; end if;
 end loop;
end;
$$;
revoke all on function public.apply_order_inventory(jsonb) from public,anon,authenticated;
grant execute on function public.apply_order_inventory(jsonb) to service_role;

-- Replace only the existing stock block; preserve payment/refund/event guarantees.
do $migration$
declare body text:=pg_get_functiondef('public.fulfil_paid_stripe_checkout(text,text,uuid,text,text,text,bigint,text)'::regprocedure);
 start_at int; end_at int;
begin
 start_at:=strpos(body,' for item in select value from jsonb_array_elements(order_row.items) loop');
 end_at:=strpos(body,' update public.orders set payment_status');
 if start_at=0 or end_at<=start_at or strpos(body,'Conditional UPDATE locks each stock row')=0 then
  raise exception 'Unexpected paid-order inventory boundary; migration halted';
 end if;
 execute overlay(body placing ' perform public.apply_order_inventory(order_row.items);'||chr(10) from start_at for end_at-start_at);
end $migration$;

create function public.create_external_order(p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); existing public.orders%rowtype; saved public.orders%rowtype;
 request_uuid uuid; request_hash_value text; channel text; external_ref text; sale_date date;
 customer_name text; notes text; postage bigint; subtotal bigint:=0;
 input_item jsonb; stored_items jsonb:='[]'::jsonb; parts jsonb; requirements jsonb;
 component public.components%rowtype; assembly public.assemblies%rowtype;
 product_id text; item_type text; item_quantity int; unit_price bigint; product_name text; product_sku text; snapshot jsonb;
begin
 if actor is null or not exists(select 1 from public.admin_members where user_id=actor) then
  raise exception 'Admin membership required' using errcode='42501';
 end if;
 if p_request is null or jsonb_typeof(p_request)<>'object' or length(p_request::text)>30000
  or jsonb_typeof(p_request->'items') is distinct from 'array'
  or jsonb_array_length(p_request->'items') not between 1 and 10 then
  raise exception 'Add between 1 and 10 existing products' using errcode='22023';
 end if;
 if coalesce(p_request->>'requestId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
  raise exception 'Invalid external order request identifier' using errcode='22023';
 end if;
 request_uuid:=(p_request->>'requestId')::uuid;
 channel:=p_request->>'channel';external_ref:=btrim(p_request->>'externalReference');
 if channel is null or channel not in ('EBAY','DIRECT','OTHER') or coalesce(length(external_ref),0) not between 1 and 150 then
  raise exception 'Choose an external sales channel and enter its order reference' using errcode='22023';
 end if;
 if coalesce(p_request->>'orderDate','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
  raise exception 'Enter the order date' using errcode='22023';
 end if;
 sale_date:=(p_request->>'orderDate')::date;
 if sale_date not between date '1900-01-01' and date '2100-12-31' then raise exception 'Invalid order date' using errcode='22023';end if;
 customer_name:=btrim(p_request->>'customerName');notes:=coalesce(btrim(p_request->>'notes'),'');
 if coalesce(length(customer_name),0) not between 1 and 150 or length(notes)>2000
  or coalesce(p_request->>'postagePence','') !~ '^[0-9]{1,10}$' then
  raise exception 'Enter the customer name and valid postage in pence' using errcode='22023';
 end if;
 postage:=(p_request->>'postagePence')::bigint;
 if postage>1000000000 then raise exception 'Postage exceeds the supported range' using errcode='22023';end if;
 request_hash_value:=md5((p_request-'requestId')::text);
 -- Serialize both retry identities before any catalogue reads or stock movements.
 perform pg_advisory_xact_lock(hashtextextended('external-request:'||request_uuid::text,0));
 perform pg_advisory_xact_lock(hashtextextended('external-sale:'||channel||':'||lower(external_ref),0));
 select * into existing from public.orders where request_id=request_uuid;
 if found then
  if existing.sales_channel<>channel or existing.external_reference_key<>lower(external_ref) or existing.request_hash<>request_hash_value then
   raise exception 'Order request identifier already used with different details' using errcode='23505';
  end if;
  return jsonb_build_object('id',existing.id,'reference',existing.reference,'duplicate',true);
 end if;
 select * into existing from public.orders where sales_channel=channel and external_reference_key=lower(external_ref);
 if found then raise exception 'An order already exists for this sales channel and external reference: %',existing.reference using errcode='23505';end if;
 for input_item in select value from jsonb_array_elements(p_request->'items') loop
  item_type:=input_item->>'type';product_id:=input_item->>'productId';
  if item_type is null or item_type not in ('component','assembly') or coalesce(length(product_id),0) not between 1 and 120
   or coalesce(input_item->>'quantity','') !~ '^[1-9][0-9]?$'
   or coalesce(input_item->>'unitPricePence','') !~ '^[0-9]{1,10}$' then
   raise exception 'Choose an existing product, quantity 1–99 and a valid agreed unit price' using errcode='22023';
  end if;
  item_quantity:=(input_item->>'quantity')::int;unit_price:=(input_item->>'unitPricePence')::bigint;
  if unit_price>1000000000 then raise exception 'Unit price exceeds the supported range' using errcode='22023';end if;
  if item_type='component' then
   select * into component from public.components where id=product_id and active and individually for share;
   if not found then raise exception 'Selected product is unavailable' using errcode='22023';end if;
   product_name:=coalesce(nullif(component.product_content->>'title',''),component.name);product_sku:=component.sku;
   snapshot:=jsonb_build_object('componentId',component.id,'sku',component.sku,'name',product_name,
    'manufacturer',component.manufacturer,'specification',component.specs,'description',component.description);
  else
   select * into assembly from public.assemblies where id=product_id and active for share;
   if not found then raise exception 'Selected assembly is unavailable' using errcode='22023';end if;
   -- Fixed BOM only: customer-configured kits are never inferred from a default.
   if assembly.kind='wiring-kit' then raise exception 'Configured wiring kits require their saved configuration and are not supported by manual External Orders V1' using errcode='22023';end if;
   perform 1 from public.assembly_bom where assembly_id=product_id order by component_id for share;
   perform 1 from public.components c join public.assembly_bom b on b.component_id=c.id where b.assembly_id=product_id order by c.id for share of c;
   if not exists(select 1 from public.assembly_bom where assembly_id=product_id)
    or exists(select 1 from public.assembly_bom b join public.components c on c.id=b.component_id where b.assembly_id=product_id and not c.active) then
    raise exception 'Assembly has no available fixed BOM' using errcode='22023';end if;
   select jsonb_agg(jsonb_build_object('componentId',b.component_id,'quantity',b.quantity) order by b.component_id),
    jsonb_agg(jsonb_build_object('componentId',b.component_id,'sku',c.sku,'name',c.name,'quantity',b.quantity) order by b.component_id)
    into requirements,parts from public.assembly_bom b join public.components c on c.id=b.component_id where b.assembly_id=product_id;
   product_name:=assembly.name;product_sku:=assembly.sku;
   snapshot:=jsonb_build_object('assemblyId',assembly.id,'sku',assembly.sku,'name',assembly.name,'stockRequirements',requirements,'components',parts);
  end if;
  subtotal:=subtotal+unit_price*item_quantity;
  stored_items:=stored_items||jsonb_build_array(jsonb_build_object('type',item_type,'productId',product_id,'sku',product_sku,
   'name',product_name,'quantity',item_quantity,'unitPrice',unit_price,'lineTotal',unit_price*item_quantity,'currency','GBP','snapshot',snapshot));
 end loop;
 if subtotal+postage>1000000000 then raise exception 'Order total exceeds the supported range' using errcode='22023';end if;
 insert into public.orders(request_id,request_hash,sales_channel,external_reference,order_date,internal_notes,
  subtotal_pence,delivery_pence,total_pence,customer,delivery,items,payment_status,paid_at,fulfillment_applied_at,
  confirmation_email_status,status_history)
 values(request_uuid,request_hash_value,channel,external_ref,sale_date,notes,subtotal,postage,subtotal+postage,
  jsonb_build_object('name',customer_name),'{}'::jsonb,stored_items,'paid',now(),now(),'legacy',
  jsonb_build_array(jsonb_build_object('status','pending','at',now(),'source','admin','actor',actor))) returning * into saved;
 perform public.apply_order_inventory(stored_items);
 return jsonb_build_object('id',saved.id,'reference',saved.reference,'duplicate',false);
end;
$$;
revoke all on function public.create_external_order(jsonb) from public,anon,authenticated;
grant execute on function public.create_external_order(jsonb) to authenticated;

-- External orders share fulfilment, never website customer-email eligibility.
-- Guard the existing functions surgically; no existing order or ledger row changes.
do $migration$
declare body text;
begin
 body:=pg_get_functiondef('public.advance_order_fulfilment(uuid,text)'::regprocedure);
 if strpos(body,'if p_next_status in (')=0 then raise exception 'Unexpected fulfilment email boundary';end if;
 execute replace(body,'if p_next_status in (','if order_row.sales_channel=''WEBSITE'' and p_next_status in (');
 body:=pg_get_functiondef('public.claim_paid_order_confirmation(uuid)'::regprocedure);
 if strpos(body,'if not found or o.payment_status')=0 then raise exception 'Unexpected confirmation claim boundary';end if;
 execute replace(body,'if not found or o.payment_status','if not found or o.sales_channel<>''WEBSITE'' or o.payment_status');
 body:=pg_get_functiondef('public.claim_order_email_delivery(uuid,text)'::regprocedure);
 if strpos(body,'if not found or nullif(order_.customer')=0 then raise exception 'Unexpected lifecycle claim boundary';end if;
 execute replace(body,'if not found or nullif(order_.customer','if not found or order_.sales_channel<>''WEBSITE'' or nullif(order_.customer');
end $migration$;


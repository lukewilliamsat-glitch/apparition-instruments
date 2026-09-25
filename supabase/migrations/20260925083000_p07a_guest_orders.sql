-- P07A: durable, Admin-private orders. Guest writes are constrained to this RPC.
create sequence public.order_reference_seq start 10001;
create table public.orders (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique default ('AI-' || lpad(nextval('public.order_reference_seq')::text,6,'0')),
 request_id uuid not null unique,
 request_hash text not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 status text not null default 'pending' check (status = 'pending'),
 payment_status text not null default 'unpaid' check (payment_status = 'unpaid'),
 currency text not null default 'GBP' check (currency = 'GBP'),
 subtotal_pence bigint not null check (subtotal_pence between 0 and 1000000000),
 delivery_pence bigint not null default 0 check (delivery_pence = 0),
 total_pence bigint not null check (total_pence = subtotal_pence + delivery_pence),
 customer jsonb not null check (jsonb_typeof(customer) = 'object'),
 delivery jsonb not null check (jsonb_typeof(delivery) = 'object'),
 items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 10)
);
alter table public.orders enable row level security;
revoke all on public.orders from public, anon, authenticated;
grant select on public.orders to authenticated;
create policy orders_admin_read on public.orders for select to authenticated
 using (exists (select 1 from public.admin_members where user_id=(select auth.uid())));

create function public.create_guest_kit_order(p_request jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  order_data public.orders%rowtype;
  kit public.kit_definitions%rowtype;
  assembly public.assemblies%rowtype;
  input_item jsonb; snapshot jsonb; choice jsonb; part jsonb; requirement jsonb;
  component public.components%rowtype;
  item_index int; role_index int; role_name text; selected_id text;
  physical_quantity int; unit_price bigint; contribution bigint;
  baseline_price bigint; base_id text; expected_price bigint; subtotal bigint:=0;
  option_group jsonb; option_value jsonb; mapping_id text;
  saved_mapping boolean;
  expected_stock jsonb; supplied_stock jsonb;
  expected_lines jsonb; line jsonb; line_key text; line_price bigint;
  customer_name text; customer_email text; delivery_line text; postcode text; country text;
  safe_customer jsonb; safe_delivery jsonb; stored_items jsonb:='[]'::jsonb;
  request_uuid uuid; request_hash_value text;
  price_parts jsonb;
begin
 if p_request is null or jsonb_typeof(p_request)<>'object' or length(p_request::text)>250000
    or jsonb_typeof(p_request->'items')<>'array' or jsonb_array_length(p_request->'items') not between 1 and 10 then
  raise exception 'Order must contain between 1 and 10 configured kits' using errcode='22023';
 end if;
 if (p_request->>'requestId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
  raise exception 'Invalid order request identifier' using errcode='22023';
 end if;
 request_uuid:=(p_request->>'requestId')::uuid;
 request_hash_value:=md5((p_request-'requestId')::text);
 select * into order_data from public.orders where request_id=request_uuid;
 if found then
  if order_data.request_hash<>request_hash_value then raise exception 'Order request identifier already used' using errcode='22023'; end if;
  return jsonb_build_object('id',order_data.id,'reference',order_data.reference,'totalPence',order_data.total_pence,'paymentStatus',order_data.payment_status);
 end if;
 customer_name:=btrim(p_request->'customer'->>'name');customer_email:=btrim(p_request->'customer'->>'email');
 delivery_line:=btrim(p_request->'delivery'->>'line1');postcode:=btrim(p_request->'delivery'->>'postcode');country:=btrim(p_request->'delivery'->>'country');
 if coalesce(length(customer_name),0) not between 1 and 150 or coalesce(length(customer_email),0) not between 3 and 254
    or customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or coalesce(length(delivery_line),0) not between 1 and 200 or coalesce(length(postcode),0) not between 1 and 32
    or coalesce(length(country),0) not between 1 and 100 then
  raise exception 'Customer name, email and delivery address are required' using errcode='22023';
 end if;
 safe_customer:=jsonb_build_object('name',customer_name,'email',customer_email);
 safe_delivery:=jsonb_build_object('line1',delivery_line,'postcode',postcode,'country',country);
 for item_index in 0..jsonb_array_length(p_request->'items')-1 loop
  input_item:=p_request->'items'->item_index;snapshot:=input_item->'record';choice:=snapshot->'configuration';
  if input_item->>'product'<>'les-paul' or jsonb_typeof(snapshot)<>'object' or jsonb_typeof(choice)<>'object'
    or snapshot->>'kitType'<>'les-paul' or snapshot->>'schemaVersion'<>'3'
    or jsonb_typeof(snapshot->'components')<>'array' or jsonb_array_length(snapshot->'components')<>6
    or jsonb_typeof(snapshot->'pricing'->'lines')<>'array' or jsonb_array_length(snapshot->'pricing'->'lines')<>9
    or jsonb_typeof(snapshot->'stockRequirements')<>'array'
    or jsonb_typeof(snapshot->'specification')<>'object'
    or (input_item->>'quantity') !~ '^[1-9][0-9]?$' or (input_item->>'quantity')::int>99 then
   raise exception 'Malformed configured kit snapshot' using errcode='22023';
  end if;
  select * into kit from public.kit_definitions where assembly_id=snapshot->>'kitDefinitionId' and family='les-paul' for share;
  select * into assembly from public.assemblies where id=kit.assembly_id for share;
  if kit.assembly_id is null or not (assembly.active and kit.builder_enabled) or snapshot->>'kitName'<>assembly.name
    or snapshot->'pricing'->>'currency'<>'GBP' then raise exception 'Kit is unavailable' using errcode='22023'; end if;
  if choice->>'wiring' not in ('modern','50s','60s') or choice->>'shaft' not in ('short','long')
    or choice->>'matching' not in ('standard','precision')
    or choice->>'caps' is null or choice->>'bleed' is null or choice->>'jack' is null or choice->>'selector' is null then
   raise exception 'Unsupported kit selection' using errcode='22023';
  end if;
  if choice->>'wiring'='50s' and choice->>'bleed'<>'none' then raise exception 'Treble bleed is unavailable with 50s wiring' using errcode='22023'; end if;
  for option_group in select value from jsonb_array_elements(kit.builder_options) loop
   if option_group->>'key' in ('pots','shaft') then
    select value into option_value from jsonb_array_elements(option_group->'values') where value->>'key'=choice->>(option_group->>'key') and value->>'enabled'='true';
    if option_value is null or option_group->>'enabled'<>'true' then raise exception 'Kit option is disabled' using errcode='22023'; end if;
   end if;
  end loop;
  select m->>'componentId' into base_id from jsonb_array_elements(kit.component_resolvers) r,
   lateral jsonb_array_elements(r->'mappings') m where r->>'key'='potentiometers'
   and m->'selection'->>'pots'=(select g->>'defaultValue' from jsonb_array_elements(kit.builder_options) g where g->>'key'='pots')
   and m->'selection'->>'shaft'=(select g->>'defaultValue' from jsonb_array_elements(kit.builder_options) g where g->>'key'='shaft') limit 1;
  select kit_price into baseline_price from public.components where id=base_id;
  if baseline_price is null then raise exception 'Kit baseline price is unavailable' using errcode='22023'; end if;
  price_parts:=jsonb_build_object('base',kit.base_price,'wiring',0,'shaft',0,'matching',case when choice->>'matching'='precision' then 999 else 0 end);
  for role_index in 0..5 loop
   requirement:=kit.defaults->'requirements'->role_index;
   role_name:=requirement->>'role';
   if role_name is distinct from (array['potentiometers','neckToneCapacitor','bridgeToneCapacitor','trebleBleeds','outputJack','selector'])[role_index+1]
      or (requirement->>'quantity') !~ '^[1-9][0-9]*$' then raise exception 'Invalid physical kit requirements' using errcode='22023'; end if;
   physical_quantity:=(requirement->>'quantity')::int;
   select value into part from jsonb_array_elements(snapshot->'components') where value->>'role'=role_name;
   if part is null or (select count(*) from jsonb_array_elements(snapshot->'components') where value->>'role'=role_name)<>1 then
    raise exception 'Incomplete physical kit configuration' using errcode='22023'; end if;
   if role_name='potentiometers' then
    select m->>'componentId' into mapping_id from jsonb_array_elements(kit.component_resolvers) r,
     lateral jsonb_array_elements(r->'mappings') m where r->>'key'='potentiometers'
     and m->'selection'->>'pots'=choice->>'pots' and m->'selection'->>'shaft'=choice->>'shaft' limit 1;
    saved_mapping:=found;
    selected_id:=part->>'componentId';
    if saved_mapping and mapping_id is distinct from selected_id then raise exception 'Potentiometer mapping does not match the kit' using errcode='22023'; end if;
   elsif role_name in ('neckToneCapacitor','bridgeToneCapacitor') then
    selected_id:=case when choice->>'caps'='mixed' then choice->>(case when role_name='neckToneCapacitor' then 'neckCap' else 'bridgeCap' end) else choice->>'caps' end;
   else
    selected_id:=choice->>(case role_name when 'trebleBleeds' then 'bleed' when 'outputJack' then 'jack' else 'selector' end);
    if selected_id='none' then selected_id:=null;physical_quantity:=0; end if;
   end if;
   if part->>'componentId' is distinct from selected_id or (part->>'quantity') !~ '^[0-9]+$'
     or (part->>'quantity')::int<>physical_quantity then raise exception 'Physical part or quantity differs from kit selection' using errcode='22023'; end if;
   if selected_id is not null then
    select * into component from public.components where id=selected_id and active and in_kits;
    if not found or not exists(select 1 from public.kit_permitted_components where assembly_id=kit.assembly_id and component_id=selected_id)
       or component.kit_price is null then raise exception 'Selected Component is unavailable' using errcode='22023'; end if;
    if component.category<>(case role_name when 'potentiometers' then 'potentiometers' when 'neckToneCapacitor' then 'capacitors' when 'bridgeToneCapacitor' then 'capacitors' when 'trebleBleeds' then 'treble-bleeds' when 'outputJack' then 'jacks' else 'switches' end) then
     raise exception 'Component category does not match its physical role' using errcode='22023'; end if;
    if role_name='potentiometers' and (component.manufacturer<>(choice->>'pots') or (component.specs->>'Shaft') !~* ('^' || (choice->>'shaft') || '( shaft)?$')
       or (component.specs->>'Resistance') !~* '^(500[[:space:]]*k(Ω|ohms?)?|500000[[:space:]]*(Ω|ohms?))$' or (component.specs->>'Taper') !~* 'audio|^a' or (component.specs->>'Type') !~* '^standard$') then
      raise exception 'Physical potentiometer does not match the selection' using errcode='22023'; end if;
    if role_name='potentiometers' and not saved_mapping and (select count(*) from public.components c join public.kit_permitted_components p on p.component_id=c.id and p.assembly_id=kit.assembly_id
      where c.active and c.in_kits and c.category='potentiometers' and c.manufacturer=choice->>'pots'
      and (c.specs->>'Shaft') ~* ('^' || (choice->>'shaft') || '( shaft)?$')
      and (c.specs->>'Resistance') ~* '^(500[[:space:]]*k(Ω|ohms?)?|500000[[:space:]]*(Ω|ohms?))$'
      and (c.specs->>'Taper') ~* 'audio|^a' and (c.specs->>'Type') ~* '^standard$')<>1 then
      raise exception 'Ambiguous physical potentiometer selection' using errcode='22023'; end if;
    if part->'component'->>'id'<>component.id or part->'component'->>'sku'<>component.sku
      or part->'component'->>'name'<>component.name or part->'component'->>'manufacturer'<>component.manufacturer
      or part->'component'->'specification'<>component.specs
      or part->'component'->>'kitPrice'<>component.kit_price::text then
     raise exception 'Component snapshot differs from current catalogue' using errcode='22023'; end if;
    unit_price:=component.kit_price;
   else unit_price:=null;end if;
   contribution:=case when physical_quantity=0 then 0 when role_name='potentiometers' then physical_quantity*(unit_price-baseline_price) else physical_quantity*unit_price end;
   if part->>'unitKitPrice' is distinct from unit_price::text or part->>'priceContribution' is distinct from contribution::text then
    raise exception 'Physical Component price was altered' using errcode='22023'; end if;
   price_parts:=price_parts || jsonb_build_object(role_name,contribution);
  end loop;
  -- Compare aggregate stock to the P06B snapshot. No stock is reserved or changed.
  select coalesce(jsonb_object_agg(component_id,quantity),'{}'::jsonb) into expected_stock from (
   select value->>'componentId' component_id,sum((value->>'quantity')::int) quantity
   from jsonb_array_elements(snapshot->'components') where value->>'componentId' is not null group by value->>'componentId'
  ) totals;
  select coalesce(jsonb_object_agg(component_id,quantity),'{}'::jsonb) into supplied_stock from (
   select value->>'componentId' component_id,sum((value->>'quantity')::int) quantity
   from jsonb_array_elements(snapshot->'stockRequirements') group by value->>'componentId'
  ) totals;
  if expected_stock<>supplied_stock or exists(select 1 from jsonb_array_elements(snapshot->'stockRequirements') v
    where v->>'componentId' is null or (v->>'quantity') !~ '^[1-9][0-9]*$') then
   raise exception 'Aggregate physical stock requirements are inconsistent' using errcode='22023'; end if;
  expected_lines:=jsonb_build_array('base','wiring','pots','shaft','matching','capacitors','bleed','jack','selector');
  expected_price:=kit.base_price;
  for role_index in 0..8 loop
   line:=snapshot->'pricing'->'lines'->role_index;line_key:=expected_lines->>role_index;
   line_price:=case line_key when 'pots' then (price_parts->>'potentiometers')::bigint
    when 'capacitors' then (price_parts->>'neckToneCapacitor')::bigint+(price_parts->>'bridgeToneCapacitor')::bigint
    when 'bleed' then (price_parts->>'trebleBleeds')::bigint
    when 'jack' then (price_parts->>'outputJack')::bigint
    when 'selector' then (price_parts->>'selector')::bigint
    else (price_parts->>line_key)::bigint end;
   if line->>'key'<>line_key or line->>'price' is distinct from line_price::text then raise exception 'Kit price breakdown differs from current prices' using errcode='22023'; end if;
   if line_key<>'base' then expected_price:=expected_price+line_price; end if;
  end loop;
  if snapshot->'pricing'->>'total' is distinct from expected_price::text or snapshot->>'basePrice' is distinct from kit.base_price::text
    or expected_price<0 or expected_price>1000000000 then raise exception 'Kit total differs from validated price' using errcode='22023'; end if;
  subtotal:=subtotal+expected_price*(input_item->>'quantity')::int;
  stored_items:=stored_items || jsonb_build_array(jsonb_build_object('type','kit','productId',assembly.id,'sku',assembly.sku,
    'name',assembly.name,'quantity',(input_item->>'quantity')::int,'unitPrice',expected_price,
    'lineTotal',expected_price*(input_item->>'quantity')::int,'currency','GBP','snapshot',snapshot));
 end loop;
 if subtotal>1000000000 then raise exception 'Order amount exceeds supported range' using errcode='22023'; end if;
 insert into public.orders(request_id,request_hash,subtotal_pence,total_pence,customer,delivery,items)
 values(request_uuid,request_hash_value,subtotal,subtotal,safe_customer,safe_delivery,stored_items)
 returning * into order_data;
 return jsonb_build_object('id',order_data.id,'reference',order_data.reference,'totalPence',order_data.total_pence,'paymentStatus',order_data.payment_status);
end;
$$;
revoke all on function public.create_guest_kit_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_guest_kit_order(jsonb) to anon, authenticated;

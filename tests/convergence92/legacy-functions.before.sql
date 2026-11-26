CREATE OR REPLACE FUNCTION commerce67.admin_actor()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(select from public.admin_members where user_id=actor)
 then raise exception 'Commerce Admin membership required' using errcode='42501'; end if;
 return actor;
end $function$
;
CREATE OR REPLACE FUNCTION commerce67.apply_offer(p_units jsonb, r commerce67.rules)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare tier jsonb; gross bigint; discount bigint; allocation bigint; balance bigint; allocated bigint:=0;
 ids integer[]; ix integer; groups integer; min_qty integer; unit jsonb; modified jsonb:=p_units;
begin
 select array_agg(n::integer-1 order by (v->>'remaining')::bigint desc,n) into ids
 from jsonb_array_elements(p_units) with ordinality as x(v,n)
 where v->>'type'='component'
 and not ((r.data->'exclude') ? (v->>'productId'))
 and (r.data->'all'='true'::jsonb or (r.data->'products') ? (v->>'productId') or (r.data->'categories') ? (v->>'category'));
 select value into tier from jsonb_array_elements(r.data->'tiers')
  where (value->>'minimum')::int<=coalesce(cardinality(ids),0) order by (value->>'minimum')::int desc limit 1;
 if tier is null then return null; end if;
 min_qty:=(tier->>'minimum')::int;
 if tier->>'type'='package' then
  ids:=array(select k from unnest(ids) k where not coalesce((p_units->k->>'packageUsed')::boolean,false));
  select value into tier from jsonb_array_elements(r.data->'tiers') where value->>'type'='package'
    and (value->>'minimum')::int<=cardinality(ids) order by (value->>'minimum')::int desc limit 1;
  if tier is null then return null; end if;
  min_qty:=(tier->>'minimum')::int;
 end if;
 groups:=cardinality(ids)/min_qty;
 if tier->>'type'='package' then ids:=ids[1:groups*min_qty]; end if;
 select sum((p_units->k->>'remaining')::bigint) into gross from unnest(ids) k;
 discount:=case tier->>'type' when 'percent' then (gross*(tier->>'value')::bigint+5000)/10000
  when 'fixed' then groups*(tier->>'value')::bigint
  else greatest(0,gross-groups*(tier->>'value')::bigint) end;
 -- A physical line is never rounded below one penny. Fixed-package groups
 -- occupy the highest-priced available eligible units, as in the draft studio.
 discount:=least(discount,gross-cardinality(ids));
 if discount<=0 then return null; end if;
 balance:=gross-cardinality(ids);
 foreach ix in array ids loop
  unit:=modified->ix;
  allocation:=((unit->>'remaining')::bigint-1)*discount/balance;
  modified:=jsonb_set(modified,array[ix::text],unit||jsonb_build_object('remaining',(unit->>'remaining')::bigint-allocation,
   'packageUsed',coalesce((unit->>'packageUsed')::boolean,false) or tier->>'type'='package',
   'offers',coalesce(unit->'offers','[]'::jsonb)||jsonb_build_array(r.id)),false);
  allocated:=allocated+allocation;
 end loop;
 foreach ix in array ids loop
  exit when allocated=discount;
  if (modified->ix->>'remaining')::bigint>1 then
   modified:=jsonb_set(modified,array[ix::text,'remaining'],to_jsonb((modified->ix->>'remaining')::bigint-1),false);
   allocated:=allocated+1;
  end if;
 end loop;
 if allocated<>discount then raise exception 'Discount allocation failed'; end if;
 return jsonb_build_object('units',modified,'discount',discount,
  'offer',jsonb_build_object('id',r.id,'revision',r.revision,'name',r.name,'discountMinor',discount,'minimum',min_qty));
end $function$
;
CREATE OR REPLACE FUNCTION commerce67.audit_paid_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if old.state='open' and new.state='paid' then
  insert into commerce67.payment_audit(order_id,transition) values(new.order_id,'paid');
 end if;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION commerce67.consume(p_order uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare row_state text;
begin
 select state into row_state from commerce67.sessions where order_id=p_order for update;
 if not found then return; end if;
 if row_state<>'open' then raise exception 'Commerce checkout reservation is no longer open'; end if;
 -- Same ordering as the established stock deduction, including measured variants.
 perform 1 from public.inventory i where i.component_id in (
  select component_id from commerce67.holds where order_id=p_order
  union select component_id from commerce67.matched_sets where order_id=p_order)
  order by i.component_id for update;
 update commerce67.measured_units u set sold_order=p_order where exists(
  select from commerce67.set_members m join commerce67.matched_sets s on s.id=m.set_id
  where m.unit_id=u.id and s.order_id=p_order and s.state='reserved');
 update commerce67.matched_sets set state='sold' where order_id=p_order and state='reserved';
 delete from commerce67.holds where order_id=p_order;
 update commerce67.sessions set state='paid',resolved_at=now() where order_id=p_order;
end $function$
;
CREATE OR REPLACE FUNCTION commerce67.delivery_pence(p_merchandise bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare rate bigint; threshold bigint;
begin
 select standard_delivery_pence,free_delivery_threshold_pence into rate,threshold
 from public.commerce_shipping where country='GB' for share;
 if rate is null or threshold is null then raise exception 'UK delivery is unavailable'; end if;
 return case when p_merchandise>=threshold then 0 else rate end;
end $function$
;
CREATE OR REPLACE FUNCTION commerce67.floor_quantity(p_component text)
 RETURNS bigint
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 select (select count(*) from commerce67.measured_units where component_id=p_component and sold_order is null)
 + coalesce((select sum(quantity) from commerce67.holds where component_id=p_component),0)::bigint
$function$
;
CREATE OR REPLACE FUNCTION commerce67.inventory_floor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare floor_qty bigint:=commerce67.floor_quantity(old.component_id);
begin
 if floor_qty>0 and (tg_op='DELETE' or new.component_id is distinct from old.component_id or new.quantity<floor_qty) then
  raise exception 'Stock is allocated to measured units or pending checkout' using errcode='23514';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION commerce67.quote(p_intents jsonb, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare t timestamptz:=statement_timestamp(); input jsonb; u jsonb; r commerce67.rules; a commerce67.rules;
 c record; matched commerce67.matched_sets; match_data jsonb;
 units jsonb:='[]'; stacked jsonb; chosen jsonb; applied jsonb:='[]'; chosen_applied jsonb:='[]'; attempt jsonb;
 parts jsonb; cost bigint; gross bigint; price bigint; goods bigint:=0; unit_count integer:=0; quantity integer;
 stacked_discount bigint:=0; best_discount bigint:=0; ship bigint; threshold bigint; key text; customer_name text;
 item_sku text; offer_code text:=nullif(upper(btrim(p_code)),''); order_lines jsonb; base_gross bigint;
 stock_need record; existing bigint;
begin
 if not (select enabled from commerce67.control where single for share)
 then raise exception 'Commerce checkout is disabled' using errcode='55000'; end if;
 if jsonb_typeof(p_intents) is distinct from 'array' or jsonb_array_length(p_intents) not between 1 and 10
 or octet_length(p_intents::text)>7000 or (offer_code is not null and offer_code !~ '^[A-Z0-9-]{3,32}$')
 then raise exception 'Invalid commerce basket' using errcode='22023'; end if;
 for input in select value from jsonb_array_elements(p_intents) loop
  if jsonb_typeof(input) is distinct from 'object' or (input - array['kind','id','quantity','addon'])<>'{}'::jsonb
   or coalesce(input->>'id','') !~ '^[A-Za-z0-9_-]{1,120}$'
  then raise exception 'Invalid commerce item' using errcode='22023'; end if;
  quantity:=commerce67.require_int(input->'quantity',1,60);
  unit_count:=unit_count+quantity;
  if unit_count>60 then raise exception 'Commerce checkout supports at most sixty sellable units'; end if;
  key:=input->>'id'; match_data:=null; parts:='[]';
  if input->>'kind'='component' then
   select id,sku,name,category,sale_price into c from public.components where id=key and active and individually and sale_price>0 for share;
   if not found then raise exception 'Component is unavailable' using errcode='22023'; end if;
   gross:=c.sale_price; price:=gross; customer_name:=c.name; item_sku:=c.sku;
   u:=jsonb_build_object('type','component','productId',c.id,'category',c.category);
   if input ? 'addon' then
    select * into a from commerce67.rules where id=(input->>'addon')::uuid and kind='addon' and state in ('active','scheduled')
    and (starts_at is null or starts_at<=t) and (ends_at is null or ends_at>t)
    and (data->'products') ? c.id and not ((data->'exclude') ? c.id);
    if not found then raise exception 'Add-on is unavailable or incompatible' using errcode='22023'; end if;
    if exists(select from jsonb_array_elements(a.data->'parts') p where p->>'componentId'=c.id)
    then raise exception 'Incompatible repeated base component'; end if;
    parts:=(a.data->'parts')||jsonb_build_array(jsonb_build_object('componentId',c.id,'quantity',1));
    customer_name:=c.name||' + '||a.name;
    price:=price+(a.data->>'priceMinor')::bigint; gross:=price;
    u:=jsonb_build_object('type','assembly','productId',c.id,'addon',
     jsonb_build_object('id',a.id,'revision',a.revision,'name',a.name,'instructions',a.data->>'instructions','priceMinor',a.data->'priceMinor'));
   end if;
  elsif input->>'kind'='bundle' and not(input ? 'addon') then
   select * into r from commerce67.rules where id=key::uuid and kind='bundle' and state in ('active','scheduled')
   and (starts_at is null or starts_at<=t) and (ends_at is null or ends_at>t);
   if not found then raise exception 'Bundle is unavailable' using errcode='22023'; end if;
   parts:=r.data->'parts'; customer_name:=r.name; item_sku:='BUNDLE-'||left(key,8);
   u:=jsonb_build_object('type','assembly','productId',key,'bundle',jsonb_build_object('id',r.id,'revision',r.revision,'name',r.name));
  elsif input->>'kind'='set' and quantity=1 and not(input ? 'addon') then
   select * into matched from commerce67.matched_sets where id=key::uuid and state='available';
   if not found then raise exception 'Measured set is unavailable' using errcode='22023'; end if;
   select id,sku,name,category,sale_price into c from public.components where id=matched.component_id and active and sale_price>0 for share;
   if not found then raise exception 'Measured set variant is unavailable'; end if;
   parts:=jsonb_build_array(jsonb_build_object('componentId',c.id,'quantity',matched.size));
   price:=matched.price_minor; gross:=price;
   customer_name:=c.name||' · measured set of '||matched.size;
   item_sku:='MATCH-'||left(key,8);
   -- Public quote strips this metadata; the authenticated fulfilment copy retains it.
   select jsonb_build_object('id',matched.id,'toleranceBp',matched.tolerance_bp,
    'units',jsonb_agg(jsonb_build_object('id',m.id,'ohms',m.resistance_ohms) order by m.id))
   into match_data from commerce67.set_members s join commerce67.measured_units m on m.id=s.unit_id where s.set_id=matched.id;
   if jsonb_array_length(match_data->'units') is distinct from matched.size then raise exception 'Measured set membership changed'; end if;
   u:=jsonb_build_object('type','assembly','productId',key,'measuredSet',match_data);
  else raise exception 'Unsupported commercial selection' using errcode='22023';
  end if;
  if jsonb_array_length(parts)>0 then
   -- Only constituent rows; never select an image or private cost on this path.
   perform 1 from public.components cc where cc.id in (select value->>'componentId' from jsonb_array_elements(parts))
    order by cc.id for share;
   if exists(select from jsonb_array_elements(parts) p left join public.components cc on cc.id=p->>'componentId'
    where cc.active is not true or (input->>'kind'='bundle' and coalesce(cc.sale_price,0)<1))
   then raise exception 'A constituent is unavailable'; end if;
   if input->>'kind'='bundle' then
    select sum(cc.sale_price::bigint*(p->>'quantity')::int) into gross
    from jsonb_array_elements(parts) p join public.components cc on cc.id=p->>'componentId';
    price:=case r.data->>'pricing' when 'fixed' then (r.data->>'priceMinor')::bigint
     else greatest(1,gross-(r.data->>'priceMinor')::bigint) end;
    if price>gross then raise exception 'Bundle price exceeds its constituent prices'; end if;
   end if;
   select jsonb_agg(p||jsonb_build_object('name',cc.name,'sku',cc.sku) order by cc.id) into parts
    from jsonb_array_elements(parts) p join public.components cc on cc.id=p->>'componentId';
  end if;
  u:=u||jsonb_build_object('name',customer_name,'sku',item_sku,'gross',gross,'remaining',price,
   'stockRequirements',parts,'offers','[]'::jsonb);
  for ix in 1..quantity loop units:=units||jsonb_build_array(u); end loop;
 end loop;
 base_gross:=(select sum((v->>'gross')::bigint) from jsonb_array_elements(units) v);
 if base_gross>1000000000 or (select max((v->>'remaining')::bigint) from jsonb_array_elements(units) v)>99999999
  then raise exception 'Commerce totals exceed the supported range'; end if;

 stacked:=units;
 for r in select * from commerce67.rules where kind='offer' and state in ('active','scheduled')
   and (starts_at is null or starts_at<=t) and (ends_at is null or ends_at>t)
   and (code is null or code=offer_code) and data->>'stacking'='stackable' order by priority,id loop
  attempt:=commerce67.apply_offer(stacked,r);
  if attempt is not null then
   stacked:=attempt->'units'; stacked_discount:=stacked_discount+(attempt->>'discount')::bigint;
   applied:=applied||jsonb_build_array(attempt->'offer');
  end if;
 end loop;
 chosen:=stacked; chosen_applied:=applied; best_discount:=stacked_discount;
 for r in select * from commerce67.rules where kind='offer' and state in ('active','scheduled')
   and (starts_at is null or starts_at<=t) and (ends_at is null or ends_at>t)
   and (code is null or code=offer_code) and data->>'stacking'='exclusive' order by priority,id loop
  attempt:=commerce67.apply_offer(units,r);
  if (attempt->>'discount')::bigint>best_discount then
   chosen:=attempt->'units'; chosen_applied:=jsonb_build_array(attempt->'offer'); best_discount:=(attempt->>'discount')::bigint;
  end if;
 end loop;
 if offer_code is not null and not exists(select from jsonb_array_elements(chosen_applied) p
  join commerce67.rules rr on rr.id=(p->>'id')::uuid where rr.code=offer_code)
 then raise exception 'Code is unavailable for this basket' using errcode='22023'; end if;
 select jsonb_agg(jsonb_build_object('type',s.u->>'type','productId',s.u->>'productId','sku',s.u->>'sku','name',s.u->>'name',
 'quantity',q,'unitPrice',(s.u->>'remaining')::bigint,'lineTotal',q*(s.u->>'remaining')::bigint,'currency','GBP',
 'snapshot',jsonb_build_object('originalUnitPrice',(s.u->>'gross')::bigint,'offerIds',s.u->'offers',
 'stockRequirements',s.u->'stockRequirements')||
 case when s.u?'addon' then jsonb_build_object('addon',s.u->'addon') when s.u?'bundle' then jsonb_build_object('bundle',s.u->'bundle')
 when s.u?'measuredSet' then jsonb_build_object('measuredSet',s.u->'measuredSet') else '{}'::jsonb end)
 order by first_ordinal) into order_lines
 from (select v u,count(*) q,min(n) first_ordinal
  from jsonb_array_elements(chosen) with ordinality as x(v,n) group by v) s;
 if exists(select from jsonb_array_elements(order_lines) item where item->'snapshot'?'measuredSet' and (item->>'quantity')::int<>1) or
  (select count(*) from jsonb_array_elements(order_lines) item where item->'snapshot'?'measuredSet')<>
  (select count(distinct item->>'productId') from jsonb_array_elements(order_lines) item where item->'snapshot'?'measuredSet')
  then raise exception 'A measured set can only be selected once'; end if;
 for stock_need in select * from commerce67.requirements(order_lines) loop
  select i.quantity into existing from public.inventory i where i.component_id=stock_need.component_id and i.stock_unit='item';
  if existing is null or existing-commerce67.floor_quantity(stock_need.component_id)<stock_need.quantity
   then raise exception 'Shared stock is unavailable' using errcode='22023'; end if;
 end loop;
 goods:=(select sum((item->>'lineTotal')::bigint) from jsonb_array_elements(order_lines) item);
 ship:=commerce67.delivery_pence(goods);
 return jsonb_build_object('currency','GBP','subtotalMinor',goods,'deliveryMinor',ship,'totalMinor',goods+ship,
  'originalMinor',base_gross,'discountMinor',base_gross-goods,'offers',chosen_applied,'items',order_lines);
end $function$
;
CREATE OR REPLACE FUNCTION commerce67.require_int(p jsonb, low integer, high integer)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
begin
 if jsonb_typeof(p) is distinct from 'number' or p::text !~ '^[0-9]{1,10}$'
 or p::text::bigint not between low and high then
  raise exception 'Invalid integer configuration' using errcode='22023';
 end if;
 return p::text::integer;
end $function$
;
CREATE OR REPLACE FUNCTION commerce67.requirements(p_items jsonb)
 RETURNS TABLE(component_id text, quantity bigint)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select parts.id,sum(parts.q)::bigint
 from jsonb_array_elements(p_items) r(item)
 cross join lateral (
  select r.item->>'productId' id,(r.item->>'quantity')::bigint q where r.item->>'type'='component'
  union all
  select v->>'componentId',(v->>'quantity')::bigint*(r.item->>'quantity')::bigint
  from jsonb_array_elements(r.item->'snapshot'->'stockRequirements') v
  where r.item->>'type' in ('kit','assembly') and not (r.item->'snapshot' ? 'measuredSet')
 ) parts
 group by parts.id order by parts.id
$function$
;
CREATE OR REPLACE FUNCTION commerce67.reserve(p_order uuid, p_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare requirement record; have bigint; item jsonb; set_uuid uuid; owner_id uuid; physical bigint; current_timepoint timestamptz;
begin

 perform pg_advisory_xact_lock(671016221000::bigint);
 current_timepoint:=clock_timestamp();
 select owner_user_id into strict owner_id from public.orders where id=p_order;
 select coalesce(sum(quantity),0) into physical from commerce67.requirements(p_items);
 physical:=physical+coalesce((select sum((x->>'quantity')::int)
  from jsonb_array_elements(p_items) t(v)
  cross join lateral jsonb_array_elements(v->'snapshot'->'stockRequirements') x
  where v->'snapshot'?'measuredSet'),0);
 if physical not between 1 and 60 then
  raise exception 'Checkout reservation quantity limit exceeded' using errcode='22023';
 end if;
 if (select count(*) from commerce67.sessions where state='open')>=20
 or physical+coalesce((select sum(physical_units) from commerce67.sessions where state='open'),0)>150
 or (select count(*) from commerce67.sessions where created_at>current_timepoint-interval '1 minute')>=12
 or (owner_id is null and (
  (select count(*) from commerce67.sessions s join public.orders o on o.id=s.order_id where s.state='open' and o.owner_user_id is null)>=6 or
  (select count(*) from commerce67.sessions s join public.orders o on o.id=s.order_id where s.created_at>current_timepoint-interval '1 minute' and o.owner_user_id is null)>=6))
 or (owner_id is not null and (
  (select count(*) from commerce67.sessions s join public.orders o on o.id=s.order_id where s.state='open' and o.owner_user_id=owner_id)>=2 or
  (select count(*) from commerce67.sessions s join public.orders o on o.id=s.order_id where s.created_at>current_timepoint-interval '1 minute' and o.owner_user_id=owner_id)>=3))
 then raise exception 'Checkout is temporarily at reservation capacity' using errcode='P0067'; end if;
 for requirement in select * from commerce67.requirements(p_items) loop
  select i.quantity into have from public.inventory i where i.component_id=requirement.component_id and i.stock_unit='item' for update;
  if have is null or have-commerce67.floor_quantity(requirement.component_id)<requirement.quantity
  then raise exception 'Shared stock is unavailable' using errcode='22023'; end if;
  update public.inventory set updated_at=updated_at where component_id=requirement.component_id;
  insert into commerce67.holds values(p_order,requirement.component_id,requirement.quantity);
 end loop;
 for item in select value from jsonb_array_elements(p_items) where value->'snapshot' ? 'measuredSet' order by value->>'productId' loop
  set_uuid:=(item->'snapshot'->'measuredSet'->>'id')::uuid;
  update commerce67.matched_sets set state='reserved',order_id=p_order where id=set_uuid and state='available';
  if not found then raise exception 'Measured set is unavailable' using errcode='22023'; end if;
 end loop;

 insert into commerce67.sessions(order_id,physical_units,expires_epoch)
 values(p_order,physical,floor(extract(epoch from current_timepoint))::bigint+2400);
 insert into commerce67.payment_audit(order_id,transition) values(p_order,'reserved');

end $function$
;

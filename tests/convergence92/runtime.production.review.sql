-- Production review only. Installation and activation need separate release authority.
do $preflight$begin
 if to_regnamespace('commerce67') is not null
   or (select mode from dominion79.lifecycle_control where singleton) is distinct from 'paused'
   or exists(select 1 from dominion79.holds)
   or to_regprocedure('dominion79.reserve(uuid,text,timestamptz)') is not null
   or md5(pg_get_functiondef('public.fulfil_paid_stripe_checkout(text,text,uuid,text,text,text,bigint,text)'::regprocedure))
      is distinct from 'bb9667b96e2aa3d8a557863434463294' then
  raise exception 'Expected dormant production reservation and legacy payment baseline required';
 end if;
end $preflight$;
create table dominion79.consuming(
 order_id uuid primary key references dominion79.holds(order_id),
 transaction_id xid8 not null
);
create table dominion79.provider_events (
 provider_account text not null, event_key text not null, order_id uuid not null references public.orders(id),
 fingerprint jsonb not null, outcome text,
 primary key(provider_account,event_key)
);
create table dominion79.provenance(
 order_id uuid not null references public.orders(id), component_id text not null references public.inventory(component_id),
 consumed_on timestamptz not null default clock_timestamp(), quantity bigint not null check(quantity>0),
 batches jsonb not null, measured_units uuid[] not null,
 primary key(order_id,component_id)
);
-- Mirrors the established saved BOM, without resolving SKUs or names. An explicit measured selection uses an existing allocated-set ID.
create function dominion79.requirements(items jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare item jsonb; part jsonb; wanted jsonb:='{}'; component text; q bigint; n bigint; k text;
begin
 if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) not between 1 and 100 then raise exception 'Invalid saved BOM'; end if;
 for item in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(item->'quantity') is distinct from 'number' or coalesce(item->>'quantity','') !~ '^[1-9][0-9]{0,3}$' then raise exception 'Invalid saved quantity'; end if;
  q:=(item->>'quantity')::bigint;k:=item->>'type';
  if k='component' then
   component:=item->>'productId';if coalesce(component,'') !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$' then raise exception 'Invalid component identity';end if;
   wanted:=jsonb_set(wanted,array[component],to_jsonb(coalesce((wanted->>component)::bigint,0)+q));
  elsif k in ('kit','assembly') then
   if jsonb_typeof(item#>'{snapshot,stockRequirements}') is distinct from 'array' or jsonb_array_length(item#>'{snapshot,stockRequirements}') not between 1 and 100 then raise exception 'Invalid saved kit BOM';end if;
   for part in select value from jsonb_array_elements(item#>'{snapshot,stockRequirements}') loop
    component:=part->>'componentId';
    if coalesce(component,'') !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$' or jsonb_typeof(part->'quantity') is distinct from 'number' or coalesce(part->>'quantity','') !~ '^[1-9][0-9]{0,3}$' then raise exception 'Invalid saved component requirement'; end if;
    n:=(part->>'quantity')::bigint*q;
    wanted:=jsonb_set(wanted,array[component],to_jsonb(coalesce((wanted->>component)::bigint,0)+n));
   end loop;
  else raise exception 'Unsupported saved order item';end if;
 end loop;
 if (select count(*) from jsonb_object_keys(wanted))>100 or exists(select from jsonb_each_text(wanted) where value::bigint>10000) then raise exception 'Saved BOM exceeds limits';end if;
 return wanted;
end $$;

create function dominion79.locks(wanted jsonb) returns void language plpgsql set search_path='' as $$
declare c text; begin
 for c in select key from jsonb_each(wanted) order by key loop
  perform 1 from public.inventory i where i.component_id=c and i.stock_unit='item' for update;
  if not found then raise exception 'Unavailable stock identity' using errcode='23514';end if;
 end loop;
end $$;

-- Bridge existing IRONCLAD availability/read controls to this fixture's one reservation source.
-- CREATE OR REPLACE retains the existing private grants on this routine.
create or replace function ironclad69.reservations(c text) returns bigint language plpgsql stable set search_path='' as $$
declare n bigint; begin
 if to_regnamespace('commerce67') is not null then raise exception 'Two reservation authorities cannot operate together';end if;
 select coalesce(sum(l.quantity-cardinality(l.picked_units)),0)::bigint into n
 from dominion79.hold_lines l join dominion79.holds h using(order_id) where l.component_id=c and h.state='held';
 return n;
end $$;

-- An explicit pick is counted just once: it already belongs to an IRONCLAD allocated set.
create function dominion79.unavailable(c text, own uuid default null) returns bigint language sql volatile set search_path='' as $$
 select
  (select count(*) from ironclad69.measurements m join ironclad69.batches b on b.id=m.batch_id where b.component_id=c and
   (m.quality in ('quarantine','rejected') or exists(select 1 from ironclad69.set_members sm join ironclad69.sets s on s.id=sm.set_id where sm.unit_id=m.id and sm.active and s.state='allocated')))
  + (select coalesce(sum(l.quantity-cardinality(l.picked_units)),0)::bigint from dominion79.hold_lines l join dominion79.holds h using(order_id)
     where l.component_id=c and h.state='held' and h.order_id is distinct from own)
  + (case when to_regnamespace('commerce67') is not null then ironclad69.reservations(c) else 0 end);
$$;

create function dominion79.guard_inventory() returns trigger language plpgsql security definer set search_path='' as $$
declare own uuid; begin
 if new.quantity>=old.quantity then return new;end if;
 select h.order_id into own from dominion79.consuming h join dominion79.hold_lines l using(order_id)
  where h.transaction_id=pg_current_xact_id_if_assigned() and l.component_id=old.component_id;
 if new.quantity<dominion79.unavailable(old.component_id,own) then
   raise exception 'Count would breach reserved or protected stock' using errcode='23514';
 end if;
 return new;
end $$;
create trigger dominion79_protect_reservations before update of quantity on public.inventory for each row execute function dominion79.guard_inventory();

-- Reserved measured units cannot be changed by parallel measurement or set-release writers.
create function dominion79.guard_measurement() returns trigger language plpgsql security definer set search_path='' as $$
declare u uuid; begin
 if tg_table_name='measurements' then u:=old.id;
 else u:=old.unit_id;
 end if;
 if exists(select 1 from dominion79.active_units a where a.unit_id=u
   and not exists(select 1 from dominion79.consuming b where b.order_id=a.order_id and b.transaction_id=pg_current_xact_id_if_assigned()))
 then raise exception 'Measurement belongs to a reserved order' using errcode='23514';end if;
 return new;
end $$;
create trigger dominion79_protect_measured_unit before update on ironclad69.measurements
 for each row execute function dominion79.guard_measurement();
create trigger dominion79_protect_set_members before update on ironclad69.set_members
 for each row execute function dominion79.guard_measurement();

create function dominion79.reserve(p_order uuid,p_owner text,p_until timestamptz)
returns text language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; h dominion79.holds%rowtype; bom jsonb; selections jsonb:='{}';
 item jsonb; s uuid; c text; q bigint; ids uuid[]; n bigint; stock bigint;
begin
 if coalesce(p_owner,'') !~ '^[A-Za-z0-9:_-]{1,96}$' or p_until is null then raise exception 'Invalid reservation owner or deadline';end if;
 select * into strict o from public.orders where id=p_order for update;
 select * into h from dominion79.holds where order_id=p_order;
 if found then
  if h.owner_key<>p_owner or h.ends_at<>p_until or h.order_items_hash<>sha256(convert_to(o.items::text,'UTF8')) then raise exception 'Reservation replay differs' using errcode='23505'; end if;
  return h.state;
 end if;
 if (select mode from dominion79.lifecycle_control where singleton for share) is distinct from 'accepting' then
  raise exception 'New reservations are paused' using errcode='55000';end if;
 if o.sales_channel<>'WEBSITE' or o.payment_status<>'unpaid' or p_until<=clock_timestamp() or p_until>clock_timestamp()+interval '2 hours'
   or ironclad69.commerce_enabled() then raise exception 'Order is not eligible for a reservation'; end if;
 -- Serialise checks by stable owner; two browser requests cannot create concurrent owner holds past the cap.
 perform pg_advisory_xact_lock(hashtextextended('dominion79/owner/'||p_owner,0));
 if (select count(*) from dominion79.holds where owner_key=p_owner and state='held')>=3 then raise exception 'Too many open reservations';end if;
 bom:=dominion79.requirements(o.items);
 perform dominion79.locks(bom);
 for item in select value from jsonb_array_elements(o.items) where value#>'{snapshot,dominionSetId}' is not null loop
  if item->>'type'<>'component' then raise exception 'Explicit set must be an identified component line';end if;
  c:=item->>'productId';s:=(item#>>'{snapshot,dominionSetId}')::uuid;s:=coalesce(s,'00000000-0000-0000-0000-000000000000');
  if selections?c or (bom->>c)<>(item->>'quantity') then raise exception 'Mixed selection for a component needs review';end if;
  perform 1 from ironclad69.sets z where z.id=s and z.component_id=c and z.state='allocated' for update;
  if not found then raise exception 'Allocated set not available' using errcode='23514';end if;
  perform 1 from ironclad69.set_members sm join ironclad69.measurements m on m.id=sm.unit_id
  where sm.set_id=s and sm.active order by m.id for update of sm,m;
  select array_agg(m.id order by m.id),count(*) into ids,n from ironclad69.set_members sm
  join ironclad69.measurements m on m.id=sm.unit_id join ironclad69.batches b on b.id=m.batch_id
  where sm.set_id=s and sm.active and m.quality='accepted' and b.component_id=c;
  if n<>(bom->>c)::bigint or exists (select 1 from dominion79.active_units a where a.unit_id=any(ids)) then
   raise exception 'Measured units missing, protected or already reserved' using errcode='23514';
  end if;
  selections:=jsonb_set(selections,array[c],jsonb_build_object('set',s,'units',to_jsonb(ids)));
 end loop;
 for c,q in select key,value::bigint from jsonb_each_text(bom) order by key loop
  select quantity into strict stock from public.inventory where component_id=c;
  n:=coalesce(jsonb_array_length(selections#>array[c,'units']),0);
  if stock<dominion79.unavailable(c)+q-n then raise exception 'Insufficient unreserved stock' using errcode='23514';end if;
 end loop;
 insert into dominion79.holds(order_id,owner_key,components,selection,order_items_hash,ends_at) values(p_order,p_owner,bom,selections,sha256(convert_to(o.items::text,'UTF8')),p_until);
 for c,q in select key,value::bigint from jsonb_each_text(bom) order by key loop
  ids:=array(select jsonb_array_elements_text(selections#>array[c,'units'])::uuid);
  insert into dominion79.hold_lines values(p_order,c,q,ids);
  insert into dominion79.active_units select u,p_order from unnest(ids) u;
 end loop;
 return 'held';
end $$;

-- Invoke only after the private provider adapter corroborates an unpaid expiry or cancellation for the attached session.
-- Elapsed local time and browser abandonment are never sufficient to release an uncertain reservation.
create function dominion79.release_verified(p_order uuid,p_session text,p_provider_state text) returns text
language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype;h dominion79.holds%rowtype; next_state text;
begin
 select * into strict o from public.orders where id=p_order for update;
 select * into strict h from dominion79.holds where order_id=p_order for update;
 if p_session is null or p_session is distinct from o.stripe_checkout_session_id or coalesce(p_provider_state,'') not in ('expired-unpaid','cancelled-unpaid')
 then raise exception 'Verified attached unpaid session required';end if;
 if h.state='consumed' or o.payment_status<>'unpaid' then raise exception 'Paid order cannot release stock';end if;
 next_state:=case when p_provider_state='expired-unpaid' then 'expired' else 'released' end;
 if h.state<>'held' then
  if h.state=next_state then return h.state;else raise exception 'Already resolved by another provider state';end if;
 end if;
 -- Signed/provider-verified unpaid expiry is authoritative, including early expiry.
 perform dominion79.locks(h.components);
 delete from dominion79.active_units where order_id=p_order;
 update dominion79.holds set state=next_state,resolved_at=clock_timestamp() where order_id=p_order;
 return next_state;
end $$;

-- Calls the real legacy paid writer once, with the original order snapshot. Reservation, physical stock, audit and payment share one transaction.
create function dominion79.consume(p_order uuid,p_account text,p_event text,p_ref text,p_session text,p_intent text,p_amount bigint,p_currency text)
returns text language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; h dominion79.holds%rowtype; l record; b record; body jsonb; prior jsonb;
 previous jsonb:='{}'; old_units uuid[]; retired uuid[]; expected_total bigint; actual bigint;
 allocations jsonb; result text; s uuid;
begin
 if coalesce(p_account,'') !~ '^[A-Za-z0-9:_-]{1,96}$' or coalesce(p_event,'') !~ '^evt_[A-Za-z0-9_]{1,110}$'
    or coalesce(p_intent,'') !~ '^pi_[A-Za-z0-9_]{1,110}$' then raise exception 'Invalid provider correlation';end if;
 select * into strict o from public.orders where id=p_order for update;
 select * into strict h from dominion79.holds where order_id=p_order for update;
 body:=jsonb_build_array(p_order,p_ref,p_session,p_intent,p_amount,lower(p_currency));
 insert into dominion79.provider_events(provider_account,event_key,order_id,fingerprint)
 values(p_account,p_event,p_order,body) on conflict do nothing;
 if not found then
  select e.fingerprint into strict prior from dominion79.provider_events e where provider_account=p_account and event_key=p_event;
  if body<>prior then raise exception 'Conflicting provider event replay' using errcode='23505';end if;
  return 'duplicate';
 end if;
 if p_session is null or p_session is distinct from o.stripe_checkout_session_id or p_ref is distinct from o.reference
   or p_amount is distinct from o.total_pence or lower(p_currency) is distinct from lower(o.currency) then
   raise exception 'Provider does not match saved order' using errcode='23514';end if;
 if h.state='consumed' then
  if o.stripe_payment_intent_id is distinct from p_intent then raise exception 'Payment intent differs from consumed order' using errcode='23514';end if;
  update dominion79.provider_events set outcome='duplicate' where provider_account=p_account and event_key=p_event;
  return 'duplicate';
 end if;
 if h.state<>'held' or h.order_items_hash<>sha256(convert_to(o.items::text,'UTF8')) then raise exception 'Payment needs review: hold no longer usable' using errcode='23514';end if;
 perform dominion79.locks(h.components);
 insert into dominion79.consuming values(p_order,pg_current_xact_id());
 for l in select * from dominion79.hold_lines where order_id=p_order order by component_id loop
  select quantity into strict actual from public.inventory where component_id=l.component_id;
  if (select count(*) from ironclad69.batches b0 where b0.component_id=l.component_id and b0.remaining>0)>250
    then raise exception 'Batch history needs manual bounded review';end if;
  select coalesce(jsonb_object_agg(id,remaining),'{}'::jsonb) into allocations from ironclad69.batches where component_id=l.component_id and remaining>0;
  if (select count(*) from ironclad69.measurements m join ironclad69.batches b0 on b0.id=m.batch_id where b0.component_id=l.component_id and m.quality='accepted')>1000 then
   raise exception 'Measurement history needs manual bounded review';end if;
  select coalesce(array_agg(m.id order by m.id),'{}'::uuid[]) into old_units from ironclad69.measurements m
   join ironclad69.batches b0 on b0.id=m.batch_id where b0.component_id=l.component_id and m.quality='accepted';
  previous:=jsonb_set(previous,array[l.component_id],jsonb_build_object('physical',actual,'batches',allocations,'units',to_jsonb(old_units)));
  if cardinality(l.picked_units)>0 then
   s:=(h.selection#>>array[l.component_id,'set'])::uuid;
   -- Never consume a changed set or accept an inferred physical pick as matched evidence.
   if array(select m.id from ironclad69.set_members sm join ironclad69.measurements m on m.id=sm.unit_id
    where sm.set_id=s and sm.active and m.quality='accepted' order by m.id)<>l.picked_units
    or not exists(select from ironclad69.sets where id=s and state='allocated') then raise exception 'Reserved set changed';end if;
   update ironclad69.set_members set active=false where set_id=s and active;
   update ironclad69.sets set state='released',released_at=clock_timestamp() where id=s;
  end if;
 end loop;
 select public.fulfil_paid_stripe_checkout(p_event,'checkout.session.completed',p_order,p_ref,p_session,p_intent,p_amount,p_currency) into result;
 if result is distinct from 'paid' then raise exception 'Legacy fulfilment did not commit the reserved order';end if;
 for l in select * from dominion79.hold_lines where order_id=p_order order by component_id loop
  select quantity into strict actual from public.inventory where component_id=l.component_id;
  if (previous#>>array[l.component_id,'physical'])::bigint-actual<>l.quantity then raise exception 'Physical stock deduction differs';end if;
  select coalesce(jsonb_agg(jsonb_build_object('batch',b0.id,'quantity',a.value::bigint-b0.remaining,
    'basis',case when b0.cost_minor is null then 'unknown' else 'estimated-batch' end,
    'batchCostMinor',b0.cost_minor,'batchUnits',b0.quantity) order by b0.id),'[]'::jsonb) into allocations
   from jsonb_each_text(previous#>array[l.component_id,'batches']) a join ironclad69.batches b0 on b0.id=a.key::uuid
   where a.value::bigint>b0.remaining;
  retired:=array(select m.id from jsonb_array_elements_text(previous#>array[l.component_id,'units']) prior_unit
    join ironclad69.measurements m on m.id=prior_unit.value::uuid where m.quality='retired' order by m.id);
  if cardinality(l.picked_units)>0 and retired<>l.picked_units then
   raise exception 'The legacy batch selection does not prove the measured pick' using errcode='23514';
  end if;
  if exists(select from ironclad69.tracking t where t.component_id=l.component_id) then
   select coalesce(sum((v->>'quantity')::bigint),0) into expected_total from jsonb_array_elements(allocations) v;
   if expected_total<>l.quantity then raise exception 'IRONCLAD batch movement does not reconcile with stock' using errcode='23514';end if;
  end if;
  insert into dominion79.provenance(order_id,component_id,quantity,batches,measured_units)
   values(p_order,l.component_id,l.quantity,allocations,l.picked_units);
 end loop;
 delete from dominion79.consuming where order_id=p_order;
 delete from dominion79.active_units where order_id=p_order;
 update dominion79.holds set state='consumed',resolved_at=clock_timestamp() where order_id=p_order;
 update dominion79.provider_events set outcome='paid' where provider_account=p_account and event_key=p_event;
 return 'paid';
end $$;
alter table dominion79.consuming enable row level security;
alter table dominion79.provider_events enable row level security;
alter table dominion79.provenance enable row level security;
revoke all on all tables in schema dominion79 from public,anon,authenticated,service_role;
revoke all on all functions in schema dominion79 from public,anon,authenticated,service_role;
grant usage on schema dominion79 to service_role;
grant execute on function dominion79.reserve(uuid,text,timestamptz),
 dominion79.release_verified(uuid,text,text),dominion79.consume(uuid,text,text,text,text,text,bigint,text) to service_role;

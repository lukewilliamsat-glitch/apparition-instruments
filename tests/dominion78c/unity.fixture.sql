-- Disposable native Postgres fixture only. No production deployment or credentials.
begin;
do $$begin
 if current_database() <> 'dominion78c_fixture' then
  raise exception 'DOMINION SQL is restricted to its disposable fixture database';
 end if;
end$$;
create schema dominion78c;
revoke all on schema dominion78c from public;
-- Minimal shape of the existing public.inventory authority used by the workload.
create table public.inventory(component_id text primary key, quantity bigint not null check(quantity>=0));
create table dominion78c.restrictions(component_id text primary key references public.inventory,
 allocated bigint not null default 0 check(allocated>=0), quality_held bigint not null default 0 check(quality_held>=0));
-- This is a fixture input representing the authoritative saved checkout snapshot.
create table dominion78c.saved_orders(id uuid primary key, items jsonb not null);
create table dominion78c.holds(
 order_id uuid primary key references dominion78c.saved_orders,
 snapshot jsonb not null, state text not null check(state in ('active','consumed','released','expired')),
 created_at timestamptz not null, expires_at timestamptz not null, closed_at timestamptz,
 check(expires_at > created_at));
create table dominion78c.lines(
 order_id uuid not null references dominion78c.holds,
 component_id text not null references public.inventory,
 quantity bigint not null check(quantity>0), primary key(order_id,component_id));
create index on dominion78c.lines(component_id,order_id);
create table dominion78c.disposition(
 request_id uuid primary key, order_id uuid not null references dominion78c.holds,
 action text not null check(action in ('consume','release','expire')), result text not null);
revoke all on all tables in schema dominion78c from public;
create function dominion78c.requirements(items jsonb) returns jsonb
language plpgsql immutable strict set search_path='' as $$
declare line jsonb; item_count bigint; part jsonb; p text; q bigint; saved jsonb:='{}';
begin
 if jsonb_typeof(items) is distinct from 'array' then raise exception 'Invalid physical lines'; end if;
 if jsonb_array_length(items) not between 1 and 100 then raise exception 'Invalid physical line count'; end if;
 for line in select value from jsonb_array_elements(items) loop
  if coalesce(line->>'quantity','') !~ '^[1-9][0-9]{0,3}$' and line->>'quantity' is distinct from '10000' then raise exception 'Invalid saved line quantity'; end if;
  item_count:=(line->>'quantity')::bigint;
  if line->>'type' in ('kit','assembly') then
   if jsonb_typeof(line#>'{snapshot,stockRequirements}') is distinct from 'array' then raise exception 'Missing saved BOM'; end if;
   if jsonb_array_length(line#>'{snapshot,stockRequirements}') not between 1 and 200 then raise exception 'Invalid saved BOM'; end if;
  elsif line->>'type'='component' then
   line:=jsonb_set(line,'{snapshot}',jsonb_build_object('stockRequirements',jsonb_build_array(jsonb_build_object('componentId',line->>'productId','quantity',1))),true);
  else raise exception 'Unsupported saved line type'; end if;
  for part in select value from jsonb_array_elements(line#>'{snapshot,stockRequirements}') loop
   p:=part->>'componentId';
   if coalesce(p,'') !~ '^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$' or p in ('constructor','prototype') then raise exception 'Missing or invalid component identity'; end if;
   if coalesce(part->>'quantity','') !~ '^[1-9][0-9]{0,3}$' and part->>'quantity' is distinct from '10000' then raise exception 'Invalid BOM quantity'; end if;
   q:=coalesce((saved->>p)::bigint,0)+(part->>'quantity')::bigint*item_count;
   if q>1000000 then raise exception 'Expanded requirement out of range'; end if;
   saved:=jsonb_set(saved,array[p],to_jsonb(q),true);
  end loop;
 end loop;
 return saved;
end$$;
create function dominion78c.usable(c text, except_order uuid) returns bigint
language sql stable set search_path='' as $$
 select i.quantity-coalesce(r.allocated,0)-coalesce(r.quality_held,0)-coalesce((
  select sum(l.quantity)::bigint from dominion78c.lines l join dominion78c.holds h using(order_id)
    where l.component_id=c and h.state='active' and h.order_id is distinct from except_order
 ),0) from public.inventory i left join dominion78c.restrictions r using(component_id) where i.component_id=c
$$;
create function dominion78c.reserve(p_order uuid,p_now timestamptz,p_until timestamptz)
returns text language plpgsql set search_path='' as $$
declare demand jsonb; prior dominion78c.holds%rowtype; wanted record;
begin
 if p_now is null or p_until is null or not isfinite(p_now) or not isfinite(p_until)
  or p_until<=p_now or p_until>p_now+interval '30 minutes' then raise exception 'Invalid reservation interval'; end if;
 select dominion78c.requirements(items) into strict demand from dominion78c.saved_orders where id=p_order for update;
 select * into prior from dominion78c.holds where order_id=p_order;
 if found then
  if prior.snapshot is distinct from demand or prior.expires_at is distinct from p_until then raise exception 'Conflicting reservation replay'; end if;
  return prior.state;
 end if;
 for wanted in select key,value::bigint n from jsonb_each_text(demand) order by key collate "C" loop
  perform 1 from public.inventory where component_id=wanted.key for update;
  if not found or coalesce(dominion78c.usable(wanted.key,null),-1)<wanted.n then
   raise exception 'Insufficient available stock' using errcode='23514'; end if;
 end loop;
 insert into dominion78c.holds values(p_order,demand,'active',p_now,p_until,null);
 insert into dominion78c.lines select p_order,key,value::bigint from jsonb_each_text(demand);
 return 'active';
end$$;
create function dominion78c.resolve(p_order uuid,p_request uuid,p_action text,p_now timestamptz)
returns text language plpgsql set search_path='' as $$
declare entry dominion78c.holds%rowtype; existing dominion78c.disposition%rowtype; r record; final text;
begin
 if p_action is null or p_action not in ('consume','release','expire') or p_now is null or not isfinite(p_now) then raise exception 'Invalid stock disposition'; end if;
 select * into strict entry from dominion78c.holds where order_id=p_order for update;
 select * into existing from dominion78c.disposition where request_id=p_request;
 if found then
  if existing.order_id<>p_order or existing.action<>p_action then raise exception 'Conflicting disposition replay';end if;
  return existing.result;
 end if;
 if entry.state<>'active' or p_now<entry.created_at then raise exception 'Reservation is not active at supplied time';end if;
 if p_action='consume' then
  if p_now>=entry.expires_at then raise exception 'Payment requires reconciliation after hold expiry';end if;
  for r in select component_id,quantity from dominion78c.lines where order_id=p_order order by component_id collate "C" loop
   perform 1 from public.inventory where component_id=r.component_id for update;
   if dominion78c.usable(r.component_id,p_order)<r.quantity then raise exception 'Reserved stock requires reconciliation' using errcode='23514';end if;
   update public.inventory set quantity=quantity-r.quantity where component_id=r.component_id;
  end loop;
  final:='consumed';
 elsif p_action='expire' then
  if p_now<entry.expires_at then raise exception 'Reservation has not expired';end if;
  final:='expired';
 else final:='released';
 end if;
 update dominion78c.holds set state=final,closed_at=p_now where order_id=p_order;
 insert into dominion78c.disposition values(p_request,p_order,p_action,final);
 return final;
end$$;
revoke all on all functions in schema dominion78c from public;
commit;

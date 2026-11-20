-- Proposed experimental integration, withheld from production. Reversible static visibility must not change business history.
begin;
do $$ begin
 if current_database()<>'dominion79_fixture' or to_regclass('dominion79.holds') is null
   or to_regclass('quartermaster79.packing') is null then raise exception 'Disposable DOMINION database required';end if;
end $$;

-- A legacy paid call deducts stock before it updates Orders. Refusing its Orders transition
-- below rolls back the entire legacy transaction, including its earlier physical stock change.
create function dominion79.guard_reserved_order() returns trigger language plpgsql security definer set search_path='' as $$
declare h text;
begin
 select state into h from dominion79.holds where order_id=old.id;
 if h is null or h='consumed' then return new;end if;
 if new.payment_status is distinct from old.payment_status or new.fulfillment_applied_at is distinct from old.fulfillment_applied_at then
  if h<>'held' or not exists(select 1 from dominion79.consuming where order_id=old.id and transaction_id=pg_current_xact_id_if_assigned())
  then raise exception 'Reserved order must use verified fulfilment or review' using errcode='23514';end if;
 end if;
 if h='held' and (new.items is distinct from old.items or new.total_pence is distinct from old.total_pence
   or new.currency is distinct from old.currency or new.reference is distinct from old.reference
   or new.sales_channel is distinct from old.sales_channel
   or (old.stripe_checkout_session_id is not null and new.stripe_checkout_session_id is distinct from old.stripe_checkout_session_id)
   or (new.status='cancelled' and new.status is distinct from old.status))
 then raise exception 'Active reservation prevents changing the saved order or attached session' using errcode='23514';end if;
 return new;
end $$;
create trigger ironheart80_protect_reserved_order before update on public.orders
 for each row execute function dominion79.guard_reserved_order();
revoke all on function dominion79.guard_reserved_order() from public,anon,authenticated,service_role;

create table quartermaster79.rollout(
 singleton boolean primary key default true check(singleton),
 mode text not null check(mode in ('disabled','observe','workshop'))
);
insert into quartermaster79.rollout(mode) values('disabled');
alter table quartermaster79.rollout enable row level security;
revoke all on quartermaster79.rollout from public,anon,authenticated,service_role;
create function quartermaster79.require_write() returns void language plpgsql set search_path='' as $$
begin
 if (select mode from quartermaster79.rollout where singleton for share) is distinct from 'workshop' then
  raise exception 'Packing writes are disabled' using errcode='55000';end if;
end $$;
revoke all on function quartermaster79.require_write() from public,anon,authenticated,service_role;

create table quartermaster79.pick_events(
 id uuid primary key, order_id uuid not null references quartermaster79.packing,
 component_id text not null references public.inventory,
 previous integer not null check(previous>=0), picked integer not null check(picked>=0),
 actor uuid not null references auth.users, at timestamptz not null default clock_timestamp()
);
create index on quartermaster79.pick_events(order_id,component_id,at desc,id desc);
create table quartermaster79.pick_progress(
 order_id uuid not null references quartermaster79.packing, component_id text not null references public.inventory,
 picked integer not null check(picked>=0), primary key(order_id,component_id)
);
create table quartermaster79.postage_evidence(
 id uuid primary key, order_id uuid not null unique references quartermaster79.packing,
 minor integer not null check(minor between 0 and 1000000), receipt text not null unique,
 actor uuid not null references auth.users, at timestamptz not null default clock_timestamp()
);
alter table quartermaster79.pick_events enable row level security;
alter table quartermaster79.pick_progress enable row level security;
alter table quartermaster79.postage_evidence enable row level security;
revoke all on quartermaster79.pick_events,quartermaster79.pick_progress,quartermaster79.postage_evidence from public,anon,authenticated,service_role;

-- The existing Orders Admin membership gate owns this lookup. It returns one order and no buyer PII.
create function public.quartermaster80_order(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare o public.orders%rowtype; pack quartermaster79.packing%rowtype; bom jsonb; items jsonb; materials jsonb; costs jsonb;
begin
 perform ironclad69.actor();
 if (select mode from quartermaster79.rollout where singleton)='disabled' then
  raise exception 'Packing lookup is disabled' using errcode='55000';end if;
 select * into strict o from public.orders where id=p_order;
 if o.payment_status not in ('paid','partially_refunded') or o.fulfillment_applied_at is null then
  raise exception 'Use an eligible paid Order' using errcode='22023';end if;
 bom:=dominion79.requirements(o.items);
 select * into pack from quartermaster79.packing where order_id=o.id;
 select jsonb_agg(jsonb_build_object('component',a.key,'name',c.name,'quantity',a.value::integer,
  'currentAvailable',greatest(0,i.quantity-dominion79.unavailable(a.key)),
  'picked',coalesce(p.picked,0),'source','saved-order-bom') order by a.key) into items
 from jsonb_each_text(bom) a left join public.inventory i on i.component_id=a.key
 left join public.components c on c.id=a.key
 left join quartermaster79.pick_progress p on p.order_id=o.id and p.component_id=a.key;
 select coalesce(jsonb_agg(z),'[]') into materials from (
  select m.sku,m.title,m.inner_mm,m.outer_mm,m.tare_grams,
   quartermaster79.ready_stock(m.sku)->'available' as available
  from quartermaster79.material m order by m.sku limit 25
 ) z;
 costs:=quartermaster79.cost_evidence(o.id);
 if costs is not null then
  costs:=costs||coalesce((select jsonb_build_object('postageActualMinor',e.minor,'postageReceipt',e.receipt)
    from quartermaster79.postage_evidence e where e.order_id=o.id),'{}'::jsonb);
 end if;
 return jsonb_build_object('id',o.id,'reference',o.reference,'status',o.status,
  'readyForReview',coalesce(pack.state='packed' and o.status in ('pending','in_production','ready_to_dispatch')
   and (o.payment_status='paid' or exists(select 1 from public.partial_refund_reviews r where r.order_id=o.id and r.refunded_pence=o.refunded_pence and r.refund_at=o.latest_refund_at)),false),
  'packingState',pack.state,'picked',items,'materials',materials,'cost',costs);
end $$;

create function public.quartermaster80_pick(p_order uuid,p_request uuid,p_component text,p_expected integer,p_quantity integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare member uuid:=ironclad69.actor(); o public.orders%rowtype; p quartermaster79.packing%rowtype; e quartermaster79.pick_events%rowtype; cap integer; prior integer;
begin
 perform quartermaster79.require_write();
 select * into strict o from public.orders where id=p_order for share;
 select * into strict p from quartermaster79.packing where order_id=p_order for update;
 select * into e from quartermaster79.pick_events where id=p_request;
 if found then
  if (e.order_id,e.component_id,e.previous,e.picked,e.actor) is distinct from (p_order,p_component,p_expected,p_quantity,member)
  then raise exception 'Pick evidence replay differs' using errcode='23505';end if;
  return jsonb_build_object('picked',e.picked,'duplicate',true);
 end if;
 if p.state<>'reserved' or o.payment_status not in ('paid','partially_refunded') or o.fulfillment_applied_at is null
    or o.status not in ('pending','in_production','ready_to_dispatch') then raise exception 'Packing is not open';end if;
 cap:=(p.picked->>p_component)::integer;
 if cap is null or p_quantity is null or p_expected is null or p_quantity<0 or p_quantity>cap
   or p.picked is distinct from dominion79.requirements(o.items) then raise exception 'Pick must match the saved order';end if;
 select picked into prior from quartermaster79.pick_progress where order_id=p_order and component_id=p_component;
 if coalesce(prior,0)<>p_expected then raise exception 'Picked count changed; reload' using errcode='40001';end if;
 insert into quartermaster79.pick_progress values(p_order,p_component,p_quantity)
 on conflict(order_id,component_id) do update set picked=excluded.picked;
 insert into quartermaster79.pick_events(id,order_id,component_id,previous,picked,actor) values(p_request,p_order,p_component,p_expected,p_quantity,member);
 return jsonb_build_object('picked',p_quantity,'duplicate',false);
end $$;

create function quartermaster79.require_confirmed_picks() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.state='packed' and old.state='reserved' and not exists(
   select 1 from public.orders o where o.id=new.order_id and
    (o.payment_status='paid' or o.payment_status='partially_refunded' and exists(select 1 from public.partial_refund_reviews r
      where r.order_id=o.id and r.refunded_pence=o.refunded_pence and r.refund_at=o.latest_refund_at)))
 then raise exception 'Review the current partial refund before packing' using errcode='23514';end if;
 if new.state='packed' and old.state='reserved' and (
   exists(select 1 from jsonb_each_text(new.picked) a left join quartermaster79.pick_progress p
     on p.order_id=new.order_id and p.component_id=a.key where p.picked is distinct from a.value::int)
   or not exists(select 1 from public.orders o where o.id=new.order_id and dominion79.requirements(o.items)=new.picked)
 ) then raise exception 'Confirm every saved BOM pick before packing' using errcode='23514';end if;
 return new;
end $$;
create trigger ironheart80_require_confirmed_picks before update of state on quartermaster79.packing
 for each row execute function quartermaster79.require_confirmed_picks();
revoke all on function quartermaster79.require_confirmed_picks() from public,anon,authenticated,service_role;
-- Service helpers from the 79 pilot may only write during the explicitly enabled workshop stage.
create function quartermaster79.guard_rollout() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform quartermaster79.require_write();return null;
end $$;
create trigger ironheart80_packing_gate before insert or update on quartermaster79.packing
 for each statement execute function quartermaster79.guard_rollout();
create trigger ironheart80_receipt_gate before insert or update on quartermaster79.purchase
 for each statement execute function quartermaster79.guard_rollout();
revoke all on function quartermaster79.guard_rollout() from public,anon,authenticated,service_role;


-- Evidence only. A correction requires an explicit future workflow, rather than replacing accounting evidence in place.
create function public.quartermaster80_postage(p_order uuid,p_request uuid,p_minor integer,p_receipt text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare member uuid:=public.command63_finance_actor(); e quartermaster79.postage_evidence%rowtype; r text:=btrim(p_receipt);
begin
 perform quartermaster79.require_write();
 perform 1 from quartermaster79.packing where order_id=p_order and state='packed' for update;
 if not found or p_minor is null or p_minor not between 0 and 1000000
   or coalesce(r,'') !~ '^[A-Za-z0-9][A-Za-z0-9 .:_/-]{2,119}$' then raise exception 'A recorded parcel and postage evidence are required';end if;
 select * into e from quartermaster79.postage_evidence where order_id=p_order or id=p_request;
 if found then
  if (e.id,e.order_id,e.minor,e.receipt,e.actor) is distinct from (p_request,p_order,p_minor,r,member)
   then raise exception 'Postage already recorded or request conflicts' using errcode='23505';end if;
  return jsonb_build_object('actualMinor',e.minor,'duplicate',true);
 end if;
 insert into quartermaster79.postage_evidence(id,order_id,minor,receipt,actor) values(p_request,p_order,p_minor,r,member);
 return jsonb_build_object('actualMinor',p_minor,'duplicate',false);
end $$;

revoke all on function public.quartermaster80_order(uuid),public.quartermaster80_pick(uuid,uuid,text,integer,integer),
 public.quartermaster80_postage(uuid,uuid,integer,text) from public,anon,authenticated,service_role;
grant execute on function public.quartermaster80_order(uuid),public.quartermaster80_pick(uuid,uuid,text,integer,integer),
 public.quartermaster80_postage(uuid,uuid,integer,text) to authenticated;
commit;

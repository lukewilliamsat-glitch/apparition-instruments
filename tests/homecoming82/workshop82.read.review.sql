-- Disposable rehearsal. No part of this migration is approved for production.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '8s';
do $$ begin
 if current_database()<>'dominion79_fixture' then raise exception 'Isolated workshop rehearsal required';end if;
end $$;

create function public.quartermaster82_review(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare view_data jsonb; rollout text; packing quartermaster79.packing%rowtype;
begin
 perform ironclad69.actor();
 select mode into strict rollout from quartermaster79.rollout where singleton;
 if rollout='disabled' then
  return jsonb_build_object('schema',1,'rollout',rollout,'order',null,'canPick',false);
 end if;
 view_data:=public.quartermaster80_order(p_order);
 select * into packing from quartermaster79.packing where order_id=p_order;
 return jsonb_build_object('schema',1,'rollout',rollout,'order',view_data,'canPick',
    coalesce(rollout='workshop' and packing.state='reserved' and view_data->>'status' in
      ('pending','in_production','ready_to_dispatch'),false),
   'parcel',case when packing.state='packed' then jsonb_build_object(
    'format',packing.postal_class,'tracking',packing.tracking,'grams',packing.measured_grams,'outerMm',packing.measured_mm) else null end);
end
$$;
revoke all on function public.quartermaster82_review(uuid) from public,anon,authenticated,service_role;
grant execute on function public.quartermaster82_review(uuid) to authenticated;
commit;

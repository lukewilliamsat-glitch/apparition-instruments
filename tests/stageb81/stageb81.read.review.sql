-- Stage B proposal only. Install only in isolated acceptance.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '8s';

create function public.dominion81_status() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare unity_mode text; packing_mode text;
begin
  perform ironclad69.actor();
  select mode into strict unity_mode from dominion79.lifecycle_control where singleton;
  select mode into strict packing_mode from quartermaster79.rollout where singleton;
  return pg_catalog.jsonb_build_object(
    'schema', 1,
    'unity', pg_catalog.jsonb_build_object(
      'mode', unity_mode,
      'holds', (select count(*) from (select 1 from dominion79.holds limit 1001) h),
      'holdLines', (select count(*) from (select 1 from dominion79.hold_lines limit 1001) h),
      'measuredAllocations', (select count(*) from (select 1 from dominion79.active_units limit 1001) u)),
    'quartermaster', pg_catalog.jsonb_build_object(
      'mode', packing_mode,
      'materials', (select count(*) from (select 1 from quartermaster79.material limit 1001) m),
      'packs', (select count(*) from (select 1 from quartermaster79.packing limit 1001) p),
      'movements', (select count(*) from (select 1 from quartermaster79.movement limit 1001) m)));
end
$$;
revoke all on function public.dominion81_status() from public, anon, authenticated, service_role;
grant execute on function public.dominion81_status() to authenticated;
comment on function public.dominion81_status() is 'Admin-only read snapshot; counts are capped at 1001 and do not expose individual records.';
commit;

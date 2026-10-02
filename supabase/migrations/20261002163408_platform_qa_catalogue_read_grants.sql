-- Public catalogue views are read projections. Supabase default grants can
-- otherwise leave unused write privileges after GRANT SELECT on a new view.
-- Base-table Admin grants, service access and all business rows are preserved.
do $$
begin
 if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relname in ('catalogue_components','catalogue_wiring_kits')
       and c.relkind='v' and c.reloptions @> array['security_invoker=true'])<>2 then
  raise exception 'Expected invoker catalogue views; grant hardening halted';
 end if;
end $$;
revoke all on public.catalogue_components,public.catalogue_wiring_kits from public,anon,authenticated;
grant select on public.catalogue_components,public.catalogue_wiring_kits to anon,authenticated;

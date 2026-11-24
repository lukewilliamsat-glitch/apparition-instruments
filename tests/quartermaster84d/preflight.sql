-- Abort an upgrade against unexpected production contracts or existing writer state.
do $$
declare
  item record;
begin
  if to_regnamespace('quartermaster84w') is not null or to_regnamespace('quartermaster84c') is not null
    or exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      where (n.nspname='quartermaster79' and proname in ('receive','complete'))
         or (n.nspname='public' and (left(proname,16)='quartermaster84w' or left(proname,16)='quartermaster84d')))
    or (select mode from dominion79.lifecycle_control where singleton) is distinct from 'paused'
    or (select mode from quartermaster79.rollout where singleton) is distinct from 'observe'
    or exists(select from quartermaster79.packing where state='reserved') then
    raise exception 'Unexpected release baseline';
  end if;
  for item in select * from (values
      ('ironclad69.actor()', 'dfd0d21e2b3f4f16701b8deb7f5953c4'),
      ('public.dominion81_status()', '46709eee25d4a13232a6d51c1f5028f1'),
      ('public.quartermaster84_review(uuid)', '594670c01dea054008251b29e1a5b856'),
      ('quartermaster79.saved_bom(jsonb)', 'e25ca99aeea98828ecba08c7a2f3e608'),
      ('public.command63_financial_read(uuid)', '13c440e3341d1550a9798a6f8361d508'),
      ('public.command63_financial_save(uuid,bigint,text,uuid,jsonb)', 'e7226e9772be861465e0cd7f9b377f59'),
      ('public.omniscience74_orders(date,date,date,uuid)', 'b728d8e8b2a23d4a08319aa316684d7c')
    ) defs(signature,digest)
  loop
    if md5(pg_get_functiondef(to_regprocedure(item.signature))) is distinct from item.digest then
      raise exception 'Changed release prerequisite: %',item.signature;
    end if;
  end loop;
end $$;

-- Proposed correction. Apply only under separate production authority while dormant.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '15s';
do $preflight$
begin
  perform 1 from quartermaster84w.gate where singleton and mode='disabled' for share;
  if not found then raise exception 'Expected disabled writer gate'; end if;
  perform 1 from quartermaster79.rollout where singleton and mode='observe' for share;
  if not found then raise exception 'Expected observe review'; end if;
  perform 1 from dominion79.lifecycle_control where singleton and mode='paused' for share;
  if not found then raise exception 'Expected paused UNITY'; end if;
  if md5(pg_get_functiondef('public.quartermaster84d_suppliers()'::regprocedure))
      is distinct from 'aa86ee066ca76c7eca91bbeea3b7c502'
    or md5(pg_get_functiondef('quartermaster84w.check_mode(boolean)'::regprocedure))
      is distinct from 'e9ef59c0297f28dcd405bad1f4445a5a' then
    raise exception 'Unexpected supplier reader or writer gate definition';
  end if;
end $preflight$;

create or replace function public.quartermaster84d_suppliers() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  perform quartermaster84w.actor('receive');
  -- PostgREST executes a GET in a read-only transaction. Writers still take a row lock.
  if (select mode from quartermaster84w.gate where singleton) is distinct from 'workshop' then
    raise exception 'Workshop operation unavailable' using errcode='42501';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name,id),'[]')
    from (select id,left(name,120) as name from ironclad69.suppliers
      where active order by name,id limit 100) directory);
end $$;

do $verify$
declare fn oid := 'public.quartermaster84d_suppliers()'::regprocedure;
begin
  if not has_function_privilege('authenticated',fn,'execute')
    or has_function_privilege('anon',fn,'execute')
    or has_function_privilege('service_role',fn,'execute')
    or not exists(select from pg_proc where oid=fn and prosecdef and provolatile='s'
      and proconfig=array['search_path=""']) then
    raise exception 'Unexpected supplier reader permissions';
  end if;
end $verify$;
commit;

-- Scope: 84C-only stage tables, grants and gate. Never delete evidence.
begin;
do $drain$
declare mode_now text;
begin
  if to_regnamespace('commerce67') is null or to_regclass('quartermaster84c.fixture_orders') is null then
    raise exception '84C staging scope unavailable';
  end if;
  select mode into strict mode_now from quartermaster84w.gate where singleton for update;
  if mode_now not in ('workshop','drain','disabled') then raise exception 'Unexpected 84C writer mode'; end if;
  if mode_now='workshop' then update quartermaster84w.gate set mode='drain' where singleton; end if;
end
$drain$;
commit;

-- Let an authorised packing operator release each physically unconsumed hold.
-- Reconcile uncertain requests first. After that, run finish-recovery.sql.

begin;
do $finish$
declare mode_now text;
begin
  if to_regnamespace('commerce67') is null or to_regclass('quartermaster84c.fixture_orders') is null then
    raise exception '84C staging scope unavailable';
  end if;
  select mode into strict mode_now from quartermaster84w.gate where singleton for update;
  if mode_now not in ('drain','disabled') then raise exception 'Drain the writer first'; end if;
  if exists(select from quartermaster79.packing where state='reserved') then
    raise exception 'Reserved packs remain; reconcile them first';
  end if;
  update quartermaster84w.gate set mode='disabled' where singleton;
end
$finish$;
revoke execute on function public.quartermaster84w_pack(uuid,uuid,bigint,bigint,jsonb),
 public.quartermaster84w_receive(uuid,text,uuid,text,integer,bigint),
 public.quartermaster84w_create_material(text,text,integer[],integer[],integer,integer),
 public.quartermaster84c_finance_save(uuid,bigint,text,text,uuid) from authenticated;
commit;

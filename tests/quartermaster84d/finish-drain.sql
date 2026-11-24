begin;
do $$
begin
  perform 1 from quartermaster84w.gate where singleton and mode='drain' for update;
  if not found then raise exception 'Expected the draining writer singleton'; end if;
  if exists(select from quartermaster79.packing where state='reserved') then
    raise exception 'Reconcile outstanding reservations before disabling the writer';
  end if;
  update quartermaster84w.gate set mode='disabled' where singleton and mode='drain';
end $$;
commit;

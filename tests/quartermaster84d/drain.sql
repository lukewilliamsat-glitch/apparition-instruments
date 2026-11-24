-- For separately authorised recovery after activation.
begin;
do $$
begin
  update quartermaster84w.gate set mode='drain' where singleton and mode='workshop';
  if not found then raise exception 'Expected the active writer singleton'; end if;
end $$;
commit;

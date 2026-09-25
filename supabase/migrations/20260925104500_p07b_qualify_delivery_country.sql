-- The function's local variable country shadows the shipping table column in the
-- already-applied P07B migration. Keep the other validator logic and privileges.
do $migration$
declare function_sql text := pg_get_functiondef('public.create_guest_kit_order(jsonb)'::regprocedure);
begin
 if position('from public.commerce_shipping where country=''GB''' in function_sql)=0 then
  raise exception 'Expected P07B checkout function body was not installed';
 end if;
 execute replace(function_sql,
  'from public.commerce_shipping where country=''GB''',
  'from public.commerce_shipping shipping where shipping.country=''GB''');
end $migration$;

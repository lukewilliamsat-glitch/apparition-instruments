-- The local PL/pgSQL variable component_id shadows the Inventory column.
-- Preserve the deployed function body and its service-only EXECUTE permissions.
do $migration$
declare function_sql text := pg_get_functiondef('public.fulfil_paid_stripe_checkout(text,text,uuid,text,text,text,bigint,text)'::regprocedure);
begin
 if position('update public.inventory set quantity=quantity-wanted.value::bigint,updated_at=now()' in function_sql)=0 then
  raise exception 'Expected P07B.2A function body was not installed';
 end if;
 execute replace(function_sql,
  'update public.inventory set quantity=quantity-wanted.value::bigint,updated_at=now()
   where component_id=wanted.key and quantity>=wanted.value::bigint',
  'update public.inventory inventory_row set quantity=inventory_row.quantity-wanted.value::bigint,updated_at=now()
   where inventory_row.component_id=wanted.key and inventory_row.quantity>=wanted.value::bigint');
end $migration$;

-- Apply only via the project-pinned staging procedure, after both Commerce migrations.
do $staging$
declare k text; src text;
begin
 if current_database()<>'postgres' or
    not exists(select from public.assemblies where id='kit-les-paul' and sku='FIXTURE-KIT') then
   raise exception 'Expected isolated staging fixture is absent';
 end if;
 foreach k in array array[
   'public.fulfil_paid_stripe_checkout(text,text,uuid,text,text,text,bigint,text)',
   'public.save_stripe_order_contact(uuid,text,text,text,jsonb,jsonb)',
   'public.commerce67_expire_checkout(uuid,text,text)',
   'public.commerce67_payment_observe(uuid,text,text,bigint,text,text)'
 ] loop
   src:=pg_get_functiondef(k::regprocedure);
   if length(src)-length(replace(src,'cs_live_',''))<>8 then
      raise exception 'Unrecognised Stripe session guard: %',k;
   end if;
   execute replace(src,'cs_live_','cs_test_');
 end loop;
end $staging$;

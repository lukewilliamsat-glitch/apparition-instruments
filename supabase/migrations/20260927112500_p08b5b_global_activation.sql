-- P08B.5B: one atomic handover from the idle canary job to the global queue.
-- Run only after the new Edge dispatcher and paid-confirmation renderer deploy.
do $$
begin
 if (select count(*) from public.order_email_deliveries)<>2
    or exists(select 1 from public.order_email_deliveries
              where state<>'sent' or attempts<>1 or automatic_delivery_eligible)
    or (select count(*) from public.order_email_deliveries d
        join public.orders o on o.id=d.order_id
        where o.reference='AI-010010'
          and d.kind in ('ready_to_dispatch','dispatched'))<>2
    or exists(select 1 from public.order_email_deliveries d
              join public.orders o on o.id=d.order_id where o.reference='AI-010015')
    or not exists(select 1 from cron.job where jobname='ai010010-lifecycle-email-canary' and active)
    or (select enabled from public.transactional_email_activation where singleton=true)
 then raise exception 'Production email preflight changed: activation halted'; end if;

 if not cron.unschedule('ai010010-lifecycle-email-canary') then
  raise exception 'Canary scheduler could not be retired';
 end if;
 update public.transactional_email_activation
 set enabled=true,activated_at=now() where singleton=true and enabled=false;
 if not found then raise exception 'Activation boundary unavailable'; end if;

 perform cron.schedule('apparition-transactional-email','* * * * *',
  $job$
   select net.http_post(
    url:='https://acdxpxvksvdwfajntzfx.supabase.co/functions/v1/transactional-email/dispatch',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization',
     'Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='transactional_email_dispatch')),
    body:='{}'::jsonb,timeout_milliseconds:=30000
   ) where exists (
    select 1 from public.order_email_deliveries
    where state='pending' and automatic_delivery_eligible
      and kind in ('in_production','ready_to_dispatch','dispatched','full_refund')
   );
  $job$);

 drop function public.get_ai010010_canary_token();
 delete from vault.secrets where name='ai010010_email_canary';
end;
$$;

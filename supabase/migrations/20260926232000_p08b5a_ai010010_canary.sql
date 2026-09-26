-- P08B.5A: one fixed-order server-side canary. No historical ledger insertion.
create extension if not exists pg_net;
create extension if not exists pg_cron with schema pg_catalog;

select vault.create_secret(encode(gen_random_bytes(32),'hex'),'ai010010_email_canary');

create function public.get_ai010010_canary_token()
returns text language sql security definer set search_path='' as $$
 select decrypted_secret from vault.decrypted_secrets where name='ai010010_email_canary'
$$;
revoke all on function public.get_ai010010_canary_token() from public,anon,authenticated;
grant execute on function public.get_ai010010_canary_token() to service_role;

-- The job reads only the fixed Order's pending lifecycle rows and posts to the
-- dedicated, token-protected Edge route. Edge repeats the fixed-order filter.
select cron.schedule('ai010010-lifecycle-email-canary','* * * * *',
 $job$
 select net.http_post(
  url:='https://acdxpxvksvdwfajntzfx.supabase.co/functions/v1/transactional-email/canary',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization',
   'Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='ai010010_email_canary')),
  body:='{}'::jsonb,
  timeout_milliseconds:=30000
 ) where exists (
  select 1 from public.order_email_deliveries
  where order_id='a3217839-e590-431f-8c40-c59ec9a75b64'::uuid
   and kind in ('ready_to_dispatch','dispatched') and state='pending'
 );
 $job$);

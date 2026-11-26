-- Staging only: existing owner-saved Vault credential; never return it to a
-- browser, runner or report. Only the staging Edge service may call this RPC.
create or replace function public.convergence93_test_credential()
returns text language plpgsql security definer set search_path='' set statement_timeout='2s' as $$
declare credential text;
begin
 select btrim(decrypted_secret) into strict credential from vault.decrypted_secrets where name='STRIPE_SECRET_KEY';
 if length(credential) not between 16 and 520 or credential !~ '^(sk|rk)_test_[A-Za-z0-9_]+$' then
  raise exception 'A test-only staging credential is required' using errcode='28000';
 end if;
 return credential;
end $$;
revoke all on function public.convergence93_test_credential() from public,anon,authenticated;
grant execute on function public.convergence93_test_credential() to service_role;

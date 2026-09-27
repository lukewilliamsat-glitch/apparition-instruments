-- Contact audit still stores no message or customer email. A verified Order
-- reference is attached only by the service role after Auth ownership checks.
alter table public.contact_enquiry_attempts
 add column verified_order_reference text check(verified_order_reference ~ '^AI-[0-9]{6}$');

create function public.attach_verified_contact_order(p_submission_id uuid,p_owner uuid,p_reference text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_submission_id is null or p_owner is null or p_reference !~ '^AI-[0-9]{6}$' then return false; end if;
 update public.contact_enquiry_attempts a set verified_order_reference=p_reference
 where a.submission_id=p_submission_id and a.outcome='accepted' and a.attempted_at is null
  and (a.verified_order_reference is null or a.verified_order_reference=p_reference)
  and exists(select 1 from public.orders o where o.reference=p_reference and o.owner_user_id=p_owner);
 return found;
end;
$$;
revoke all on function public.attach_verified_contact_order(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.attach_verified_contact_order(uuid,uuid,text) to service_role;

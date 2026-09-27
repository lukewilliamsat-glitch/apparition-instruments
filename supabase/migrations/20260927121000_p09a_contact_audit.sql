-- P09A: private delivery metadata only; neither email address nor message is stored.
create table public.contact_enquiry_attempts (
 submission_id uuid primary key,
 email_fingerprint text not null,
 ip_fingerprint text,
 created_at timestamptz not null default now(),
 attempted_at timestamptz,
 finished_at timestamptz,
 outcome text not null check(outcome in ('accepted','attempting','sent','failed','unknown','rate_limited'))
);
alter table public.contact_enquiry_attempts enable row level security;
revoke all on public.contact_enquiry_attempts from public,anon,authenticated;
create index contact_enquiry_attempts_created_idx on public.contact_enquiry_attempts(created_at);
create index contact_enquiry_attempts_email_idx on public.contact_enquiry_attempts(email_fingerprint,created_at);
create index contact_enquiry_attempts_ip_idx on public.contact_enquiry_attempts(ip_fingerprint,created_at);
select vault.create_secret(encode(gen_random_bytes(32),'hex'),'contact_rate_hash_key');

-- Serialising the small reservation transaction prevents concurrent submissions
-- from evading the limits. The one-time submission ID prevents duplicate sends.
create function public.reserve_contact_enquiry(p_submission_id uuid,p_email text,p_ip text)
returns text language plpgsql security definer set search_path='' as $$
declare secret text; email_hash text; ip_hash text; existing text; limited boolean;
begin
 if p_submission_id is null or p_email is null or length(p_email)>254
  or p_ip is null or length(p_ip)>128 then raise exception 'Invalid contact reservation'; end if;
 select decrypted_secret into secret from vault.decrypted_secrets where name='contact_rate_hash_key';
 if secret is null then raise exception 'Contact service unavailable'; end if;
 email_hash:=encode(extensions.hmac(convert_to(lower(p_email),'UTF8'),convert_to(secret,'UTF8'),'sha256'),'hex');
 ip_hash:=case when p_ip='' then null else encode(extensions.hmac(convert_to(p_ip,'UTF8'),convert_to(secret,'UTF8'),'sha256'),'hex') end;
 perform pg_advisory_xact_lock(593814,1138);
 select outcome into existing from public.contact_enquiry_attempts where submission_id=p_submission_id;
 if found then return existing; end if;
 limited:=(select count(*)>=3 from public.contact_enquiry_attempts
           where email_fingerprint=email_hash and outcome<>'rate_limited'
             and created_at>now()-interval '15 minutes')
       or (ip_hash is not null and (select count(*)>=10 from public.contact_enquiry_attempts
           where ip_fingerprint=ip_hash and outcome<>'rate_limited'
             and created_at>now()-interval '15 minutes'))
       or (select count(*)>=100 from public.contact_enquiry_attempts
           where outcome<>'rate_limited' and created_at>now()-interval '1 hour');
 insert into public.contact_enquiry_attempts(submission_id,email_fingerprint,ip_fingerprint,outcome)
 values(p_submission_id,email_hash,ip_hash,case when limited then 'rate_limited' else 'accepted' end);
 return case when limited then 'rate_limited' else 'accepted' end;
end;
$$;
revoke all on function public.reserve_contact_enquiry(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_contact_enquiry(uuid,text,text) to service_role;

create function public.mark_contact_enquiry_attempt(p_submission_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.contact_enquiry_attempts set outcome='attempting',attempted_at=now()
 where submission_id=p_submission_id and outcome='accepted' and attempted_at is null;
 return found;
end;
$$;
revoke all on function public.mark_contact_enquiry_attempt(uuid) from public,anon,authenticated;
grant execute on function public.mark_contact_enquiry_attempt(uuid) to service_role;

create function public.finish_contact_enquiry(p_submission_id uuid,p_outcome text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_outcome not in ('sent','failed','unknown') then raise exception 'Invalid contact delivery outcome'; end if;
 update public.contact_enquiry_attempts set outcome=p_outcome,finished_at=now()
 where submission_id=p_submission_id and outcome='attempting' and attempted_at is not null;
 return found;
end;
$$;
revoke all on function public.finish_contact_enquiry(uuid,text) from public,anon,authenticated;
grant execute on function public.finish_contact_enquiry(uuid,text) to service_role;

-- The audit contains no correspondence; prune correlation and rate data daily.
select cron.schedule('prune-contact-enquiry-audit','30 3 * * *',
 $$delete from public.contact_enquiry_attempts where created_at<now()-interval '14 days'$$);

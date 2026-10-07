-- Central, reversible open preview; no individual entitlement or billing records.
create table forge_private.preview_policy (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 capabilities text[] not null check(capabilities <@ array['forge.projects.cloud','forge.projects.history','forge.projects.compare','forge.templates.personal','forge.measurements','forge.documents.professional']::text[])
);
alter table forge_private.preview_policy enable row level security;
revoke all on forge_private.preview_policy from public,anon,authenticated;
insert into forge_private.preview_policy(singleton,enabled,capabilities) values(true,true,array['forge.projects.cloud','forge.projects.history','forge.projects.compare','forge.templates.personal','forge.measurements','forge.documents.professional']::text[]);
create or replace function forge_private.has_capability(p_capability text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null
 and exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false))
 and (exists(select 1 from public.forge_capability_grants g where g.owner_id=auth.uid() and g.capability=p_capability and (g.expires_at is null or g.expires_at>statement_timestamp()))
 or exists(select 1 from forge_private.preview_policy p where p.singleton and p.enabled and p_capability=any(p.capabilities)));
$$;
create function forge_private.effective_capabilities()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(c.capability order by c.capability),'[]'::jsonb)
 from (select g.capability from public.forge_capability_grants g where g.owner_id=auth.uid()
 union select unnest(p.capabilities) from forge_private.preview_policy p where p.singleton and p.enabled) c
 where forge_private.has_capability(c.capability);
$$;
revoke all on function forge_private.effective_capabilities() from public,anon;
grant execute on function forge_private.effective_capabilities() to authenticated;
create or replace function public.forge_capabilities()
returns jsonb language sql stable security invoker set search_path='' as $$
 select forge_private.effective_capabilities();
$$;
revoke all on function public.forge_capabilities() from public,anon;
grant execute on function public.forge_capabilities() to authenticated;

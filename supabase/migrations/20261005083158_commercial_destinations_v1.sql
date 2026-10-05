-- Additive operator configuration only. No business rows or guessed URLs.
create table public.commercial_destinations (
 scope text not null check (scope in ('PRODUCT','SKU','FAMILY','CATEGORY','STOREFRONT')),
 scope_key text not null check (length(scope_key) between 1 and 160 and scope_key !~ '[[:cntrl:]]'),
 destination_type text not null default 'EBAY' check (destination_type = 'EBAY'),
 url text not null check (length(url) <= 2000 and url ~ '^https://(www\.)?ebay\.(co\.uk|com)/(itm|str)/[A-Za-z0-9_%-]+(/?[A-Za-z0-9_./%?=&+-]*)?$' and url !~ '(%0[adAD]|%5[cC]|%23)'),
 label text not null default '' check (length(label) <= 100),
 enabled boolean not null default false,
 paused_only boolean not null default false,
 primary key (scope, scope_key),
 check (scope <> 'STOREFRONT' or scope_key = '*')
);
alter table public.commercial_destinations enable row level security;
revoke all on public.commercial_destinations from public, anon, authenticated;
grant select, insert, update, delete on public.commercial_destinations to authenticated;
create policy commercial_admin on public.commercial_destinations for all to authenticated
 using (exists(select 1 from public.admin_members where user_id = (select auth.uid())))
 with check (exists(select 1 from public.admin_members where user_id = (select auth.uid())));
-- Deliberately anonymous read API, like public_news: only enabled public actions.
-- No authoring configuration, disabled rows, identities or business data exposed.
create function public.public_commercial_destinations()
returns table(scope text, scope_key text, destination_type text, url text, label text, paused_only boolean)
language sql stable security definer set search_path = '' as $$
 select d.scope,d.scope_key,d.destination_type,d.url,d.label,d.paused_only
 from public.commercial_destinations d where d.enabled order by d.scope,d.scope_key
$$;
revoke all on function public.public_commercial_destinations() from public, anon, authenticated;
grant execute on function public.public_commercial_destinations() to anon, authenticated;

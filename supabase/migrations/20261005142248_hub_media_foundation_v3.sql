-- Private approved static asset metadata. No storage uploads or public projection.
create table if not exists public.hub_media_assets(
 id uuid primary key default gen_random_uuid(),
 asset_key text not null unique check(asset_key ~ '^[a-z0-9-]{1,100}$'),
 filename text not null check(filename ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,179}$'),
 path text not null unique check(path ~ '^/assets/[A-Za-z0-9_-]+\.(png|jpg|jpeg|webp)$'),
 mime_type text not null check(mime_type in ('image/png','image/jpeg','image/webp')),
 width integer not null check(width between 1 and 16384),height integer not null check(height between 1 and 16384),
 byte_size bigint not null check(byte_size between 1 and 10485760),sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now()
);
create table if not exists public.hub_article_media(
 article_id uuid not null references public.hub_articles(id) on delete restrict,
 asset_id uuid not null references public.hub_media_assets(id) on delete restrict,
 block_ref text not null default '' check(block_ref='' or block_ref ~ '^[A-Za-z0-9_.:-]{1,120}$'),
 alt_text text not null check(char_length(alt_text)<=300),caption text not null check(char_length(caption)<=2000),
 decorative boolean not null default false,
 edit_version bigint not null default 1 check(edit_version>0),updated_at timestamptz not null default now(),actor uuid not null references auth.users(id),
 primary key(article_id,asset_id,block_ref),
 check((decorative and alt_text='') or (not decorative and char_length(btrim(alt_text))>0))
);
alter table public.hub_media_assets enable row level security;
alter table public.hub_article_media enable row level security;
revoke all on public.hub_media_assets,public.hub_article_media from public,anon,authenticated;
grant select on public.hub_media_assets,public.hub_article_media to authenticated;
drop policy if exists hub_media_admin_read on public.hub_media_assets;
create policy hub_media_admin_read on public.hub_media_assets for select to authenticated using(exists(select 1 from public.admin_members where user_id=(select auth.uid())));
drop policy if exists hub_media_usage_admin_read on public.hub_article_media;
create policy hub_media_usage_admin_read on public.hub_article_media for select to authenticated using(exists(select 1 from public.admin_members where user_id=(select auth.uid())));
create index if not exists hub_media_usage_asset_idx on public.hub_article_media(asset_id);

create or replace function public.save_hub_media_reference(p_article_id uuid,p_asset_id uuid,p_block_ref text,p_alt_text text,p_caption text,p_decorative boolean,p_expected_version bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result public.hub_article_media; current_version bigint; actor_id uuid:=auth.uid();
begin
 if actor_id is null or not exists(select 1 from public.admin_members where user_id=actor_id) then raise exception 'Admin access required' using errcode='42501';end if;
 if p_block_ref is null or p_alt_text is null or p_caption is null or p_decorative is null or p_expected_version is null or p_expected_version<0 then raise exception 'Invalid media reference' using errcode='23514';end if;
 if p_alt_text ~ '[[:cntrl:]]' or p_caption ~ '[[:cntrl:]]' then raise exception 'Invalid media text' using errcode='23514';end if;
 -- Lock the document, serialising first inserts as well as updates without touching its draft/version/publication pointer.
 perform 1 from public.hub_articles where id=p_article_id for update;
 if not found then raise exception 'Unknown article' using errcode='23503';end if;
 select edit_version into current_version from public.hub_article_media where article_id=p_article_id and asset_id=p_asset_id and block_ref=p_block_ref;
 if coalesce(current_version,0)<>p_expected_version then raise exception 'Media reference changed; reload before saving' using errcode='40001';end if;
 insert into public.hub_article_media(article_id,asset_id,block_ref,alt_text,caption,decorative,actor,edit_version)
 values(p_article_id,p_asset_id,p_block_ref,p_alt_text,p_caption,p_decorative,actor_id,coalesce(current_version,0)+1)
 on conflict(article_id,asset_id,block_ref) do update set alt_text=excluded.alt_text,caption=excluded.caption,decorative=excluded.decorative,actor=excluded.actor,edit_version=excluded.edit_version,updated_at=now()
 returning * into result;
 return to_jsonb(result);
end $$;
revoke all on function public.save_hub_media_reference(uuid,uuid,text,text,text,boolean,bigint) from public,anon,authenticated;
grant execute on function public.save_hub_media_reference(uuid,uuid,text,text,text,boolean,bigint) to authenticated;

insert into public.hub_media_assets(asset_key,filename,path,mime_type,width,height,byte_size,sha256) values('apparition-logo','apparition-logo.png','/assets/apparition-logo.png','image/png','2048','2048','2201238','b62febec8243f0626dd7a24daf5de67d4ff02f470045c07551e618691df5ee39') on conflict(asset_key) do nothing;

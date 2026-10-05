-- Additive private import history; existing published revisions/pointers are untouched.
create table public.hub_article_draft_imports(
 id bigint generated always as identity primary key,
 article_id uuid not null references public.hub_articles(id),
 edit_version bigint not null,
 content jsonb not null,
 provenance text not null default 'DOCX_IMPORT' check(provenance='DOCX_IMPORT'),
 actor uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(article_id,edit_version)
);
alter table public.hub_article_draft_imports enable row level security;
revoke all on public.hub_article_draft_imports from public,anon,authenticated;
revoke all on sequence public.hub_article_draft_imports_id_seq from public,anon,authenticated;
grant select on public.hub_article_draft_imports to authenticated;
create policy hub_draft_import_admin_read on public.hub_article_draft_imports for select to authenticated using(exists(select 1 from public.admin_members where user_id=(select auth.uid())));
create trigger hub_draft_import_immutable before update or delete on public.hub_article_draft_imports for each row execute function public.hub_revision_immutable();
create function public.save_hub_docx_import(p_id uuid,p_expected_version bigint,p_content jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.hub_articles; saved jsonb; old_protected jsonb; new_protected jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin membership required' using errcode='42501';end if;
 select * into a from public.hub_articles where id=p_id for update;
 if not found then raise exception 'CMS article missing' using errcode='23503';end if;
 if p_expected_version is distinct from a.edit_version then raise exception 'Draft changed; re-export before importing' using errcode='40001';end if;
 -- DOCX may edit only title/intro/body. Intelligence remains authoritative outside Word.
 if (p_content-'body'-'title'-'intro') is distinct from (a.draft-'body'-'title'-'intro') then raise exception 'DOCX cannot rewrite article intelligence' using errcode='23514';end if;
 select coalesce(jsonb_agg(jsonb_build_object('slot',slots.key,'node',nodes.value) order by slots.key,nodes.value::text),'[]'::jsonb) into old_protected from jsonb_each(a.draft->'body'->'slots') as slots(key,doc) cross join lateral jsonb_path_query(slots.doc,'strict $.** ? (@.type == "protected" || @.type == "protected_inline")') as nodes(value);
 select coalesce(jsonb_agg(jsonb_build_object('slot',slots.key,'node',nodes.value) order by slots.key,nodes.value::text),'[]'::jsonb) into new_protected from jsonb_each(p_content->'body'->'slots') as slots(key,doc) cross join lateral jsonb_path_query(slots.doc,'strict $.** ? (@.type == "protected" || @.type == "protected_inline")') as nodes(value);
 if old_protected is distinct from new_protected then raise exception 'DOCX protected blocks must remain unchanged, complete and unique' using errcode='23514';end if;
 saved:=public.save_hub_article(p_id,p_expected_version,p_content,'DRAFT',null);
 insert into public.hub_article_draft_imports(article_id,edit_version,content,actor) values(p_id,(saved->>'edit_version')::bigint,saved->'draft',auth.uid());
 return saved;
end;$$;
revoke all on function public.save_hub_docx_import(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.save_hub_docx_import(uuid,bigint,jsonb) to authenticated;

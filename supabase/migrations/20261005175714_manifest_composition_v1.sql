-- Manifest is private composition, coordinated with the existing semantic lifecycle.
-- Nullable fields require no backfill and do not affect the public projection.
alter table public.hub_articles add column manifest jsonb;
alter table public.hub_article_revisions add column manifest jsonb;
create or replace view public.hub_article_library with (security_invoker=true) as
 select a.id,a.guide_key,a.draft,a.seed_context,a.published_revision_id,a.edit_version,a.created_at,a.updated_at,r.content as published_content,a.manifest
 from public.hub_articles a left join public.hub_article_revisions r on r.id=a.published_revision_id and r.article_id=a.id;
create function public.hub_manifest_integer(v jsonb,lo int,hi int) returns boolean language sql immutable set search_path='' as $$
 select case when jsonb_typeof(v)='number' and v::text ~ '^[0-9]+$' then (v::text)::numeric between lo and hi else false end
$$;
revoke all on function public.hub_manifest_integer(jsonb,int,int) from public,anon,authenticated;
create function public.hub_validate_manifest(m jsonb,c jsonb,article_id uuid) returns void language plpgsql set search_path='' as $$
declare s jsonb;b jsonb;l jsonb;p jsonb;g jsonb;entry record;bid text;bp text;k text;v jsonb;n jsonb;idx jsonb;ids text[]:=array[]::text[];ordered text[];keys text[];protected boolean;row_end int;total int:=0;
begin
 if m is null then return;end if;
 if jsonb_typeof(m) is distinct from 'object' or octet_length(m::text)>2000000 or m->>'schemaVersion' is distinct from '1' or m->>'id' is distinct from 'article:'||article_id::text or jsonb_typeof(m->'sections') is distinct from 'array' or jsonb_array_length(m->'sections') not between 1 and 100 then raise exception 'Invalid Manifest document/ownership' using errcode='23514';end if;
 for k in select jsonb_object_keys(m) loop if k not in ('schemaVersion','id','sections') then raise exception 'Unexpected Manifest field' using errcode='23514';end if;end loop;
 ids:=array[m->>'id'];
 for s in select value from jsonb_array_elements(m->'sections') loop
  if jsonb_typeof(s) is distinct from 'object' or coalesce(s->>'id','') !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$' or s->>'id'=any(ids) or coalesce(s->>'policy','') not in ('layer','reject','push') or jsonb_typeof(s->'order') is distinct from 'array' or jsonb_typeof(s->'blocks') is distinct from 'object' or jsonb_typeof(s->'layouts') is distinct from 'object' then raise exception 'Invalid Manifest section' using errcode='23514';end if;
  ids:=array_append(ids,s->>'id');
  for k in select jsonb_object_keys(s) loop if k not in ('id','policy','order','blocks','layouts') then raise exception 'Unexpected section field' using errcode='23514';end if;end loop;
  select coalesce(array_agg(x order by x),array[]::text[]) into ordered from jsonb_array_elements_text(s->'order') x;
  select coalesce(array_agg(x order by x),array[]::text[]) into keys from jsonb_object_keys(s->'blocks') x;
  total:=total+cardinality(ordered);if ordered is distinct from keys or cardinality(ordered)>1000 or total>1000 or cardinality(ordered)<>(select count(distinct x) from unnest(ordered)x) then raise exception 'Invalid Manifest block order' using errcode='23514';end if;
  for entry in select * from jsonb_each(s->'blocks') loop
   bid:=entry.key;b:=entry.value;
   if bid !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$' or bid=any(ids) or b->>'id' is distinct from bid or coalesce(b->>'type','') !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$' or not public.hub_manifest_integer(b->'version',1,100) or jsonb_typeof(b->'content') is distinct from 'object' or jsonb_typeof(b->'presentation') is distinct from 'object' or jsonb_typeof(b->'capabilities') is distinct from 'object' then raise exception 'Invalid Manifest block' using errcode='23514';end if;
   ids:=array_append(ids,bid);
   for k in select jsonb_object_keys(b) loop if k not in ('id','type','version','content','presentation','capabilities') then raise exception 'Unexpected block field' using errcode='23514';end if;end loop;
   for k,v in select * from jsonb_each(b->'capabilities') loop if k not in ('move','resize','layer','edit','remove') or jsonb_typeof(v) is distinct from 'boolean' then raise exception 'Invalid block capability' using errcode='23514';end if;end loop;
   protected:=false;
   if b->>'version'='1' and b->>'type'='text' then
    for k in select jsonb_object_keys(b->'content') loop if k not in ('slot','path','kind','ref') then raise exception 'Manifest cannot store article text' using errcode='23514';end if;end loop;
    if jsonb_typeof(b->'content'->'path') is distinct from 'array' or jsonb_array_length(b->'content'->'path') not between 1 and 40 then raise exception 'Invalid semantic reference' using errcode='23514';end if;
    n:=c->'body'->'slots'->(b->'content'->>'slot');
    for idx in select value from jsonb_array_elements(b->'content'->'path') loop
     if not public.hub_manifest_integer(idx,0,3000) then raise exception 'Invalid semantic path' using errcode='23514';end if;
     n:=n->'content'->((idx::text)::int);
    end loop;
    if n is null or n->>'type' is distinct from b->'content'->>'kind' or coalesce(n->'attrs'->>'ref','') is distinct from coalesce(b->'content'->>'ref','') then raise exception 'Stale Manifest semantic reference' using errcode='23514';end if;
    if b->'presentation'<>'{}'::jsonb then raise exception 'Unsupported text presentation' using errcode='23514';end if;
    protected:=jsonb_path_exists(n,'strict $.** ? (@.type == "protected" || @.type == "protected_inline")');
   elsif b->>'version'='1' and b->>'type'='image' then
    for k in select jsonb_object_keys(b->'content') loop if k not in ('assetId','usageRef') then raise exception 'Unsupported image content' using errcode='23514';end if;end loop;
    if not exists(select 1 from public.hub_article_media u join public.hub_media_assets a on a.id=u.asset_id where u.article_id=$3 and a.id::text=b->'content'->>'assetId' and u.block_ref=b->'content'->>'usageRef') then raise exception 'Image must use approved article media' using errcode='23514';end if;
    if b->'presentation' not in ('{"fit":"contain"}'::jsonb,'{"fit":"cover"}'::jsonb) then raise exception 'Unsupported image presentation' using errcode='23514';end if;
   elsif b->>'version'='1' and b->>'type'='button' then
    for k in select jsonb_object_keys(b->'content') loop if k not in ('label','href') then raise exception 'Unsupported button content' using errcode='23514';end if;end loop;
    if jsonb_typeof(b->'content'->'label') is distinct from 'string' or length(btrim(b->'content'->>'label')) not between 1 and 120 or length(b->'content'->>'href')>2000 or coalesce(b->'content'->>'href','') !~ '^(https://[^/@[:space:]\\]+([/?#].*)?|/([^/].*)?|#[A-Za-z0-9_-]+)$' or b->'content'->>'href' ~ '[[:space:]\\]' then raise exception 'Unsafe Manifest button' using errcode='23514';end if;
    if b->'presentation' not in ('{"variant":"primary"}'::jsonb,'{"variant":"secondary"}'::jsonb) then raise exception 'Unsupported button presentation' using errcode='23514';end if;
   else protected:=true;
   end if;
   if protected and exists(select 1 from jsonb_each(b->'capabilities') x where x.value='true'::jsonb) then raise exception 'Protected/unknown block capabilities denied' using errcode='23514';end if;
   if (select count(*) from jsonb_object_keys(s->'layouts')) not between 1 and 10 then raise exception 'Invalid breakpoint count' using errcode='23514';end if;
   for bp,l in select * from jsonb_each(s->'layouts') loop
    if bp !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$' or jsonb_typeof(l) is distinct from 'object' then raise exception 'Invalid breakpoint' using errcode='23514';end if;
    for k in select jsonb_object_keys(l) loop if k not in ('grid','rows','placements') then raise exception 'Unexpected layout field' using errcode='23514';end if;end loop;
    g:=l->'grid';if jsonb_typeof(g) is distinct from 'object' or not public.hub_manifest_integer(g->'columns',1,96) or not public.hub_manifest_integer(g->'minRows',1,100000) or not public.hub_manifest_integer(g->'trailingRows',0,100) or not public.hub_manifest_integer(l->'rows',(g->>'minRows')::int,100000) then raise exception 'Invalid Manifest grid' using errcode='23514';end if;
    for k in select jsonb_object_keys(g) loop if k not in ('columns','minRows','trailingRows','rowHeight','gapX','gapY') then raise exception 'Unexpected grid field' using errcode='23514';end if;end loop;
    foreach k in array array['rowHeight','gapX','gapY'] loop if jsonb_typeof(g->k) is distinct from 'number' or (g->>k)::numeric not between (case when k='rowHeight' then 1 else 0 end) and 1000 then raise exception 'Invalid grid measurement' using errcode='23514';end if;end loop;
    if jsonb_typeof(l->'placements') is distinct from 'object' or (select array_agg(x order by x) from jsonb_object_keys(l->'placements')x) is distinct from nullif(ordered,array[]::text[]) then raise exception 'Placement identities mismatch' using errcode='23514';end if;
    v:=l->'placements'->bid;
    for k in select jsonb_object_keys(v) loop if k not in ('source','value') then raise exception 'Unexpected placement field' using errcode='23514';end if;end loop;
    if coalesce(v->>'source','') not in ('manual','generated') then raise exception 'Invalid placement source' using errcode='23514';end if;p:=v->'value';
    if jsonb_typeof(p) is distinct from 'object' then raise exception 'Missing placement' using errcode='23514';end if;
    for k in select jsonb_object_keys(p) loop if k not in ('col','row','cols','rows','z','visible','locked') then raise exception 'Unexpected geometry field' using errcode='23514';end if;end loop;
    foreach k in array array['col','row','z'] loop if not public.hub_manifest_integer(p->k,0,100000) then raise exception 'Invalid placement integer' using errcode='23514';end if;end loop;
    foreach k in array array['cols','rows'] loop if not public.hub_manifest_integer(p->k,1,100000) then raise exception 'Invalid placement span' using errcode='23514';end if;end loop;
    if jsonb_typeof(p->'visible') is distinct from 'boolean' or jsonb_typeof(p->'locked') is distinct from 'boolean' or (p->>'col')::int+(p->>'cols')::int>(g->>'columns')::int or (p->>'row')::int+(p->>'rows')::int>100000 or p->>'visible'='true' and (p->>'row')::int+(p->>'rows')::int>(l->>'rows')::int or protected and (p->>'locked'<>'true' or p->>'visible'<>'true') then raise exception 'Invalid/protected geometry' using errcode='23514';end if;
   end loop;
  end loop;
 end loop;
end$$;
revoke all on function public.hub_validate_manifest(jsonb,jsonb,uuid) from public,anon,authenticated;
create function public.hub_save_manifest_core(p_id uuid,p_expected_version bigint,p_content jsonb,p_action text,p_restore_revision bigint,p_manifest jsonb,p_provided boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid();a public.hub_articles;c jsonb:=p_content;revision_id bigint;num bigint;m jsonb;old_s jsonb;old_b jsonb;new_s jsonb;bp text;
begin
 if actor_id is null or not exists(select 1 from public.admin_members where user_id=actor_id) then raise exception 'Admin membership required' using errcode='42501';end if;
 if p_provided and p_id is null then raise exception 'Save the article before opening Conjure' using errcode='23514';end if;
 if p_action not in ('DRAFT','PUBLISH','RESTORE') then raise exception 'Unsupported CMS action' using errcode='23514';end if;
 if p_id is null then
  if p_action<>'DRAFT' then raise exception 'Create a draft before publication' using errcode='23514';end if;
  a.id:=gen_random_uuid();a.guide_key:='cms-'||a.id::text;a.seed_context:='{"template_key":"generic","expected_intent":null,"refs":{},"slots":["main"]}'::jsonb;
  perform public.hub_validate_content(c,a.seed_context,false);
  if c->>'slug'<>'' and exists(select 1 from public.hub_articles where draft->>'slug'=c->>'slug') then raise exception 'CMS slug collision' using errcode='23505';end if;
  insert into public.hub_articles(id,guide_key,draft,seed_context) values(a.id,a.guide_key,c,a.seed_context) returning * into a;return to_jsonb(a);
 end if;
 select * into a from public.hub_articles where id=p_id for update;if not found then raise exception 'CMS article missing' using errcode='23503';end if;
 if p_expected_version is distinct from a.edit_version then raise exception 'CMS article changed; reload before saving' using errcode='40001';end if;
 if p_action='RESTORE' then select content,manifest into c,m from public.hub_article_revisions where article_id=a.id and id=p_restore_revision;if not found then raise exception 'Revision does not belong to this article' using errcode='23503';end if;end if;
 if p_action<>'RESTORE' then m:=case when p_provided then p_manifest when c->'body'=a.draft->'body' then a.manifest else null end;end if;
 if p_provided and a.manifest is not null then
  for old_s in select value from jsonb_array_elements(a.manifest->'sections') loop
   for old_b in select value from jsonb_each(old_s->'blocks') loop
    if old_b->>'type'='text' and not exists(select 1 from jsonb_each(old_b->'capabilities') x where x.value='true'::jsonb) then
     select value into new_s from jsonb_array_elements(m->'sections') where value->>'id'=old_s->>'id';
     if new_s is null or new_s->'blocks'->(old_b->>'id') is distinct from old_b then raise exception 'Protected composition binding is immutable' using errcode='23514';end if;
     for bp in select jsonb_object_keys(old_s->'layouts') loop
      if new_s->'layouts'->bp->'placements'->(old_b->>'id') is distinct from old_s->'layouts'->bp->'placements'->(old_b->>'id') then raise exception 'Protected composition geometry is immutable' using errcode='23514';end if;
     end loop;
    end if;
   end loop;
  end loop;
 end if;
 perform public.hub_validate_manifest(m,c,a.id);
 perform public.hub_validate_content(c,a.seed_context,p_action<>'DRAFT');
 if a.published_revision_id is not null and c->>'slug'<>(select content->>'slug' from public.hub_article_revisions where id=a.published_revision_id) then raise exception 'Published CMS slug is immutable' using errcode='23514';end if;
 perform pg_advisory_xact_lock(hashtext('hub-cms-slug:'||(c->>'slug')));
 if c->>'slug'<>'' and exists(select 1 from public.hub_articles other where other.id<>a.id and (other.draft->>'slug'=c->>'slug' or exists(select 1 from public.hub_article_revisions r where r.id=other.published_revision_id and r.content->>'slug'=c->>'slug'))) then raise exception 'CMS slug collision' using errcode='23505';end if;
 if p_action<>'DRAFT' then
  c:=jsonb_set(jsonb_set(c,'{published_at}',case when a.published_revision_id is not null then (select content->'published_at' from public.hub_article_revisions where id=a.published_revision_id) else coalesce(nullif(c->'published_at','null'::jsonb),to_jsonb(now())) end),'{content_updated_at}',to_jsonb(now()));
  select coalesce(max(revision_number),0)+1 into num from public.hub_article_revisions where article_id=a.id;
  insert into public.hub_article_revisions(article_id,revision_number,content,action,actor,manifest) values(a.id,num,c,p_action,actor_id,m) returning id into revision_id;
 end if;
 update public.hub_articles set draft=c,manifest=m,published_revision_id=coalesce(revision_id,published_revision_id),edit_version=edit_version+1,updated_at=now() where id=a.id returning * into a;
 return to_jsonb(a);
end$$;
revoke all on function public.hub_save_manifest_core(uuid,bigint,jsonb,text,bigint,jsonb,boolean) from public,anon,authenticated;
create or replace function public.save_hub_article(p_id uuid,p_expected_version bigint,p_content jsonb,p_action text default 'DRAFT',p_restore_revision bigint default null) returns jsonb
 language sql security definer set search_path='' as $$select public.hub_save_manifest_core(p_id,p_expected_version,p_content,p_action,p_restore_revision,null,false)$$;
-- Same publication lifecycle; no independent Conjure lifecycle.
create function public.save_hub_article_manifest(p_id uuid,p_expected_version bigint,p_content jsonb,p_manifest jsonb,p_action text default 'DRAFT') returns jsonb
 language sql security definer set search_path='' as $$select public.hub_save_manifest_core(p_id,p_expected_version,p_content,p_action,null,p_manifest,true)$$;
revoke all on function public.save_hub_article_manifest(uuid,bigint,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_hub_article_manifest(uuid,bigint,jsonb,jsonb,text) to authenticated;
comment on column public.hub_articles.manifest is 'Manifest Engine v1 private draft composition. ProseMirror draft remains semantic authority; absence preserves legacy rendering.';
comment on column public.hub_article_revisions.manifest is 'Composition snapshot corresponding to this immutable semantic revision; never uses current draft layout.';

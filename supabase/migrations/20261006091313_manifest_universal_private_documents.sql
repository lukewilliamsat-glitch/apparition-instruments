-- Universal Manifest documents are private and lazy. No seed, public pointer or business writes.
create table public.manifest_documents (
 id text primary key,document_key text not null unique,route text not null unique,document_type text not null,
 source_hash text not null,draft jsonb not null,manifest jsonb not null,edit_version bigint not null default 1 check(edit_version>0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.manifest_document_revisions (
 id bigint generated always as identity primary key,document_id text not null references public.manifest_documents(id),
 edit_version bigint not null,draft jsonb not null,manifest jsonb not null,actor uuid not null references auth.users(id),created_at timestamptz not null default now(),unique(document_id,edit_version)
);
alter table public.manifest_documents enable row level security;
alter table public.manifest_document_revisions enable row level security;
revoke all on public.manifest_documents,public.manifest_document_revisions from public,anon,authenticated;
revoke all on sequence public.manifest_document_revisions_id_seq from public,anon,authenticated;
grant select on public.manifest_documents,public.manifest_document_revisions to authenticated;
create policy manifest_admin_read on public.manifest_documents for select to authenticated using(exists(select 1 from public.admin_members where user_id=(select auth.uid())));
create policy manifest_revision_admin_read on public.manifest_document_revisions for select to authenticated using(exists(select 1 from public.admin_members where user_id=(select auth.uid())));
create trigger manifest_revision_immutable before update or delete on public.manifest_document_revisions for each row execute function public.hub_revision_immutable();
create function public.manifest_validate_document(m jsonb,c jsonb,document_id text) returns void language plpgsql set search_path='' as $$
declare s jsonb;b jsonb;l jsonb;p jsonb;g jsonb;entry record;bid text;bp text;k text;v jsonb;n jsonb;idx jsonb;ids text[]:=array[]::text[];ordered text[];keys text[];protected boolean;row_end int;total int:=0;
begin
 if m is null then raise exception 'Manifest required' using errcode='23514';end if;
 if jsonb_typeof(m) is distinct from 'object' or octet_length(m::text)>2000000 or m->>'schemaVersion' is distinct from '1' or m->>'id' is distinct from document_id or jsonb_typeof(m->'sections') is distinct from 'array' or jsonb_array_length(m->'sections') not between 1 and 100 then raise exception 'Invalid Manifest document/ownership' using errcode='23514';end if;
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
    if b->'content'->>'assetId' is distinct from 'static:/assets/guitar.webp' or document_id<>'page:home' or b->'content'->>'usageRef' is distinct from 'page:home:section:hero:hero-media' then raise exception 'Image requires approved native media' using errcode='23514';end if;
    if b->'presentation' not in ('{"fit":"contain"}'::jsonb,'{"fit":"cover"}'::jsonb) then raise exception 'Unsupported image presentation' using errcode='23514';end if;
   elsif b->>'version'='1' and b->>'type'='button' then
    for k in select jsonb_object_keys(b->'content') loop if k not in ('label','href') then raise exception 'Unsupported button content' using errcode='23514';end if;end loop;
    if jsonb_typeof(b->'content'->'label') is distinct from 'string' or length(btrim(b->'content'->>'label')) not between 1 and 120 or length(b->'content'->>'href')>2000 or coalesce(b->'content'->>'href','') !~ '^(https://[^/@[:space:]\\]+([/?#].*)?|/([^/].*)?|#[A-Za-z0-9_-]+)$' or b->'content'->>'href' ~ '[[:space:]\\]' then raise exception 'Unsafe Manifest button' using errcode='23514';end if;
    if b->'presentation' not in ('{"variant":"primary"}'::jsonb,'{"variant":"secondary"}'::jsonb) then raise exception 'Unsupported button presentation' using errcode='23514';end if;
   elsif b->>'version'='1' and b->>'type'='line' then
    if b->'content'<>'{}'::jsonb or b->'presentation'<>'{}'::jsonb or b->'capabilities'->'edit'='true'::jsonb then raise exception 'Invalid Line adapter' using errcode='23514';end if;
   elsif b->>'version'='1' and b->>'type' in ('application','dynamic') then
    if (select array_agg(x order by x) from jsonb_object_keys(b->'content')x) is distinct from array['binding','source']::text[] or b->'content'->>'binding' is distinct from bid or coalesce(b->'content'->>'source','') not in ('application','catalogue','news','articles','presentation') or b->'presentation'<>'{}'::jsonb then raise exception 'Invalid protected source binding' using errcode='23514';end if;protected:=true;
   else protected:=true;
   end if;
   if protected and exists(select 1 from jsonb_each(b->'capabilities') x where x.value='true'::jsonb) then raise exception 'Protected/unknown block capabilities denied' using errcode='23514';end if;
  end loop;
   if (select count(*) from jsonb_object_keys(s->'layouts')) not between 1 and 10 then raise exception 'Invalid breakpoint count' using errcode='23514';end if;
   for bp,l in select * from jsonb_each(s->'layouts') loop
    if bp !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$' or jsonb_typeof(l) is distinct from 'object' then raise exception 'Invalid breakpoint' using errcode='23514';end if;
    for k in select jsonb_object_keys(l) loop if k not in ('grid','rows','placements') then raise exception 'Unexpected layout field' using errcode='23514';end if;end loop;
    g:=l->'grid';if jsonb_typeof(g) is distinct from 'object' or not public.hub_manifest_integer(g->'columns',1,96) or not public.hub_manifest_integer(g->'minRows',1,100000) or not public.hub_manifest_integer(g->'trailingRows',0,100) or not public.hub_manifest_integer(l->'rows',(g->>'minRows')::int,100000) then raise exception 'Invalid Manifest grid' using errcode='23514';end if;
    for k in select jsonb_object_keys(g) loop if k not in ('columns','minRows','trailingRows','rowHeight','gapX','gapY') then raise exception 'Unexpected grid field' using errcode='23514';end if;end loop;
    foreach k in array array['rowHeight','gapX','gapY'] loop if jsonb_typeof(g->k) is distinct from 'number' or (g->>k)::numeric not between (case when k='rowHeight' then 1 else 0 end) and 1000 then raise exception 'Invalid grid measurement' using errcode='23514';end if;end loop;
    if jsonb_typeof(l->'placements') is distinct from 'object' or (select array_agg(x order by x) from jsonb_object_keys(l->'placements')x) is distinct from nullif(ordered,array[]::text[]) then raise exception 'Placement identities mismatch' using errcode='23514';end if;
    for bid in select jsonb_object_keys(s->'blocks') loop
    b:=s->'blocks'->bid;protected:=b->>'type' not in ('text','image','button','line') or b->>'version'<>'1';
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

revoke all on function public.manifest_validate_document(jsonb,jsonb,text) from public,anon,authenticated;

create function public.save_manifest_document(p_key text,p_route text,p_type text,p_source_hash text,p_expected_version bigint,p_content jsonb,p_manifest jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid();a public.manifest_documents;n jsonb;k text;old_s jsonb;old_b jsonb;new_s jsonb;bp text;
begin
 if actor_id is null or not exists(select 1 from public.admin_members where user_id=actor_id) then raise exception 'Admin membership required' using errcode='42501';end if;
 if not ((p_key='home' and p_route='/' and p_type='homepage') or (p_key='components' and p_route='/components/' and p_type='landing') or (p_key='contact' and p_route='/contact/' and p_type='information') or (p_key='luthier-hub' and p_route='/luthier-hub/' and p_type='landing')) or p_source_hash !~ '^[0-9a-f]{64}$' or p_expected_version is null or p_expected_version<0 then raise exception 'Unsupported private document identity' using errcode='23514';end if;
 if jsonb_typeof(p_content) is distinct from 'object' or octet_length(p_content::text)>1000000 or (select array_agg(x order by x) from jsonb_object_keys(p_content)x) is distinct from array['body']::text[] or p_content->'body'->>'version' is distinct from '1' or (select array_agg(x order by x) from jsonb_object_keys(p_content->'body')x) is distinct from array['slots','version']::text[] or (select array_agg(x order by x) from jsonb_object_keys(p_content->'body'->'slots')x) is distinct from array['content']::text[] then raise exception 'Invalid semantic document' using errcode='23514';end if;
 n:=p_content->'body'->'slots'->'content';if n->>'type' is distinct from 'doc' or jsonb_typeof(n->'content') is distinct from 'array' or jsonb_array_length(n->'content')<1 then raise exception 'Body document required' using errcode='23514';end if;perform public.hub_validate_node(n,'{}'::jsonb);
 perform public.manifest_validate_document(p_manifest,p_content,'page:'||p_key);
 perform pg_advisory_xact_lock(hashtext('manifest-document:'||p_key));
 select * into a from public.manifest_documents where document_key=p_key for update;
 if found then
  if a.edit_version is distinct from p_expected_version then raise exception 'Private document changed; reload before saving' using errcode='40001';end if;
  if a.route is distinct from p_route or a.document_type is distinct from p_type or a.source_hash is distinct from p_source_hash then raise exception 'Canonical source changed; draft retained' using errcode='23514';end if;
  for old_s in select value from jsonb_array_elements(a.manifest->'sections') loop
   for old_b in select value from jsonb_each(old_s->'blocks') loop
    if old_b->>'type' in ('application','dynamic') then
     select value into new_s from jsonb_array_elements(p_manifest->'sections') where value->>'id'=old_s->>'id';
     if new_s is null or new_s->'blocks'->(old_b->>'id') is distinct from old_b then raise exception 'Protected source binding immutable' using errcode='23514';end if;
     for bp in select jsonb_object_keys(old_s->'layouts') loop
      if new_s->'layouts'->bp->'placements'->(old_b->>'id') is distinct from old_s->'layouts'->bp->'placements'->(old_b->>'id') then raise exception 'Protected geometry immutable' using errcode='23514';end if;
     end loop;
    end if;
   end loop;
  end loop;
  update public.manifest_documents set draft=p_content,manifest=p_manifest,edit_version=edit_version+1,updated_at=now() where document_key=p_key returning * into a;
 else
  if p_expected_version<>0 then raise exception 'Private document version missing' using errcode='40001';end if;
  insert into public.manifest_documents(id,document_key,route,document_type,source_hash,draft,manifest) values('page:'||p_key,p_key,p_route,p_type,p_source_hash,p_content,p_manifest) returning * into a;
 end if;
 insert into public.manifest_document_revisions(document_id,edit_version,draft,manifest,actor) values(a.id,a.edit_version,a.draft,a.manifest,actor_id);
 return to_jsonb(a);
end$$;
revoke all on function public.save_manifest_document(text,text,text,text,bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_manifest_document(text,text,text,text,bigint,jsonb,jsonb) to authenticated;
comment on table public.manifest_documents is 'Private Manifest drafts; bootstrap is read-only and first explicit Admin save creates version one. No public renderer or publication lifecycle.';

-- Additive private Line adapter. Existing function identity, grants, RPC and unknown-block protection retained. No row writes.
create or replace function public.hub_validate_manifest(m jsonb,c jsonb,article_id uuid) returns void language plpgsql set search_path='' as $$
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
   elsif b->>'version'='1' and b->>'type'='line' then
    if b->'content'<>'{}'::jsonb or b->'presentation'<>'{}'::jsonb or b->'capabilities'->'edit'='true'::jsonb then raise exception 'Invalid Line adapter' using errcode='23514';end if;
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

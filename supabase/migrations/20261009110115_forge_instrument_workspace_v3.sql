-- Forge V3 additive revision documentation. Approval required before production.
-- No legacy object replacement, backfill, business data writes or destructive SQL.
begin;
create table public.forge_instrument_versions (
 revision_id uuid primary key,
 project_id uuid not null,
 workspace jsonb not null check(jsonb_typeof(workspace)='object' and workspace->>'schema'='1' and octet_length(workspace::text)<=100000),
 created_at timestamptz not null default now(),
 foreign key(revision_id,project_id) references public.forge_revisions(id,project_id) on delete cascade
);
create index forge_instrument_versions_project on public.forge_instrument_versions(project_id,created_at desc);
alter table public.forge_instrument_versions enable row level security;
revoke all on public.forge_instrument_versions from public,anon,authenticated,service_role;
grant select on public.forge_instrument_versions to authenticated;
create policy forge_instrument_versions_owner on public.forge_instrument_versions for select to authenticated
 using(exists(select 1 from public.forge_revisions r where r.id=revision_id and r.project_id=forge_instrument_versions.project_id));
create table forge_private.instrument_requests (
 owner_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 action text not null check(action in ('create','save')),
 request jsonb not null check(octet_length(request::text)<=240000),
 result jsonb not null,
 created_at timestamptz not null default now(),primary key(owner_id,request_id)
);
alter table forge_private.instrument_requests enable row level security;
revoke all on forge_private.instrument_requests from public,anon,authenticated,service_role;
create function forge_private.instrument_immutable() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Instrument revision records are immutable' using errcode='42501';end $$;
revoke all on function forge_private.instrument_immutable() from public,anon,authenticated,service_role;
create trigger forge_instrument_versions_immutable before update on public.forge_instrument_versions for each row execute function forge_private.instrument_immutable();
create trigger forge_instrument_requests_immutable before update on forge_private.instrument_requests for each row execute function forge_private.instrument_immutable();
-- Deletes are not granted to clients. FK account/project cascades retain established deletion semantics.
create function forge_private.instrument_fields(input jsonb,spec jsonb) returns void language plpgsql set search_path='' as $$
declare k text;v jsonb;rule jsonb;
begin
 if coalesce(jsonb_typeof(input),'null')<>'object' then raise exception 'Invalid documentation fields' using errcode='22023';end if;
 for k,v in select * from jsonb_each(input) loop
  rule:=spec->k;
  if rule is null then raise exception 'Unsupported documentation field: %',k using errcode='22023';end if;
  if v='null'::jsonb then continue;end if;
  if rule ? 'number' then
   if jsonb_typeof(v)<>'number' then raise exception 'Invalid numeric documentation field' using errcode='22023';end if;
   if (v::text)::numeric<(rule->'number'->>0)::numeric or (v::text)::numeric>(rule->'number'->>1)::numeric or coalesce((rule->>'integer')::boolean,false) and (v::text)::numeric<>trunc((v::text)::numeric) then raise exception 'Documentation value out of range' using errcode='22023';end if;
  else
   if jsonb_typeof(v)<>'string' then raise exception 'Invalid text documentation field' using errcode='22023';end if;
   if rule ? 'text' and char_length(input->>k)>(rule->>'text')::integer then raise exception 'Documentation text too long' using errcode='22023';end if;
   if rule ? 'options' and not (rule->'options' @> jsonb_build_array(v)) then raise exception 'Unsupported documentation option' using errcode='22023';end if;
   if rule ? 'uuid' and (input->>k)!~* '^[a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}$' then raise exception 'Invalid associated instance identity' using errcode='22023';end if;
   if rule ? 'date' then
    if (input->>k)!~ '^\d{4}-\d{2}-\d{2}$' or to_char((input->>k)::date,'YYYY-MM-DD')<>input->>k then raise exception 'Invalid documentation date' using errcode='22023';end if;
   end if;
  end if;
 end loop;
end $$;
revoke all on function forge_private.instrument_fields(jsonb,jsonb) from public,anon,authenticated,service_role;
create function forge_private.validate_instrument(w jsonb,s jsonb) returns void language plpgsql set search_path='' as $$
declare c jsonb;b jsonb;ids text[]:='{}';mapped text[]:='{}';ref text;kind text;
 identity_spec constant jsonb:='{"strings":{"number":[1,24],"integer":true},"scale_mm":{"number":[100,1500]},"scale_unit":{"options":["mm","in"]},"tuning":{"text":300},"handedness":{"options":["right","left","ambidextrous"]}}'::jsonb;
 component_specs constant jsonb:='{"pickup":{"position":{"text":100},"manufacturer":{"text":200},"model":{"text":200},"notes":{"text":2000},"installed_on":{"date":true},"type":{"options":["single_coil","humbucker","p90","active","other"]},"coils":{"options":["single","dual","stacked","other"]},"conductors":{"options":["1","2","3","4","5","other"]},"colour_convention":{"text":200},"measured_dcr_ohm":{"number":[0.001,100000000]},"measured_inductance_h":{"number":[0.000001,1000]}},"pot":{"position":{"text":100},"manufacturer":{"text":200},"model":{"text":200},"notes":{"text":2000},"installed_on":{"date":true},"role":{"text":100},"series":{"text":200},"nominal_ohm":{"number":[0.001,1000000000]},"measured_ohm":{"number":[0.001,1000000000]},"taper":{"options":["audio","linear","reverse_audio","other"]},"shaft":{"text":200},"function":{"options":["standard","push_pull","push_push","other"]}},"capacitor":{"position":{"text":100},"manufacturer":{"text":200},"model":{"text":200},"notes":{"text":2000},"installed_on":{"date":true},"role":{"text":100},"series":{"text":200},"nominal_pf":{"number":[0.001,1000000000000]},"measured_pf":{"number":[0.001,1000000000000]},"tolerance_percent":{"number":[0,100]},"voltage_v":{"number":[0.001,1000000]},"dielectric":{"text":200}},"resistor":{"position":{"text":100},"manufacturer":{"text":200},"model":{"text":200},"notes":{"text":2000},"installed_on":{"date":true},"role":{"text":100},"nominal_ohm":{"number":[0.001,1000000000000]},"measured_ohm":{"number":[0.001,1000000000000]},"tolerance_percent":{"number":[0,100]},"capacitor_id":{"uuid":true}},"treble_bleed":{"position":{"text":100},"manufacturer":{"text":200},"model":{"text":200},"notes":{"text":2000},"installed_on":{"date":true},"topology":{"options":["capacitor_only","parallel","series","other"]},"capacitor_id":{"uuid":true},"resistor_id":{"uuid":true}},"switch":{"position":{"text":100},"manufacturer":{"text":200},"model":{"text":200},"notes":{"text":2000},"installed_on":{"date":true},"role":{"text":100},"type":{"options":["toggle","blade","push_pull","push_push","other"]},"configuration":{"text":500}},"jack":{"position":{"text":100},"manufacturer":{"text":200},"model":{"text":200},"notes":{"text":2000},"installed_on":{"date":true},"type":{"options":["mono","stereo","other"]},"configuration":{"text":500}},"other":{"position":{"text":100},"manufacturer":{"text":200},"model":{"text":200},"notes":{"text":2000},"installed_on":{"date":true},"role":{"text":100},"description":{"text":500}}}'::jsonb;
 circuit_types constant jsonb:='{"pickup":["humbucker","singleCoil","singlecoil","pickup"],"pot":["pot"],"capacitor":["capacitor"],"resistor":["resistor"],"treble_bleed":[],"switch":["toggle","blade","dpdt","switch"],"jack":["jack"]}'::jsonb;
 build_spec constant jsonb:='{"description":{"text":2000},"date":{"date":true},"builder":{"text":200},"installation_notes":{"text":4000},"measurements":{"text":4000},"testing_notes":{"text":4000},"problems":{"text":4000},"completed":{"text":4000},"planned":{"text":4000}}'::jsonb;
begin
 if w is null or jsonb_typeof(w)<>'object' or coalesce(w->>'schema','')<>'1' or jsonb_typeof(w->'schema')<>'number' or not w ?& array['schema','identity','components','build'] or (select count(*) from jsonb_object_keys(w))<>4 or octet_length(w::text)>100000 then raise exception 'Invalid instrument envelope' using errcode='22023';end if;
 perform forge_private.instrument_fields(w->'identity',identity_spec);
 if jsonb_typeof(w->'components')<>'array' or jsonb_typeof(w->'build')<>'array' then raise exception 'Invalid instrument records' using errcode='22023';end if;
 if jsonb_array_length(w->'components')>100 or jsonb_array_length(w->'build')>50 then raise exception 'Too many instrument records' using errcode='22023';end if;
 for c in select value from jsonb_array_elements(w->'components') loop
  if jsonb_typeof(c)<>'object' or not c ?& array['id','kind','status','circuit_id','fields'] or (select count(*) from jsonb_object_keys(c))<>5 or coalesce(c->>'id','')!~* '^[a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}$' or lower(c->>'id')=any(ids) or not component_specs ? coalesce(c->>'kind','') or coalesce(c->>'status','') not in ('installed','planned','removed','unknown') then raise exception 'Invalid physical component identity' using errcode='22023';end if;
  ids:=array_append(ids,lower(c->>'id'));perform forge_private.instrument_fields(c->'fields',component_specs->(c->>'kind'));
  if c->'circuit_id'<>'null'::jsonb then
   if jsonb_typeof(c->'circuit_id')<>'string' or char_length(c->>'circuit_id')>80 or c->>'circuit_id'=any(mapped) or not exists(select 1 from jsonb_array_elements(s->'technical'->'components') x where x->>'id'=c->>'circuit_id') then raise exception 'Stale or invalid circuit mapping' using errcode='22023';end if;
   if c->>'kind'<>'other' and not exists(select 1 from jsonb_array_elements(s->'technical'->'components') x where x->>'id'=c->>'circuit_id' and circuit_types->(c->>'kind') @> jsonb_build_array(x->'type')) then raise exception 'Physical kind does not match circuit representation' using errcode='22023';end if;
   mapped:=array_append(mapped,c->>'circuit_id');
  end if;
 end loop;
 for c in select value from jsonb_array_elements(w->'components') loop
  foreach kind in array array['capacitor','resistor'] loop
   ref:=c->'fields'->>(kind||'_id');
   if ref is not null and not exists(select 1 from jsonb_array_elements(w->'components') x where lower(x->>'id')=lower(ref) and x->>'kind'=kind) then raise exception 'Unavailable associated physical instance' using errcode='22023';end if;
  end loop;
  if c->>'kind'='treble_bleed' and ((c->'fields'->>'topology'='capacitor_only' and c->'fields'->>'resistor_id' is not null) or (c->'fields'->>'topology'='other' and coalesce(btrim(c->'fields'->>'notes'),'')='')) then raise exception 'Invalid treble bleed description' using errcode='22023';end if;
 end loop;
 for b in select value from jsonb_array_elements(w->'build') loop
  if jsonb_typeof(b)<>'object' or not b ?& array['id','fields'] or (select count(*) from jsonb_object_keys(b))<>2 or coalesce(b->>'id','')!~* '^[a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}$' or lower(b->>'id')=any(ids) then raise exception 'Invalid build record identity' using errcode='22023';end if;
  ids:=array_append(ids,lower(b->>'id'));perform forge_private.instrument_fields(b->'fields',build_spec);
 end loop;
end $$;
revoke all on function forge_private.validate_instrument(jsonb,jsonb) from public,anon,authenticated,service_role;
create function forge_private.instrument_command(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();request_uuid uuid;cached forge_private.instrument_requests%rowtype;result jsonb;core jsonb;
begin
 if not forge_private.has_capability('forge.projects.cloud') then raise exception 'Confirmed owner capability required' using errcode='42501';end if;
 if p_action not in ('create','save') or p_action is null or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>240000 or not p_data ?& array['request_id','workspace','snapshot'] then raise exception 'Invalid instrument request' using errcode='22023';end if;
 request_uuid:=(p_data->>'request_id')::uuid;if request_uuid is null then raise exception 'Request identity required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||':instrument:'||request_uuid::text,0));
 select * into cached from forge_private.instrument_requests where owner_id=actor and request_id=request_uuid;
 if found then
  if cached.action<>p_action or cached.request<>p_data then raise exception 'Request identity already used for different content' using errcode='22023';end if;
  return cached.result;
 end if;
 perform forge_private.validate_snapshot(p_data->'snapshot');
 perform forge_private.validate_instrument(p_data->'workspace',p_data->'snapshot');
 core:=p_data-'workspace'-'request_id';
 result:=forge_private.command(p_action,core);
 if exists(select 1 from public.forge_instrument_versions where revision_id=(result->>'current_revision_id')::uuid) then raise exception 'This import already has documentation; open the existing project' using errcode='22023';end if;
 -- A repeated legacy local import must not attach new documentation to an existing historic revision.
 if p_action='create' and (result->>'created_at')::timestamptz<transaction_timestamp() then raise exception 'This local import already exists; open its project' using errcode='22023';end if;
 insert into public.forge_instrument_versions(revision_id,project_id,workspace) values((result->>'current_revision_id')::uuid,(result->>'id')::uuid,p_data->'workspace');
 insert into forge_private.instrument_requests(owner_id,request_id,action,request,result) values(actor,request_uuid,p_action,p_data,result);
 return result;
end $$;
revoke all on function forge_private.instrument_command(text,jsonb) from public,anon,service_role;
grant execute on function forge_private.instrument_command(text,jsonb) to authenticated;
create function public.forge_instrument_command(p_action text,p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$select forge_private.instrument_command(p_action,p_data)$$;
revoke all on function public.forge_instrument_command(text,jsonb) from public,anon,service_role;
grant execute on function public.forge_instrument_command(text,jsonb) to authenticated;
comment on table public.forge_instrument_versions is 'Owner-only physical documentation tied to exact existing Forge revision UUID; no electrical simulation or public passport.';
commit;

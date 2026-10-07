-- Additive private Forge instrument/build domain. No grants or user data are seeded.
create schema forge_private;
revoke all on schema forge_private from public,anon;
grant usage on schema forge_private to authenticated;
create table public.forge_capability_grants (
 owner_id uuid not null references auth.users(id) on delete cascade,
 capability text not null check(capability in ('forge.projects.cloud','forge.projects.history','forge.projects.compare','forge.templates.personal','forge.measurements','forge.documents.professional','forge.workshop.metadata')),
 source text not null check(char_length(source) between 1 and 100),
 expires_at timestamptz,created_at timestamptz not null default now(),primary key(owner_id,capability)
);
create table public.forge_projects (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 120),notes text not null default '' check(char_length(notes)<=8000),
 instrument jsonb not null default '{}'::jsonb check(jsonb_typeof(instrument)='object'),
 lifecycle text not null default 'ACTIVE' check(lifecycle in ('ACTIVE','ARCHIVED')),
 version integer not null default 1 check(version>0),current_revision_id uuid,
 source_kind text not null default 'NEW' check(source_kind in ('NEW','LOCAL_IMPORT','DUPLICATE','TEMPLATE')),
 source_id text check(char_length(source_id)<=100),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),last_opened_at timestamptz,
 unique(id,owner_id)
);
create unique index forge_import_once on public.forge_projects(owner_id,source_id) where source_kind='LOCAL_IMPORT';
create index forge_owner_updated on public.forge_projects(owner_id,updated_at desc);
create table public.forge_revisions (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.forge_projects(id) on delete cascade,
 sequence integer not null check(sequence>0),name text not null check(char_length(name) between 1 and 120),note text not null default '' check(char_length(note)<=4000),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and (snapshot->>'schema')='1' and octet_length(snapshot::text)<=100000),
 restored_from uuid references public.forge_revisions(id),created_at timestamptz not null default now(),
 unique(project_id,sequence),unique(id,project_id)
);
alter table public.forge_projects add constraint forge_current_revision foreign key(current_revision_id,id) references public.forge_revisions(id,project_id) deferrable initially deferred;
create table public.forge_templates (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 120),description text not null default '' check(char_length(description)<=4000),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and snapshot->>'schema'='1'),
 source_revision_id uuid references public.forge_revisions(id) on delete set null,created_at timestamptz not null default now()
);
create index forge_template_owner on public.forge_templates(owner_id,created_at desc);
create table public.forge_measurements (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.forge_projects(id) on delete cascade,
 revision_id uuid not null,
 type text not null check(type in ('resistance','capacitance','pickupDCR','pickupInductance')),
 unit text not null,value numeric not null check(value>0 and value<=1e12),nominal numeric check(nominal>0 and nominal<=1e12),
 component_id text check(char_length(component_id)<=80),observed_at timestamptz not null,
 notes text not null default '' check(char_length(notes)<=2000),provenance text not null default 'MANUAL' check(provenance='MANUAL'),created_at timestamptz not null default now(),
 foreign key(revision_id,project_id) references public.forge_revisions(id,project_id),
 check((type='resistance' and unit in ('ohm','kohm','Mohm')) or (type='pickupDCR' and unit in ('ohm','kohm')) or (type='capacitance' and unit in ('pF','nF','uF')) or (type='pickupInductance' and unit in ('H','mH')))
);
create index forge_measurement_project on public.forge_measurements(project_id,observed_at desc);
create table public.forge_documents (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.forge_projects(id) on delete cascade,
 revision_id uuid not null,kind text not null check(kind='TECHNICAL_BUILD_SHEET'),payload jsonb not null check(payload->>'schema'='1'),created_at timestamptz not null default now(),
 foreign key(revision_id,project_id) references public.forge_revisions(id,project_id)
);
create index forge_document_project on public.forge_documents(project_id,created_at desc);
create function forge_private.has_capability(p_capability text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)) and exists(select 1 from public.forge_capability_grants g where g.owner_id=auth.uid() and g.capability=p_capability and (g.expires_at is null or g.expires_at>statement_timestamp()));
$$;
revoke all on function forge_private.has_capability(text) from public,anon;
grant execute on function forge_private.has_capability(text) to authenticated;
alter table public.forge_capability_grants enable row level security;
alter table public.forge_projects enable row level security;
alter table public.forge_revisions enable row level security;
alter table public.forge_templates enable row level security;
alter table public.forge_measurements enable row level security;
alter table public.forge_documents enable row level security;
create policy forge_grants_owner on public.forge_capability_grants for select to authenticated using(owner_id=(select auth.uid()));
create policy forge_projects_owner on public.forge_projects for select to authenticated using(owner_id=(select auth.uid()) and (select forge_private.has_capability('forge.projects.cloud')));
create policy forge_revisions_owner on public.forge_revisions for select to authenticated using(exists(select 1 from public.forge_projects p where p.id=project_id and p.owner_id=(select auth.uid()) and (p.current_revision_id=forge_revisions.id or (select forge_private.has_capability('forge.projects.history')))));
create policy forge_templates_owner on public.forge_templates for select to authenticated using(owner_id=(select auth.uid()) and (select forge_private.has_capability('forge.projects.cloud')) and (select forge_private.has_capability('forge.templates.personal')));
create policy forge_measurements_owner on public.forge_measurements for select to authenticated using((select forge_private.has_capability('forge.measurements')) and exists(select 1 from public.forge_projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy forge_documents_owner on public.forge_documents for select to authenticated using((select forge_private.has_capability('forge.documents.professional')) and exists(select 1 from public.forge_projects p where p.id=project_id and p.owner_id=(select auth.uid())));
revoke all on public.forge_capability_grants,public.forge_projects,public.forge_revisions,public.forge_templates,public.forge_measurements,public.forge_documents from public,anon,authenticated;
grant select on public.forge_capability_grants,public.forge_projects,public.forge_revisions,public.forge_templates,public.forge_measurements,public.forge_documents to authenticated;
-- No public/client grant operation exists. Trusted provisioning is a separately authorised operation.
create function public.forge_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(g.capability order by g.capability),'[]'::jsonb) from public.forge_capability_grants g where forge_private.has_capability(g.capability);
$$;
create function forge_private.validate_snapshot(s jsonb) returns void language plpgsql set search_path='' as $$
declare m jsonb;i jsonb;k text;
begin
 if s is null or jsonb_typeof(s)<>'object' or s->>'schema'<>'1' or octet_length(s::text)>100000 or (select count(*) from jsonb_object_keys(s))<>5 or not s ?& array['schema','engine','metadata','electronics','technical'] or coalesce(jsonb_typeof(s->'engine'),'null')<>'string' or char_length(s->>'engine') not between 1 and 100 then raise exception 'Invalid snapshot envelope' using errcode='22023';end if;
 m:=s->'metadata';i:=m->'instrument';
 if jsonb_typeof(m)<>'object' or jsonb_typeof(i)<>'object' or (select count(*) from jsonb_object_keys(m))<>3 or not m ?& array['title','notes','instrument'] or jsonb_typeof(m->'title')<>'string' or char_length(m->>'title') not between 1 and 120 or jsonb_typeof(m->'notes')<>'string' or char_length(m->>'notes')>8000 then raise exception 'Invalid project metadata' using errcode='22023';end if;
 for k in select jsonb_object_keys(i) loop
  if k not in ('manufacturer','model','year','serial','type','configuration','notes','reference') or (k='year' and (jsonb_typeof(i->k)<>'number' or (i->>k)::numeric not between 1800 and 2200 or (i->>k)::numeric<>trunc((i->>k)::numeric))) or (k<>'year' and (jsonb_typeof(i->k)<>'string' or char_length(i->>k)>case when k='notes' then 4000 else 200 end)) then raise exception 'Invalid instrument field' using errcode='22023';end if;
 end loop;
 if coalesce(jsonb_typeof(s->'electronics'),'null')<>'object' or coalesce(s->'electronics'->>'version','') not in ('1','2') or coalesce(jsonb_typeof(s->'technical'),'null')<>'object' or coalesce(jsonb_typeof(s->'technical'->'components'),'null')<>'array' or jsonb_array_length(s->'technical'->'components')>100 then raise exception 'Invalid technical envelope' using errcode='22023';end if;
 -- Electrical semantics stay in the shared deterministic engine, not a second SQL solver.
end $$;
revoke all on function forge_private.validate_snapshot(jsonb) from public,anon,authenticated;
create function forge_private.command(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();p public.forge_projects%rowtype;r public.forge_revisions%rowtype;t public.forge_templates%rowtype;s jsonb;cap text;new_id uuid;seq integer;result jsonb;
begin
 if not forge_private.has_capability('forge.projects.cloud') then raise exception 'Forge cloud capability required' using errcode='42501';end if;
 if jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>120000 then raise exception 'Invalid request' using errcode='22023';end if;
 cap:=case p_action when 'save' then 'forge.projects.cloud' when 'restore' then 'forge.projects.history' when 'template' then 'forge.templates.personal' when 'instantiate' then 'forge.templates.personal' when 'measurement' then 'forge.measurements' when 'document' then 'forge.documents.professional' when 'create' then 'forge.projects.cloud' when 'duplicate' then 'forge.projects.cloud' when 'archive' then 'forge.projects.cloud' when 'open' then 'forge.projects.cloud' else null end;
 if cap is null then raise exception 'Unsupported action' using errcode='22023';end if;
 if not forge_private.has_capability(cap) then raise exception 'Forge capability required' using errcode='42501';end if;
 if p_action not in ('create','instantiate') then
  select * into p from public.forge_projects where id=(p_data->>'project_id')::uuid and owner_id=actor for update;
  if not found then raise exception 'Project unavailable' using errcode='42501';end if;
  select * into r from public.forge_revisions where id=p.current_revision_id and project_id=p.id;
 end if;
 if p_action in ('save','restore','archive') and (p_data->>'expected_version')::integer is distinct from p.version then raise exception 'Project changed; reload before saving' using errcode='40001';end if;
 if p_action='open' then update public.forge_projects set last_opened_at=now() where id=p.id;return to_jsonb(p);end if;
 if p_action='archive' then update public.forge_projects set lifecycle='ARCHIVED',version=version+1,updated_at=now() where id=p.id returning * into p;return to_jsonb(p);end if;
 if p_action in ('save','restore','measurement','template') and p.lifecycle<>'ACTIVE' then raise exception 'Archived project is read-only; duplicate to continue' using errcode='22023';end if;
 if p_action='restore' then
  select * into r from public.forge_revisions where id=(p_data->>'revision_id')::uuid and project_id=p.id;
  if not found then raise exception 'Revision unavailable' using errcode='42501';end if;s:=r.snapshot;
 elsif p_action='instantiate' then
  select * into t from public.forge_templates where id=(p_data->>'template_id')::uuid and owner_id=actor;
  if not found then raise exception 'Template unavailable' using errcode='42501';end if;s:=jsonb_set(jsonb_set(t.snapshot,'{metadata,instrument,serial}','""'::jsonb),'{metadata,instrument,reference}','""'::jsonb);
 elsif p_action='duplicate' then s:=r.snapshot;
 else s:=p_data->'snapshot';end if;
 if p_action in ('create','save','restore','instantiate','duplicate') then
  perform forge_private.validate_snapshot(s);
  if p_action='create' and p_data->>'source_kind'='LOCAL_IMPORT' then
   if char_length(p_data->>'source_id') not between 1 and 100 then raise exception 'Local import identity required' using errcode='22023';end if;
   perform pg_advisory_xact_lock(hashtextextended(actor::text||':'||(p_data->>'source_id'),0));
   select * into p from public.forge_projects where owner_id=actor and source_kind='LOCAL_IMPORT' and source_id=p_data->>'source_id';if found then return to_jsonb(p);end if;
  end if;
  if p_action in ('create','instantiate','duplicate') then
   insert into public.forge_projects(owner_id,title,notes,instrument,source_kind,source_id) values(actor,s->'metadata'->>'title',s->'metadata'->>'notes',s->'metadata'->'instrument',case p_action when 'instantiate' then 'TEMPLATE' when 'duplicate' then 'DUPLICATE' else case when p_data->>'source_kind'='LOCAL_IMPORT' then 'LOCAL_IMPORT' else 'NEW' end end,case p_action when 'instantiate' then t.id::text when 'duplicate' then p.id::text else p_data->>'source_id' end) returning * into p;seq:=1;
  else seq:=(select max(sequence)+1 from public.forge_revisions where project_id=p.id);end if;
  insert into public.forge_revisions(project_id,sequence,name,note,snapshot,restored_from) values(p.id,seq,coalesce(nullif(p_data->>'name',''),'Initial design'),coalesce(p_data->>'note',''),s,case when p_action='restore' then r.id else null end) returning id into new_id;
  update public.forge_projects set title=s->'metadata'->>'title',notes=s->'metadata'->>'notes',instrument=s->'metadata'->'instrument',current_revision_id=new_id,version=case when seq=1 then version else version+1 end,updated_at=now() where id=p.id returning * into p;return to_jsonb(p);
 elsif p_action='template' then
  insert into public.forge_templates(owner_id,name,description,snapshot,source_revision_id) values(actor,p_data->>'name',coalesce(p_data->>'description',''),r.snapshot,r.id) returning to_jsonb(forge_templates.*) into result;return result;
 elsif p_action='measurement' then
  if p_data->>'component_id' is not null and not exists(select 1 from jsonb_array_elements(r.snapshot->'technical'->'components') c where c->>'id'=p_data->>'component_id') then raise exception 'Unknown component association' using errcode='22023';end if;
  insert into public.forge_measurements(project_id,revision_id,type,unit,value,nominal,component_id,observed_at,notes) values(p.id,r.id,p_data->>'type',p_data->>'unit',(p_data->>'value')::numeric,nullif(p_data->>'nominal','')::numeric,p_data->>'component_id',(p_data->>'observed_at')::timestamptz,coalesce(p_data->>'notes','')) returning to_jsonb(forge_measurements.*) into result;return result;
 elsif p_action='document' then
  select * into r from public.forge_revisions where id=(p_data->>'revision_id')::uuid and project_id=p.id;
  if not found then raise exception 'Revision unavailable' using errcode='42501';end if;
  insert into public.forge_documents(project_id,revision_id,kind,payload) values(p.id,r.id,'TECHNICAL_BUILD_SHEET',jsonb_build_object('schema',1,'snapshot',r.snapshot,'revision',jsonb_build_object('id',r.id,'sequence',r.sequence,'name',r.name),'measurements',coalesce((select jsonb_agg(to_jsonb(m) order by m.observed_at,m.id) from public.forge_measurements m where m.project_id=p.id and m.revision_id=r.id),'[]'::jsonb))) returning to_jsonb(forge_documents.*) into result;return result;
 end if;
 raise exception 'Unsupported action' using errcode='22023';
end $$;
revoke all on function forge_private.command(text,jsonb) from public,anon;
grant execute on function forge_private.command(text,jsonb) to authenticated;
create function public.forge_command(p_action text,p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$select forge_private.command(p_action,p_data)$$;
revoke all on function public.forge_capabilities(),public.forge_command(text,jsonb) from public,anon;
grant execute on function public.forge_capabilities(),public.forge_command(text,jsonb) to authenticated;
comment on table public.forge_projects is 'Private instrument/build aggregate; electronics belongs to immutable revisions. No public sharing or CRM.';
comment on table public.forge_capability_grants is 'Trusted, provider-independent capabilities. No client writes, default grants or billing state.';

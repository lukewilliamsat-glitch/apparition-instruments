-- Revised safety review: no DROP, no function replacement; mismatches abort.
-- Additive content-only template management. No customer/order backfill or send.
create table if not exists public.email_template_versions(
 id uuid primary key default gen_random_uuid(),template_key text not null check(template_key in ('dispatched:WEBSITE','dispatched:EBAY','aftercare:WEBSITE','aftercare:EBAY')),
 version integer not null check(version>0),content jsonb not null,previous_version uuid references public.email_template_versions(id),published_at timestamptz not null default clock_timestamp(),published_by uuid references auth.users(id),unique(template_key,version));
create table if not exists public.email_templates(
 template_key text primary key check(template_key in ('dispatched:WEBSITE','dispatched:EBAY','aftercare:WEBSITE','aftercare:EBAY')),
 current_version uuid references public.email_template_versions(id),draft jsonb,revision bigint not null default 0,updated_at timestamptz not null default clock_timestamp(),updated_by uuid references auth.users(id));
create table if not exists public.email_template_audit(id uuid primary key default gen_random_uuid(),template_key text not null references public.email_templates(template_key),action text not null,actor uuid references auth.users(id),at timestamptz not null default clock_timestamp(),before_state jsonb,after_state jsonb);
create table if not exists public.email_template_uses(delivery_id uuid primary key references public.order_email_deliveries(id),version_id uuid not null references public.email_template_versions(id),at timestamptz not null default clock_timestamp());
alter table public.email_templates enable row level security;
alter table public.email_template_versions enable row level security;
alter table public.email_template_audit enable row level security;
alter table public.email_template_uses enable row level security;
revoke all on public.email_templates,public.email_template_versions,public.email_template_audit,public.email_template_uses from anon,authenticated;
grant select on public.email_templates,public.email_template_versions,public.email_template_audit to authenticated;
grant select on public.email_templates,public.email_template_versions,public.email_template_audit,public.email_template_uses to service_role;
DO $$declare t text;begin foreach t in array array['email_templates','email_template_versions','email_template_audit'] loop
 if not exists(select 1 from pg_policy where polrelid=to_regclass('public.'||t) and polname='email_template_admin_read') then
  execute format('create policy email_template_admin_read on public.%I for select to authenticated using(exists(select 1 from public.admin_members where user_id=auth.uid()))',t);
 elsif not exists(select 1 from pg_policy where polrelid=to_regclass('public.'||t) and polname='email_template_admin_read' and polcmd='r' and polpermissive and polroles=array[(select oid from pg_roles where rolname='authenticated')] and regexp_replace(pg_get_expr(polqual,polrelid),'\s+','','g')='(EXISTS(SELECT1FROMadmin_membersWHERE(admin_members.user_id=auth.uid())))' and polwithcheck is null) then
  raise exception 'Unexpected Studio policy on %; explicit review required',t using errcode='55000';
 end if;
 end loop;end$$;
-- Create only when absent. Identical definitions survive retries; conflicts fail closed.
DO $studio_function_guard$declare existing oid:=to_regprocedure('public.email_template_immutable()');begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='email_template_immutable' and (existing is null or p.oid<>existing)) then raise exception 'Unexpected overload of email_template_immutable; explicit review required' using errcode='55000';end if;
 if existing is null then
  execute $studio_definition$create function public.email_template_immutable() returns trigger language plpgsql set search_path='' as $$begin raise exception 'Published versions and audits are immutable' using errcode='42501';end$$;$studio_definition$;
 elsif not exists(select 1 from pg_proc p join pg_language l on l.oid=p.prolang where p.oid=existing and p.prosrc='begin raise exception ''Published versions and audits are immutable'' using errcode=''42501'';end' and l.lanname='plpgsql' and p.prorettype='trigger'::regtype and not p.proretset and p.prokind='f' and p.provolatile='v' and p.prosecdef=false and p.proconfig=array['search_path=""'] and p.proargnames is not distinct from null::text[] and p.proargmodes is null and p.proargdefaults is null) then
  raise exception 'Unexpected definition of email_template_immutable; explicit review required' using errcode='55000';
 end if;
end$studio_function_guard$;
DO $studio_trigger_guard$begin
 if not exists(select 1 from pg_trigger where tgrelid='public.email_template_versions'::regclass and tgname='immutable_version' and not tgisinternal) then
  create trigger immutable_version before update or delete on public.email_template_versions for each row execute function public.email_template_immutable();
 elsif not exists(select 1 from pg_trigger where tgrelid='public.email_template_versions'::regclass and tgname='immutable_version' and not tgisinternal and tgfoid='public.email_template_immutable()'::regprocedure and tgtype=27 and tgenabled='O' and tgnargs=0 and tgqual is null and tgattr=''::int2vector) then
  raise exception 'Unexpected Studio trigger immutable_version; explicit review required' using errcode='55000';
 end if;
end$studio_trigger_guard$;
DO $studio_trigger_guard$begin
 if not exists(select 1 from pg_trigger where tgrelid='public.email_template_audit'::regclass and tgname='immutable_audit' and not tgisinternal) then
  create trigger immutable_audit before update or delete on public.email_template_audit for each row execute function public.email_template_immutable();
 elsif not exists(select 1 from pg_trigger where tgrelid='public.email_template_audit'::regclass and tgname='immutable_audit' and not tgisinternal and tgfoid='public.email_template_immutable()'::regprocedure and tgtype=27 and tgenabled='O' and tgnargs=0 and tgqual is null and tgattr=''::int2vector) then
  raise exception 'Unexpected Studio trigger immutable_audit; explicit review required' using errcode='55000';
 end if;
end$studio_trigger_guard$;
revoke all on function public.email_template_immutable() from public,anon,authenticated;
-- Create only when absent. Identical definitions survive retries; conflicts fail closed.
DO $studio_function_guard$declare existing oid:=to_regprocedure('public.validate_email_template(text,jsonb)');begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='validate_email_template' and (existing is null or p.oid<>existing)) then raise exception 'Unexpected overload of validate_email_template; explicit review required' using errcode='55000';end if;
 if existing is null then
  execute $studio_definition$create function public.validate_email_template(p_key text,p_content jsonb) returns boolean language plpgsql set search_path='' as $$
declare field text; value text; alltext text; stripped text; placeholder text;maxlen int;
begin
 if p_key is null or p_key not in ('dispatched:WEBSITE','dispatched:EBAY','aftercare:WEBSITE','aftercare:EBAY') or jsonb_typeof(p_content) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_content))<>3 or not p_content ?& array['subject','heading','body'] then raise exception 'Subject, heading and body required' using errcode='22023';end if;
 foreach field in array array['subject','heading','body'] loop
  value:=p_content->>field;maxlen:=case field when 'subject' then 200 when 'heading' then 120 else 6000 end;
  if jsonb_typeof(p_content->field) is distinct from 'string' or length(btrim(value))=0 or length(value)>maxlen or value~'[<>]' or value~'[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]' or (field<>'body' and value~E'[\r\n]') then raise exception 'Invalid %: plain text only; maximum % characters',field,maxlen using errcode='22023';end if;
  for placeholder in select (regexp_matches(value,'\{\{([a-z_]+)\}\}','g'))[1] loop
   if placeholder not in ('first_name','order_number') and not (p_key like 'dispatched:%' and placeholder in ('shipping_service','tracking_reference')) then raise exception 'Unknown placeholder: %',placeholder using errcode='22023';end if;
  end loop;
  stripped:=regexp_replace(value,'\{\{([a-z_]+)\}\}','','g');if field<>'body' and length(btrim(stripped))=0 then raise exception 'Subject and heading need readable text beyond placeholders' using errcode='22023';end if;
  if stripped~'[{}]' then raise exception 'Malformed placeholder' using errcode='22023';end if;
 end loop;
 if position('{{first_name}}' in p_content->>'body')=0 or (p_key like 'dispatched:%' and position('{{order_number}}' in p_content->>'subject')=0) then raise exception 'Preserve first-name greeting and dispatch order-number subject' using errcode='22023';end if;
 if cardinality(regexp_split_to_array(p_content->>'body',E'\n\\s*\n'))<3 then raise exception 'Use separate greeting, message and support paragraphs' using errcode='22023';end if;
 alltext:=(p_content->>'subject')||' '||(p_content->>'heading')||' '||(p_content->>'body');
 if alltext~*'https?:|www\.|[[:alnum:]_-]+\.(com|co\.uk|net|org)\M|\S+@\S+|javascript:|data:' then raise exception 'Links and addresses belong to protected service sections' using errcode='22023';end if;
 if p_key like '%:EBAY' and ((p_content->>'body')!~*'eBay order messages' or alltext~*'off[ -]platform|buy direct|purchase direct|discount|coupon|promo(tion|tional)?|review|feedback|rating|incentive') then raise exception 'eBay wording must use order messages without promotional invitations' using errcode='22023';end if;
 return true;
end$$;$studio_definition$;
 elsif not exists(select 1 from pg_proc p join pg_language l on l.oid=p.prolang where p.oid=existing and p.prosrc='
declare field text; value text; alltext text; stripped text; placeholder text;maxlen int;
begin
 if p_key is null or p_key not in (''dispatched:WEBSITE'',''dispatched:EBAY'',''aftercare:WEBSITE'',''aftercare:EBAY'') or jsonb_typeof(p_content) is distinct from ''object'' or (select count(*) from jsonb_object_keys(p_content))<>3 or not p_content ?& array[''subject'',''heading'',''body''] then raise exception ''Subject, heading and body required'' using errcode=''22023'';end if;
 foreach field in array array[''subject'',''heading'',''body''] loop
  value:=p_content->>field;maxlen:=case field when ''subject'' then 200 when ''heading'' then 120 else 6000 end;
  if jsonb_typeof(p_content->field) is distinct from ''string'' or length(btrim(value))=0 or length(value)>maxlen or value~''[<>]'' or value~''[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]'' or (field<>''body'' and value~E''[\r\n]'') then raise exception ''Invalid %: plain text only; maximum % characters'',field,maxlen using errcode=''22023'';end if;
  for placeholder in select (regexp_matches(value,''\{\{([a-z_]+)\}\}'',''g''))[1] loop
   if placeholder not in (''first_name'',''order_number'') and not (p_key like ''dispatched:%'' and placeholder in (''shipping_service'',''tracking_reference'')) then raise exception ''Unknown placeholder: %'',placeholder using errcode=''22023'';end if;
  end loop;
  stripped:=regexp_replace(value,''\{\{([a-z_]+)\}\}'','''',''g'');if field<>''body'' and length(btrim(stripped))=0 then raise exception ''Subject and heading need readable text beyond placeholders'' using errcode=''22023'';end if;
  if stripped~''[{}]'' then raise exception ''Malformed placeholder'' using errcode=''22023'';end if;
 end loop;
 if position(''{{first_name}}'' in p_content->>''body'')=0 or (p_key like ''dispatched:%'' and position(''{{order_number}}'' in p_content->>''subject'')=0) then raise exception ''Preserve first-name greeting and dispatch order-number subject'' using errcode=''22023'';end if;
 if cardinality(regexp_split_to_array(p_content->>''body'',E''\n\\s*\n''))<3 then raise exception ''Use separate greeting, message and support paragraphs'' using errcode=''22023'';end if;
 alltext:=(p_content->>''subject'')||'' ''||(p_content->>''heading'')||'' ''||(p_content->>''body'');
 if alltext~*''https?:|www\.|[[:alnum:]_-]+\.(com|co\.uk|net|org)\M|\S+@\S+|javascript:|data:'' then raise exception ''Links and addresses belong to protected service sections'' using errcode=''22023'';end if;
 if p_key like ''%:EBAY'' and ((p_content->>''body'')!~*''eBay order messages'' or alltext~*''off[ -]platform|buy direct|purchase direct|discount|coupon|promo(tion|tional)?|review|feedback|rating|incentive'') then raise exception ''eBay wording must use order messages without promotional invitations'' using errcode=''22023'';end if;
 return true;
end' and l.lanname='plpgsql' and p.prorettype='boolean'::regtype and not p.proretset and p.prokind='f' and p.provolatile='v' and p.prosecdef=false and p.proconfig=array['search_path=""'] and p.proargnames is not distinct from array['p_key','p_content']::text[] and p.proargmodes is null and p.proargdefaults is null) then
  raise exception 'Unexpected definition of validate_email_template; explicit review required' using errcode='55000';
 end if;
end$studio_function_guard$;
revoke all on function public.validate_email_template(text,jsonb) from public,anon,authenticated;
grant execute on function public.validate_email_template(text,jsonb) to service_role;
-- Create only when absent. Identical definitions survive retries; conflicts fail closed.
DO $studio_function_guard$declare existing oid:=to_regprocedure('public.get_admin_email_templates()');begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_admin_email_templates' and (existing is null or p.oid<>existing)) then raise exception 'Unexpected overload of get_admin_email_templates; explicit review required' using errcode='55000';end if;
 if existing is null then
  execute $studio_definition$create function public.get_admin_email_templates() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin membership required' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('published',to_jsonb(v),'history',(select coalesce(jsonb_agg(to_jsonb(h) order by h.version desc),'[]'::jsonb) from public.email_template_versions h where h.template_key=t.template_key)) order by t.template_key),'[]'::jsonb) from public.email_templates t join public.email_template_versions v on v.id=t.current_version);
end$$;$studio_definition$;
 elsif not exists(select 1 from pg_proc p join pg_language l on l.oid=p.prolang where p.oid=existing and p.prosrc='begin
 if auth.uid() is null or not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception ''Admin membership required'' using errcode=''42501'';end if;
 return (select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object(''published'',to_jsonb(v),''history'',(select coalesce(jsonb_agg(to_jsonb(h) order by h.version desc),''[]''::jsonb) from public.email_template_versions h where h.template_key=t.template_key)) order by t.template_key),''[]''::jsonb) from public.email_templates t join public.email_template_versions v on v.id=t.current_version);
end' and l.lanname='plpgsql' and p.prorettype='jsonb'::regtype and not p.proretset and p.prokind='f' and p.provolatile='v' and p.prosecdef=true and p.proconfig=array['search_path=""'] and p.proargnames is not distinct from null::text[] and p.proargmodes is null and p.proargdefaults is null) then
  raise exception 'Unexpected definition of get_admin_email_templates; explicit review required' using errcode='55000';
 end if;
end$studio_function_guard$;
revoke all on function public.get_admin_email_templates() from public,anon,authenticated;
grant execute on function public.get_admin_email_templates() to authenticated;
-- Create only when absent. Identical definitions survive retries; conflicts fail closed.
DO $studio_function_guard$declare existing oid:=to_regprocedure('public.mutate_email_template(text,bigint,text,jsonb,uuid)');begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='mutate_email_template' and (existing is null or p.oid<>existing)) then raise exception 'Unexpected overload of mutate_email_template; explicit review required' using errcode='55000';end if;
 if existing is null then
  execute $studio_definition$create function public.mutate_email_template(p_key text,p_expected_revision bigint,p_action text,p_content jsonb default null,p_version uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.email_templates%rowtype;before_state jsonb;v public.email_template_versions%rowtype;content jsonb;actor uuid:=auth.uid();n int;
begin
 if actor is null or not exists(select 1 from public.admin_members where user_id=actor) then raise exception 'Admin membership required' using errcode='42501';end if;
 select * into t from public.email_templates where template_key=p_key for update;if not found then raise exception 'Template unavailable' using errcode='22023';end if;
 if p_expected_revision is null or t.revision<>p_expected_revision then raise exception 'Template changed; reload before saving' using errcode='40001';end if;
 before_state:=to_jsonb(t);
 if p_action='save' then
  if jsonb_typeof(p_content) is distinct from 'object' or length(p_content::text)>9000 or (select count(*) from jsonb_object_keys(p_content))<>3 or not p_content ?& array['subject','heading','body'] or exists(select 1 from jsonb_each(p_content) where jsonb_typeof(value)<>'string') then raise exception 'Draft requires bounded subject, heading and body text' using errcode='22023';end if;
  t.draft:=p_content;
 elsif p_action='discard' then t.draft:=null;
 elsif p_action='restore' then
  select * into v from public.email_template_versions where id=p_version and template_key=p_key;if not found then raise exception 'Version unavailable for this template' using errcode='22023';end if;t.draft:=v.content;
 elsif p_action='publish' then
  perform public.validate_email_template(p_key,t.draft);
  select coalesce(max(version),0)+1 into n from public.email_template_versions where template_key=p_key;
  insert into public.email_template_versions(template_key,version,content,previous_version,published_by) values(p_key,n,t.draft,t.current_version,actor) returning * into v;
  t.current_version:=v.id;t.draft:=null;
 else raise exception 'Unsupported template action' using errcode='22023';end if;
 update public.email_templates set current_version=t.current_version,draft=t.draft,revision=revision+1,updated_at=clock_timestamp(),updated_by=actor where template_key=p_key returning * into t;
 insert into public.email_template_audit(template_key,action,actor,before_state,after_state) values(p_key,p_action,actor,before_state,to_jsonb(t));
 return to_jsonb(t);
end$$;$studio_definition$;
 elsif not exists(select 1 from pg_proc p join pg_language l on l.oid=p.prolang where p.oid=existing and p.prosrc='
declare t public.email_templates%rowtype;before_state jsonb;v public.email_template_versions%rowtype;content jsonb;actor uuid:=auth.uid();n int;
begin
 if actor is null or not exists(select 1 from public.admin_members where user_id=actor) then raise exception ''Admin membership required'' using errcode=''42501'';end if;
 select * into t from public.email_templates where template_key=p_key for update;if not found then raise exception ''Template unavailable'' using errcode=''22023'';end if;
 if p_expected_revision is null or t.revision<>p_expected_revision then raise exception ''Template changed; reload before saving'' using errcode=''40001'';end if;
 before_state:=to_jsonb(t);
 if p_action=''save'' then
  if jsonb_typeof(p_content) is distinct from ''object'' or length(p_content::text)>9000 or (select count(*) from jsonb_object_keys(p_content))<>3 or not p_content ?& array[''subject'',''heading'',''body''] or exists(select 1 from jsonb_each(p_content) where jsonb_typeof(value)<>''string'') then raise exception ''Draft requires bounded subject, heading and body text'' using errcode=''22023'';end if;
  t.draft:=p_content;
 elsif p_action=''discard'' then t.draft:=null;
 elsif p_action=''restore'' then
  select * into v from public.email_template_versions where id=p_version and template_key=p_key;if not found then raise exception ''Version unavailable for this template'' using errcode=''22023'';end if;t.draft:=v.content;
 elsif p_action=''publish'' then
  perform public.validate_email_template(p_key,t.draft);
  select coalesce(max(version),0)+1 into n from public.email_template_versions where template_key=p_key;
  insert into public.email_template_versions(template_key,version,content,previous_version,published_by) values(p_key,n,t.draft,t.current_version,actor) returning * into v;
  t.current_version:=v.id;t.draft:=null;
 else raise exception ''Unsupported template action'' using errcode=''22023'';end if;
 update public.email_templates set current_version=t.current_version,draft=t.draft,revision=revision+1,updated_at=clock_timestamp(),updated_by=actor where template_key=p_key returning * into t;
 insert into public.email_template_audit(template_key,action,actor,before_state,after_state) values(p_key,p_action,actor,before_state,to_jsonb(t));
 return to_jsonb(t);
end' and l.lanname='plpgsql' and p.prorettype='jsonb'::regtype and not p.proretset and p.prokind='f' and p.provolatile='v' and p.prosecdef=true and p.proconfig=array['search_path=""'] and p.proargnames is not distinct from array['p_key','p_expected_revision','p_action','p_content','p_version']::text[] and p.proargmodes is null and pg_get_expr(p.proargdefaults,0)='NULL::jsonb, NULL::uuid') then
  raise exception 'Unexpected definition of mutate_email_template; explicit review required' using errcode='55000';
 end if;
end$studio_function_guard$;
revoke all on function public.mutate_email_template(text,bigint,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.mutate_email_template(text,bigint,text,jsonb,uuid) to authenticated;
-- Create only when absent. Identical definitions survive retries; conflicts fail closed.
DO $studio_function_guard$declare existing oid:=to_regprocedure('public.get_published_email_template(text)');begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_published_email_template' and (existing is null or p.oid<>existing)) then raise exception 'Unexpected overload of get_published_email_template; explicit review required' using errcode='55000';end if;
 if existing is null then
  execute $studio_definition$create function public.get_published_email_template(p_key text) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('key',t.template_key,'id',v.id,'version',v.version,'content',v.content) from public.email_templates t join public.email_template_versions v on v.id=t.current_version where t.template_key=p_key
$$;$studio_definition$;
 elsif not exists(select 1 from pg_proc p join pg_language l on l.oid=p.prolang where p.oid=existing and p.prosrc='
 select jsonb_build_object(''key'',t.template_key,''id'',v.id,''version'',v.version,''content'',v.content) from public.email_templates t join public.email_template_versions v on v.id=t.current_version where t.template_key=p_key
' and l.lanname='sql' and p.prorettype='jsonb'::regtype and not p.proretset and p.prokind='f' and p.provolatile='v' and p.prosecdef=true and p.proconfig=array['search_path=""'] and p.proargnames is not distinct from array['p_key']::text[] and p.proargmodes is null and p.proargdefaults is null) then
  raise exception 'Unexpected definition of get_published_email_template; explicit review required' using errcode='55000';
 end if;
end$studio_function_guard$;
revoke all on function public.get_published_email_template(text) from public,anon,authenticated;
grant execute on function public.get_published_email_template(text) to service_role;
-- Publication and claim serialize on the same template row, closing the read/claim race.
-- Create only when absent. Identical definitions survive retries; conflicts fail closed.
DO $studio_function_guard$declare existing oid:=to_regprocedure('public.claim_email_template_preview(text,uuid,text,uuid,uuid,jsonb,uuid,boolean,text)');begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='claim_email_template_preview' and (existing is null or p.oid<>existing)) then raise exception 'Unexpected overload of claim_email_template_preview; explicit review required' using errcode='55000';end if;
 if existing is null then
  execute $studio_definition$create function public.claim_email_template_preview(p_key text,p_version uuid,p_kind text,p_order_id uuid,p_actor uuid,p_context jsonb,p_operation_id uuid,p_resend boolean,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.email_templates%rowtype;c jsonb;channel text;
begin
 if p_kind not in ('dispatched','aftercare') or p_context is null then raise exception 'Prepared template required' using errcode='22023';end if;
 channel:=case when p_context#>>'{order,sales_channel}'='EBAY' then 'EBAY' else 'WEBSITE' end;
 if p_key is distinct from p_kind||':'||channel then raise exception 'Template channel mismatch' using errcode='40001';end if;
 select * into t from public.email_templates where template_key=p_key for share;
 if not found or p_version is distinct from t.current_version then raise exception 'Template changed; preview again' using errcode='40001';end if;
 if p_kind='aftercare' then
  if p_resend then raise exception 'Aftercare has no repeat send' using errcode='22023';end if;
  c:=public.confirm_aftercare_preview(p_order_id,p_actor,p_context,p_operation_id,'aftercare-support-v1/prepared-v1');
 else c:=public.confirm_dispatch_preview(p_order_id,p_actor,p_resend,p_context,p_operation_id,p_reason);end if;
 insert into public.email_template_uses(delivery_id,version_id) values((c->>'deliveryId')::uuid,p_version);
 return c;
end$$;$studio_definition$;
 elsif not exists(select 1 from pg_proc p join pg_language l on l.oid=p.prolang where p.oid=existing and p.prosrc='
declare t public.email_templates%rowtype;c jsonb;channel text;
begin
 if p_kind not in (''dispatched'',''aftercare'') or p_context is null then raise exception ''Prepared template required'' using errcode=''22023'';end if;
 channel:=case when p_context#>>''{order,sales_channel}''=''EBAY'' then ''EBAY'' else ''WEBSITE'' end;
 if p_key is distinct from p_kind||'':''||channel then raise exception ''Template channel mismatch'' using errcode=''40001'';end if;
 select * into t from public.email_templates where template_key=p_key for share;
 if not found or p_version is distinct from t.current_version then raise exception ''Template changed; preview again'' using errcode=''40001'';end if;
 if p_kind=''aftercare'' then
  if p_resend then raise exception ''Aftercare has no repeat send'' using errcode=''22023'';end if;
  c:=public.confirm_aftercare_preview(p_order_id,p_actor,p_context,p_operation_id,''aftercare-support-v1/prepared-v1'');
 else c:=public.confirm_dispatch_preview(p_order_id,p_actor,p_resend,p_context,p_operation_id,p_reason);end if;
 insert into public.email_template_uses(delivery_id,version_id) values((c->>''deliveryId'')::uuid,p_version);
 return c;
end' and l.lanname='plpgsql' and p.prorettype='jsonb'::regtype and not p.proretset and p.prokind='f' and p.provolatile='v' and p.prosecdef=true and p.proconfig=array['search_path=""'] and p.proargnames is not distinct from array['p_key','p_version','p_kind','p_order_id','p_actor','p_context','p_operation_id','p_resend','p_reason']::text[] and p.proargmodes is null and p.proargdefaults is null) then
  raise exception 'Unexpected definition of claim_email_template_preview; explicit review required' using errcode='55000';
 end if;
end$studio_function_guard$;
revoke all on function public.claim_email_template_preview(text,uuid,text,uuid,uuid,jsonb,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.claim_email_template_preview(text,uuid,text,uuid,uuid,jsonb,uuid,boolean,text) to service_role;

-- Seed once: retry never overwrites a draft or published version.
insert into public.email_template_versions(template_key,version,content) values('dispatched:WEBSITE',1,'{"subject":"Apparition Instruments order {{order_number}} dispatched","heading":"YOUR ORDER IS ON ITS WAY","body":"Hi {{first_name}},\n\nYour order has been dispatched.\n\nIf you need help with delivery, please contact us."}'::jsonb) on conflict(template_key,version) do nothing;
insert into public.email_templates(template_key,current_version) select 'dispatched:WEBSITE',id from public.email_template_versions where template_key='dispatched:WEBSITE' and version=1 on conflict(template_key) do nothing;
insert into public.email_template_versions(template_key,version,content) values('dispatched:EBAY',1,'{"subject":"Apparition Instruments order {{order_number}} dispatched","heading":"YOUR ORDER IS ON ITS WAY","body":"Hi {{first_name}},\n\nYour order has been dispatched.\n\nFor help with this order, contact Apparition Instruments through your eBay order messages."}'::jsonb) on conflict(template_key,version) do nothing;
insert into public.email_templates(template_key,current_version) select 'dispatched:EBAY',id from public.email_template_versions where template_key='dispatched:EBAY' and version=1 on conflict(template_key) do nothing;
insert into public.email_template_versions(template_key,version,content) values('aftercare:WEBSITE',1,'{"subject":"Checking in after your Apparition Instruments order","heading":"HERE IF YOU NEED US","body":"Hi {{first_name}},\n\nWe just wanted to check in and say thank you for choosing Apparition Instruments!\n\nHopefully your order has arrived safely and you''re getting on well with everything.\n\nAs a small independent UK business, every order genuinely means a lot to us, and we really appreciate your support.\n\nIf you have any questions about your components, need a hand with installation or wiring, or just want some advice on your guitar''s electronics, please don''t hesitate to reply. We''re always happy to help!\n\nThanks again, and we hope everything goes brilliantly with your project!\n\nApparition Instruments"}'::jsonb) on conflict(template_key,version) do nothing;
insert into public.email_templates(template_key,current_version) select 'aftercare:WEBSITE',id from public.email_template_versions where template_key='aftercare:WEBSITE' and version=1 on conflict(template_key) do nothing;
insert into public.email_template_versions(template_key,version,content) values('aftercare:EBAY',1,'{"subject":"Checking in after your Apparition Instruments order","heading":"HERE IF YOU NEED US","body":"Hi {{first_name}},\n\nWe just wanted to check in and say thank you for choosing Apparition Instruments!\n\nHopefully your order has arrived safely and you''re getting on well with everything.\n\nAs a small independent UK business, every order genuinely means a lot to us, and we really appreciate your support.\n\nIf you have any questions about your components, need a hand with installation or wiring, or just want some advice on your guitar''s electronics, please feel free to get in touch through your eBay order messages. We''re always happy to help!\n\nThanks again, and we hope everything goes brilliantly with your project!\n\nApparition Instruments"}'::jsonb) on conflict(template_key,version) do nothing;
insert into public.email_templates(template_key,current_version) select 'aftercare:EBAY',id from public.email_template_versions where template_key='aftercare:EBAY' and version=1 on conflict(template_key) do nothing;

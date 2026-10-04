-- Operations V1: one effective-time store configuration; private authoring;
-- curated public reads; membership-guarded mutations and a service-only guard.
create table public.site_operations (
 id boolean primary key default true check(id),
 desired_state text not null default 'OPEN' check(desired_state in ('OPEN','ORDERS_PAUSED')),
 customer_title text not null default 'Orders are temporarily paused' check(length(customer_title) between 1 and 160),
 customer_message text not null default 'You can browse and save your basket. Checkout will return when orders reopen.' check(length(customer_message) between 1 and 1000),
 internal_reason text not null default '' check(length(internal_reason)<=2000),
 pause_from timestamptz, resume_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id),
 check((desired_state='OPEN' and pause_from is null and resume_at is null) or (desired_state='ORDERS_PAUSED' and pause_from is not null and (resume_at is null or resume_at>pause_from)))
);
insert into public.site_operations(id) values(true);
create table public.news_posts (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=100),
 title text not null check(length(title) between 1 and 200),
 excerpt text not null check(length(excerpt) between 1 and 600),
 body text not null check(length(body) between 1 and 30000),
 category text not null check(category in ('NEWS','PRODUCT','TOOL_UPDATE','MAINTENANCE','STORE_UPDATE')),
 status text not null default 'DRAFT' check(status in ('DRAFT','SCHEDULED','PUBLISHED','ARCHIVED')),
 publication_at timestamptz, expires_at timestamptz,
 cta_label text, cta_url text,
 announcement boolean not null default false,
 priority integer not null default 0 check(priority between 0 and 100),
 dismissible boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 created_by uuid not null references auth.users(id),updated_by uuid not null references auth.users(id),
 check(status not in ('SCHEDULED','PUBLISHED') or publication_at is not null),
 check(expires_at is null or (publication_at is not null and expires_at>publication_at)),
 check((cta_url is null and cta_label is null) or (length(cta_label) between 1 and 100 and length(cta_url)<=2000 and cta_url !~ '[[:space:]\\]'  and cta_url ~ '^(\/[^\/]|\/$|https:\/\/[^[:space:]@]+$)'))
);
create index news_posts_publication on public.news_posts(publication_at desc) where status in ('SCHEDULED','PUBLISHED');
create table public.site_operations_audit (
 id bigint generated always as identity primary key,
 actor uuid not null references auth.users(id),action text not null,entity_id text not null,
 before_state jsonb,after_state jsonb,created_at timestamptz not null default now()
);
revoke all on sequence public.site_operations_audit_id_seq from public,anon,authenticated,service_role;
alter table public.site_operations enable row level security;
alter table public.news_posts enable row level security;
alter table public.site_operations_audit enable row level security;
revoke all on public.site_operations,public.news_posts,public.site_operations_audit from public,anon,authenticated,service_role;
grant select on public.site_operations,public.news_posts,public.site_operations_audit to authenticated,service_role;
create policy operations_admin_read on public.site_operations for select to authenticated using(exists(select 1 from public.admin_members where user_id=auth.uid()));
create policy news_admin_read on public.news_posts for select to authenticated using(exists(select 1 from public.admin_members where user_id=auth.uid()));
create policy operations_audit_admin_read on public.site_operations_audit for select to authenticated using(exists(select 1 from public.admin_members where user_id=auth.uid()));

-- A small explicit public projection, never internal reason/updater/audit fields.
create function public.public_news() returns table(id uuid,slug text,title text,excerpt text,body text,category text,publication_at timestamptz,expires_at timestamptz,cta_label text,cta_url text,announcement boolean,priority integer,dismissible boolean,updated_at timestamptz)
language sql stable security definer set search_path='' as $$
 select n.id,n.slug,n.title,n.excerpt,n.body,n.category,n.publication_at,n.expires_at,n.cta_label,n.cta_url,n.announcement,n.priority,n.dismissible,n.updated_at
 from public.news_posts n where n.status in ('PUBLISHED','SCHEDULED') and n.publication_at<=statement_timestamp()
 order by n.publication_at desc,n.slug;
$$;
create function public.get_site_operations() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('server_time',statement_timestamp(),'store',jsonb_build_object(
 'desired_state',o.desired_state,'state',case when o.desired_state='ORDERS_PAUSED' and o.pause_from<=statement_timestamp() and (o.resume_at is null or statement_timestamp()<o.resume_at) then 'ORDERS_PAUSED' else 'OPEN' end,
 'customer_title',o.customer_title,'customer_message',o.customer_message,'pause_from',o.pause_from,'resume_at',o.resume_at,'updated_at',o.updated_at))
 from public.site_operations o where o.id;
$$;
create function public.assert_store_accepting_orders() returns jsonb language plpgsql security definer set search_path='' as $$
declare current_state jsonb;
begin
 -- Serialize DB initiation against manual configuration changes. Existing
 -- payment/webhook/fulfilment paths do not call this initiation-only guard.
 perform 1 from public.site_operations where id for share;
 current_state:=public.get_site_operations();
 if current_state is null then raise exception 'Store availability is temporarily unavailable' using errcode='P0001'; end if;
 if current_state->'store'->>'state'<>'OPEN' then
  raise exception 'Orders are temporarily paused' using errcode='P0001',detail=current_state->'store'->>'customer_message';
 end if;
 return current_state;
end $$;
create function public.set_store_operations(p_change jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare previous public.site_operations%rowtype;updated public.site_operations%rowtype;actor_id uuid:=auth.uid();start_at timestamptz;end_at timestamptz;desired text;
begin
 if actor_id is null or not exists(select 1 from public.admin_members where user_id=actor_id) then raise exception 'Admin membership required' using errcode='42501'; end if;
 if jsonb_typeof(p_change)<>'object' then raise exception 'Invalid operations update' using errcode='22023'; end if;
 select * into strict previous from public.site_operations where id for update;
 if (p_change->>'expected_updated_at')::timestamptz is distinct from previous.updated_at then raise exception 'Operations changed; reload before saving' using errcode='40001'; end if;
 desired:=p_change->>'desired_state';
 if desired='ORDERS_PAUSED' then
  if p_change->>'mode'='now' then start_at:=statement_timestamp();
  elsif p_change->>'mode'='schedule' then start_at:=(p_change->>'pause_from')::timestamptz;
   if start_at is null or start_at<=statement_timestamp() then raise exception 'Scheduled pause must be in the future' using errcode='22023'; end if;
  elsif p_change->>'mode'='edit' and previous.desired_state='ORDERS_PAUSED' then start_at:=previous.pause_from;
  else raise exception 'Choose pause now, schedule, or edit' using errcode='22023'; end if;
  end_at:=nullif(p_change->>'resume_at','')::timestamptz;
 elsif desired<>'OPEN' or desired is null then raise exception 'Invalid store state' using errcode='22023'; end if;
 update public.site_operations set desired_state=desired,pause_from=start_at,resume_at=end_at,
 customer_title=coalesce(p_change->>'customer_title',previous.customer_title),customer_message=coalesce(p_change->>'customer_message',previous.customer_message),internal_reason=coalesce(p_change->>'internal_reason',previous.internal_reason),updated_at=clock_timestamp(),updated_by=actor_id where id returning * into updated;
 insert into public.site_operations_audit(actor,action,entity_id,before_state,after_state) values(actor_id,'STORE_STATUS','store',to_jsonb(previous),to_jsonb(updated));
 return to_jsonb(updated);
end $$;
create function public.save_news_post(p_post jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare previous public.news_posts%rowtype;updated public.news_posts%rowtype;actor_id uuid:=auth.uid();post_id uuid;state text;published_at timestamptz;
begin
 if actor_id is null or not exists(select 1 from public.admin_members where user_id=actor_id) then raise exception 'Admin membership required' using errcode='42501'; end if;
 if jsonb_typeof(p_post)<>'object' then raise exception 'Invalid news post' using errcode='22023'; end if;
 post_id:=coalesce(nullif(p_post->>'id','')::uuid,gen_random_uuid());
 select * into previous from public.news_posts where id=post_id for update;
 if not found and nullif(p_post->>'id','') is not null then raise exception 'News post not found; reload before saving' using errcode='22023'; end if;
 if previous.id is not null then
  if (p_post->>'expected_updated_at')::timestamptz is distinct from previous.updated_at then raise exception 'News changed; reload before saving' using errcode='40001'; end if;
  if previous.slug<>p_post->>'slug' then raise exception 'Saved article slug is immutable' using errcode='22023'; end if;
 end if;
 state:=p_post->>'status';published_at:=nullif(p_post->>'publication_at','')::timestamptz;
 if state='PUBLISHED' then published_at:=case when previous.publication_at<=statement_timestamp() then previous.publication_at else statement_timestamp() end;
 elsif state='SCHEDULED' and (published_at is null or published_at<=statement_timestamp()) then raise exception 'Scheduled publication must be in the future' using errcode='22023'; end if;
 insert into public.news_posts(id,slug,title,excerpt,body,category,status,publication_at,expires_at,cta_label,cta_url,announcement,priority,dismissible,created_by,updated_by)
 values(post_id,p_post->>'slug',p_post->>'title',p_post->>'excerpt',p_post->>'body',p_post->>'category',state,published_at,nullif(p_post->>'expires_at','')::timestamptz,nullif(p_post->>'cta_label',''),nullif(p_post->>'cta_url',''),coalesce((p_post->>'announcement')::boolean,false),coalesce((p_post->>'priority')::int,0),coalesce((p_post->>'dismissible')::boolean,true),actor_id,actor_id)
 on conflict(id) do update set title=excluded.title,excerpt=excluded.excerpt,body=excluded.body,category=excluded.category,status=excluded.status,publication_at=excluded.publication_at,expires_at=excluded.expires_at,cta_label=excluded.cta_label,cta_url=excluded.cta_url,announcement=excluded.announcement,priority=excluded.priority,dismissible=excluded.dismissible,updated_by=actor_id,updated_at=clock_timestamp()
 returning * into updated;
 insert into public.site_operations_audit(actor,action,entity_id,before_state,after_state) values(actor_id,'NEWS_'||state,post_id::text,case when previous.id is null then null else to_jsonb(previous) end,to_jsonb(updated));
 return to_jsonb(updated);
end $$;
revoke all on function public.public_news(),public.get_site_operations(),public.assert_store_accepting_orders(),public.set_store_operations(jsonb),public.save_news_post(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.public_news(),public.get_site_operations() to anon,authenticated,service_role;
grant execute on function public.assert_store_accepting_orders() to service_role;
grant execute on function public.set_store_operations(jsonb),public.save_news_post(jsonb) to authenticated;

-- Add a guard to the current validated guest-order function, retaining its
-- entire pricing/ownership/idempotency body and existing execute privileges.
do $$
declare source text:=pg_get_functiondef('public.create_guest_kit_order(jsonb)'::regprocedure);replacement text;
begin
 if position('request_hash_value' in source)=0 or position('owner_user_id' in source)=0 or position(E'\nbegin\n' in source)=0 then raise exception 'Unexpected guest-order authority; operations migration halted'; end if;
 replacement:=regexp_replace(source,E'\nbegin\n',E'\nbegin\n perform public.assert_store_accepting_orders();\n');
 execute replacement;
end $$;

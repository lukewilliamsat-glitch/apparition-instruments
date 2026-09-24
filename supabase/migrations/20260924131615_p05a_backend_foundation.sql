-- P05A: empty business schema. Browser-local records remain authoritative until P05B/P05C.
-- IDs and money are preserved as existing text IDs and integer GBP pence.
create table public.admin_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);

create table public.components (
 id text primary key check (length(id) between 1 and 120),
 sku text not null unique check (length(sku) between 1 and 80),
 name text not null check (length(name) between 1 and 300),
 category text not null check (length(category) between 1 and 100),
 manufacturer text not null default '',
 description text not null default '',
 specs jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
 product_content jsonb not null default '{}'::jsonb check (jsonb_typeof(product_content) = 'object'),
 active boolean not null default true,
 individually boolean not null default false,
 in_kits boolean not null default false,
 sale_price integer check (sale_price >= 0),
 kit_price integer check (kit_price >= 0),
 image jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

-- Costs and supplier details are isolated so public catalogue RLS cannot expose them.
create table public.component_internal (
 component_id text primary key references public.components(id) on delete cascade,
 internal_unit_cost integer check (internal_unit_cost >= 0),
 supplier_details jsonb not null default '{}'::jsonb check (jsonb_typeof(supplier_details) = 'object'),
 private_notes text not null default '',
 updated_at timestamptz not null default now()
);

create table public.inventory (
 component_id text primary key references public.components(id) on delete cascade,
 quantity bigint not null default 0 check (quantity between 0 and 9007199254740991),
 stock_unit text not null default 'item' check (stock_unit in ('item','m','g')),
 updated_at timestamptz not null default now()
);

create table public.assemblies (
 id text primary key check (length(id) between 1 and 120),
 sku text not null unique check (length(sku) between 1 and 80),
 name text not null check (length(name) between 1 and 300),
 category text not null,
 kind text not null default 'assembly' check (kind in ('assembly','wiring-kit')),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (id, kind)
);

-- Fixed BOM only. Customer-selected configurable components remain in kit_definitions.
create table public.assembly_bom (
 assembly_id text not null references public.assemblies(id) on delete cascade,
 component_id text not null references public.components(id),
 quantity bigint not null check (quantity between 1 and 9007199254740991),
 primary key (assembly_id, component_id)
);

create table public.kit_definitions (
 assembly_id text primary key,
 assembly_kind text not null default 'wiring-kit' check (assembly_kind = 'wiring-kit'),
 family text not null unique check (family ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 base_price integer not null check (base_price >= 0),
 show_on_wiring_kits boolean not null default false,
 builder_enabled boolean not null default false,
 default_wiring_style text not null,
 defaults jsonb not null default '{}'::jsonb check (jsonb_typeof(defaults) = 'object'),
 builder_options jsonb not null default '[]'::jsonb check (jsonb_typeof(builder_options) = 'array'),
 component_resolvers jsonb not null default '[]'::jsonb check (jsonb_typeof(component_resolvers) = 'array'),
 updated_at timestamptz not null default now(),
 foreign key (assembly_id, assembly_kind) references public.assemblies(id, kind) on delete cascade
);

create table public.kit_definition_internal (
 assembly_id text primary key references public.kit_definitions(assembly_id) on delete cascade,
 metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

create table public.kit_permitted_components (
 assembly_id text not null references public.kit_definitions(assembly_id) on delete cascade,
 component_id text not null references public.components(id),
 primary key (assembly_id, component_id)
);
create index kit_permitted_components_component_idx on public.kit_permitted_components(component_id);

alter table public.admin_members enable row level security;
alter table public.components enable row level security;
alter table public.component_internal enable row level security;
alter table public.inventory enable row level security;
alter table public.assemblies enable row level security;
alter table public.assembly_bom enable row level security;
alter table public.kit_definitions enable row level security;
alter table public.kit_definition_internal enable row level security;
alter table public.kit_permitted_components enable row level security;

-- No one may self-enrol. Initial Admin membership must be provisioned later by
-- a trusted operator; the current static Admin password is not database auth.
revoke all on public.admin_members, public.components, public.component_internal,
 public.inventory, public.assemblies, public.assembly_bom,
 public.kit_definitions, public.kit_definition_internal, public.kit_permitted_components from anon, authenticated;
grant select on public.admin_members to authenticated;
create policy admin_members_self on public.admin_members for select to authenticated
 using (user_id = (select auth.uid()));

-- Public table privileges are column-scoped, even if a caller queries tables directly.
grant select (id, sku, name, category, manufacturer, description, specs,
 product_content, active, individually, in_kits, sale_price, kit_price, image)
 on public.components to anon, authenticated;
create policy components_public_read on public.components for select to anon, authenticated
 using (active and (individually or in_kits));
create policy components_admin_read on public.components for select to authenticated
 using (exists (select 1 from public.admin_members where user_id = (select auth.uid())));

grant select (id, sku, name, category, kind, active) on public.assemblies to anon, authenticated;
grant select (assembly_id, family, base_price, show_on_wiring_kits, builder_enabled,
 default_wiring_style, defaults, builder_options, component_resolvers)
 on public.kit_definitions to anon, authenticated;
grant select on public.kit_permitted_components to anon, authenticated;
create policy assemblies_public_read on public.assemblies for select to anon, authenticated
 using (active and kind = 'wiring-kit');
create policy assemblies_admin_read on public.assemblies for select to authenticated
 using (exists (select 1 from public.admin_members where user_id = (select auth.uid())));
create policy kits_public_read on public.kit_definitions for select to anon, authenticated
 using ((show_on_wiring_kits or builder_enabled) and exists (
  select 1 from public.assemblies a where a.id = assembly_id and a.active));
create policy kits_admin_read on public.kit_definitions for select to authenticated
 using (exists (select 1 from public.admin_members where user_id = (select auth.uid())));
create policy permitted_public_read on public.kit_permitted_components for select to anon, authenticated
 using (exists (select 1 from public.kit_definitions k where k.assembly_id = kit_permitted_components.assembly_id));
create policy permitted_admin_read on public.kit_permitted_components for select to authenticated
 using (exists (select 1 from public.admin_members where user_id = (select auth.uid())));

-- Admin-only read and mutation: a generic authenticated customer is never Admin.
grant select, insert, update, delete on public.components, public.component_internal,
 public.inventory, public.assemblies, public.assembly_bom,
 public.kit_definitions, public.kit_definition_internal, public.kit_permitted_components to authenticated;
create policy kit_internal_admin on public.kit_definition_internal for all to authenticated
 using (exists (select 1 from public.admin_members where user_id = (select auth.uid())))
 with check (exists (select 1 from public.admin_members where user_id = (select auth.uid())));

create policy component_internal_admin on public.component_internal for all to authenticated
 using (exists (select 1 from public.admin_members where user_id = (select auth.uid())))
 with check (exists (select 1 from public.admin_members where user_id = (select auth.uid())));
create policy inventory_admin on public.inventory for all to authenticated
 using (exists (select 1 from public.admin_members where user_id = (select auth.uid())))
 with check (exists (select 1 from public.admin_members where user_id = (select auth.uid())));
create policy bom_admin on public.assembly_bom for all to authenticated
 using (exists (select 1 from public.admin_members where user_id = (select auth.uid())))
 with check (exists (select 1 from public.admin_members where user_id = (select auth.uid())));
create policy components_admin_write on public.components for all to authenticated
 using (exists (select 1 from public.admin_members where user_id = (select auth.uid())))
 with check (exists (select 1 from public.admin_members where user_id = (select auth.uid())));
create policy assemblies_admin_write on public.assemblies for all to authenticated
 using (exists (select 1 from public.admin_members where user_id = (select auth.uid())))
 with check (exists (select 1 from public.admin_members where user_id = (select auth.uid())));
create policy kits_admin_write on public.kit_definitions for all to authenticated
 using (exists (select 1 from public.admin_members where user_id = (select auth.uid())))
 with check (exists (select 1 from public.admin_members where user_id = (select auth.uid())));
create policy permitted_admin_write on public.kit_permitted_components for all to authenticated
 using (exists (select 1 from public.admin_members where user_id = (select auth.uid())))
 with check (exists (select 1 from public.admin_members where user_id = (select auth.uid())));

-- security_invoker makes both the column grants and RLS of underlying tables apply.
create view public.catalogue_components with (security_invoker = true) as
 select id, sku, name, category, manufacturer, description, specs, product_content,
  individually, in_kits, sale_price, kit_price, image from public.components
 where active and (individually or in_kits);
create view public.catalogue_wiring_kits with (security_invoker = true) as
 select a.id, a.sku, a.name, a.category, k.family as slug, k.base_price,
  k.show_on_wiring_kits, k.builder_enabled, k.default_wiring_style,
  k.defaults, k.builder_options, k.component_resolvers
 from public.assemblies a join public.kit_definitions k on k.assembly_id = a.id
 where a.active and (k.show_on_wiring_kits or k.builder_enabled);
revoke all on public.catalogue_components, public.catalogue_wiring_kits from public;
grant select on public.catalogue_components, public.catalogue_wiring_kits to anon, authenticated;

-- Public object downloads; ONLY explicitly authorised admins may upload/change files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
 values ('apparition-business-images','apparition-business-images',true,8388608,
  array['image/png','image/jpeg','image/webp']);
create policy apparition_images_admin_insert on storage.objects for insert to authenticated
 with check (bucket_id = 'apparition-business-images' and (storage.foldername(name))[1] in ('components','assemblies')
  and exists (select 1 from public.admin_members where user_id = (select auth.uid())));
create policy apparition_images_admin_update on storage.objects for update to authenticated
 using (bucket_id = 'apparition-business-images' and exists (select 1 from public.admin_members where user_id = (select auth.uid())))
 with check (bucket_id = 'apparition-business-images' and (storage.foldername(name))[1] in ('components','assemblies')
  and exists (select 1 from public.admin_members where user_id = (select auth.uid())));
create policy apparition_images_admin_delete on storage.objects for delete to authenticated
 using (bucket_id = 'apparition-business-images' and exists (select 1 from public.admin_members where user_id = (select auth.uid())));
create policy apparition_images_admin_select on storage.objects for select to authenticated
 using (bucket_id = 'apparition-business-images' and exists (select 1 from public.admin_members where user_id = (select auth.uid())));

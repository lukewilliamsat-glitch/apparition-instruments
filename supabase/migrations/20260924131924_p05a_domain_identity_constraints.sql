-- Preserve every existing BOM row, including repeated physical Component IDs.
-- Existing empty P05A tables make this additive migration non-destructive.
alter table public.assembly_bom drop constraint assembly_bom_pkey;
alter table public.assembly_bom add column position integer not null default 0 check (position >= 0);
alter table public.assembly_bom add primary key (assembly_id, position);
alter table public.assembly_bom alter column position drop default;

-- The local Component editor accepts kitPriceQuantity and case-insensitive SKUs.
alter table public.components add column kit_price_quantity integer check (kit_price_quantity >= 1);
create unique index components_sku_folded_key on public.components (lower(sku));
create unique index assemblies_sku_folded_key on public.assemblies (lower(sku));
grant select (kit_price_quantity) on public.components to anon, authenticated;
create or replace view public.catalogue_components with (security_invoker = true) as
 select id, sku, name, category, manufacturer, description, specs, product_content,
  individually, in_kits, sale_price, kit_price, image, kit_price_quantity
 from public.components where active and (individually or in_kits);

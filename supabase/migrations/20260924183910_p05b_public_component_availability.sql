-- P05B: The Builder needs current physical quantities for its existing stock checks.
-- Only active, customer-visible or kit-eligible components may be read publicly.
-- Internal costs and all inventory mutations remain Admin-only under existing RLS.
grant select (component_id, quantity) on public.inventory to anon;
create policy inventory_public_availability on public.inventory for select to anon, authenticated
 using (exists (
  select 1 from public.components c where c.id = component_id
   and c.active and (c.individually or c.in_kits)
 ));

create or replace view public.catalogue_components with (security_invoker = true) as
 select c.id, c.sku, c.name, c.category, c.manufacturer, c.description, c.specs,
  c.product_content, c.individually, c.in_kits, c.sale_price, c.kit_price,
  c.image, c.kit_price_quantity, i.quantity as stock
 from public.components c join public.inventory i on i.component_id = c.id
 where c.active and (c.individually or c.in_kits);

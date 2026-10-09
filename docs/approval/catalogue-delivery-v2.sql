-- REVIEW ONLY. Target acdxpxvksvdwfajntzfx. Separate owner approval required.
-- One-shot additive view; fail rather than replace an unexpected existing object.
begin;
create view public.catalogue_delivery_v2 with (security_invoker = true) as
select c.id,c.sku,c.name,c.category,c.manufacturer,c.description,c.specs,
       c.product_content,c.individually,c.in_kits,c.sale_price,c.kit_price,
       c.kit_price_quantity,c.stock,
       case
         when jsonb_typeof(c.image) = 'string' and c.image #>> '{}' <> ''
           then encode(extensions.digest(c.image #>> '{}','sha256'),'hex')
         when jsonb_typeof(c.image) = 'object' and c.image ->> 'kind' = 'object'
              and c.image ->> 'url' like 'https://%'
           then encode(extensions.digest(c.image ->> 'url','sha256'),'hex')
         else null
       end as image_identity,
       case when jsonb_typeof(c.image) = 'object'
                 and c.image ->> 'kind' = 'object'
                 and c.image ->> 'url' like 'https://%'
            then jsonb_build_object('kind','object','key',c.image ->> 'key',
                                   'url',c.image ->> 'url','mimeType',c.image ->> 'mimeType')
            else null end as image_reference
from public.catalogue_components c;
revoke all on public.catalogue_delivery_v2 from public,anon,authenticated,service_role;
grant select on public.catalogue_delivery_v2 to anon,authenticated;
commit;

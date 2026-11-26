-- Installation changes public availability only; existing view identity,
-- columns, row filter and grants are preserved. Apply after the paused runtime.
do $$begin if md5(pg_get_viewdef('public.catalogue_components'::regclass,true))<>'16626212b80b5685c88aa75fe6bcdd24' then raise exception 'Public catalogue drift';end if;end $$;
create function public.unity93_unavailable(p_component text) returns bigint
language sql stable security definer set search_path='' set statement_timeout='2s' as $$
 select case when length(p_component) between 1 and 120 and exists(select from public.components where id=p_component and active and (individually or in_kits))
 then dominion79.unavailable(p_component) else 0::bigint end;
$$;
revoke all on function public.unity93_unavailable(text) from public;
grant execute on function public.unity93_unavailable(text) to anon,authenticated,service_role;
create or replace view public.catalogue_components as
 SELECT c.id,
    c.sku,
    c.name,
    c.category,
    c.manufacturer,
    c.description,
    c.specs,
    c.product_content,
    c.individually,
    c.in_kits,
    c.sale_price,
    c.kit_price,
    c.image,
    c.kit_price_quantity,
    greatest(i.quantity-public.unity93_unavailable(c.id),0)::bigint AS stock
   FROM components c
     JOIN inventory i ON i.component_id = c.id
  WHERE c.active AND (c.individually OR c.in_kits);

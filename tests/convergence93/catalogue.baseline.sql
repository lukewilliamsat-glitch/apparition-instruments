create view public.catalogue_components as
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
    i.quantity AS stock
   FROM components c
     JOIN inventory i ON i.component_id = c.id
  WHERE c.active AND (c.individually OR c.in_kits);

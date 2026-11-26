CREATE OR REPLACE FUNCTION public.omniscience74_orders(p_from date, p_to date, p_cursor_day date DEFAULT NULL::date, p_cursor_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '5s'
AS $function$
begin
 perform public.command63_finance_actor();
 if p_from is null or p_to is null or p_from<'1900-01-01' or p_to-p_from not between 0 and 365
  or ((p_cursor_day is null) <> (p_cursor_id is null)) or (p_cursor_day is not null and p_cursor_day not between p_from and p_to)
  then raise exception 'Invalid reporting window or cursor' using errcode='22023';
 end if;
 return (with sale as (
  select o.id,case when o.sales_channel='WEBSITE' then (o.paid_at at time zone 'Europe/London')::date
       else coalesce(o.order_date,(o.created_at at time zone 'Europe/London')::date) end as day
  from public.orders o where o.payment_status in('paid','partially_refunded','refunded') and (o.sales_channel<>'WEBSITE' or o.paid_at is not null)
 ), paged as materialized (
  select s.* from sale s where s.day between p_from and p_to and (p_cursor_day is null or (s.day,s.id)<(p_cursor_day,p_cursor_id))
  order by s.day desc,s.id desc limit 11
 ), records as (
  select s.day,s.id,jsonb_build_object('id',o.id,'day',s.day,'reference',left(o.reference,80),'channel',o.sales_channel,'currency',o.currency,
   'total',o.total_pence,'refund',o.refunded_pence,'finance',f.document,'current',f.order_basis_hash=public.command63_finance_basis(o),
   'items',coalesce((select jsonb_agg(jsonb_build_object('productId',left(coalesce(a.v->>'productId',a.v#>>'{snapshot,componentId}',a.v#>>'{snapshot,assemblyId}',''),120),
     'sku',left(a.v->>'sku',96),'name',left(a.v->>'name',160),'lineTotal',a.v->'lineTotal','quantity',a.v->'quantity') order by a.n)
     from jsonb_array_elements(case when jsonb_typeof(o.items)='array' then o.items else '[]'::jsonb end) with ordinality a(v,n) where a.n<=10),'[]'::jsonb)) as body
  from (select * from paged order by day desc,id desc limit 10) s join public.orders o on o.id=s.id
  left join public.order_financial_records f on f.order_id=o.id
 ) select jsonb_build_object('rows',coalesce((select jsonb_agg(r.body order by r.day desc,r.id desc) from records r),'[]'::jsonb),
  'next',case when (select count(*) from paged)>10 then (select jsonb_build_object('day',r.day,'id',r.id) from records r order by r.day,r.id limit 1) end));
end $function$
;

CREATE OR REPLACE FUNCTION public.omniscience92_orders(p_from date, p_to date, p_cursor_day date DEFAULT NULL::date, p_cursor_id uuid DEFAULT NULL::uuid)
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
  order by s.day desc,s.id desc limit 101
 ), records as (
  select s.day,s.id,jsonb_build_object('id',o.id,'day',s.day,'reference',left(o.reference,80),'channel',o.sales_channel,'currency',o.currency,
   'total',o.total_pence,'refund',o.refunded_pence,'finance',f.document,'current',f.order_basis_hash=public.command63_finance_basis(o),
   'items',coalesce((select jsonb_agg(jsonb_build_object('productId',left(coalesce(a.v->>'productId',a.v#>>'{snapshot,componentId}',a.v#>>'{snapshot,assemblyId}',''),120),
     'sku',left(a.v->>'sku',96),'name',left(a.v->>'name',160),'lineTotal',a.v->'lineTotal','quantity',a.v->'quantity') order by a.n)
     from jsonb_array_elements(case when jsonb_typeof(o.items)='array' then o.items else '[]'::jsonb end) with ordinality a(v,n) where a.n<=10),'[]'::jsonb)) as body
  from (select * from paged order by day desc,id desc limit 100) s join public.orders o on o.id=s.id
  left join public.order_financial_records f on f.order_id=o.id
 ) select jsonb_build_object('rows',coalesce((select jsonb_agg(r.body order by r.day desc,r.id desc) from records r),'[]'::jsonb),
  'next',case when (select count(*) from paged)>100 then (select jsonb_build_object('day',r.day,'id',r.id) from records r order by r.day,r.id limit 1) end));
end $function$
;

revoke all on function public.omniscience92_orders(date,date,date,uuid) from public,anon,service_role;
grant execute on function public.omniscience92_orders(date,date,date,uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.omniscience92_outlays(p_from date, p_to date, p_cursor_day date DEFAULT NULL::date, p_cursor_id uuid DEFAULT NULL::uuid)
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
 return (with paged as materialized (
  select o.* from omniscience74.outlays o where o.day between p_from and p_to and (p_cursor_day is null or (o.day,o.id)<(p_cursor_day,p_cursor_id))
  order by o.day desc,o.id desc limit 101
 ), records as (
  select o.day,o.id,to_jsonb(o)-'actor'||jsonb_build_object('reimbursed',coalesce(r.total,0),'last_reimbursement',r.last_day) as body
  from (select * from paged order by day desc,id desc limit 100) o
  left join lateral(select sum(x.sterling_minor) total,max(x.day) last_day from omniscience74.reimbursements x where x.outlay=o.id) r on true
 ) select jsonb_build_object('rows',coalesce((select jsonb_agg(r.body order by r.day desc,r.id desc) from records r),'[]'::jsonb),
  'next',case when (select count(*) from paged)>100 then (select jsonb_build_object('day',r.day,'id',r.id) from records r order by r.day,r.id limit 1) end));
end $function$
;

revoke all on function public.omniscience92_outlays(date,date,date,uuid) from public,anon,service_role;
grant execute on function public.omniscience92_outlays(date,date,date,uuid) to authenticated;

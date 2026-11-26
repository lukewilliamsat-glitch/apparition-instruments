CREATE OR REPLACE FUNCTION public.omniscience74_outlays(p_from date, p_to date, p_cursor_day date DEFAULT NULL::date, p_cursor_id uuid DEFAULT NULL::uuid)
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
  order by o.day desc,o.id desc limit 11
 ), records as (
  select o.day,o.id,to_jsonb(o)-'actor'||jsonb_build_object('reimbursed',coalesce(r.total,0),'last_reimbursement',r.last_day) as body
  from (select * from paged order by day desc,id desc limit 10) o
  left join lateral(select sum(x.sterling_minor) total,max(x.day) last_day from omniscience74.reimbursements x where x.outlay=o.id) r on true
 ) select jsonb_build_object('rows',coalesce((select jsonb_agg(r.body order by r.day desc,r.id desc) from records r),'[]'::jsonb),
  'next',case when (select count(*) from paged)>10 then (select jsonb_build_object('day',r.day,'id',r.id) from records r order by r.day,r.id limit 1) end));
end $function$
;

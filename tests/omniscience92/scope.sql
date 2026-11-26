create function public.omniscience92_scope(p_from date,p_to date)
returns jsonb language plpgsql stable security definer set search_path='' set statement_timeout='5s' as $$
declare sales bigint;expenses bigint;sales_hash text;expense_hash text;
begin
 perform public.command63_finance_actor();
 if p_from is null or p_to is null or p_from<'1900-01-01' or p_to-p_from not between 0 and 365 then
  raise exception 'Choose a period of up to 366 days' using errcode='22023';
 end if;
 select count(*),md5(coalesce(string_agg(
  o.id::text||':'||o.updated_at::text||':'||coalesce(f.revision::text,'0')||':'||
  public.command63_finance_basis(o)||':'||coalesce(md5(f.document::text),''),
  ',' order by o.id),''))
 into sales,sales_hash
 from public.orders o left join public.order_financial_records f on f.order_id=o.id
 where o.payment_status in('paid','partially_refunded','refunded')
  and (o.sales_channel<>'WEBSITE' or o.paid_at is not null)
  and case when o.sales_channel='WEBSITE' then (o.paid_at at time zone 'Europe/London')::date
    else coalesce(o.order_date,(o.created_at at time zone 'Europe/London')::date) end between p_from and p_to;
 select count(*),md5(coalesce(string_agg(
  o.id::text||':'||md5(to_jsonb(o)::text)||':'||
   coalesce((select md5(string_agg(to_jsonb(r)::text,',' order by r.id)) from omniscience74.reimbursements r where r.outlay=o.id),''),
  ',' order by o.id),''))
 into expenses,expense_hash from omniscience74.outlays o where o.day between p_from and p_to;
 if sales>10000 or expenses>10000 then raise exception 'Choose a shorter period for complete totals' using errcode='54000'; end if;
 return jsonb_build_object('orders',sales,'outlays',expenses,
  'revision',md5(sales_hash||':'||expense_hash||':'||p_from::text||':'||p_to::text));
end $$;
revoke all on function public.omniscience92_scope(date,date) from public,anon,service_role;
grant execute on function public.omniscience92_scope(date,date) to authenticated;

-- Additive, private management reporting. No writes to orders, stock, providers or financial revisions.
begin;
set local lock_timeout='5s';
set local statement_timeout='45s';
create schema omniscience74;
revoke all on schema omniscience74 from public,anon,authenticated,service_role;
create table omniscience74.outlays(
 id uuid primary key, day date not null, vendor text not null, category text not null, purpose text not null,
 original_minor bigint not null check(original_minor between 1 and 100000000),
 currency text not null check(currency in ('GBP','USD','EUR')), sterling_minor bigint not null check(sterling_minor between 1 and 100000000),
 funding text not null check(funding in ('business','director')),
 treatment text not null check(treatment in ('overhead','stock','recorded-elsewhere')),
 evidence text not null, external_reference text not null, recurring boolean not null, notes text not null,
 actor uuid not null references auth.users(id), recorded_at timestamptz not null default clock_timestamp(),
 check(currency<>'GBP' or original_minor=sterling_minor),
 check(treatment<>'recorded-elsewhere' or length(external_reference)>0),
 unique(evidence)
);
create table omniscience74.reimbursements(
 id uuid primary key, outlay uuid not null references omniscience74.outlays(id),
 day date not null, sterling_minor bigint not null check(sterling_minor between 1 and 100000000),
 evidence text not null unique, actor uuid not null references auth.users(id), recorded_at timestamptz not null default clock_timestamp()
);
create index outlay_period74 on omniscience74.outlays(day desc,id desc);
create index reimbursements_outlay74 on omniscience74.reimbursements(outlay,day,id);
alter table omniscience74.outlays enable row level security;
alter table omniscience74.reimbursements enable row level security;
revoke all on all tables in schema omniscience74 from public,anon,authenticated,service_role;

-- Date semantics match commercialOrderDay; purchase day takes precedence only for external channels.
create index omniscience74_orders_day_idx on public.orders(
 (case when sales_channel='WEBSITE' then (paid_at at time zone 'Europe/London')::date
       else coalesce(order_date,(created_at at time zone 'Europe/London')::date) end) desc, id desc)
 where payment_status in ('paid','partially_refunded','refunded') and (sales_channel<>'WEBSITE' or paid_at is not null);

create function public.omniscience74_orders(p_from date,p_to date,p_cursor_day date default null,p_cursor_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' set statement_timeout='5s' as $$
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
end $$;

create function public.omniscience74_outlays(p_from date,p_to date,p_cursor_day date default null,p_cursor_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' set statement_timeout='5s' as $$
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
end $$;

create function omniscience74.clean(p text,p_min integer,p_max integer)
returns text language plpgsql immutable set search_path='' as $$
begin
 p:=btrim(coalesce(p,''));
 if char_length(p) not between p_min and p_max or p ~ '[[:cntrl:]]' then
  raise exception 'A required field is missing or too long' using errcode='22023'; end if;
 return p;
end $$;

create function public.omniscience74_record_outlay(p_id uuid,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='5s' set lock_timeout='2s' as $$
declare who uuid:=public.command63_finance_actor(); actual omniscience74.outlays; wanted omniscience74.outlays;
begin
 if p_id is null or jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>3500 then raise exception 'Invalid outlay' using errcode='22023';end if;
 perform public.command63_finance_keys(p_data,array['date','vendor','category','purpose','original','currency','gbp','funding','treatment','evidence','link','recurring','notes']);
 wanted.id:=p_id; wanted.actor:=who; wanted.day:=(p_data->>'date')::date;
 wanted.vendor:=omniscience74.clean(p_data->>'vendor',1,100); wanted.category:=omniscience74.clean(p_data->>'category',1,40);
 wanted.purpose:=omniscience74.clean(p_data->>'purpose',1,180);wanted.funding:=p_data->>'funding';wanted.treatment:=p_data->>'treatment';
 wanted.original_minor:=public.command63_finance_number(p_data->'original',false);wanted.sterling_minor:=public.command63_finance_number(p_data->'gbp',false);
 wanted.currency:=p_data->>'currency';wanted.evidence:=lower(omniscience74.clean(p_data->>'evidence',3,140));
 wanted.external_reference:=omniscience74.clean(p_data->>'link',0,140);
 wanted.recurring:=(p_data->>'recurring')::boolean;wanted.notes:=omniscience74.clean(p_data->>'notes',0,400);
 if wanted.day is null or wanted.day not between '1900-01-01' and (now() at time zone 'Europe/London')::date
    or jsonb_typeof(p_data->'recurring') is distinct from 'boolean' then raise exception 'Invalid date or recurrence' using errcode='22023';end if;
 insert into omniscience74.outlays values(wanted.id,wanted.day,wanted.vendor,wanted.category,wanted.purpose,wanted.original_minor,wanted.currency,wanted.sterling_minor,
  wanted.funding,wanted.treatment,wanted.evidence,wanted.external_reference,wanted.recurring,wanted.notes,wanted.actor,clock_timestamp())
 on conflict(id) do nothing returning * into actual;
 if not found then
  select * into strict actual from omniscience74.outlays where id=p_id;
  if (to_jsonb(actual)-'recorded_at') is distinct from (to_jsonb(wanted)-'recorded_at') then
   raise exception 'This outlay request already exists with different details' using errcode='23505'; end if;
  return jsonb_build_object('id',p_id,'duplicate',true);
 end if;
 return jsonb_build_object('id',p_id,'duplicate',false);
end $$;

create function public.omniscience74_reimburse(p_id uuid,p_outlay uuid,p_date date,p_gbp bigint,p_evidence text)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='5s' set lock_timeout='2s' as $$
declare who uuid:=public.command63_finance_actor(); parent omniscience74.outlays; existing omniscience74.reimbursements; used numeric;
begin
 if p_id is null or p_outlay is null or p_date is null or p_gbp is null or p_gbp not between 1 and 100000000 then raise exception 'Invalid reimbursement' using errcode='22023';end if;
 p_evidence:=lower(omniscience74.clean(p_evidence,3,140));
 select * into parent from omniscience74.outlays where id=p_outlay for update;
 if parent.id is null or parent.funding<>'director' or p_date not between parent.day and (now() at time zone 'Europe/London')::date then
  raise exception 'Reimbursement must refer to an existing director purchase and valid date' using errcode='22023';end if;
 select * into existing from omniscience74.reimbursements where id=p_id;
 if found then
  if (existing.actor,existing.outlay,existing.day,existing.sterling_minor,existing.evidence) is distinct from (who,p_outlay,p_date,p_gbp,p_evidence)
    then raise exception 'This reimbursement request has different details' using errcode='23505';end if;
  return jsonb_build_object('id',p_id,'duplicate',true);
 end if;
 select coalesce(sum(sterling_minor),0) into used from omniscience74.reimbursements where outlay=p_outlay;
 if used+p_gbp>parent.sterling_minor then raise exception 'Reimbursement exceeds the remaining balance' using errcode='23514';end if;
 insert into omniscience74.reimbursements(id,outlay,day,sterling_minor,evidence,actor) values(p_id,p_outlay,p_date,p_gbp,p_evidence,who);
 return jsonb_build_object('id',p_id,'duplicate',false);
end $$;

revoke all on all functions in schema omniscience74 from public,anon,authenticated,service_role;
revoke all on function public.omniscience74_orders(date,date,date,uuid),public.omniscience74_outlays(date,date,date,uuid),
 public.omniscience74_record_outlay(uuid,jsonb),public.omniscience74_reimburse(uuid,uuid,date,bigint,text)
 from public,anon,authenticated,service_role;
grant execute on function public.omniscience74_orders(date,date,date,uuid),public.omniscience74_outlays(date,date,date,uuid),
 public.omniscience74_record_outlay(uuid,jsonb),public.omniscience74_reimburse(uuid,uuid,date,bigint,text)
 to authenticated;
commit;

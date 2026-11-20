-- Isolated import staging only. Procedures have no write access path into Orders or finance.
begin;
do $$ begin
 if current_database()<>'dominion79_fixture' then raise exception 'Disposable DOMINION database required';end if;
end $$;
create schema marketplace79;
revoke all on schema marketplace79 from public,anon,authenticated,service_role;
create table marketplace79.watermarks(
 account text not null, kind text not null check(kind in('orders','transactions')),
 revision bigint not null default 0, through_at timestamptz, review jsonb not null default '[]',
 primary key(account,kind)
);
create table marketplace79.evidence(
 account text not null, kind text not null, item_key text not null, provider_at timestamptz not null,
 body jsonb not null, primary key(account,kind,item_key),
 foreign key(account,kind) references marketplace79.watermarks(account,kind)
);
alter table marketplace79.watermarks enable row level security;
alter table marketplace79.evidence enable row level security;

-- Rows, review classification and watermark move in one transaction. Older overlap is ignored.
-- Reviewed keys are bounded and restricted to the model's non-PII fields.
create function marketplace79.stage(p_account text,p_kind text,p_revision bigint,p_through timestamptz,p_body jsonb,p_review jsonb) returns bigint
language plpgsql security definer set search_path='' as $$
declare v jsonb; l jsonb; m marketplace79.watermarks%rowtype; t timestamptz; p marketplace79.evidence%rowtype;
 k text; link uuid; ref text; allowed text[];
begin
 if coalesce(p_account,'') !~ '^[A-Za-z0-9:_-]{1,96}$' or coalesce(p_kind,'') not in('orders','transactions')
  or p_revision is null or p_revision<0 or p_through is null or jsonb_typeof(p_body) is distinct from 'array'
  or jsonb_typeof(p_review) is distinct from 'array' or jsonb_array_length(p_body)>2000 or jsonb_array_length(p_review)>2000
  or octet_length(p_body::text)>750000 or octet_length(p_review::text)>150000 then raise exception 'Import batch outside intake limits';end if;
 for v in select value from jsonb_array_elements(p_review) loop
  if jsonb_typeof(v) is distinct from 'object' or exists(select from jsonb_object_keys(v) a where a not in ('kind','reference'))
   or coalesce(v->>'kind','') !~ '^[a-z-]{1,60}$' or coalesce(v->>'reference','') !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$' then
   raise exception 'Invalid review evidence';
  end if;
 end loop;
 insert into marketplace79.watermarks(account,kind) values(p_account,p_kind) on conflict do nothing;
 select * into strict m from marketplace79.watermarks where account=p_account and kind=p_kind for update;
 if m.revision<>p_revision or (m.through_at is not null and m.through_at>=p_through) then
  raise exception 'Stale import watermark' using errcode='40001';
 end if;
 allowed:=case when p_kind='orders' then
  array['key','provider','account','reference','updatedAt','currency','totalMinor','cancelled','cancellation','shipping','lines','existingOrderId','decision','needsStockReview','stockMutation']
 else array['key','id','account','orderReference','kind','rawKind','direction','currency','amountMinor','at','matchedOrderReference','manualOrderId','reviewNeeded'] end;
 for v in select value from jsonb_array_elements(p_body) loop
  if jsonb_typeof(v) is distinct from 'object' or (v->>'account') is distinct from p_account or octet_length(v::text)>18000
   or exists(select from jsonb_object_keys(v) a where a<>all(allowed)) then raise exception 'Import row contains fields outside scoped evidence';end if;
  if p_kind='orders' then
   if v->>'provider' is distinct from 'ebay' or v->'stockMutation' is distinct from 'false'::jsonb
    or jsonb_typeof(v->'lines') is distinct from 'array' then raise exception 'Only read-only eBay evidence may be staged';end if;
   for l in select value from jsonb_array_elements(v->'lines') loop
    if jsonb_typeof(l) is distinct from 'object' or exists(select from jsonb_object_keys(l) a where a not in ('lineRef','listingRef','sku','quantity','verifiedSku'))
     then raise exception 'Unexpected order-line evidence';end if;
   end loop;
   if (v->'shipping' is distinct from 'null'::jsonb and
    (jsonb_typeof(v->'shipping') is distinct from 'object' or exists(select from jsonb_object_keys(v->'shipping') a where a not in ('currency','minor'))))
    or jsonb_typeof(v->'cancellation') is distinct from 'object'
    or exists(select from jsonb_object_keys(v->'cancellation') a where a not in ('state','latest')) then raise exception 'Unexpected shipping or cancellation evidence';end if;
   k:=v->>'reference';ref:=k;t:=(v->>'updatedAt')::timestamptz;link:=(v->>'existingOrderId')::uuid;
  else
   k:=v->>'id';ref:=v->>'matchedOrderReference';t:=(v->>'at')::timestamptz;link:=(v->>'manualOrderId')::uuid;
  end if;
  if t is null or t>p_through or coalesce(k,'') !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$' then raise exception 'Invalid provider record identity';end if;
  if link is not null and not exists(select from public.orders where id=link and sales_channel='EBAY' and external_reference=ref)
   then raise exception 'Provider evidence disagrees with the existing external order identity';end if;
  select * into p from marketplace79.evidence where account=p_account and kind=p_kind and item_key=k;
  if found then
   if p_kind='transactions' or p.provider_at=t then
    -- Review state can legitimately change with a new explicit mapping; provider bytes cannot.
    if (p.body-'matchedOrderReference'-'manualOrderId'-'reviewNeeded'-'existingOrderId'-'decision'-'needsStockReview'-'lines')<>
       (v-'matchedOrderReference'-'manualOrderId'-'reviewNeeded'-'existingOrderId'-'decision'-'needsStockReview'-'lines')
      or (p_kind='orders' and (select jsonb_agg(d-'verifiedSku') from jsonb_array_elements(p.body->'lines') d)
         is distinct from (select jsonb_agg(d-'verifiedSku') from jsonb_array_elements(v->'lines') d))
    then raise exception 'Conflicting replay in provider evidence' using errcode='23505';end if;
    update marketplace79.evidence set body=v where account=p_account and kind=p_kind and item_key=k;
   elsif p.provider_at<t then
    update marketplace79.evidence set body=v,provider_at=t where account=p_account and kind=p_kind and item_key=k;
   end if;
  else insert into marketplace79.evidence values(p_account,p_kind,k,t,v);
  end if;
 end loop;
 update marketplace79.watermarks set revision=m.revision+1,through_at=p_through,review=p_review where account=p_account and kind=p_kind;
 return m.revision+1;
end $$;
revoke all on all tables in schema marketplace79 from public,anon,authenticated,service_role;
revoke all on all functions in schema marketplace79 from public,anon,authenticated,service_role;
grant usage on schema marketplace79 to service_role;
grant execute on function marketplace79.stage(text,text,bigint,timestamptz,jsonb,jsonb) to service_role;
commit;

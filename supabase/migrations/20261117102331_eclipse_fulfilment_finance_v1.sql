-- ECLIPSE staging candidate; no catalogues, order facts or financial revisions are rewritten.
create schema eclipse_finance;
revoke all on schema eclipse_finance from public,anon,authenticated,service_role;
create table eclipse_finance.fulfilment_settings(
 id boolean primary key default true check(id), revision integer not null default 0,
 items jsonb not null default '[]', presets jsonb not null default '[]',
 updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
insert into eclipse_finance.fulfilment_settings default values;
alter table eclipse_finance.fulfilment_settings enable row level security;
revoke all on eclipse_finance.fulfilment_settings from public,anon,authenticated,service_role;

create function eclipse_finance.item_id(val text) returns boolean language sql immutable set search_path='' as $$
 select coalesce(val ~ '^[a-z][a-z0-9-]{1,29}$',false);
$$;
create function eclipse_finance.whole(val jsonb,lowest int,highest int) returns integer language plpgsql immutable set search_path='' as $$
begin
 if jsonb_typeof(val) is distinct from 'number' or val::text !~ '^[0-9]{1,8}$' or (val::text)::int not between lowest and highest
 then raise exception 'Invalid fulfilment quantity or unit cost' using errcode='22023';end if;
 return (val::text)::int;
end $$;

create function public.eclipse_fulfilment_library() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.command63_finance_actor();
 return (select jsonb_build_object('revision',revision,'items',items,'presets',presets) from eclipse_finance.fulfilment_settings where id);
end $$;
create function public.eclipse_save_fulfilment_library(p_revision integer,p_items jsonb,p_presets jsonb) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='2s' set statement_timeout='6s' as $$
declare s eclipse_finance.fulfilment_settings%rowtype; actor uuid:=public.command63_finance_actor(); i jsonb; p jsonb; link jsonb; key text; ids text[]:='{}'; preset_ids text[]:='{}'; links text[];
begin
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_typeof(p_presets) is distinct from 'array' or
  octet_length(p_items::text)+octet_length(p_presets::text)>16000 or jsonb_array_length(p_items)>32 or jsonb_array_length(p_presets)>12 then
  raise exception 'The fulfilment library exceeds its supported size' using errcode='22023';
 end if;
 select * into strict s from eclipse_finance.fulfilment_settings where id for update;
 if p_revision is distinct from s.revision then raise exception 'Library changed; reload before saving' using errcode='40001';end if;
 for i in select value from jsonb_array_elements(p_items) loop
  perform public.command63_finance_keys(i,array['id','name','unitMinor','quantity','active']);
  key:=i->>'id';perform public.command63_finance_text(i->'name',60,true);
  if not eclipse_finance.item_id(key) or key=any(ids) or jsonb_typeof(i->'active') is distinct from 'boolean' then
   raise exception 'Invalid or duplicate consumable' using errcode='22023';end if;
  perform eclipse_finance.whole(i->'unitMinor',0,99999),eclipse_finance.whole(i->'quantity',1,99);
  ids:=array_append(ids,key);
 end loop;
 for p in select value from jsonb_array_elements(p_presets) loop
  perform public.command63_finance_keys(p,array['id','name','kind','active','items']);
  key:=p->>'id';perform public.command63_finance_text(p->'name',60,true);
  if not eclipse_finance.item_id(key) or key=any(preset_ids) or coalesce(p->>'kind','') not in ('component','potentiometer','kit','other')
   or jsonb_typeof(p->'active') is distinct from 'boolean' or jsonb_typeof(p->'items') is distinct from 'array'
   or jsonb_array_length(p->'items') not between 1 and 12 then
   raise exception 'Invalid or duplicate packaging preset' using errcode='22023';end if;
  preset_ids:=array_append(preset_ids,key);links:='{}';
  for link in select value from jsonb_array_elements(p->'items') loop
   perform public.command63_finance_keys(link,array['itemId','quantity']);
   key:=link->>'itemId';
   if not eclipse_finance.item_id(key) or not(key=any(ids)) or key=any(links)
    or ((p->>'active')::boolean and not exists(select 1 from jsonb_array_elements(p_items) i0 where i0->>'id'=key and (i0->>'active')::boolean))
   then raise exception 'Preset uses an unavailable or duplicate consumable' using errcode='22023';end if;
   links:=array_append(links,key);perform eclipse_finance.whole(link->'quantity',1,99);
  end loop;
 end loop;
 update eclipse_finance.fulfilment_settings set revision=revision+1,items=p_items,presets=p_presets,
  updated_by=actor,updated_at=clock_timestamp() where id;
 return public.eclipse_fulfilment_library();
end $$;

-- Preserve packaging items, unit prices, quantities and provenance in the
-- existing immutable financial revision document. Older documents remain valid.
create function eclipse_finance.valid_snapshot(p_document jsonb) returns void
language plpgsql set search_path='' as $$
declare snap jsonb:=p_document->'fulfilmentSnapshot'; item jsonb; total bigint:=0; ids text[]:='{}'; key text;
begin
 if snap is null then return;end if;
 perform public.command63_finance_keys(snap,array['presetId','presetName','libraryRevision','items']);
 if not eclipse_finance.item_id(snap->>'presetId') then raise exception 'Invalid preset snapshot' using errcode='22023';end if;
 perform public.command63_finance_text(snap->'presetName',60,true);
 perform eclipse_finance.whole(snap->'libraryRevision',0,99999999);
 if jsonb_typeof(snap->'items') is distinct from 'array' or jsonb_array_length(snap->'items') not between 1 and 20 then
  raise exception 'Invalid snapshot item count' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(snap->'items') loop
  perform public.command63_finance_keys(item,array['id','name','unitMinor','quantity']);
  key:=item->>'id';if not eclipse_finance.item_id(key) or key=any(ids) then
   raise exception 'Invalid or duplicate snapshot item' using errcode='22023';end if;
  ids:=array_append(ids,key);perform public.command63_finance_text(item->'name',60,true);
  total:=total+eclipse_finance.whole(item->'unitMinor',0,99999)::bigint*eclipse_finance.whole(item->'quantity',1,99);
 end loop;
 if total is distinct from public.command63_finance_number(p_document#>'{costs,packaging,minor}',true)
  or coalesce(p_document#>>'{costs,packaging,state}','') not in ('estimated','confirmed') then
  raise exception 'Packaging total and evidence must match the snapshot' using errcode='22023';end if;
end $$;

do $$
declare src text; signature text;
 anchor text:=$p$'returnCostCredit','provenance']);$p$;
 old_order text:=$p$if not found or o.sales_channel='WEBSITE' then raise exception 'Existing external order required' using errcode='22023';end if;$p$;
 new_order text:=$p$if not found or (o.sales_channel='WEBSITE' and (o.paid_at is null or o.stripe_payment_intent_id is null or o.payment_status not in ('paid','partially_refunded','refunded'))) then raise exception 'A recorded external sale or verified website payment is required' using errcode='22023';end if;$p$;
 old_batch text:=$p$o.sales_channel<>'WEBSITE'$p$;
begin
 src:=pg_get_functiondef('public.command63_finance_validate(jsonb,jsonb,text)'::regprocedure);
 if (length(src)-length(replace(src,anchor,'')))<>length(anchor) then raise exception 'Financial validator contract changed';end if;
 execute replace(src,anchor,$p$'returnCostCredit','provenance','fulfilmentSnapshot']);
 perform eclipse_finance.valid_snapshot(p_document);$p$);
 foreach signature in array array['public.command63_financial_read(uuid)','public.command63_financial_save(uuid,bigint,text,uuid,jsonb)']
 loop
  src:=pg_get_functiondef(signature::regprocedure);
  if (length(src)-length(replace(src,old_order,'')))<>length(old_order) then raise exception 'Financial order contract changed: %',signature;end if;
  execute replace(src,old_order,new_order);
 end loop;
 src:=pg_get_functiondef('public.command63_financial_batch(uuid[])'::regprocedure);
 if (length(src)-length(replace(src,old_batch,'')))<>length(old_batch) then raise exception 'Financial batch contract changed';end if;
 execute replace(src,old_batch,$p$(o.sales_channel<>'WEBSITE' or (o.paid_at is not null and o.stripe_payment_intent_id is not null and o.payment_status in ('paid','partially_refunded','refunded')))$p$);
end $$;

revoke all on all functions in schema eclipse_finance from public,anon,authenticated,service_role;
revoke all on function public.eclipse_fulfilment_library(),public.eclipse_save_fulfilment_library(integer,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.eclipse_fulfilment_library(),public.eclipse_save_fulfilment_library(integer,jsonb,jsonb) to authenticated;

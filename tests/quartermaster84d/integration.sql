alter table quartermaster84w.staff add column can_approve_finance boolean not null default false;
create table quartermaster84w.finance_receipts (
  actor uuid not null references auth.users,
  request_id uuid not null,
  order_id uuid not null references public.orders,
  inputs jsonb not null,
  result jsonb not null,
  primary key(actor,request_id)
);
alter table quartermaster84w.finance_receipts enable row level security;
revoke all on quartermaster84w.finance_receipts from public,anon,authenticated,service_role;

create function public.quartermaster84d_access() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  member uuid := ironclad69.actor();
  seats quartermaster84w.staff%rowtype;
  gate text;
begin
  select mode into strict gate from quartermaster84w.gate where singleton;
  select * into seats from quartermaster84w.staff where user_id=member;
  return jsonb_build_object('mode',gate,
    'packing',coalesce(seats.can_pack or seats.can_receive or seats.can_record_postage,false),
    'receive',coalesce(seats.can_receive,false),'finance',coalesce(seats.can_approve_finance,false));
end $$;

create function public.quartermaster84d_suppliers() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  perform quartermaster84w.actor('receive');
  perform quartermaster84w.check_mode(false);
  return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name,id),'[]')
    from (select id,left(name,120) as name from ironclad69.suppliers
      where active order by name,id limit 100) directory);
end $$;

create function quartermaster84w.finance_actor() returns uuid
language plpgsql stable set search_path='' as $$
declare member uuid:=ironclad69.actor();
begin
  if not exists(select from quartermaster84w.staff where user_id=member and can_approve_finance) then
    raise exception 'Finance approval role required' using errcode='42501';
  end if;
  return member;
end $$;

create function quartermaster84w.finance_proposal(p_order uuid) returns jsonb
language plpgsql stable set search_path='' as $$
declare
  packed quartermaster79.packing%rowtype;
  postage quartermaster79.postage_evidence%rowtype;
  movement bigint;
  book jsonb;
  saved jsonb;
  proposed jsonb;
  inputs jsonb;
begin
  perform quartermaster84w.finance_actor();
  if (select mode from quartermaster84w.gate where singleton) is distinct from 'workshop' then
    raise exception 'Finance approval unavailable' using errcode='42501';
  end if;
  select * into packed from quartermaster79.packing where order_id=p_order and state='packed';
  if not found then return jsonb_build_object('state','needs-pack'); end if;
  select * into postage from quartermaster79.postage_evidence where order_id=p_order;
  if not found then return jsonb_build_object('state','needs-postage'); end if;
  select id into strict movement from quartermaster79.movement where order_id=p_order and kind='packed';
  book:=public.command63_financial_read(p_order);
  saved:=book->'document';
  if jsonb_typeof(saved) is distinct from 'object' then return jsonb_build_object('state','needs-record'); end if;
  if book->>'orderBasisMatches' is distinct from 'true' or
    (saved ? 'fulfilmentSnapshot' and saved->'fulfilmentSnapshot'<>'null'::jsonb) then
    return jsonb_build_object('state','needs-finance-review');
  end if;
  proposed:=jsonb_set(saved,'{costs,packaging}',jsonb_build_object('minor',packed.actual_material_minor,
    'state','confirmed','source','QUARTERMASTER movement '||movement));
  proposed:=jsonb_set(proposed,'{costs,shipping}',jsonb_build_object('minor',postage.minor,
    'state','confirmed','source','QUARTERMASTER postage '||postage.id));
  if proposed=saved then return jsonb_build_object('state','already-recorded'); end if;
  inputs:=jsonb_build_object('movement',movement,'postage',postage.id,'document',proposed);
  return jsonb_build_object('state','ready','packaging',packed.actual_material_minor,'postage',postage.minor,
    'revision',book->'revision','basis',book->'orderBasisHash','document',proposed,
    'evidence',encode(sha256(convert_to(inputs::text,'UTF8')),'hex'));
end $$;

create function public.quartermaster84d_finance_proposal(p_order uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select quartermaster84w.finance_proposal(p_order) - 'document';
$$;

create function public.quartermaster84d_finance_save(p_order uuid,p_revision bigint,p_basis text,p_evidence text,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  member uuid:=quartermaster84w.finance_actor();
  proposal jsonb;
  receipt quartermaster84w.finance_receipts%rowtype;
  inputs jsonb:=jsonb_build_object('order',p_order,'revision',p_revision,'basis',p_basis,'evidence',p_evidence);
  outcome jsonb;
begin
  if p_request is null or p_order is null or p_revision is null or p_revision not between 1 and 999999999
    or coalesce(p_basis,'') !~ '^[0-9a-f]{64}$' or coalesce(p_evidence,'') !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid finance approval' using errcode='22023';
  end if;
  -- Use the same gate-before-order lock ordering as packing commands.
  perform quartermaster84w.check_mode(false);
  perform 1 from public.orders where id=p_order for update;
  select * into receipt from quartermaster84w.finance_receipts where actor=member and request_id=p_request;
  if found then
    if receipt.inputs is distinct from inputs then raise exception 'Request already used' using errcode='22023'; end if;
    return receipt.result;
  end if;
  proposal:=quartermaster84w.finance_proposal(p_order);
  if proposal->>'state' is distinct from 'ready' or proposal->>'evidence' is distinct from p_evidence
    or proposal->>'basis' is distinct from p_basis or (proposal->>'revision')::bigint is distinct from p_revision then
    raise exception 'Finance evidence changed' using errcode='40001';
  end if;
  outcome:=public.command63_financial_save(p_order,p_revision,p_basis,p_request,proposal->'document');
  insert into quartermaster84w.finance_receipts values(member,p_request,p_order,inputs,outcome);
  return outcome;
end $$;

create function public.quartermaster84d_finance_status(p_order uuid,p_request uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare member uuid:=quartermaster84w.finance_actor();
begin
  return (select result from quartermaster84w.finance_receipts
    where actor=member and order_id=p_order and request_id=p_request);
end $$;

revoke all on all functions in schema quartermaster84w from public,anon,authenticated,service_role;
revoke all on function public.quartermaster84d_access(),public.quartermaster84d_suppliers(),
  public.quartermaster84d_finance_proposal(uuid),public.quartermaster84d_finance_save(uuid,bigint,text,text,uuid),
  public.quartermaster84d_finance_status(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.quartermaster84d_access(),public.quartermaster84d_suppliers(),
  public.quartermaster84d_finance_proposal(uuid),public.quartermaster84d_finance_save(uuid,bigint,text,text,uuid),
  public.quartermaster84d_finance_status(uuid,uuid) to authenticated;

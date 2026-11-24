create table quartermaster84c.finance_receipts(
 actor uuid not null references auth.users, request_id uuid not null,
 order_id uuid not null references quartermaster84c.fixture_orders,
 inputs jsonb not null, result jsonb not null,
 primary key(actor,request_id)
);
alter table quartermaster84c.finance_receipts enable row level security;
revoke all on quartermaster84c.finance_receipts from public,anon,authenticated,service_role;

create function quartermaster84c.finance_actor(approval boolean) returns uuid
language plpgsql stable set search_path='' as $$
declare member uuid:=quartermaster84c.actor();
begin
 if not exists(select from quartermaster84c.finance_staff s where s.user_id=member and case when approval then can_approve else can_review end) then
  raise exception 'Finance review or approval role required' using errcode='42501';
 end if;
 if approval then perform ironclad69.actor(); end if;
 return member;
end
$$;

create function public.quartermaster84c_orders() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare member uuid:=quartermaster84c.actor();
begin
 return jsonb_build_object('subject',member,'orders',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'reference',o.reference) order by o.reference),'[]')
   from quartermaster84c.fixture_orders f join public.orders o on o.id=f.id),
   'writer',exists(select from quartermaster84w.staff s where s.user_id=member),
   'finance',exists(select from quartermaster84c.finance_staff s where s.user_id=member and can_review),
   'financeApprove',exists(select from quartermaster84c.finance_staff s where s.user_id=member and can_approve));
end
$$;

create function public.quartermaster84c_suppliers() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform quartermaster84w.actor('receive');
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by id),'[]')
   from (select s.id,s.name from quartermaster84c.fixture_suppliers f join ironclad69.suppliers s using(id)
     where s.active order by s.id limit 20) directory);
end
$$;

create function public.quartermaster84c_finance_proposal(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 member uuid:=quartermaster84c.finance_actor(false);
 o public.orders%rowtype;
 book jsonb;
 document jsonb;
 packed quartermaster79.packing%rowtype;
 movement quartermaster79.movement%rowtype;
 postage quartermaster79.postage_evidence%rowtype;
 evidence jsonb;
begin
 perform quartermaster84c.require_order(p_order);
 select * into strict o from public.orders where id=p_order;
 if exists(select from quartermaster84c.finance_staff where user_id=member and can_approve) then
   book:=public.command63_financial_read(p_order);
 else
   select jsonb_build_object('revision',coalesce(f.revision,0),'document',f.document,
     'orderBasisHash',public.command63_finance_basis(o),
     'orderBasisMatches',f.order_basis_hash is null or f.order_basis_hash=public.command63_finance_basis(o))
     into book from (select true) anchor left join public.order_financial_records f on f.order_id=p_order;
 end if;
 if book is null then raise exception 'Existing finance authority unavailable' using errcode='42501'; end if;
 select * into packed from quartermaster79.packing where order_id=p_order and state='packed';
 if not found then return jsonb_build_object('state','waiting-for-packing'); end if;
 select * into strict movement from quartermaster79.movement where order_id=p_order and kind='packed';
 select * into postage from quartermaster79.postage_evidence where order_id=p_order;
 evidence:=jsonb_build_object('movement',movement.id,'packaging',packed.actual_material_minor,
   'estimate',packed.estimated_postage_minor,'actual',postage.minor,'postage',postage.id);
 document:=book->'document';
 if jsonb_typeof(document) is distinct from 'object' then
   -- Seed facts are authorised for these four synthetic order identities only.
   document:=jsonb_build_object(
    'policyVersion','marketplace-contribution-v2','currency',o.currency,'paymentBreakdownBasis','customer_gross',
    'actualPaidMinor',o.total_pence,'postageMinor',o.delivery_pence,'marketplaceTaxMinor',0,
    'marketplaceTaxState','confirmed','marketplaceTaxSource','84C synthetic direct order',
    'discount',jsonb_build_object('kind','none','minor',0,'percentage',''),
    'lines',(select jsonb_agg(jsonb_build_object('id','line-'||(k-1)::text,'label',i->>'name',
      'productId',i->>'productId','quantity',(i->>'quantity')::integer,'unitPriceMinor',(i->>'unitPrice')::bigint,
      'priceBasis','net','discountMinor',0,'unitCostMicro',250000,'costState','confirmed',
      'costSource','84C fixture component acquisition') order by k) from jsonb_array_elements(o.items) with ordinality q(i,k)),
    'fees','[]'::jsonb,'feesComplete',true,
    'costs',jsonb_build_object('other',jsonb_build_object('minor',0,'state','confirmed','source','84C fixture other costs'),
      'labour',jsonb_build_object('state','excluded')),
    'tax',jsonb_build_object('state','not_applicable','minor',null,'source','84C synthetic order'),
    'settlement',jsonb_build_object('minor',null,'state','unknown','source','','adjustmentMinor',0,'adjustmentSource',''),
    'adjustments',case when o.refunded_pence>0 then jsonb_build_array(jsonb_build_object('id','recorded-refund',
        'kind','refund','minor',o.refunded_pence,'state','confirmed','source','84C recorded refund')) else '[]'::jsonb end);
 elsif document ? 'fulfilmentSnapshot' and document->'fulfilmentSnapshot'<>'null'::jsonb then
   raise exception 'An itemised finance snapshot already exists. Review the correction in Orders.' using errcode='22023';
 end if;
 document:=jsonb_set(document,'{costs,packaging}',
   jsonb_build_object('minor',packed.actual_material_minor,'state','confirmed','source','QUARTERMASTER movement '||movement.id));
 document:=jsonb_set(document,'{costs,shipping}',case
   when postage.id is not null then jsonb_build_object('minor',postage.minor,'state','confirmed','source','QUARTERMASTER postage '||postage.id)
   when packed.estimated_postage_minor is not null then jsonb_build_object('minor',packed.estimated_postage_minor,
      'state','estimated','source','QUARTERMASTER estimate for movement '||movement.id)
   else jsonb_build_object('minor',null,'state','unknown','source','') end);
 perform public.command63_finance_validate(document,o.items,o.currency);
 return jsonb_build_object('state','unsaved','canApprove',exists(select from quartermaster84c.finance_staff s
      where s.user_id=member and can_approve) and postage.id is not null and book->>'orderBasisMatches'='true',
   'revision',book->'revision','orderBasisHash',book->'orderBasisHash',
   'evidenceHash',encode(sha256(convert_to(evidence::text,'UTF8')),'hex'),'evidence',evidence,
   'document',document,'saved',book->'document','history',book->'history');
end
$$;

create function public.quartermaster84c_finance_save(p_order uuid,p_revision bigint,p_basis text,p_evidence text,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 member uuid:=quartermaster84c.finance_actor(true);
 proposal jsonb;
 receipt quartermaster84c.finance_receipts%rowtype;
 arguments jsonb:=jsonb_build_object('order',p_order,'revision',p_revision,'basis',p_basis,'evidence',p_evidence);
 outcome jsonb;
 current_mode text;
begin
 perform quartermaster84c.require_order(p_order);
 select mode into strict current_mode from quartermaster84w.gate where singleton for share;
 if current_mode <> 'workshop' then raise exception 'Finance approval is locked for this rehearsal' using errcode='42501'; end if;
 if p_request is null or p_revision is null or p_revision not between 0 and 999999999
    or coalesce(p_basis,'') !~ '^[0-9a-f]{64}$' or coalesce(p_evidence,'') !~ '^[0-9a-f]{64}$' then
   raise exception 'Review the exact finance proposal' using errcode='22023';
 end if;
 perform 1 from public.orders where id=p_order for update;
 select * into receipt from quartermaster84c.finance_receipts where actor=member and request_id=p_request;
 if found then
   if receipt.inputs is distinct from arguments then raise exception 'Finance request already used' using errcode='22023'; end if;
   return receipt.result||jsonb_build_object('idempotent',true);
 end if;
 proposal:=public.quartermaster84c_finance_proposal(p_order);
 if (proposal->>'canApprove')::boolean is not true or proposal->>'evidenceHash' is distinct from p_evidence then
  raise exception 'Verified packing and postage evidence changed or is incomplete' using errcode='40001';
 end if;
 outcome:=public.command63_financial_save(p_order,p_revision,p_basis,p_request,proposal->'document');
 insert into quartermaster84c.finance_receipts(actor,request_id,order_id,inputs,result)
   values(member,p_request,p_order,arguments,outcome);
 return outcome;
end
$$;

create function public.quartermaster84c_finance_status(p_order uuid,p_request uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare member uuid:=quartermaster84c.finance_actor(true);
begin
 perform quartermaster84c.require_order(p_order);
 return (select result from quartermaster84c.finance_receipts
     where actor=member and order_id=p_order and request_id=p_request);
end
$$;

create function public.quartermaster84c_omniscience(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare o public.orders%rowtype;
begin
 perform quartermaster84c.finance_actor(true);
 perform quartermaster84c.require_order(p_order);
 select * into strict o from public.orders where id=p_order;
 return (select row from jsonb_array_elements(public.omniscience74_orders(o.order_date,o.order_date,null,null)->'rows') row
   where row->>'id'=p_order::text);
end
$$;
revoke all on all functions in schema quartermaster84c from public,anon,authenticated,service_role;
revoke all on function public.quartermaster84c_orders(),public.quartermaster84c_suppliers(),
 public.quartermaster84c_finance_proposal(uuid),public.quartermaster84c_finance_save(uuid,bigint,text,text,uuid),
 public.quartermaster84c_finance_status(uuid,uuid),public.quartermaster84c_omniscience(uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.quartermaster84c_orders(),public.quartermaster84c_suppliers(),
 public.quartermaster84c_finance_proposal(uuid),public.quartermaster84c_finance_save(uuid,bigint,text,text,uuid),
 public.quartermaster84c_finance_status(uuid,uuid),public.quartermaster84c_omniscience(uuid) to authenticated;

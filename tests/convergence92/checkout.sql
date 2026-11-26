create function public.convergence92_prepare(p_order uuid,p_owner text,p_expiration bigint)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare
 o public.orders%rowtype;
 saved convergence87.checkout_plans%rowtype;
 fingerprint text;
begin
 select * into strict o from public.orders where id=p_order for update;
 select * into saved from convergence87.checkout_plans where order_id=p_order for update;
 if found then
  if saved.account<>'acct_1UJURLIeVWpsCl5X' or saved.currency<>o.currency or saved.expected_minor<>o.total_pence then
   raise exception 'Existing checkout needs review' using errcode='23514';
  end if;
 else
  if p_expiration is null or p_expiration-extract(epoch from clock_timestamp()) not between 2100 and 7200
    or o.total_pence not between 1 and 100000000 or o.currency<>'GBP'
    or o.stripe_checkout_session_id is not null then
   raise exception 'A new checkout plan cannot be created' using errcode='22023';
  end if;
  fingerprint:=encode(sha256(convert_to(format('["%s","acct_1UJURLIeVWpsCl5X","GBP",%s,%s]',
    o.id,o.total_pence,p_expiration),'UTF8')),'hex');
  insert into convergence87.checkout_plans(order_id,account,currency,expected_minor,expiration,binding)
   values(o.id,'acct_1UJURLIeVWpsCl5X','GBP',o.total_pence,p_expiration,fingerprint)
   returning * into saved;
 end if;
 perform dominion79.reserve(o.id,p_owner,to_timestamp(saved.expiration));
 return jsonb_build_object('orderId',o.id,'reference',o.reference,'account',saved.account,'currency',saved.currency,
  'expectedMinor',saved.expected_minor,'expiration',saved.expiration,'binding',saved.binding,
  'idempotencyKey','apparition79/'||saved.binding,'sessionId',saved.session_id,'mode','sandbox','intent',saved.intent);
end $$;

create function public.convergence92_attach(p_order uuid,p_binding text,p_session text)
returns boolean language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare o public.orders%rowtype; saved convergence87.checkout_plans%rowtype;
begin
 select * into strict o from public.orders where id=p_order for update;
 select * into strict saved from convergence87.checkout_plans where order_id=p_order for update;
 if p_binding is null or saved.binding<>p_binding or p_session is null
    or p_session !~ '^cs_test_[A-Za-z0-9]{8,128}$'
    or (saved.session_id is not null and saved.session_id<>p_session)
    or (o.stripe_checkout_session_id is not null and o.stripe_checkout_session_id<>p_session)
    or saved.expected_minor<>o.total_pence or saved.currency<>o.currency then
  raise exception 'Checkout attachment conflict' using errcode='23505';
 end if;
 update convergence87.checkout_plans set session_id=p_session where order_id=p_order;
 update public.orders set stripe_checkout_session_id=p_session,updated_at=clock_timestamp()
  where id=p_order and stripe_checkout_session_id is null;
 return true;
end $$;
revoke all on function public.convergence92_prepare(uuid,text,bigint),
 public.convergence92_attach(uuid,text,text) from public,anon,authenticated;
grant execute on function public.convergence92_prepare(uuid,text,bigint),
 public.convergence92_attach(uuid,text,text) to service_role;

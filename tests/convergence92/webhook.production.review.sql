-- Production review only.
create schema convergence92;
revoke all on schema convergence92 from public,anon,authenticated,service_role;
create table convergence92.receipts(
 event_id text primary key,
 event_type text not null,
 order_id uuid not null references public.orders(id),
 fingerprint bytea not null,
 outcome text not null,
 observed_at timestamptz not null default clock_timestamp()
);
alter table convergence92.receipts enable row level security;
revoke all on convergence92.receipts from public,anon,authenticated,service_role;

create function public.convergence92_receive(p_raw text,p_signature text)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='10s' as $$
declare
 fields text[]; stamp text; candidate text; matched boolean:=false; secret text; expected text;
 event jsonb; object jsonb; plan convergence87.checkout_plans%rowtype;
 order_row public.orders%rowtype; previous convergence92.receipts%rowtype;
 outcome text; fingerprint bytea; checkout boolean; refund boolean; event_at timestamptz;
begin
 if p_raw is null or octet_length(p_raw) not between 1 and 98304
   or p_signature is null or length(p_signature)>4096 then
   raise exception 'Invalid webhook envelope' using errcode='22023';
 end if;
 fields:=string_to_array(p_signature,',');
 if (select count(*) from unnest(fields) f where btrim(f) like 't=%')<>1
   or (select count(*) from unnest(fields) f where btrim(f) like 'v1=%') not between 1 and 10 then
   raise exception 'Invalid signature' using errcode='28000';
 end if;
 select substring(btrim(f) from 3) into stamp from unnest(fields) f where btrim(f) like 't=%';
 if stamp !~ '^[0-9]{9,12}$' or abs(extract(epoch from clock_timestamp())-stamp::bigint)>300 then
   raise exception 'Expired signature' using errcode='28000';
 end if;
 select decrypted_secret into strict secret from vault.decrypted_secrets where name='convergence92_webhook';
 if secret !~ '^whsec_[A-Za-z0-9_]{8,200}$' then raise exception 'Webhook custody unavailable'; end if;
 expected:=encode(extensions.hmac(convert_to(stamp||'.'||p_raw,'UTF8'),convert_to(secret,'UTF8'),'sha256'),'hex');
 for candidate in select substring(btrim(f) from 4) from unnest(fields) f where btrim(f) like 'v1=%' loop
   if candidate ~ '^[a-fA-F0-9]{64}$' and lower(candidate)=expected then matched:=true; end if;
 end loop;
 if not matched then raise exception 'Invalid signature' using errcode='28000'; end if;
 event:=p_raw::jsonb;
 if event->>'object' is distinct from 'event' or event->'livemode' is distinct from 'true'::jsonb
   or coalesce(event->>'id','') !~ '^evt_[A-Za-z0-9]{8,128}$'
   or (event ? 'account' and event->>'account' is distinct from 'acct_1UJUR9I4E9fIeEmD')
   or coalesce(event->>'created','') !~ '^[0-9]{9,12}$' then
   raise exception 'Sandbox event required' using errcode='22023';
 end if;
 checkout:=event->>'type' in ('checkout.session.completed','checkout.session.async_payment_succeeded',
   'checkout.session.expired','checkout.session.async_payment_failed');
 refund:=event->>'type' in ('refund.created','refund.updated');
 if not checkout and not refund then return jsonb_build_object('outcome','ignored'); end if;
 object:=event#>'{data,object}';
 if (checkout and object->'livemode' is distinct from 'true'::jsonb)
   or (refund and object ? 'livemode' and object->'livemode' is distinct from 'true'::jsonb) then
  raise exception 'Sandbox object required' using errcode='22023';
 end if;
 if checkout then
   if object->>'object' is distinct from 'checkout.session' or coalesce(object->>'id','') !~ '^cs_live_[A-Za-z0-9]{8,128}$' then
    raise exception 'Invalid checkout event' using errcode='22023'; end if;
   select * into plan from convergence87.checkout_plans where session_id=object->>'id';
 else
   if object->>'object' is distinct from 'refund' or coalesce(object->>'payment_intent','') !~ '^pi_[A-Za-z0-9]{8,128}$' then
    raise exception 'Invalid refund event' using errcode='22023'; end if;
   select * into plan from convergence87.checkout_plans where intent=object->>'payment_intent';
 end if;
 if plan.order_id is null then return jsonb_build_object('outcome','unattached'); end if;
 select * into strict order_row from public.orders where id=plan.order_id for update;
 select * into strict plan from convergence87.checkout_plans where order_id=order_row.id for update;
 if plan.account<>'acct_1UJUR9I4E9fIeEmD' or plan.currency<>'GBP'
   or plan.expected_minor<>order_row.total_pence or plan.session_id is distinct from order_row.stripe_checkout_session_id then
   raise exception 'Stored plan binding changed' using errcode='23514';
 end if;
 fingerprint:=sha256(convert_to(jsonb_build_array(
   event->'id',event->'type',event->'created',plan.order_id,plan.account,
   object->'object',object->'id',object->'client_reference_id',object#>'{metadata,dominion_binding}',
   object->'amount_total',object->'amount',object->'currency',object->'payment_status',
   object->'status',object->'payment_intent',object->'created'
 )::text,'UTF8'));
 select * into previous from convergence92.receipts where event_id=event->>'id';
 if found then
   if previous.fingerprint<>fingerprint or previous.order_id<>plan.order_id then
    raise exception 'Event identity conflict' using errcode='23505'; end if;
   return jsonb_build_object('outcome','duplicate');
 end if;
 event_at:=to_timestamp((event->>'created')::bigint);
 if checkout then
   if object->>'client_reference_id' is distinct from plan.order_id::text
    or object#>>'{metadata,dominion_binding}' is distinct from plan.binding
    or object->'amount_total' is distinct from to_jsonb(plan.expected_minor)
    or object->>'currency' is distinct from 'gbp' then
    raise exception 'Checkout does not match saved plan' using errcode='23514'; end if;
   if event->>'type'='checkout.session.async_payment_failed' then
     return jsonb_build_object('outcome','failed-awaiting-provider');
   elsif event->>'type'='checkout.session.expired' then
     if object->>'status' is distinct from 'expired' or object->>'payment_status' is distinct from 'unpaid' then
      raise exception 'Unpaid expiry required' using errcode='23514'; end if;
     outcome:=dominion79.release_verified(plan.order_id,plan.session_id,'expired-unpaid');
   elsif object->>'status'='complete' and object->>'payment_status'='paid' then
     if coalesce(object->>'payment_intent','') !~ '^pi_[A-Za-z0-9]{8,128}$'
       or plan.intent is not null and plan.intent is distinct from object->>'payment_intent' then
      raise exception 'Payment identity conflict' using errcode='23514'; end if;
     outcome:=dominion79.consume(plan.order_id,plan.account,event->>'id',order_row.reference,
       plan.session_id,object->>'payment_intent',plan.expected_minor,'gbp');
     update convergence87.checkout_plans set intent=object->>'payment_intent' where order_id=plan.order_id;
   else return jsonb_build_object('outcome','awaiting-payment');
   end if;
 else
   if object->>'status' is distinct from 'succeeded' then return jsonb_build_object('outcome','awaiting-refund'); end if;
   if object->>'currency' is distinct from 'gbp' or coalesce(object->>'amount','') !~ '^[0-9]{1,9}$'
     or (object->>'amount')::bigint not between 1 and plan.expected_minor
     or coalesce(object->>'created','') !~ '^[0-9]{9,12}$' then
     raise exception 'Refund does not match payment' using errcode='23514';
   end if;
   outcome:=public.record_verified_stripe_refund(event->>'id',event->>'type',object->>'id',
     plan.intent,(object->>'amount')::bigint,'gbp','succeeded',to_timestamp((object->>'created')::bigint),event_at);
 end if;
 insert into convergence92.receipts(event_id,event_type,order_id,fingerprint,outcome)
 values(event->>'id',event->>'type',plan.order_id,fingerprint,outcome);
 return jsonb_build_object('outcome',outcome);
end $$;
revoke all on function public.convergence92_receive(text,text) from public,anon,authenticated;
grant execute on function public.convergence92_receive(text,text) to service_role;

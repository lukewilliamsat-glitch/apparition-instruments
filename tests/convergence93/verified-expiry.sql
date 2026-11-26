create or replace function dominion79.release_verified(p_order uuid,p_session text,p_provider_state text) returns text
language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype;h dominion79.holds%rowtype; next_state text;
begin
 select * into strict o from public.orders where id=p_order for update;
 select * into strict h from dominion79.holds where order_id=p_order for update;
 if p_session is null or p_session is distinct from o.stripe_checkout_session_id or coalesce(p_provider_state,'') not in ('expired-unpaid','cancelled-unpaid')
 then raise exception 'Verified attached unpaid session required';end if;
 if h.state='consumed' or o.payment_status<>'unpaid' then raise exception 'Paid order cannot release stock';end if;
 next_state:=case when p_provider_state='expired-unpaid' then 'expired' else 'released' end;
 if h.state<>'held' then
  if h.state=next_state then return h.state;else raise exception 'Already resolved by another provider state';end if;
 end if;
 -- Signed/provider-verified unpaid expiry is authoritative, including early expiry.
 perform dominion79.locks(h.components);
 delete from dominion79.active_units where order_id=p_order;
 update dominion79.holds set state=next_state,resolved_at=clock_timestamp() where order_id=p_order;
 return next_state;
end $$;
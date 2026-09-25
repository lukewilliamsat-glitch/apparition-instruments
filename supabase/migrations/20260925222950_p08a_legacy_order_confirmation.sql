-- Single, explicit recovery of the pre-email live test Order. No payment or stock writes.
create function public.claim_legacy_test_order_confirmation(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; claim uuid;
begin
 select * into o from public.orders where id=p_order_id and reference='AI-010010' for update;
 if not found or o.payment_status<>'paid' or o.paid_at is null or o.fulfillment_applied_at is null
    or o.confirmation_email_status<>'legacy' or nullif(o.customer->>'email','') is null
    or jsonb_typeof(o.items)<>'array' or jsonb_array_length(o.items)=0 then return null; end if;
 claim:=gen_random_uuid();
 update public.orders set confirmation_email_status='sending',confirmation_email_claim_id=claim,
   confirmation_email_last_attempt_at=now(),confirmation_email_attempts=confirmation_email_attempts+1
 where id=p_order_id;
 return jsonb_build_object('claim',claim,'order',to_jsonb(o));
end;
$$;
revoke all on function public.claim_legacy_test_order_confirmation(uuid) from public, anon, authenticated;
grant execute on function public.claim_legacy_test_order_confirmation(uuid) to service_role;

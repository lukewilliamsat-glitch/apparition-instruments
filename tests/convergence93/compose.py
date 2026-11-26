from pathlib import Path
root=Path(__file__).parent
base=root.parent/'convergence92'
contact="""shipping:=coalesce(object#>'{collected_information,shipping_details}',object->'shipping_details');
     perform public.save_stripe_order_contact(plan.order_id,order_row.reference,plan.session_id,object->>'payment_intent',
       jsonb_build_object('name',btrim(object#>>'{customer_details,name}'),'email',btrim(object#>>'{customer_details,email}')),
       jsonb_strip_nulls(jsonb_build_object('recipient',btrim(shipping->>'name'),'line1',btrim(shipping#>>'{address,line1}'),
         'line2',nullif(btrim(shipping#>>'{address,line2}'),''),'city',btrim(shipping#>>'{address,city}'),
         'postcode',btrim(shipping#>>'{address,postal_code}'),'country',shipping#>>'{address,country}')));
     """
legacy="""if plan.order_id is null then
   if checkout and not(coalesce(object->'metadata','{}'::jsonb) ? 'dominion_binding') then
     return jsonb_build_object('outcome','legacy');
   elsif refund and exists(select from public.orders o where o.stripe_payment_intent_id=object->>'payment_intent'
       and not exists(select from convergence87.checkout_plans cp where cp.order_id=o.id)) then
     return jsonb_build_object('outcome','legacy');
   end if;
   return jsonb_build_object('outcome','unattached');
 end if;"""
for source,target in [('webhook.sql','receiver.staging.sql'),('webhook.production.review.sql','receiver.production.review.sql')]:
 s=(base/source).read_text();s=s[s.index('create function public.convergence92_receive'):]
 s=s.replace('create function','create or replace function',1)
 s=s.replace('outcome text; fingerprint bytea;', 'outcome text; shipping jsonb; fingerprint bytea;')
 s=s.replace("if plan.order_id is null then return jsonb_build_object('outcome','unattached'); end if;",legacy)
 s=s.replace('outcome:=dominion79.consume',contact+'outcome:=dominion79.consume')
 (root/target).write_text(s)
legacy_source=(root/'legacy/index.ts').read_text()
marker="return reply(400,'Invalid live Checkout event');"
assert legacy_source.count(marker)==1
legacy_source=legacy_source.replace(marker,marker+"\n if(/^[a-f0-9]{64}$/.test(session.metadata?.dominion_binding||''))return reply(200,'UNITY routed');")
(root/'legacy-router.production.review.ts').write_text(legacy_source)
s=(base/'index.production.review.ts').read_text()
s="import {sendConfirmedOrderOnce} from './legacy/delivery.ts';\n"+s
marker='    return Response.json(result);'
assert s.count(marker)==1
s=s.replace(marker,"""    if(['paid','duplicate'].includes(result.outcome)){
      const event=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
      if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)
        &&event.data?.object?.payment_status==='paid'
        &&!await sendConfirmedOrderOnce(event.data.object.client_reference_id,Deno.env))
        return Response.json({outcome:'email-recovery-required'},{status:503});
    }
"""+marker)
(root/'receiver.production.review.ts').write_text(s)

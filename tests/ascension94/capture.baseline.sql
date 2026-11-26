CREATE OR REPLACE FUNCTION ironclad69.capture_cost(a uuid, d jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare o public.orders%rowtype; b ironclad69.batches%rowtype; line jsonb;
 pos int; qty int; comp text; basis text; ref uuid;
begin
 select * into strict o from public.orders where id=(d->>'orderId')::uuid for share;
 if o.payment_status not in('paid','partially_refunded','refunded') or o.fulfillment_applied_at is null
 then raise exception 'Use a recorded fulfilment, not a quote or unpaid order';end if;
 pos:=ironclad69.integer(d->'lineIndex',0,249);line:=o.items->pos;
 if jsonb_typeof(line) is distinct from 'object' or line->>'type' is distinct from 'component' or line->>'productId' is null
 then raise exception 'The selected order line is not a directly identified component';end if;
 qty:=ironclad69.integer(line->'quantity',1,100000);comp:=line->>'productId';
 select * into strict b from ironclad69.batches where id=(d->>'batchId')::uuid and component_id=comp for share;
 if b.cost_minor is null or (case when b.origin='opening' and b.cost_evidence_date is not null then b.cost_evidence_date>(o.fulfillment_applied_at at time zone 'Europe/London')::date else b.received_at>o.fulfillment_applied_at end) or qty>b.quantity
 then raise exception 'The chosen batch does not provide valid evidence for this sale';end if;
 basis:=d->>'basis';
 insert into ironclad69.cost_snapshots(order_id,line_index,component_id,batch_id,quantity,batch_total_minor,batch_quantity,line_cost_minor,basis,evidence,actor)
 values(o.id,pos,comp,b.id,qty,b.cost_minor,b.quantity,round(b.cost_minor::numeric*qty/b.quantity)::bigint,basis,ironclad69.clean(d->>'evidence',8,300),a)
 returning id into ref;
 return jsonb_build_object('id',ref,'basis',basis);
end $function$

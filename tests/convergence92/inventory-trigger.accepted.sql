CREATE OR REPLACE FUNCTION ironclad69.track_inventory()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare ctx ironclad69.stock_context%rowtype; delta bigint:=new.quantity-old.quantity; needed bigint; retired bigint; b record;
begin
 if not exists(select from ironclad69.tracking where component_id=new.component_id) then return new;end if;
 if new.stock_unit is distinct from old.stock_unit then raise exception 'Tracked inventory must retain its stock unit';end if;
 if delta=0 then return new;end if;
 delete from ironclad69.stock_context where component_id=new.component_id returning * into ctx;
 if delta>0 then
  insert into ironclad69.batches(component_id,origin,receipt_id,line_id,lot,notes,quantity,remaining,cost_minor,evidence)
  values(new.component_id,case when ctx.kind='receipt' then 'receipt' else 'adjustment' end,
   case when ctx.kind='receipt' then ctx.source end,ctx.line_id,coalesce(ctx.lot,''),coalesce(ctx.reason,''),delta,delta,ctx.cost_minor,coalesce(ctx.evidence,''));
 else
  needed:=-delta;
  for b in
   select q.id,q.remaining,count(m.id) filter(where m.quality<>'retired') live,
    count(m.id) filter(where m.quality not in('retired','accepted') or sm.unit_id is not null) protected
   from ironclad69.batches q left join ironclad69.measurements m on m.batch_id=q.id
   left join ironclad69.set_members sm on sm.unit_id=m.id and sm.active
   where q.component_id=new.component_id and q.remaining>0
   group by q.id
   order by case q.origin when 'opening' then 0 when 'adjustment' then 1 else 2 end,q.received_at,q.id
  loop
   delta:=least(b.remaining-b.protected,needed);
   if delta<=0 then continue;end if;
   retired:=greatest(0,delta-(b.remaining-b.live));
   if retired>0 then
    update ironclad69.measurements m set quality='retired' where m.id in(
     select s.id from ironclad69.measurements s where s.batch_id=b.id and s.quality='accepted'
     and not exists(select from ironclad69.set_members sm where sm.unit_id=s.id and sm.active)
     order by s.slot,s.id limit retired);
   end if;
   update ironclad69.batches set remaining=remaining-delta where id=b.id;
   needed:=needed-delta;exit when needed=0;
  end loop;
  if needed>0 then raise exception 'Count would consume allocated or quality-held stock' using errcode='23514';end if;
 end if;
 update ironclad69.tracking set revision=revision+1 where component_id=new.component_id;
 insert into ironclad69.movements(component_id,kind,previous,delta,resulting,reason,actor,source)
 values(new.component_id,coalesce(ctx.kind,'upstream'),old.quantity,new.quantity-old.quantity,new.quantity,
  coalesce(ctx.reason,'Authoritative stock change from existing inventory path; allocation inferred, not physical lot proof'),
  coalesce(ctx.actor,auth.uid()),ctx.source);
 return new;
end $function$
;
CREATE TRIGGER ironclad69_track AFTER UPDATE OF quantity, stock_unit ON public.inventory FOR EACH ROW EXECUTE FUNCTION ironclad69.track_inventory();


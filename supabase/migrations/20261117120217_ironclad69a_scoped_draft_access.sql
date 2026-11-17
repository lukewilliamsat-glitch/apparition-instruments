-- Keep readback scoped to a selected draft and explicitly qualify edit identities.
do $$
declare source text; before_change text; after_change text;
begin
 source:=pg_get_functiondef('public.ironclad69_write(uuid,text,jsonb)'::regprocedure);
 before_change:='where q.id=id;';
 after_change:='where q.id=draft_work.id;';
 if length(source)-length(replace(source,before_change,''))<>length(before_change) then raise exception 'Unexpected purchase editor contract';end if;
 source:=replace(source,before_change,after_change);
 before_change:='where pl.po_id=id;';
 after_change:='where pl.po_id=draft_work.id;';
 if length(source)-length(replace(source,before_change,''))<>length(before_change) then raise exception 'Unexpected draft line editor contract';end if;
 execute replace(source,before_change,after_change);
 source:=pg_get_functiondef('public.ironclad69_read(text,jsonb)'::regprocedure);
 before_change:='where (supplier is null or o.supplier_id=supplier)';
 after_change:='where (selected is null or o.id=selected) and (supplier is null or o.supplier_id=supplier)';
 if length(source)-length(replace(source,before_change,''))<>length(before_change) then raise exception 'Unexpected purchase read contract';end if;
 execute replace(source,before_change,after_change);
end $$;

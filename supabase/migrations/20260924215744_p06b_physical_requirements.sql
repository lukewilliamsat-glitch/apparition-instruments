-- The fixed Assembly BOM remains a historical/Admin buildability snapshot.
-- Physical roles and prices are resolved from the current customer selections.
do $$
declare changed integer;
begin
 update public.kit_definitions
 set defaults=jsonb_set(defaults,'{requirements}','[{"role":"potentiometers","quantity":4,"source":"potentiometers","selectionKeys":["pots","shaft"],"pricing":"relative-to-default"},{"role":"neckToneCapacitor","quantity":1,"source":"capacitors","selectionKeys":["neckCap"],"pricing":"unit"},{"role":"bridgeToneCapacitor","quantity":1,"source":"capacitors","selectionKeys":["bridgeCap"],"pricing":"unit"},{"role":"trebleBleeds","quantity":2,"source":"bleed","selectionKeys":["bleed"],"pricing":"unit"},{"role":"outputJack","quantity":1,"source":"jack","selectionKeys":["jack"],"pricing":"unit"},{"role":"selector","quantity":1,"source":"selector","selectionKeys":["selector"],"pricing":"unit"}]'::jsonb,true)
 where assembly_id='kit-les-paul' and not defaults ? 'requirements';
 get diagnostics changed = row_count;
 if changed <> 1 then raise exception 'Expected exactly one unconfigured Les Paul Kit Definition; no requirements installed'; end if;
end $$;

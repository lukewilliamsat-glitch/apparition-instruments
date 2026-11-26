CREATE OR REPLACE FUNCTION ironclad69.clean(p text, lo integer, hi integer)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare s text:=trim(coalesce(p,''));
begin
 if length(s) not between lo and hi or s ~ '[[:cntrl:]]' then raise exception 'Invalid text length or characters';end if;
 return s;
end $function$;

CREATE OR REPLACE FUNCTION ironclad69."integer"(p jsonb, lo bigint, hi bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare n numeric;
begin
 if jsonb_typeof(p) is distinct from 'number' or p::text !~ '^-?[0-9]{1,16}$' then raise exception 'Expected a whole number';end if;
 n:=p::text::numeric;if n<lo or n>hi then raise exception 'Number out of range';end if;return n::bigint;
end $function$;

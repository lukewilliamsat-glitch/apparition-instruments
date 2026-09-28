-- P11: guarded, Admin-only permanent removal of unused manufacturer options.
-- Components hold both modern keys and legacy labels; Kit Definitions may refer to labels in nested JSON.
create or replace function public.delete_unused_catalogue_option(p_set text,p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare target public.catalogue_options%rowtype; blockers jsonb := '[]'::jsonb; candidate text; component_row record; kit_row record;
begin
 if (select auth.uid()) is null or not exists(select 1 from public.admin_members where user_id=(select auth.uid())) then
  raise exception 'Admin membership required' using errcode='42501';
 end if;
 select * into target from public.catalogue_options where option_set=p_set and option_key=p_key for update;
 if not found then raise exception 'Catalogue option no longer exists';end if;
 if p_set<>'manufacturer' then raise exception 'Core catalogue identities cannot be permanently deleted';end if;
 -- Serialize dependency checks with concurrent Component and Kit Definition edits.
 lock table public.components,public.kit_definitions in share mode;
 for component_row in select id,name from public.components c where
   c.product_content->>'manufacturerKey'=p_key or
   exists(select 1 from unnest(array_prepend(target.label,target.aliases)) label
    where regexp_replace(lower(c.manufacturer),'[.[:space:]]','','g')=regexp_replace(lower(label),'[.[:space:]]','','g'))
 loop blockers:=blockers||jsonb_build_array(jsonb_build_object('kind','Component','id',component_row.id,'name',component_row.name));end loop;
 for kit_row in select assembly_id from public.kit_definitions k where exists(
   select 1 from jsonb_path_query(to_jsonb(k),'$.**') value
   where value #>> '{}' = p_key or exists(select 1 from unnest(array_prepend(target.label,target.aliases)) label
    where value #>> '{}' = label))
 loop blockers:=blockers||jsonb_build_array(jsonb_build_object('kind','Kit Definition','id',kit_row.assembly_id));end loop;
 if jsonb_array_length(blockers)>0 then return jsonb_build_object('deleted',false,'dependencies',blockers);end if;
 delete from public.catalogue_options where option_set=p_set and option_key=p_key;
 return jsonb_build_object('deleted',true,'dependencies','[]'::jsonb);
end $$;
revoke all on function public.delete_unused_catalogue_option(text,text) from public,anon,authenticated;
grant execute on function public.delete_unused_catalogue_option(text,text) to authenticated;

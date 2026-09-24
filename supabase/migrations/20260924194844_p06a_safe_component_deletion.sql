-- P06A: permanent deletion is atomic and restricted to unused Components.
-- Existing foreign keys continue to protect BOM/permission references even
-- when a concurrent Admin request races the preflight dependency check.
drop policy components_admin_write on public.components;
create policy components_admin_insert on public.components for insert to authenticated
 with check (exists (select 1 from public.admin_members where user_id = (select auth.uid())));
create policy components_admin_update on public.components for update to authenticated
 using (exists (select 1 from public.admin_members where user_id = (select auth.uid())))
 with check (exists (select 1 from public.admin_members where user_id = (select auth.uid())));
create policy components_admin_delete on public.components for delete to authenticated
 using (
  exists (select 1 from public.admin_members where user_id = (select auth.uid()))
  and not exists (select 1 from public.assembly_bom b where b.component_id = components.id)
  and not exists (select 1 from public.kit_permitted_components p where p.component_id = components.id)
  and not exists (select 1 from public.kit_definitions k,
   lateral jsonb_each_text(coalesce(k.defaults->'componentIds','{}'::jsonb)) v
   where v.value = components.id)
  and not exists (select 1 from public.kit_definitions k,
   lateral jsonb_array_elements(k.component_resolvers) r,
   lateral jsonb_array_elements(r->'mappings') m
   where m->>'componentId' = components.id)
 );

create function public.delete_unused_component(p_component_id text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare blockers jsonb; target public.components%rowtype;
begin
 if (select auth.uid()) is null or not exists
  (select 1 from public.admin_members where user_id = (select auth.uid())) then
  raise exception 'Explicit Admin membership required' using errcode = '42501';
 end if;
 select * into target from public.components where id = p_component_id for update;
 if not found then return jsonb_build_object('deleted',false,'reason','Component no longer exists.'); end if;
 -- Prevent concurrent Kit Definition edits while JSON dependencies are checked.
 perform 1 from public.kit_definitions for update;
 select coalesce(jsonb_agg(jsonb_build_object('assembly',a.name,'reason',dep.reason)
  order by a.name,dep.reason),'[]'::jsonb) into blockers
 from (
  select assembly_id,'Assembly BOM' as reason from public.assembly_bom where component_id=p_component_id
  union all select assembly_id,'Permitted Component' from public.kit_permitted_components where component_id=p_component_id
  union all select k.assembly_id,'Default Component' from public.kit_definitions k
   where exists (select 1 from jsonb_each_text(coalesce(k.defaults->'componentIds','{}'::jsonb)) v where v.value=p_component_id)
  union all select k.assembly_id,'Potentiometer resolver' from public.kit_definitions k
   where exists (select 1 from jsonb_array_elements(k.component_resolvers) r,
    lateral jsonb_array_elements(r->'mappings') m where m->>'componentId'=p_component_id)
 ) dep join public.assemblies a on a.id=dep.assembly_id;
 if jsonb_array_length(blockers)>0 then return jsonb_build_object('deleted',false,'dependencies',blockers); end if;
 -- A PostgREST RPC executes within one database transaction. An error in
 -- either statement rolls back both, and component_internal cascades.
 delete from public.inventory where component_id=p_component_id;
 delete from public.components where id=p_component_id;
 if not found then raise exception 'Component changed while deleting; no data was removed'; end if;
 return jsonb_build_object('deleted',true,'componentId',p_component_id);
end;
$$;
revoke all on function public.delete_unused_component(text) from public, anon;
grant execute on function public.delete_unused_component(text) to authenticated;

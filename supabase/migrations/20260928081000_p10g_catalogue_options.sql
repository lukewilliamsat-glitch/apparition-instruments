-- P10G: presentation dictionaries with stable semantic identities.
create table public.catalogue_options (
 option_set text not null check (option_set in ('manufacturer','pot_type','pot_shaft','pot_taper','bleed_topology')),
 option_key text not null check (option_key ~ '^[a-z][a-z0-9_]{0,79}$'),
 label text not null check (length(btrim(label)) between 1 and 120 and label = btrim(label)),
 aliases text[] not null default '{}',
 active boolean not null default true,
 sort_order integer not null default 0,
 primary key (option_set,option_key),
 constraint fixed_electrical_option_keys check (
  option_set not in ('pot_taper','bleed_topology') or
  option_set='pot_taper' and option_key in ('audio','linear','reverse_audio') or
  option_set='bleed_topology' and option_key in ('capacitor','parallel','series'))
);
create unique index catalogue_option_label_unique on public.catalogue_options
 (option_set,regexp_replace(lower(label),'[.[:space:]]','','g'));

create function public.catalogue_option_protect_identity() returns trigger language plpgsql set search_path = '' as $$
declare candidate text;
begin
 if tg_op='UPDATE' then
  if new.option_set<>old.option_set or new.option_key<>old.option_key then
   raise exception 'Catalogue option identity cannot be changed';
  end if;
  if new.aliases is distinct from old.aliases then
   raise exception 'Catalogue option aliases cannot be edited';
  end if;
  if new.label is distinct from old.label then new.aliases:=array_append(old.aliases,old.label);end if;
 end if;
 if exists (
  select 1 from public.catalogue_options option, lateral unnest(array_prepend(option.label,option.aliases)) candidate_label
  where option.option_set=new.option_set and option.option_key<>new.option_key
   and regexp_replace(lower(candidate_label),'[.[:space:]]','','g')=regexp_replace(lower(new.label),'[.[:space:]]','','g')
 ) then raise exception 'Catalogue option label or historical alias already exists';end if;
 return new;
end $$;
create trigger catalogue_option_protect before insert or update on public.catalogue_options
 for each row execute function public.catalogue_option_protect_identity();

alter table public.catalogue_options enable row level security;
revoke all on public.catalogue_options from anon, authenticated;
grant select on public.catalogue_options to anon, authenticated;
grant insert, update on public.catalogue_options to authenticated;
create policy catalogue_options_public_read on public.catalogue_options for select to anon, authenticated using (true);
create policy catalogue_options_admin_insert on public.catalogue_options for insert to authenticated
 with check (exists (select 1 from public.admin_members where user_id=(select auth.uid())));
create policy catalogue_options_admin_update on public.catalogue_options for update to authenticated
 using (exists (select 1 from public.admin_members where user_id=(select auth.uid())))
 with check (exists (select 1 from public.admin_members where user_id=(select auth.uid())));

insert into public.catalogue_options(option_set,option_key,label,sort_order) values
 ('pot_type','standard','Standard',10),('pot_type','push_pull','Push/Pull',20),('pot_type','mini','Mini',30),
 ('pot_shaft','short','Short',10),('pot_shaft','long','Long',20),
 ('pot_taper','audio','A / Audio',10),('pot_taper','linear','B / Linear',20),('pot_taper','reverse_audio','C / Reverse Audio',30),
 ('bleed_topology','capacitor','Capacitor only',10),('bleed_topology','parallel','Parallel RC',20),('bleed_topology','series','Series RC',30);
insert into public.catalogue_options(option_set,option_key,label,sort_order)
 select 'manufacturer',trim(both '_' from regexp_replace(lower(manufacturer),'[^a-z0-9]+','_','g')),manufacturer,
  row_number() over(order by manufacturer)::integer*10
 from (select distinct manufacturer from public.components where btrim(manufacturer)<>'') source;
-- Existing Component rows, Kit Definitions, and historical snapshots remain untouched.
-- Legacy labels resolve through this dictionary; subsequent edits persist stable keys.

do $$
begin
 if not exists(select from public.assemblies where id='kit-les-paul' and sku='FIXTURE-KIT')
    or exists(select from auth.users where email is null or lower(email) !~ '^[a-z0-9._+-]+@example[.]invalid$') then
   raise exception 'Synthetic staging project identity not established';
 end if;
end $$;

create function public.proving_grounds_synthetic_auth_only() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.email is null or lower(new.email) !~ '^[a-z0-9._+-]+@example[.]invalid$'
    or new.phone is not null then
   raise exception 'Use an internal example.invalid staging identity' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function public.proving_grounds_synthetic_auth_only() from public, anon, authenticated;
create trigger proving_grounds_synthetic_auth_only
before insert or update of email, phone on auth.users
for each row execute function public.proving_grounds_synthetic_auth_only();

insert into public.components(id,sku,name,category,individually,in_kits,sale_price,kit_price) values
 ('fixture-staging-cap','STAGING-CAP','Synthetic capacitor','capacitors',true,true,160,160),
 ('fixture-staging-pot','STAGING-POT','Synthetic potentiometer','potentiometers',true,true,450,450);
insert into public.inventory(component_id,quantity) values ('fixture-staging-cap',120),('fixture-staging-pot',120);

create table dominion79.consuming(
 order_id uuid primary key references dominion79.holds(order_id),
 transaction_id xid8 not null
);
create table dominion79.provider_events (
 provider_account text not null, event_key text not null, order_id uuid not null references public.orders(id),
 fingerprint jsonb not null, outcome text,
 primary key(provider_account,event_key)
);
create table dominion79.provenance(
 order_id uuid not null references public.orders(id), component_id text not null references public.inventory(component_id),
 consumed_on timestamptz not null default clock_timestamp(), quantity bigint not null check(quantity>0),
 batches jsonb not null, measured_units uuid[] not null,
 primary key(order_id,component_id)
);

-- Isolated sandbox-only schema. No client role grants.
begin;
create schema marketplace84;
revoke all on schema marketplace84 from public,anon,authenticated,service_role;
create table marketplace84.consent_intent (
  state_hash text primary key check (state_hash ~ '^[a-f0-9]{64}$'),
  actor uuid not null references auth.users,
  account text not null check (account ~ '^[A-Za-z0-9_.:-]{1,128}$'),
  expected_subject text not null check (expected_subject ~ '^[A-Za-z0-9_.:-]{1,128}$'),
  environment text not null check (environment = 'sandbox'),
  expires_ms bigint not null
);
create index on marketplace84.consent_intent(expires_ms);
create table marketplace84.seller_custody (
  account text primary key check (account ~ '^[A-Za-z0-9_.:-]{1,128}$'),
  subject text unique not null check (subject ~ '^[A-Za-z0-9_.:-]{1,128}$'),
  actor uuid not null references auth.users,
  expires_ms bigint not null,
  envelope jsonb not null
);
alter table marketplace84.consent_intent enable row level security;
alter table marketplace84.seller_custody enable row level security;
revoke all on all tables in schema marketplace84 from public,anon,authenticated,service_role;
commit;

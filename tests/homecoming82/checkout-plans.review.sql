-- Install only in the isolated provider rehearsal database.
create schema convergence87;
revoke all on schema convergence87 from public;

create table convergence87.checkout_plans (
  order_id uuid primary key,
  account text not null check (account ~ '^acct_[A-Za-z0-9]{8,64}$'),
  currency text not null check (currency = 'GBP'),
  expected_minor integer not null check (expected_minor between 1 and 100000000),
  expiration bigint not null check (expiration between 1 and 4102444800),
  binding text not null unique check (binding ~ '^[a-f0-9]{64}$'),
  session_id text unique check (session_id ~ '^cs_test_[A-Za-z0-9]{8,128}$'),
  intent text unique check (intent ~ '^pi_[A-Za-z0-9]{8,128}$'),
  check (intent is null or session_id is not null)
);
alter table convergence87.checkout_plans enable row level security;
revoke all on convergence87.checkout_plans from public;

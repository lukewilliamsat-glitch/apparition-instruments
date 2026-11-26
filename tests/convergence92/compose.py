from pathlib import Path
from hashlib import sha256
root=Path(__file__).parent
source=(root/'unity79.accepted.sql').read_text().rstrip()
expected='4607a5c8c894f1d313f4a8868763f3892048a759ee675c883d79441c230e2248'
# GitHub text includes exactly the accepted trailing newline.
assert sha256((source+'\n').encode()).hexdigest()==expected
tables=source[source.index('create table dominion79.consuming('):source.index('do $$ declare t text;')]
runtime=source[source.index('-- Mirrors the established saved BOM'):source.index('revoke all on all tables in schema dominion79')]
fulfil=(root/'fulfilment.before.sql').read_text()
assert fulfil.count('perform commerce67.consume(p_order_id);')==1
fulfil=fulfil.replace('perform commerce67.consume(p_order_id);','-- Staging UNITY owns reservations. The accepted legacy stock writer follows.')
assert "^cs_test_" in fulfil and "^cs_live_" not in fulfil
header="""-- Authorisation 92. Apply only to prwmowexhonguvtiywsy.
set local lock_timeout='3s';
set local statement_timeout='30s';
do $preflight$
begin
 if to_regclass('quartermaster84c.fixture_orders') is null
    or to_regclass('convergence87.checkout_plans') is null
    or to_regnamespace('commerce67_archive92') is not null
    or exists(select 1 from commerce67.control where enabled)
    or exists(select 1 from commerce67.sessions where state='open')
    or exists(select 1 from commerce67.holds)
    or exists(select 1 from commerce67.matched_sets where state='reserved')
    or exists(select 1 from dominion79.holds)
    or exists(select 1 from convergence87.checkout_plans)
    or (select mode from dominion79.lifecycle_control where singleton) is distinct from 'paused'
    or to_regprocedure('dominion79.reserve(uuid,text,timestamptz)') is not null then
  raise exception 'Expected unused, synthetic staging reservation boundary required';
 end if;
end $preflight$;
alter table public.inventory disable trigger commerce67_inventory_floor;
alter table commerce67.sessions disable trigger commerce67_payment_paid;
revoke all on schema commerce67 from public,anon,authenticated,service_role;
revoke all on all tables in schema commerce67 from public,anon,authenticated,service_role;
revoke all on all functions in schema commerce67 from public,anon,authenticated,service_role;
alter schema commerce67 rename to commerce67_archive92;
"""
footer="""
alter table dominion79.consuming enable row level security;
alter table dominion79.provider_events enable row level security;
alter table dominion79.provenance enable row level security;
revoke all on all tables in schema dominion79 from public,anon,authenticated,service_role;
revoke all on all functions in schema dominion79 from public,anon,authenticated,service_role;
grant usage on schema dominion79 to service_role;
grant execute on function dominion79.reserve(uuid,text,timestamptz),
 dominion79.release_verified(uuid,text,text),dominion79.consume(uuid,text,text,text,text,text,bigint,text) to service_role;
"""
(root/'runtime.staging.sql').write_text(header+tables+runtime+fulfil+footer)
print('Accepted UNITY runtime reused with explicit staging-only reservation cutover.')

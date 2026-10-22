#!/bin/bash
set -euo pipefail
root=$1; output=$2; node=$3; browser=$4; controller=$5; owner=$6; parent_namespace=$7; commit=$8
test "$(id -u)" -eq 0
test "$(readlink /proc/self/ns/net)" != "$parent_namespace"
ip link set lo up
ip -json address show > "$output/namespace-addresses.json"
ip -json route show table all > "$output/namespace-routes.json"
readlink /proc/self/ns/net > "$output/namespace-id.txt"
fixture_home=$(mktemp -d "$output/disposable-home.XXXXXX")
mkdir -p "$output/C01" "$output/C02" "$output/C03"
chown -R "$owner" "$output"
cd "$root"
run_isolated(){
 runuser -u "$owner" -- env -i HOME="$fixture_home" TMPDIR="$fixture_home" PATH="$(dirname "$node"):/usr/bin:/bin" LANG=C.UTF-8 "$node" "$@"
}
# All negative controls run before any application page or database fixture.
run_isolated tests/command01/isolation.mjs "$output" "$browser" "$controller" "$parent_namespace" "$commit"
for version in 01 02 03; do
 run_isolated --require ./tests/command01/network-guard.cjs "tests/command$version/logic.mjs" "$output/C$version/NODE_RESULTS.json"
 cp "$output/STAGE_A_RESULTS.json" "$output/C$version/STAGE_A_RESULTS.json"
done
cp "$output/SOURCE_IDENTITY.json" "$output/C03/SOURCE_IDENTITY.json"
run_isolated --require ./tests/command01/network-guard.cjs tests/command04/logic.mjs "$output/NODE_RESULTS.json" "$output/PG_SEED.json"
# Existing server binaries only. No apt, Docker download, external service or password.
pg_bin=''
for candidate in /usr/lib/postgresql/*/bin; do
 if test -x "$candidate/initdb" && test -x "$candidate/pg_ctl" && test -x "$candidate/psql"; then pg_bin=$candidate; fi
done
if test -n "$pg_bin"; then
 mkdir -p "$output/pg-socket"; chown "$owner" "$output/pg-socket"; chmod 700 "$output/pg-socket"
 pg_data="$output/disposable-pg-data"
 pg(){ runuser -u "$owner" -- env -i HOME="$fixture_home" PATH="$pg_bin:/usr/bin:/bin" LANG=C.UTF-8 "$@"; }
 pg "$pg_bin/initdb" -D "$pg_data" -A trust --no-locale --encoding=UTF8 > "$output/postgres-init.txt"
 trap 'pg "$pg_bin/pg_ctl" -D "$pg_data" -m immediate stop > "$output/postgres-stop.txt" 2>&1 || true' EXIT
 pg "$pg_bin/pg_ctl" -D "$pg_data" -l "$output/postgres-disposable.log" -o "-c listen_addresses='' -k $output/pg-socket -p 55439 -c unix_socket_permissions=0700" -w start > "$output/postgres-start.txt"
 pg /usr/bin/python3 tests/command04/postgres.py "$output" "$output/pg-socket" "$pg_bin" "$owner"
else
 printf '%s\n' '{"status":"BLOCKED","reason":"No preinstalled PostgreSQL server binaries; no installation attempted","productionRequests":0}' > "$output/POSTGRES_RESULTS.json"
fi
for version in 01 02 03; do
 run_isolated "tests/command$version/browser.mjs" "$output/C$version" "$browser" "$controller" "$commit"
done
run_isolated tests/command04/browser.mjs "$output" "$browser" "$controller" "$commit"
# Recheck all inherited application bytes after execution as well as before it.
runuser -u "$owner" -- env -i HOME="$fixture_home" PATH=/usr/bin:/bin LANG=C.UTF-8 /usr/bin/python3 tests/command04/source-integrity.py "$output" "$commit" --after

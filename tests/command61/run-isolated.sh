#!/bin/bash
set -euo pipefail
root=$1; output=$2; node=$3; browser=$4; controller=$5; owner=$6; parent_namespace=$7; commit=$8
test "$(id -u)" -eq 0
test "$(readlink /proc/self/ns/net)" != "$parent_namespace"
ip link set lo up
ip -json address show > "$output/namespace-addresses.json"
ip -json route show table all > "$output/namespace-routes.json"
fixture_home=$(mktemp -d "$output/disposable-home.XXXXXX")
chown -R "$owner" "$output"
cd "$root"
run_isolated(){ runuser -u "$owner" -- env -i HOME="$fixture_home" TMPDIR="$fixture_home" PATH="$(dirname "$node"):/usr/bin:/bin" LANG=C.UTF-8 "$node" "$@"; }
run_isolated tests/command60/isolation.mjs "$output" "$browser" "$controller" "$parent_namespace" "$commit"
phase=$("$node" -p "JSON.parse(require('fs').readFileSync('tests/command61/phase.json')).phase")
if [ "$phase" = A ]; then
 run_isolated --import ./tests/fixtures/admin-offline.mjs tests/admin-v2-overview.mjs > "$output/inherited-overview.txt"
 run_isolated --import ./tests/fixtures/admin-offline.mjs tests/command61/overview.mjs > "$output/overview-results.txt"
fi
if [ "$phase" = B ]; then
 run_isolated tests/command61/inventory.mjs > "$output/inventory-results.txt"
fi
if [ "$phase" = C ]; then
 run_isolated tests/command61/economics.mjs > "$output/economics-results.txt"
 run_isolated --import ./tests/fixtures/admin-offline.mjs tests/command61/finance-ui.mjs > "$output/finance-ui-results.txt"
 run_isolated --import ./tests/fixtures/admin-offline.mjs tests/command61/cost-reference.mjs > "$output/cost-reference-results.txt"
fi
run_isolated tests/command61/browser.mjs "$output" "$browser" "$controller" "$commit"

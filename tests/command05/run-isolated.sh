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
chown -R "$owner" "$output"
cd "$root"
run_isolated(){ runuser -u "$owner" -- env -i HOME="$fixture_home" TMPDIR="$fixture_home" PATH="$(dirname "$node"):/usr/bin:/bin" LANG=C.UTF-8 "$node" "$@"; }
# Existing kernel/browser negative controls must pass before any Admin fixture opens.
run_isolated tests/command05/isolation.mjs "$output" "$browser" "$controller" "$parent_namespace" "$commit"
run_isolated tests/command05/reuse.mjs > "$output/reuse-log.txt"
run_isolated --require ./tests/command05/network-guard.cjs tests/command05/read.mjs "$output/READ_RESULTS.json" > "$output/read-log.txt"
run_isolated --require ./tests/command05/network-guard.cjs tests/command05/production-read.mjs "$output/PRODUCTION_READ_RESULTS.json" > "$output/production-read-log.txt"
run_isolated --require ./tests/command05/network-guard.cjs tests/command05/synthetic-security.mjs > "$output/synthetic-security-log.txt"
run_isolated --import ./tests/fixtures/admin-offline.mjs tests/command05/shell.mjs > "$output/shell-log.txt"
run_isolated --import ./tests/fixtures/admin-offline.mjs tests/command05/dom.mjs > "$output/dom-log.txt"
run_isolated --import ./tests/fixtures/admin-offline.mjs tests/command05/production-dom.mjs > "$output/production-dom-log.txt"
run_isolated --import ./tests/fixtures/admin-offline.mjs tests/command05/editor.mjs > "$output/editor-log.txt"
run_isolated --import ./tests/fixtures/admin-offline.mjs tests/command05/preservation.mjs > "$output/preservation-log.txt"
for test in admin-gate admin-v2-shell admin-v2-catalogue admin-v2-c-workspaces aftercare-admin; do
 run_isolated --import ./tests/fixtures/admin-offline.mjs "tests/$test.mjs" > "$output/$test-log.txt"
done
run_isolated tests/command05/browser.mjs "$output" "$browser" "$controller" "$commit"
runuser -u "$owner" -- env -i HOME="$fixture_home" PATH=/usr/bin:/bin LANG=C.UTF-8 /usr/bin/python3 tests/command05/source-integrity.py "$output" "$commit" --after

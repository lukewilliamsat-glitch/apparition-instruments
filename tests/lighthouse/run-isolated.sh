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
run_isolated(){ runuser -u "$owner" -- env -i HOME="$fixture_home" TMPDIR="$fixture_home" PATH="$(dirname "$node"):/usr/bin:/bin" LANG=C.UTF-8 TZ=UTC "$node" "$@"; }
# Exact frozen COMMAND negative controls; no application import before PASS.
run_isolated tests/lighthouse/isolation.mjs "$output" "$browser" "$controller" "$parent_namespace" "$commit"
failed=0
runuser -u "$owner" -- env -i HOME="$fixture_home" PATH="$(dirname "$node"):/usr/bin:/bin" LANG=C.UTF-8 TZ=UTC /usr/bin/python3 tests/lantern/run-offline.py "$output/OFFLINE_RESULTS.json" || failed=1
run_isolated tests/lighthouse/regressions.mjs "$output" || failed=1
run_isolated tests/lighthouse/browser.mjs "$output" "$browser" "$controller" "$commit" || failed=1
runuser -u "$owner" -- env -i HOME="$fixture_home" PATH=/usr/bin:/bin LANG=C.UTF-8 /usr/bin/python3 tests/lighthouse/source-integrity.py "$output" "$commit" --after
exit "$failed"

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
mkdir -p "$output/C01"
chown -R "$owner" "$output"
cd "$root"
run_isolated(){
 runuser -u "$owner" -- env -i HOME="$fixture_home" TMPDIR="$fixture_home" PATH="$(dirname "$node"):/usr/bin:/bin" LANG=C.UTF-8 "$node" "$@"
}
run_isolated tests/command01/isolation.mjs "$output" "$browser" "$controller" "$parent_namespace" "$commit"
run_isolated --require ./tests/command01/network-guard.cjs tests/command01/logic.mjs "$output/C01/NODE_RESULTS.json"
run_isolated --require ./tests/command01/network-guard.cjs tests/command02/logic.mjs "$output/NODE_RESULTS.json"
cp "$output/STAGE_A_RESULTS.json" "$output/C01/STAGE_A_RESULTS.json"
run_isolated tests/command01/browser.mjs "$output/C01" "$browser" "$controller" "$commit"
run_isolated tests/command02/browser.mjs "$output" "$browser" "$controller" "$commit"

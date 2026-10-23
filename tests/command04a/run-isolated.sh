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
# Unchanged kernel/browser negative controls precede every application launch.
run_isolated tests/command01/isolation.mjs "$output" "$browser" "$controller" "$parent_namespace" "$commit"
if test -f prototypes/command04a/index.html; then
 for version in 01 02 03 04; do
  mkdir -p "$output/C$version"; chown "$owner" "$output/C$version"
  cp "$output/STAGE_A_RESULTS.json" "$output/C$version/STAGE_A_RESULTS.json"
  cp "$output/SOURCE_IDENTITY.json" "$output/C$version/SOURCE_IDENTITY.json"
  cp "$output/IRONCLAD_SOURCE.json" "$output/C$version/IRONCLAD_SOURCE.json"
  run_isolated --require ./tests/command01/network-guard.cjs "tests/command$version/logic.mjs" "$output/C$version/NODE_RESULTS.json"
  run_isolated "tests/command$version/browser.mjs" "$output/C$version" "$browser" "$controller" "$commit"
 done
fi
# No SQL is executed in this presentation mission. The original SQL stays frozen.
run_isolated tests/command04a/browser.mjs "$output" "$browser" "$controller" "$commit"
runuser -u "$owner" -- env -i HOME="$fixture_home" PATH=/usr/bin:/bin LANG=C.UTF-8 /usr/bin/python3 tests/command04a/source-integrity.py "$output" "$commit" --after

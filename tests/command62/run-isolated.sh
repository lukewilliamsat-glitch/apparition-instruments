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
phase=$("$node" -p "JSON.parse(require('fs').readFileSync('tests/command62/phase.json')).phase")
if [ "$phase" = A ]; then
 run_isolated tests/command62/reuse.mjs > "$output/reused-financial-evidence.txt"
 run_isolated tests/command61/browser.mjs "$output" "$browser" "$controller" "$commit"
elif [ "$phase" = B ]; then
 run_isolated tests/command62/manufacturers.mjs > "$output/manufacturer-logic.txt"
 run_isolated tests/command62/browser.mjs "$output" "$browser" "$controller" "$commit"
else
 echo 'Unknown isolated acceptance phase' >&2
 exit 1
fi

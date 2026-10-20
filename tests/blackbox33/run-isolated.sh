#!/bin/bash
# Runs only inside a disposable GitHub-hosted runner network/mount/PID namespace.
# No host firewall, DNS, permissions, configuration or application files change.
set -euo pipefail
root=$1
output=$2
node=$3
browser=$4
controller=$5
owner=$6
host_namespace=$7
test "$(id -u)" -eq 0
test "$(readlink /proc/self/ns/net)" != "$host_namespace"
test -d "$output"
test "$owner" != root
ip link set lo up
ip -json address show > "$output/namespace-addresses.json"
ip -json route show table all > "$output/namespace-routes.json"
readlink /proc/self/ns/net > "$output/namespace-id.txt"
home=$(mktemp -d "$output/disposable-home.XXXXXX")
chown -R "$owner" "$output"
cd "$root"
# Browser/controller cannot inherit the runner's tokens, credentials or proxies.
# PID + mount namespaces prevent access to parent runner processes via /proc.
exec runuser -u "$owner" -- env -i HOME="$home" TMPDIR="$home" \
  PATH="$(dirname "$node"):/usr/bin:/bin" LANG=C.UTF-8 \
  "$node" tests/blackbox33/feasibility.mjs "$output" "$browser" "$controller" "$host_namespace"

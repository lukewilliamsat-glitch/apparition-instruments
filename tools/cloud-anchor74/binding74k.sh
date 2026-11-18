#!/usr/bin/env bash
# Verify the approved binding without logging the metadata supplied on stdin.
set -euo pipefail
umask 077
capture=$1
approval=$2
[[ "$capture" =~ ^[1-9][0-9]{4,23}$ && "$approval" =~ ^[a-f0-9]{64}$ ]] || exit 1
binding=$(jq -ces '
  select(length==1) | .[0] | select(type=="object" and keys==["asset","bytes","release","sha256"])
  | select(all(.[]; type=="string"))
  | select(.release | test("^[1-9][0-9]{4,23}$"))
  | select(.asset | test("^[1-9][0-9]{4,23}$"))
  | select(.bytes | test("^[1-9][0-9]{0,8}$"))
  | select((.bytes|tonumber) <= 268435456)
  | select(.sha256 | test("^[a-f0-9]{64}$"))
' 2>/dev/null) || { echo 'Archive binding missing or malformed.' >&2; exit 1; }
digest=$({ printf '%s\n' "$capture"; jq -r '.release,.asset,.bytes,.sha256' <<<"$binding"; } | sha256sum)
[[ "${digest%% *}" == "$approval" ]] || { echo 'Archive binding does not match the approved capture.' >&2; exit 1; }
printf '%s\n' "$binding"

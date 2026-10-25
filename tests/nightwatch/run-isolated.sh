#!/usr/bin/env bash
set -euo pipefail
root=$1
evidence=$2
python_bin=$3
runner_uid=$4
runner_gid=$5
mount --make-rprivate /
ip link set lo up
test -z "$(ip -4 route show)"
test -z "$(ip -6 route show default)"
chown "$runner_uid:$runner_gid" "$evidence"
cd "$root"
exec setpriv --reuid "$runner_uid" --regid "$runner_gid" --clear-groups \
  --bounding-set=-all --inh-caps=-all --ambient-caps=-all \
  env PYTHONDONTWRITEBYTECODE=1 "$python_bin" tests/nightwatch/run_tests.py \
  --out "$evidence" --require-process-isolation

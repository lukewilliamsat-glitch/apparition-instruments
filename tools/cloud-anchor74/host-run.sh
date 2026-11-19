#!/usr/bin/env bash
# Docker's --tmpfs option filter does not accept noswap; validate a host mount, then bind it.
set -euo pipefail
umask 077
src=$(dirname "$(realpath "$0")")
dir=$(realpath "$1"); shift
net=$1; shift
[[ "$dir" == "$RUNNER_TEMP"/anchor-* && -d "$dir" && ! -L "$dir" ]] || exit 1
case "$net:$1" in
 none:fixture-capture|none:fixture-restore|bridge:fixture-restore|bridge:production-capture|none:production-restore|none:production-restore-v2|none:fixture-capture-v2-final|none:fixture-restore-v2-final|none:production-restore-v2-final|none:fixture-capture-v2-semantic|none:fixture-restore-v2-semantic|none:production-restore-v2-semantic|none:fixture-capture-v2-classified|none:fixture-restore-v2-classified|none:production-restore-v2-classified) ;;
 *) exit 1 ;;
esac
mem=$(mktemp -d "$RUNNER_TEMP/anchor-ram-XXXXXX")
cleanup(){
  if mountpoint -q "$mem"; then sudo umount -- "$mem" || return 1; fi
  rmdir -- "$mem"
}
trap cleanup EXIT
sudo mount -t tmpfs -o "size=1536m,noswap,mode=0700,uid=$(id -u),gid=$(id -g)" tmpfs "$mem"
opts=$(findmnt --noheadings --mountpoint "$mem" -o FSTYPE,OPTIONS)
[[ "$opts" == tmpfs* && ",$opts," == *,noswap,* ]] || { echo 'No verified non-swap scratch mount.' >&2; exit 1; }
docker run --rm -i --user "$(id -u):$(id -g)" --network "$net" \
  --cap-drop ALL --security-opt no-new-privileges --pids-limit 100 --memory=2700m --memory-swap=2700m \
  -v "$mem:/work:rw" -v "$src:/anchor:ro" -v "$dir:/exchange:rw" \
  -e ANCHOR_RUN -e ANCHOR_PUBLIC_FIXTURE anchor74:verified "$@"

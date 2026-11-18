#!/usr/bin/env bash
# Contract probe only: substitute a local executable for gh; never contact a provider.
set -euo pipefail
umask 077
src=$(dirname "$(realpath "$0")")
fixture=$1
[[ -z "${GH_TOKEN:-}" && -z "${GITHUB_TOKEN:-}" && -f "$fixture/backup.age" ]] || exit 1
sandbox=$(mktemp -d "$RUNNER_TEMP/anchor-production-vault-test-XXXXXX")
trap 'rm -rf -- "$sandbox"' EXIT
mkdir -p "$sandbox/bin" "$sandbox/capture" "$sandbox/restore"
cp "$fixture/backup.age" "$sandbox/capture/backup.age"
hash=$(sha256sum "$fixture/backup.age"); hash=${hash%% *}
size=$(stat -c%s "$fixture/backup.age")
run=123456
jq --arg hash "$hash" --arg run "$run" --argjson size "$size" '.mode="production"|.project="acdxpxvksvdwfajntzfx"|.capture_run=$run|.sha256=$hash|.bytes=$size' "$fixture/capture.json" > "$sandbox/capture/capture.json"
export STUB_HOME="$sandbox" STUB_SHA="$hash" STUB_SIZE="$size" GITHUB_OUTPUT="$sandbox/outputs"
cat > "$sandbox/bin/gh" <<'STUB'
#!/bin/bash
set -euo pipefail
[[ "$*" == *'repos/lukewilliamsat-glitch/apparition-anchor-vault'* ]]
case "$*" in
  *'assets?name=backup.age'*)
    [[ "$*" == *'--input'* ]] && cp "$STUB_HOME/capture/backup.age" "$STUB_HOME/retained.age"
    jq -n --arg digest "sha256:$STUB_SHA" --argjson size "$STUB_SIZE" '{name:"backup.age",digest:$digest,size:$size,id:234567,state:"uploaded"}'
    ;;
  *'/releases/assets/234567'*)
    [[ "$*" == *'Accept: application/octet-stream'* ]]
    cat "$STUB_HOME/retained.age"
    ;;
  *'/releases/345678'*)
    if [[ "$*" == *'--method PATCH'* ]]; then
      printf '%s\n' '{"tag_name":"cloud-anchor74-123456","draft":false}'
    else
      jq -n --arg digest "sha256:$STUB_SHA" --argjson size "$STUB_SIZE" '{tag_name:"cloud-anchor74-123456",draft:false,assets:[{id:234567,name:"backup.age",digest:$digest,size:$size,state:"uploaded"}]}'
    fi;;
  *'--method POST'*'releases'*)
    printf '%s\n' '{"tag_name":"cloud-anchor74-123456","id":345678,"draft":true}';;
  *)
    if [[ -e "$STUB_HOME/public" ]]; then
      printf '%s\n' '{"full_name":"lukewilliamsat-glitch/apparition-anchor-vault","private":false,"visibility":"public","fork":false,"archived":false}'
    else
      printf '%s\n' '{"full_name":"lukewilliamsat-glitch/apparition-anchor-vault","private":true,"visibility":"private","fork":false,"archived":false}'
    fi;;
esac
STUB
chmod 700 "$sandbox/bin/gh"
export PATH="$sandbox/bin:$PATH"
test "$(command -v gh)" = "$sandbox/bin/gh"
touch "$sandbox/public"
if bash "$src/vault.sh" put "$sandbox/capture" "$run"; then exit 1; fi
test ! -e "$sandbox/retained.age"
rm "$sandbox/public"
bash "$src/vault.sh" put "$sandbox/capture" "$run"
rm "$sandbox/capture/backup.age"
bash "$src/vault.sh" get "$sandbox/restore" 234567 345678 "$hash" "$run" "$size"
cmp "$sandbox/retained.age" "$sandbox/restore/backup.age"
rm "$sandbox/restore/backup.age"
printf 'bad retained bytes' >> "$sandbox/retained.age"
if bash "$src/vault.sh" get "$sandbox/restore" 234567 345678 "$hash" "$run" "$size"; then exit 1; fi
echo 'PASS private-only vault contract, fresh retrieval, byte integrity and public destination denial (local stub).'

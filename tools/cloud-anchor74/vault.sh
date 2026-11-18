#!/usr/bin/env bash
# No production ciphertext is ever sent to the public application repository.
set -euo pipefail
umask 077
unset GH_DEBUG DEBUG
export GH_PROMPT_DISABLED=1
repo='lukewilliamsat-glitch/apparition-anchor-vault'
api="repos/$repo"
die(){ printf '%s\n' 'Private vault verification failed; no ANCHOR receipt issued.' >&2; exit 1; }
call(){ gh api --hostname github.com --header 'X-GitHub-Api-Version: 2022-11-28' "$@" 2>/dev/null; }
private(){
  call "$api" | jq -e --arg repo "$repo" '.private==true and .visibility=="private" and .full_name==$repo and .archived==false and .fork==false' >/dev/null || die
}
isnumber(){ [[ "$1" =~ ^[1-9][0-9]{4,23}$ ]]; }
validsha(){ [[ "$1" =~ ^[a-f0-9]{64}$ ]]; }
dir=$2
[[ "$dir" == "$RUNNER_TEMP"/anchor-production-* && -d "$dir" && ! -L "$dir" ]] || die
private
case "$1" in
  put)
    run=$3; isnumber "$run" || die
    archive="$dir/backup.age"
    [[ -f "$archive" && ! -L "$archive" && "$(stat -c%s -- "$archive")" -le 268435456 ]] || die
    [[ "$(head -n1 -- "$archive")" == 'age-encryption.org/v1' ]] || die
    digest=$(sha256sum "$archive"); digest=${digest%% *}; validsha "$digest" || die
    bytes=$(stat -c%s -- "$archive")
    jq -e --arg hash "$digest" --arg run "$run" --argjson bytes "$bytes" '.mode=="production" and .project=="acdxpxvksvdwfajntzfx" and .capture_run==$run and .sha256==$hash and .bytes==$bytes' "$dir/capture.json" >/dev/null || die
    tag="cloud-anchor74-$run"
    # No clobber and a unique run ID. An uncertain request requires owner review before retry.
    release=$(call --method POST "$api/releases" -f tag_name="$tag" -f name="Cloud ANCHOR $run" -F draft=true -F prerelease=true) || die
    rid=$(jq -er --arg tag "$tag" 'select(.tag_name==$tag and .draft==true) | .id' <<<"$release") || die
    isnumber "$rid" || die
    private
    asset=$(call --method POST "https://uploads.github.com/$api/releases/$rid/assets?name=backup.age" -H 'Content-Type: application/octet-stream' --input "$archive") || die
    aid=$(jq -er --arg digest "sha256:$digest" --argjson bytes "$bytes" 'select(.digest==$digest and .name=="backup.age" and .size==$bytes and .state=="uploaded") | .id' <<< "$asset") || die
    isnumber "$aid" || die
    private
    call --method PATCH "$api/releases/$rid" -F draft=false | jq -e --arg tag "$tag" '.tag_name==$tag and .draft==false' >/dev/null || die
    ;;
  get)
    aid=$3; rid=$4; digest=$5; run=$6; bytes=$7
    isnumber "$aid" && isnumber "$rid" && isnumber "$run" && validsha "$digest" && [[ "$bytes" =~ ^[1-9][0-9]{1,8}$ && "$bytes" -le 268435456 ]] || die
    call "$api/releases/$rid" | jq -e --arg tag "cloud-anchor74-$run" --argjson aid "$aid" --arg digest "sha256:$digest" --argjson bytes "$bytes" '
     .tag_name==$tag and .draft==false and any(.assets[]; .id==$aid and .name=="backup.age" and .size==$bytes and .digest==$digest and .state=="uploaded")' >/dev/null || die
    # The runner is fresh in the restore job; only the private retained copy is available.
    [[ ! -e "$dir/backup.age" ]] || die
    call "$api/releases/assets/$aid" -H 'Accept: application/octet-stream' > "$dir/backup.age" || die
    [[ "$(stat -c%s -- "$dir/backup.age")" == "$bytes" ]] || die
    actual=$(sha256sum "$dir/backup.age"); [[ "${actual%% *}" == "$digest" ]] || die
    private
    ;;
  check) ;;
  *) die;;
esac
if [[ "$1" == put ]]; then
  retention=$(date -u -d '+30 days' +%FT%TZ)
  {
    printf 'asset=%s\n' "$aid"
    printf 'release=%s\n' "$rid"
    printf 'sha256=%s\n' "$digest"
    printf 'bytes=%s\n' "$bytes"
    printf 'minimum_retain_until=%s\n' "$retention"
    printf 'capture_start=%s\n' "$(jq -er .started_utc "$dir/capture.json")"
    printf 'capture_finish=%s\n' "$(jq -er .finished_utc "$dir/capture.json")"
    printf 'pg_dump=%s\n' "$(jq -er .pg_dump "$dir/capture.json")"
  } >> "$GITHUB_OUTPUT"
fi

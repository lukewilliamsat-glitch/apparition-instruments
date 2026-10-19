# Atlas Phase 2B — Authorisation 21

Engineering branch: `atlas/phase2b-production-recovery`. Starting remote parent: `df66b1428d709ccd4043cbe1117d70cd4a71ad83`, tree `8d3b9acf822246197ed11050a9bdd171adee5661`. Production main remains `bb4ba2a932239a3ef397272b27143f0cd3adcccf`, tree `0f6ac37987b07050f6d457ff42861943813389e7`.

## Implemented boundary

`scripts/atlas/prepare-release.mjs` adapts explicitly supplied local baseline/overlay directories and independently SHA-256-pinned JSON contracts into the existing snapshot validator, mode resolver, allowlisted assembler and final artifact verifier. It is a preparation/preflight command, with no network imports, generators, package installation, GitHub writes, artifact upload or deployment. It never reads committed `dist` as a fallback. Output always denies production publication and deployment.

`release-input.schema.json` defines the versioned input contract. Paths are portable relative paths beneath the input JSON's directory. Baseline/overlay manifests, complete protection manifest and exact-five-path overlay policy each require independent digest pins. Existing core validators enforce duplicate-key, path, symlink, hardlink, size, collision and reference checks. The adapter additionally rejects executable file bits and unsupported output extensions. Inputs are copied into a new atomic candidate, never modified.

`baseline-evidence.schema.json` defines a separately supplied review record, pinned independently on the command line and bound to both baseline digest and verified source revision. Synthetic/partial/unapproved reconstructions cannot enter production preflight. An authentic complete artifact needs `supplied-artifact` provenance; an owner-attested reconstruction needs `public-reconstruction` provenance. The record is an externally reviewed assertion, not a signature or proof that Atlas discovered every production file. Hashes protect approved bytes; they do not authenticate whoever supplied an unreviewed hash. Do not derive approval pins from an untrusted PR or let a workflow automatically promote its own capture.

The input mechanism is intentionally local: a trusted operator supplies the already reviewed baseline and contracts from durable retained storage. No arbitrary URL fetching or automatic archive extraction is implemented. Missing, expired or unavailable inputs fail closed. A future Actions artifact provider must additionally verify run/artifact identity, complete archive hash, safe extraction, retention and independent coverage evidence. No such production provider is activated here.

## Mode behaviour

| Mode | Behaviour in this adapter |
| --- | --- |
| full-build / cms-only | Blocked before any input processing or live generator; no fallback |
| audit-only | Verify pinned baseline; no candidate and no publication |
| static-only, validation-only | Exercise exact overlay against supplied fixtures; production authority remains false |
| static-only, production-preflight | Require independently pinned complete review, matching main event/mode, valid baseline and protected union; still no deployment authority |
| schedule requesting static | Blocked; schedule is audit-only |
| missing/malformed input, wrong ref, ambiguous markers | Blocked with machine-readable error; no upload |

For push context use the actual trusted GitHub commit message. Its static marker must agree with explicit mode; conflicting markers fail. Manual/schedule context must use an empty message. Source revision must come from verified checkout/runner context. Neither a caller's SHA argument nor a review JSON establishes source provenance by itself.

Example command for separately approved **preflight**, not publication (all paths and independent pins must already be reviewed):

```bash
node scripts/atlas/prepare-release.mjs \
  --input /approved/release-input.json --input-sha256 "$INPUT_SHA256" \
  --evidence /approved/baseline-evidence.json --evidence-sha256 "$EVIDENCE_SHA256" \
  --source-revision "$VERIFIED_SOURCE_SHA" \
  --event workflow_dispatch --ref refs/heads/main --mode static-only \
  --commit-message "" --purpose production-preflight --output /staging/new-candidate
```

Output is JSON. A blocked result exits nonzero. A successful result contains verified receipt/manifest hashes, protected-file count and original baseline rollback pin. An output directory that already exists is never overwritten. Independently retain the pre-overlay baseline; candidate metadata is outside `site/` and must never be publicly deployed. The adapter does not create an approval or retain a durable backup automatically.

## Validation and CI

Official isolated Node **22.20.0**, Linux x64. Archive `node-v22.20.0-linux-x64.tar.xz` from `https://nodejs.org/dist/v22.20.0/`; SHA-256 `00bbd05e306ea68b6e13e17360d0e2f680b493ef95f2fea1c4296ff7437530bc` matched the official HTTPS SHASUMS256.txt. Detached-signature trust was not independently established. No system runtime, dependencies or lockfiles changed.

Original focused suite: **161/161 passed**, nine network probes passed. Extended suite: **190/190 passed** under the same runtime, with probes and synthetic demo passing. Kernel seccomp plus no_new_privs is inherited by test/CLI children; environment credentials are stripped, with fetch/WebSocket stubs in depth. The runner compiles only the reviewed local C launcher and invokes only Atlas tests/demo. No application generator is called.

`.github/workflows/atlas-release-validation.yml` enables focused validation on pushes **only** to the exact engineering branch and affected Atlas paths, plus manual dispatch with the same job ref guard. It uses Node 22, contents:read, checkout without persistent credentials, no secrets, no deployment environment, no Pages/OIDC write permissions and no uploaded artifact. Setup/checkout contact GitHub/Node infrastructure; the application tests run under inherited kernel network denial. This is not a production workflow replacement. CI execution outcome is recorded separately after branch publication. The earlier manual-only Phase 2A workflow remains unchanged.

## Production recovery findings — 19 October 2026

Successful Pages run `38167017686` (11 October 19:12 UTC) remains the latest successful static workflow returned by GitHub. Its artifact listing and repository-wide artifact listing are empty. No repeated download of the known missing artifact was attempted. Two recent deployment attempts on 19 October returned failure status; they are not successful production baselines. Visible ruleset listing is empty; branch-protection inspection is forbidden to this integration, so protection state remains unverified.

An explicit eight-path public capture used concurrency 1, zero retries/redirects, identity encoding, 512 KiB per-response and 2 MiB total limits. It retrieved **82,180 bytes**; all eight bodies match the earlier same-day capture. No JavaScript, browser, API endpoint or Supabase request was used. Earlier preserved public responses plus the new sample yield **27 unique files, 302,653 bytes**, classified **partial capture**. Manifest SHA-256: `a724d8c3b41e402d78fdd4f813adabbcd9dc76fea7757f2124e86f2877c3531a`.

The partial snapshot fails local reference validation with **479 reference errors**. These are not 479 distinct missing files. The evidence contains an exact missing-reference/path list and comparison against 416 committed output files. Source output is not an authoritative production file list. Product photographs, many shared scripts/styles, remaining routes and unlinked/dynamic dependencies are not comprehensively recovered. No complete authentic artifact was found among available recovery packages; development source archives are not deployed-output backups. No completeness attestation or production publication is safe yet.

## Schedule gate

Live main still has `*/15 * * * *`. The desired `0 3 * * *` patch remains `daily-schedule.REVIEW-ONLY.diff`, SHA-256 `94af681915b801cbd72e6fe6c7570fc309c987051256b67802f7f2eb6b3abada`.

Every main push enters the existing Pages job; static/CMS markers do not guard CMS generation, asset stamping, upload or deployment. A schedule-only main write therefore fails the non-deployment gate. No skip-CI marker, token-trigger suppression, branch-protection bypass, workflow disabling or reliance on Supabase 402 was used. The safe next change requires an independently reviewed non-deploying workflow-maintenance path and verification of relevant Pages/branch settings, then the minimal cron edit. A temporary workflow pause, if desired, requires separate owner approval.

## Spectre readiness

The frozen candidate and recovery ZIP retain their recorded commit/tree and SHA-256. `spectre-source.json` pins all four dedicated source files; no Spectre content was modified. `tests/atlas/spectre-readiness.mjs FROZEN_DIST NEW_OUTPUT [CAPTURED_HOMEPAGE]` assembles those exact files against explicitly synthetic routes and a synthetic logo. It verified **23 baseline files unchanged**, exact overlay hashes, noindex, return link, unchanged sitemap and final receipt. The actual sampled V01 homepage supports the exact footer-only insertion and reverse byte comparison. No browser or production functional acceptance is claimed. The V02 JS has no fetch/XMLHttpRequest/WebSocket calls; source CSP uses connect-src none.

Production Spectre publication remains blocked by complete-baseline and deployment-approval gates. This pass does not publish V02, modify the homepage, change images or import Phoenix/Forge/GIGA candidates.

## Recovery and next gates

1. Recover the engineering branch from GitHub; verify recorded commit/tree and patch hashes in the separate recovery package. Full preparation patch replays against the recorded main tree; reverse replay must restore it exactly.
2. Preserve all frozen original Atlas, Spectre, Phoenix, FORGE and GIGA recovery artifacts. This change touches only Atlas tooling/docs/tests and its separate non-deploying validation workflow.
3. Resolve non-deploying workflow-maintenance authority/configuration before changing the live schedule. Do not merge this branch broadly into main.
4. Obtain a complete owner-retained deployed artifact, or separately approve expanded bounded capture and a completeness-attestation process. A successful manifest/HTTP200 is insufficient.
5. Reconcile intervening main/live changes, independently approve source/baseline/overlay/review pins, retain original rollback bytes in durable storage, review exactly one Pages artifact and shared concurrency/deployment permissions. No live publication until these gates pass.
6. Rollback of engineering work means stop using this branch; main/live were never changed. For a future production rollback, revalidate the retained original full baseline against its pin and reconcile later releases before separately authorised redeployment. Never restore bare committed dist, delete product assets or roll back business data.

Project COMMAND remains unimplemented. Its dependency is a trustworthy publish-status/approval boundary and durable complete baseline, not a new public data projection or browser-side publishing credential.

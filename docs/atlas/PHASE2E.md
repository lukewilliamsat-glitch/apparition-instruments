# Atlas Phase 2E — release readiness

Authorisation 24 continues Phase 2D without deploying the website. The first
checkpoint records the Operations decision. The final integration reconciles the
separately authorised schedule-only main commit as an additional parent; no broad
merge into main, production workflow installation or application change occurs.

## Verified production scheduling

Main advanced from `bb4ba2a932239a3ef397272b27143f0cd3adcccf` to
`2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`, tree
`eb2c9f1824602d19ed27f010cf080190a06c713e`. Its only change is one cron line:
`*/15 * * * *` → `0 3 * * *`. Push/manual triggers and every deployment step are
unchanged. The native `[skip ci]` instruction suppressed the maintenance push;
the exact commit independently has zero Actions runs. No deliberate job failure,
workflow disabling, permission change, force push or protection bypass was used.

The authenticated read-only GitHub settings inspection established: Pages source is
GitHub Actions; classic protections and rulesets are absent; main contains only
static.yml; default token permission is read; the Pages environment permits main
only with no reviewer or wait timer; no visible webhooks are configured. GitHub's
documented push skip semantics were reviewed directly. The nine-case pure
maintenance preflight rejects unknown settings, extra workflows, required checks,
missing skip instructions and stale source hashes. This does not authorise future
arbitrary main writes. Current settings must be reverified before future maintenance.

## Operations and version evidence

`phase2e-owner-dispositions.json` binds only `operations/snapshot.json` to observed
and candidate SHA-256 `0f8320dcc2a65cb1ec467ae1c70a3960b26dfd852bbd4c2853d9c8a5501837a3`.
The exact 1,347 bytes, including “Orders are temporarily paused Test”, remain intact.
Disposition SHA-256 is `bde8f5eff303f687e5b3f97d0dc41db1bb0796225562294bdefabd9ec5ae67b0`.
Its separately supplied trust pin cannot approve another path, changed bytes,
publication or a rewrite. A fresh public response also matches those preserved bytes.

The original twenty differences remain independently recoverable: thirteen exact
stamping transformations, six identified content differences and the narrowly
owner-reviewed Operations preservation. `phase2e-disposition-matrix.json` closes
content decisions while keeping authenticity/runtime properties separate.

A new fixed-origin static byte batch made 20 requests: 19 responses succeeded and
the twentieth timed out; no retry followed. Successful identity response bodies
total 75,536 bytes. No scripts were executed, redirects followed, images re-downloaded
or Supabase endpoints contacted. The ledger is retained in the recovery package.

The original 423-file candidate remains unchanged. A **separate non-production**
candidate applies only the existing canonical stampSource transformation at the
actual deployed application revision, then cross-checks observed bytes. Every
previously observed file is protected against replacement; every fresh successful
response must match the canonical candidate. All 269 repository/candidate differences
are recorded individually, including unobserved deterministic transforms.

The resulting manifest is
`f09b597bf4d6fc0fd0e5f2cab6d64162eefb3652b1f3721d2c93b0173e0c0dc9`.
Its inventory covers 423 files: 46 individually observed, 377 unobserved and zero
observed version mismatches. Association with successful Pages run 38167017686 and
application revision bb4ba2 is verified; per-file deployment completeness is not.
The preserved upload log identifies artifact 11712976121; the earlier listing was
empty and its download returned 404. Those failed operations were not repeated.
Artifact absence is established; its exact cause remains unverified.

## Runtime and browser acceptance

The real candidate was analysed under official isolated Node 22.20.0 with inherited
kernel socket denial and injected fixture transports. All 238 JavaScript modules
parse. Thirteen checks pass: static page markup, six PNG identities, disabled public
adapter, real pure Operations/News functions, catalogue caching/invalidation/failure
handling and public repository write denial. No browser entry controller, live
checkout, authentication or production API was executed. Parsing and markup checks
are not rendering tests.

Two browser checks remain pending. Connected Chrome now supports repository settings
inspection, but its advertised API does not provide a disposable profile, process-level
network isolation or verified access to this execution environment's loopback server.
No candidate page was opened. No browser console, visual, mobile or design acceptance
is claimed. The prepared read-only loopback fixture server blocks mutation methods,
API routes, external paths, workers, forms and connections. CSP is defence in depth,
**not** proof of browser process isolation. It was policy-tested but not started.

## Certification and release guards

Version 2 adds mandatory pinned deployment inventory and runtime reports, both bound
by the independent inventory witness. The verifier separates reference closure,
authenticity, deployment completeness, runtime compatibility, owner content
disposition and publication authority. Old version 1 evidence remains inspectable
but cannot enter production preflight. Neither report flags, owner preservation nor
synthetic signing keys can replace missing independent evidence.

The exact canonical transform of independently preserved Git bytes is admissible
source provenance; arbitrary replacement content is rejected even with signed
synthetic review. This does not turn an unobserved transformed file into observed
production evidence. Actual certification remains blocked: complete deployment
reference/inventory attestation and isolated runtime/browser evidence are missing.
No production review key or credential has been created.

Rehearsal is deterministic, preserves all 422 non-homepage files, verifies the four
frozen Spectre assets, changes homepage only by the approved footer insertion and
restores the exact candidate rollback tree. News, checkout and all image bytes are
protected. This proves local preservation, not a complete live rollback. Spectre
remains unpublished; design acceptance is separate.

## Reproduce safely

Use the recovery package's verified Node 22 runtime procedure and network-denial
launcher. All commands below are offline; use fresh output directories.

```bash
python3 tests/atlas/run-offline.py --node /verified/node22 --evidence /new/tmp/tests
```

Recreate the original preserved baseline using `preserved-rehearsal.mjs` as documented
in Phase 2D, adding the owner disposition SHA-256 as the final argument. Then:

```bash
/network-deny /verified/node22 --experimental-vm-modules \
  tests/atlas/release-readiness-rehearsal.mjs \
  /recreated/base /recovered/source /package/public-version-capture \
  fc1249c49e46e35753a09a78439103d200a778b9af24924ed32bc6165a1dbed0 \
  bde8f5eff303f687e5b3f97d0dc41db1bb0796225562294bdefabd9ec5ae67b0 \
  /new/readiness
```

Certification CLI adds a separately pinned owner-trust JSON array after the existing
signer-trust arguments. The source candidate must never supply its own trust authority.
The loopback browser harness requires `--allow-loopback` and exact root/manifest pins;
do not open it until a suitable disposable, externally isolated browser is demonstrated.

Remaining owner action is narrow: provide an authentic complete deployment archive/
inventory if retained, or authorise a specifically bounded independent reconstruction
validation; and provide an isolated browser environment or owner-run acceptance
evidence. No settings screenshots or new Operations content decision are required.
Publication still requires its own explicit authorisation after technical gates pass.

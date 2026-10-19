# Atlas Phase 2C — Authorisation 22 continuation

Base: `9026ad4d0a12e532f6878ef5ae6221d8865bf3e4`, tree `f2f03b2d5d78f9e720bf336c91e631e9998004e0`. Main remains `bb4ba2a932239a3ef397272b27143f0cd3adcccf`. This is an engineering candidate, not a production release.

## Interruption recovery

The interrupted pass left no Phase2C GitHub branch or published commit. Its 17 local changes and diagnostics were reported in the conversation, but the filesystem exposed to the continuation was an older snapshot without the Authorisation21/22 directories. No missing workspace was claimed accessible.

The durable Phase2B archive was retrieved and verified: SHA256 `0a413a739caec97567b28c4cac763ed99752a95bb9719cbb74320c3031bdcc87`, ZIP CRC, all108 internal manifest entries, bundle identity and Git object integrity. It was restored into a new directory. Recorded Phase2C source/test patches were recovered from the execution transcript; no Phase2B code was reimplemented or frozen checkpoint overwritten. Because these restored bytes needed independent validation, the focused tests were rerun rather than relying on the previous248-test summary.

The restored candidate and assessment reproduce their previously recorded hashes exactly:

- Candidate manifest: `f5744201eefa765c94994ace0dfca55f83abde734b96828a5b5db377c3e15738`.
- Assessment: `38fcc60a9015c2ef3e3c351494a67a4563d90e1018b08da345dd7a41863e280b`.

Old local capture-failure diagnostics were unavailable. Their recorded outcome is retained explicitly as historical evidence, not recreated as a raw ledger or rerun against production.

## Workflow maintenance and schedule

The original workflow-publication attempt was rejected by automatic approval review, which cited the earlier manual-only restriction. The direct Authorisation22 continuation clarified the broader isolated-CI authority. The continuation successfully published a workflow-only engineering commit `fdac71ec677132930d19b0b51c2b7a8ae8f29bf2` (tree `231918fdd3d70c0e9ca4d425a310204c5f085943`) to `atlas/phase2c-workflow-recovery`.

That change only retargets the non-deploying Atlas validation workflow to the exact engineering branch, ignores workflow-only push paths and pins verified official actions. Checkout v4: `11d5960a326750d5838078e36cf38b85af677262`; setup-node v4: `49933ea5288caeca8642d1e84afbd3f7d6820020`. Permissions are contents:read; no secrets, deployment environments, Pages/OIDC writes or uploaded artifacts. Checkout does not persist credentials. The production workflow is untouched.

The first workflow-only push produced zero runs (negative control). The subsequent source push is the positive control; its final run/outcome is retained in the recovery package after publication. `workflow-maintenance.mjs` separately tests workflow-only, mixed, malformed, manual and scheduled event decisions. It is a model, not an independent GitHub authorisation mechanism.

`workflow-maintenance.REVIEW-ONLY.diff` proposes the minimal production change: ignore `.github/workflows/**` on main pushes and change cron to `0 3 * * *`. It is not installed. Path filtering has GitHub diff/timeout limitations, does not suppress manual/scheduled events and can leave required checks pending. No skip-CI marker or token-event suppression is used. Main protection reads remain403, and Pages configuration/other deployment automation is not fully established. Branch-level evidence must not be overstated as proving the full default-branch transition safe.

The review patch uses zero-context hunks; check/apply it with `git apply --check --unidiff-zero` / `git apply --unidiff-zero` only in an approved checkout after the transition gate passes. Its exact YAML transformation was verified in a disposable local fixture, without executing a workflow.

**The actual live cron remains `*/15 * * * *`. Main was not changed.** No production workflow disabling or security-setting change occurred. The next schedule gate needs owner-visible Pages/branch-protection configuration and reconciliation of all relevant publication triggers before applying the reviewed diff.

Primary GitHub references:

- https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs

## Public capture and recovery

`capture-public.mjs` accepts a SHA-pinned versioned plan, the fixed Apparition HTTPS origin and an explicit safe-path/MIME allowlist. Limits: at most64 requests, 8MiB per body, 32MiB aggregate and15seconds per request; concurrency1, retries0, redirects0. No cookies, authentication, JavaScript or API paths. Identity encoding and declared bounded Content-Length are checked before reading; PNG/JPEG/WebP/SVG signatures and optional expected hashes are checked. Other types have MIME/byte integrity checks, not full semantic decoding.

Bodies and records are exclusively created with read-only modes; SHA256-chained request records and a final sealed RESULT bind plan, order, counts, hashes and partial-failure boundaries. `verifyCapture` requires an independent final-result pin and rejects altered, missing or extra bodies. Read-only file modes are not immutable against a filesystem owner; retained hashes detect changes. Missing final seal means interrupted/unverified evidence. Byte totals refer to stored identity bodies, not headers/TLS/buffering or billed egress. Live execution requires an explicit flag. No capture module is imported by static release staging.

The earlier pass attempted one24-path batch (12MiB aggregate, 4MiB/file, eight-second timeout), stopped on its first DNS failure `EAI_AGAIN`, captured zero bodies and did not retry. The continuation made no new live-site capture request. Existing authentic public evidence was recovered from the verified Phase2B archive.

The previous479 broken references represent **96 unique missing paths and383 duplicates**. `gapInventory` separates those counts from external URLs and dynamic/unproven references. Every one of the96 paths has a historical canonical repository object; this does not prove its bytes are the current live version.

`reconstruct-candidate.mjs` verifies pinned local sources, rejects source/output overlap and conflicting equally authoritative versions, preserves observed live bytes over differing historical fills, validates the union and rechecks sources after copying. No missing image/content is generated. A final result is written last; interrupted/unsealed output must not be used.

The independently recovered reconstruction contains **417 files /15,495,657 bytes**: **27 previously observed live files plus390 historical repository files**. The known absent obsolete `products/sbe-600/index.html` is explicitly excluded. Twenty source/live versions differ; every competing digest is recorded and the observed bytes are retained. Static reference errors and unique unresolved static paths are now **zero**.

The comparison scope covers95 HTML paths,322 static files,14 known image paths, two News files,46 Hub/CMS files, seven checkout/basket files and all417 protected paths. These are comparison sets, not proof that all live/unlinked routes, dynamic product images or authenticated workflows were discovered. The historical source is not a deployed artifact. No additional historical artifact download was repeated.

## Completeness and release interfaces

`assess-recovery.mjs` requires independently pinned manifest, scope and per-file provenance. It checks routes, protected content, images, News, CMS, checkout and static assets independently. Empty categories need reasons; exclusions cannot erase required content; every protected file needs scope and matching provenance. Hash failures, unknown paths, unresolved references, synthetic content and unbound provenance cannot become complete production evidence.

Taxonomy: complete-authenticated-artifact, reconstructed-candidate-requiring-approval, incomplete-partial-capture, invalid-evidence, unknown. **Every status returns deployable:false.** Authenticated-artifact classification additionally requires externally reviewed origin/version/manifest assertions plus supplied archive bytes matching the archive pin. The tool does not independently authenticate GitHub or verify archive extraction mapping. An invented label/hash without archive bytes cannot claim authenticated completeness.

Current candidate: integrity and static closure pass; inventory authority is unattested, version compatibility unverified, classification reconstructed-candidate-requiring-approval. Its20 version conflicts require review. Neither static closure nor a pinned self-generated scope is owner approval.

`run-release.mjs` preserves the Phase2B adapter interface and adds a versioned end-to-end contract. It binds source revision, preparation inputs, review evidence, scope and provenance; assesses; prepares; assembles; verifies final artifact hashes; rereads every pin; and reassesses the original baseline. Output is deterministic machine-readable evidence with a human-readable summary and rollback baseline pin. No upload/deployment action exists.

Modes: validation-only rehearses fixtures; audit-only creates no candidate; static-only needs independently reviewed complete evidence and a separate exact assessment/baseline/source approval pin; full-build/CMS-only/unknown modes block with no stale-data fallback. Mismatched mode/context, invalid versions, competing output reservations, changed inputs and stale approvals block. SHA256 proves integrity of independently approved bytes; it does not authenticate an untrusted party supplying both content and hash. Production orchestration must obtain pins from a trusted owner-controlled boundary.

```bash
node scripts/atlas/capture-public.mjs PLAN.json EXPECTED_SHA256 NEW_OUTPUT --allow-live
node scripts/atlas/run-release.mjs RUN_PLAN.json EXPECTED_SHA256 VERIFIED_SOURCE_SHA NEW_CANDIDATE
# Separately approved production-completeness preflight also supplies:
# OWNER_APPROVAL.json EXPECTED_OWNER_APPROVAL_SHA256
```

## Validation and Spectre

The restored source passes248/248 focused tests and nine network probes under isolated official Node22.20.0. Archive checksum `00bbd05e306ea68b6e13e17360d0e2f680b493ef95f2fea1c4296ff7437530bc` matched the official checksum metadata preserved in the verified Phase2B archive. Detached-signature trust is not independently established. The binary was copied with hash verification into a disposable temporary directory; system Node24 and global configuration were unchanged.

Tests use the reviewed inherited seccomp/no_new_privs launcher, stripped credentials and injected capture transports. New coverage includes budgets, signatures/MIME, timeout/failure boundaries, tampered ledgers/plans, path restrictions, duplicate-gap counting, provenance/coverage, fake artifact escalation, mode/version mismatch, stale completeness approvals, deterministic output, concurrent staging, exact copying and workflow event modelling. Static import-closure checks establish that staging imports no Supabase client, network module or production generator. Network denial is additional defence.

The full frozen-Spectre rehearsal runs assessment → preparation → assembly → final verification → rollback-input verification against synthetic routes. It preserves23 baseline files, all four frozen asset hashes and the original valid baseline. Source commit `2c85049b8583fc225d79406ba36e56b01bec9ad4`, tree `e1136da6ba9b3b8312dfbce0f73113dd2f2a7a19` remain intact. No browser/live acceptance or Spectre publication is claimed.

## Recovery and remaining gates

Keep the Phase2B archive, original frozen candidates, restored source, new GitHub commits, full/incremental patches, complete Git bundle, candidate/provenance/conflicts, assessment and current test/CI diagnostics. Detailed recovery identities and outer ZIP hash are recorded outside this self-referencing source document.

No production rollback is needed: main/live output were not modified. Engineering rollback means stop using this branch and retain its recovery data. Future production rollback must revalidate a retained complete baseline and reconcile intervening releases. Never deploy this reconstructed comparison set merely because references close.

Before daily schedule publication, establish the default-branch/Pages/protection gate. Before any storefront release, obtain independent live inventory/version-completeness approval and reviewed deployment inputs/rollback retention. No database, Supabase, RLS, Stripe, checkout, DNS, hosting, billing, image-publisher or production permission changes occurred; no emails or customer transactions were sent.

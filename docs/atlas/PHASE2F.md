# Atlas Phase 2F — independent attestation

Authorisation 25 continues exact Phase 2E `33183afaa51a16e7d35b711fd39d2eac37045eaf`
(tree `1914490dbea7a9f0d64b6cc91d046cec7aeb09b9`). Main remains
`2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f` (tree
`eb2c9f1824602d19ed27f010cf080190a06c713e`). Its daily cron is not modified.
No production deployment, application change, Supabase request or Stripe request.

## New independent evidence

The authenticated GitHub API confirms latest successful main Pages run
`38167017686`, application source `bb4ba2a932239a3ef397272b27143f0cd3adcccf`,
tree `0f6ac37987b07050f6d457ff42861943813389e7`. Job `114551575060`
successfully generated nine product pages, one News article and 31 CMS articles,
stamped 269 files, uploaded one artifact and deployed it.

The tar listing in that successful job's retained log enumerates **exactly 423
files**, matching the candidate's complete path set with no missing/extra path.
This closes historical **path-membership** evidence. It is not a per-file digest
manifest or proof of every deployed byte. The authenticated recursive Git tree is
complete and every available historical `dist/` blob is checked against its Git
object hash. 415 candidate paths have source objects associated with this deployment;
the eight source-absent paths are covered by preserved public observations.

Raw log SHA-256:
`638db906bf609b69e303126b086cfac76aee5b86be69e5c44c2c90ddddb575ff`.
Original artifact `11712976121`, uploaded ZIP 20,301,778 bytes, recorded ZIP SHA-256:
`d3e804f37e04ea25bbd5e5df3764d8ea2c2ea201f71c381f102142e1be29f3d8`.
Its payload remains unavailable; known failed artifact downloads were not repeated.
A filename-only backup search found no `github-pages.zip`; that is not an exhaustive
claim about all possible owner archives.

Source association is now demonstrated, rather than inferred from a file merely
existing in a repository. However, generation inputs and a complete independent
byte/reference witness remain relevant. The pipeline footprint distinguishes files
expected to be copied/canonically stamped from product/CMS/Operations/environment
outputs. It does not make a supply-chain or filesystem-write theorem about arbitrary
dependency lifecycle scripts. No self-created signing key is treated as independent.

## Bounded public observation and separate correction

One fixed-origin batch attempted exactly sixteen unauthenticated static GETs, with
no redirects/retries, a 1 MiB total body budget, 128 KiB per file, five-second request
timeout and 90-second wall cap. Eight bodies succeeded, totalling **92,856 bytes**.
Eight failures remain unresolved. No image was downloaded; no script was executed.

Four bodies matched Phase 2E exactly. Four exposed real reconstruction differences:

| Path | Difference |
| --- | --- |
| `products/ai-pot-ss-alphamini-a500k/index.html` | Generated navigation/markup and learning/tool links |
| `products/bleed-premium/index.html` | Generated wording, tolerance metadata and tool handoff links |
| `products/pot-short-alpha-a/index.html` | Generated navigation/markup and learning/tool links |
| `components/potentiometers/index.html` | Serialised boolean attribute markup |

The original Phase 2E baseline remains untouched. A **separate reconstruction**
copies those four exact observed bodies; no source template, live page or protected
business data is edited. Previously observed authentic versions cannot be replaced
by this correction mechanism. All before/after hashes are retained.

Phase 2E manifest:
`f09b597bf4d6fc0fd0e5f2cab6d64162eefb3652b1f3721d2c93b0173e0c0dc9`.
Phase 2F successor manifest:
`f69ee4fa0b73b46a53eb6f3a575fb6e43eb46b37b94ebb41fc99a67fe1438450`.

All 423 paths are classified, with distinct evidence-exists, authoritative-byte,
version-compatibility and certification-sufficiency fields. There are **54 exact
publicly observed files**, zero known mismatches in the successor, and **369 files
without direct byte observations**. All 369 have canonical source/version evidence
associated with the historical upload. A conservative generator footprint further
prioritises the unresolved generated paths separately from source-derived assets;
see `phase2f-pipeline-coverage.json`. This prioritisation does not self-certify them.

No conflicting build stamps were found. A coherent reconstruction, an authenticated
historical deployment payload and a verified current production baseline are separate
claims. Only the first is supported here. Historical path membership is authenticated;
complete historical/current byte authenticity remains blocked.

Operations preserves its exact 1,347 bytes and title ending in `Test`:
`0f8320dcc2a65cb1ec467ae1c70a3960b26dfd852bbd4c2853d9c8a5501837a3`.
The original twenty dispositions remain valid. New observed differences are recorded
explicitly and cannot reuse the owner Operations approval for another path.

## Runtime, browser and certification

The successor's 238 JavaScript modules parse. Thirteen static/pure-module checks
pass; two browser groups remain pending. The dependency inventory identifies source
network primitives and literal origins without importing browser controllers or
claiming these literals are executed requests. No authenticated functionality,
checkout integration or responsive visual acceptance is claimed.

The extension connection is unavailable. The cloud browser's supported API exposes
no request-interception/process-isolation controls. No candidate/live application
page was opened. Browser acceptance therefore remains **not executed**, not passed.
`BROWSER-ACCEPTANCE.md` and the pinned `phase2f-browser-plan.json` provide the owner-run
route, viewport, isolation and evidence requirements. Twenty-four route/viewport
cases remain pending. No screenshots or console diagnostics are fabricated.

New browser receipt checks bind plan/document hashes, isolation probe artifacts,
route coverage, screenshots, viewport dimensions and console/network diagnostics.
Missing screenshots, external allowed traffic, mutations, wrong document versions,
partial checks and false pass labels are rejected. Receipt validation is not proof
of execution; independently trusted witness binding remains mandatory.

The certification engine consumes the full attestation through the existing signed
inventory-report binding. It reports historical path coverage separately from file
authenticity, deployment completeness, version consistency, runtime compatibility,
Operations disposition and publication authority. Missing reference and independent
witnesses still block certification; browser acceptance remains pending. No completed
category can substitute for another and publication remains not granted.

## Release rehearsal and recovery

The offline rehearsal uses the successor only in `validation-only` mode. Repeated
assembly is deterministic, all 422 non-homepage files are preserved, all six original
product PNGs and four frozen Spectre assets remain exact, and the homepage receives
only the approved fixture footer insertion. Exact candidate rollback is verified.
Production mode is rejected before an output directory is created. Existing focused
tests also cover interrupted staging and rollback mismatch. Spectre is not published.

Release ID:
`bb95052caa8ed6cb25b78b7b210f65d5cd006a1dc05d42f8a167d5fd2789148e`.
This proves local candidate recovery, not a complete live production rollback.

An initial local test run exceeded the inherited three-minute harness limit. The
corrected harness uses an isolated process group, a bounded seven-minute limit,
retains partial diagnostics on timeout, and terminates inherited children. A focused
fixture verifies this behaviour. No production/network guard was weakened.

The recovery ZIP includes the source bundle, E-relative/main-relative patches,
proof metadata/log, bounded response ledger and bodies, all prior replay inputs,
machine-readable verdicts, test diagnostics and exact regeneration instructions.
Raw public captures and the runtime archive are not committed to GitHub. Recovery
requires no Supabase, Pages publication, owner credentials or dependency installation.

## Remaining decisions

1. Independently review source-derived evidence and resolve the precisely enumerated
   generated-byte gaps; or recover the original artifact matching the digest above.
   Do not demand a separate GET for every source-derived file or treat source proof
   as automatically equivalent to its generated output.
2. Execute the 24-case plan in a supported externally isolated real browser and
   retain genuine screenshot/console/network evidence.
3. Obtain independent inventory/functional witness binding and complete reference
   evidence; rerun the existing fail-closed certification engine.
4. Request separate owner publication approval only after technical gates pass.

No further schedule, Operations wording or generic infrastructure audit is needed.

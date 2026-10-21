# OPERATION HOMECOMING — Authorisation 36

**BLOCKED — NOT DEPLOYED.** The reviewed CSS is preserved; mandatory complete-publication and rollback gates did not pass. This is not an Atlas reopening or a production baseline adoption.

## Reconciled source

- Production main: `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`; tree `eb2c9f1824602d19ed27f010cf080190a06c713e`.
- Preparation branch: `release/spectre35-homecoming`, based directly on verified main.
- **CSS-only candidate commit: `ee2ca60616c61304d26b7a2f7b9ff04555337cd0`; tree: `f895a3173959b7e243566902be3552e44ecbc2b9`.** Its parent is production main and its only changed file is `dist/customer-ui.css`.
- SPECTRE 35: `4f09bd5b4d5109df6028a8dc0d00468512d9af1c`, tree `fa02cb3bfae4711747a20635ad8a612eb2ac7617`. None of its test workflow, fixtures or screenshots was merged into the CSS-only commit.

The four original-to-reviewed replacements were applied only after baseline/selector checks. Original CSS Git blob `5a77dc0a6ee40fab7d1335c9c9c3003f36a36891` → reviewed blob `525ae6e3aacb40b2385192e32eb894b351f25c75`. Corrected SHA-256: `16d6ebbd2372d54e32565a7999edfd1bc9152c785b77f1bcbf79ee47bba1794a`. All other baseline source blobs remain unchanged.

## Why publication stopped

The latest visible successful Pages run is [38167017686](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/38167017686), 11 October, source `bb4ba2a932239a3ef397272b27143f0cd3adcccf`. Its original artifact ID `11712976121` is absent from the run listing; a single current retrieval attempt returned HTTP 404. Its one-day retention is recorded in the historical log, but 404 alone does not establish the exact deletion cause.

The latest main run [39567549124](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39567549124), 21 October, failed at product generation with HTTP 402; upload and deploy were skipped. Current main's `dist/` has 416 tracked files and 94 HTML pages, identical to the successful run's source tree. That does **not** prove equality to generated, stamped or currently served output. No complete authoritative payload or full rollback copy was recovered. Current active-deployment association is unverified; deployment/Pages configuration API URLs are unsupported by this connector.

The existing daily workflow remains unchanged. A `[static-only]` push still invokes the CMS generator, which performs a Supabase RPC. Skipping every generator would not establish complete current content. No replacement publishing workflow was installed and no production write was attempted.

## Evidence and continuation

[Release manifest](RELEASE_MANIFEST.json) · [Publication safety](PUBLICATION_SAFETY.md) · [Live acceptance status](LIVE_ACCEPTANCE.md) · [Rollback](ROLLBACK.md) · [Next phase and proposed approvals](NEXT_PHASE.md).

The manifest's repository inventory is explicitly source-only; authoritative publication/rollback payload identities are null. [Fresh read-only CI 39612316997](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39612316997) passed **27/27 tests, zero skips**, on Python3.12.3. Four IPv4/IPv6 TCP/UDP socket probes were denied, child inheritance and NoNewPrivs verified; existing libseccomp was reused with no dependency installation. The local run passed 26 with its full-Git case explicitly skipped; CI completed that proof. [Test evidence](TEST_RESULTS.json).

Synthetic safety tests exercise guarded extraction, missing/corrupted/extra output rejection, deterministic assembly and exact fixture rollback. Their success cannot certify production. Separate branch-only CI has read-only permissions and no production deployment path.

SPECTRE's prior Chrome/Node22 acceptance is reused because the corrected CSS is byte-identical. Its known external-font/desktop-browser-zoom limitations and pre-existing 7px enlarged-text header overflow remain. No new live-browser acceptance is claimed.

NIGHTFALL remains isolated at `c3003c6a56075964f5036ea57507aed8f431b64e`; its application was not merged or activated. Future backend checks and BLACKBOX30 are proposed, not executed. The single recommended next product implementation is **COMMAND01, a synthetic read-only catalogue workbench**, under a separate authorisation.

Production modifications performed: **none**. No main write, production workflow change, deployment, Supabase/Stripe request, live storefront request, image publication, adapter activation, DNS or billing change. No routine owner-side setup or ZIP is required.

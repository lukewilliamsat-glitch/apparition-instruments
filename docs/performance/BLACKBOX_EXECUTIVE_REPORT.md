# BLACKBOX executive report
Authorisation 29 / 29A · 20 October 2026

## Decision summary
The strongest byte-reduction opportunity is to stop transferring embedded product images in routine catalogue responses. A second, distinct finding is that shared project/kit imports initiate those reads even when a Forge interaction does not need images. Current main already has daily scheduling; reducing it from fifteen minutes is completed work, not a new recommendation.

GitHub evidence proves the failed generator received HTTP 402. It does not prove the billing reason, actual billed egress, current backend health or the state of the previously published website. No Supabase, Stripe or live storefront request was made.

Authorisation 29A supplies the formerly missing mission scope and exact research branch. It authorises this documentation-only checkpoint, without production implementation. Atlas remains frozen, COMMAND remains unimplemented, and no frozen candidate is adopted as a production baseline.

## Verified identities and original provenance
Repository: lukewilliamsat-glitch/apparition-instruments (public).
Expected and verified main: 2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f.
Main tree: eb2c9f1824602d19ed27f010cf080190a06c713e.
Research branch: research/blackbox-supabase-egress-forensics.
Reset handover: c0c8a8f4ee65fbcfc3f800685ae1a219d992fda7.

| Preserved original | Publication path | SHA-256 |
|---|---|---|
| BLACKBOX_GITHUB_ASSESSMENT_2026-10-20.md | [Original assessment](blackbox/BLACKBOX_GITHUB_ASSESSMENT_2026-10-20.md) | 3a0a955f06eb3f8f08d2086505fe843958eaae48a43eaac6bf270927356b6807 |
| BLACKBOX_RESEARCH_EVIDENCE_2026-10-20.json | [RESEARCH_EVIDENCE.json](blackbox/RESEARCH_EVIDENCE.json) | bc085753e78f797ebb5795098165a0e23dc98d258ef2bec9b583c42659073d15 |

Both originals were recovered unchanged. All 12 internal manifest entries verify. The original assessment's “missing specification/branch” stopping point is historical and is superseded by Authorisation 29A; its evidence and findings are preserved, not silently rewritten.

## Top ten suspected traffic contributors
This is a **research-priority ranking by plausible bytes and fan-out**, not measured production attribution. Related rows overlap; their savings must not be summed. “High” confidence describes the source mechanism, not its share of billed usage.

| Rank | Candidate contributor | Evidence / potential scale | Mechanism confidence; attribution gap |
|---:|---|---|---|
| 1 | Routine public image-bearing catalogue reads | Historical full 14-row response: 9,007,039 gzip body bytes; image-free technical response: 1,875. | High / HISTORICAL bytes; current frequency and payload unknown. |
| 2 | Scheduled product generation | Generator bypasses cache and requests image. Historical schedule was five, then fifteen minutes; current schedule is daily. | High / VERIFIED source and failed run; successful-run bytes not captured. |
| 3 | Authenticated Admin catalogue listing | Every list independently reads components, inventory and component_internal; components include images. | High / VERIFIED source and SYNTHETIC fan-out; real Admin volume unknown. |
| 4 | Incidental image loads through shared project/kit imports | Actual shared-model import initiated three mocked GETs, including full image-bearing components. A dedicated image-free Forge matcher does not prevent it. | High / SYNTHETIC plus source trace; subset of public catalogue traffic, not additive to rank 1. |
| 5 | Admin save/stock-triggered repeat full lists | Stock update plus explicit UI refresh produced seven mocked GETs and one fixture PATCH, including two component lists. | High / SYNTHETIC; overlaps rank 3, write validation must be preserved. |
| 6 | Public Operations polling | Two RPCs per visible cycle, nominally 120 calls in a one-hour window; boundary/visibility events may add calls. | High / VERIFIED source; response bytes and visible-tab time unknown. |
| 7 | Forge cloud revision/template/document loading | Up to 200 full revision snapshots; several other private reads on selection. | High / VERIFIED source; actual snapshots, user activity and billed bytes unknown. |
| 8 | Admin Orders plus delivery history | Source list lacks client pagination and retrieves order/audit data. | High / VERIFIED source; database row caps and response sizes unknown. |
| 9 | Backend-dependent CMS/News generation | Fully successful normal build includes Operations, News and CMS RPCs; CMS is unconditional even on tagged static-only pushes. | High / VERIFIED source; content sizes and successful run counts unknown. |
| 10 | Auth identity/refresh and dependent reload fan-out | Token expiry checks and auth-state callbacks can lead to additional requests; no observed request storm. | Medium mechanism concern / UNKNOWN contribution; measurement before any correction. |

Direct database/Supavisor traffic, Storage, other clients and unexpected automation could be material but cannot be ranked from this evidence. The email cron source is conditional on eligible pending work, so its minute schedule does **not** imply 1,440 Edge invocations per day. Live service metrics and anonymised logs were not accessed.

## Five highest-priority optimisation opportunities
| Priority | Proposal | Evidence-backed value | Approval and regression boundary |
|---:|---|---|---|
| 1 | Complete separately gated static-image/reference delivery using existing GIGA preparation | Historical image-free gzip comparison is 99.979% smaller. No measured monthly saving is claimed. | Exact asset hashes, durable retention, replacement race, fallback, manifest and rollback validation before separate cutover approval. Adapter stays disabled. |
| 2 | Remove eager catalogue/kit I/O from shared project-model startup | Avoid incidental full catalogue and kit reads when project work does not need commerce. | Preserve saved-project schemas, kit-reference checks, handoffs and authoritative purchase validation. |
| 3 | Separate genuine static publication from backend refresh | A normal successful generator sequence makes five explicit backend calls; current tagged “static-only” path still runs CMS. | Requires verified complete publication/rollback inputs and separate workflow/deployment authority. Do not reopen Atlas here. |
| 4 | Use authenticated Admin summaries and on-demand authoritative detail with refresh coordination | Listing can omit image bytes; editor still needs original writable image data. | Reconcile frozen V4 work, preserve image unloaded/deleted distinction, dirty forms, CAS stock validation and full-data consumers. |
| 5 | Add safe Operations error backoff and lifecycle coordination | Reduce request repetition during errors and redundant refreshes. Byte benefit unmeasured. | Preserve timely pause/resume, announcement boundaries, fresh purchasing checks and failure recovery. |

See [optimisation register](blackbox/OPTIMISATION_REGISTER.md) for effort, risks, test requirements and lower-priority candidates. No proposed fix was implemented.

## Quantitative interpretation
- Historical full versus technical payload: 11,946,961 / 8,843 raw JSON bytes; 9,007,039 / 1,875 gzip body bytes. The filtered generator's actual body was not measured.
- Illustrative successful-run model using the historical full gzip body: 288 runs/day → 2,594,027,232 bytes/day; 96 → 864,675,744; 1 → 9,007,039. These are conditional arithmetic, not bills, actual totals or guaranteed bounds.
- Synthetic 14-product fixture: legacy 1,053,897 raw / 792,110 gzip; summary 5,011 / 473; identity/reference 6,013 / 774. Synthetic compression is not a production measurement.
- Nineteen synthetic scenarios and six process-level network-denial probes passed under Node 24.19.0. Three import-trace assertions were also recorded. Publication reused these results without rerunning tests.
- Current browser cache, real request counts, current image fingerprints, deployed backend versions and production service allocation remain unverified.

## Three most valuable post-reset measurements
Subject to a new explicit approval, the bounded application protocol contains **three image-free GETs only**:
1. Filtered catalogue metadata: raw and encoded body bytes, returned IDs/count, status and timing using the exact generator projection minus image, limit 20.
2. Lightweight catalogue identity projection: id,image_identity only with matching filters, limit 20; execute once to observe size/timing and check the potentially expensive digest path.
3. Catalogue options: the generator's explicit option fields, limit 100; record bytes/count/timing to complete the product-step request budget.

These do not establish billed service attribution. Existing usage exports by service/day and privacy-safe endpoint/status counts are the complementary evidence needed before estimating actual savings. Any such dashboard/log access must be explicitly scoped in the next approval.

Hard limits: three application requests maximum; 32 KiB decoded per response / 96 KiB aggregate; 64 KiB aggregate encoded body; 15 seconds per request; no retries or redirects; stop on 402/401/403, schema mismatch, limit saturation or budget breach. No image-bearing baseline request is included. The [post-reset protocol](blackbox/POST_RESET_AUDIT.md) is **unexecuted and unauthorised**; 24 October is an expected reset date, not a trigger or proof of recovery.

## HTTP 403 and publication safety
The previous failing operation was the persistent file-saving helper's hosted-apps **tools/list** request, which returned HTTP 403 before saving. It was not a GitHub branch creation or commit error. Its deeper authentication/authorisation cause was not exposed, so it cannot be attributed to repository rules or a wrong GitHub branch.

For this publication GitHub metadata reported push permission; the repository was not archived; no repository rulesets were returned. The authorised research ref was absent before preparation. The visible sole workflow triggers on push to main, explicit manual dispatch and the default-branch daily schedule. Documentation publication to the named research branch does not match its push trigger. No workflow file, permission, credential or protection was changed; no workflow dispatch is part of this mission.

Actual GitHub persistence is established by the final branch/commit/content checks reported with this mission. The unrelated file-saving 403 has not been claimed repaired.

## Recommended next authorisation
Authorise BLACKBOX 30: a bounded, read-only post-reset attribution check on or after 24 October 2026, only after owner confirmation to proceed. Scope it to the three image-free GETs and budgets above plus explicitly approved existing usage/log summaries. No implementation, SQL, privileged function invocation, image extraction, customer payload collection, workflow action or deployment. If safe access or budgets fail, stop.

Before that approval, preserve this research checkpoint and make the business choice of the first implementation milestone from evidence rather than starting another broad engineering programme.

## Supporting reports
[Interaction inventory](blackbox/INTERACTION_INVENTORY.md) · [Frequency](blackbox/FREQUENCY_MODEL.md) · [Payloads](blackbox/PAYLOAD_ANALYSIS.md) · [Journeys](blackbox/JOURNEY_ANALYSIS.md) · [Images](blackbox/IMAGE_DELIVERY.md) · [Admin](blackbox/ADMIN_EFFICIENCY.md) · [Actions](blackbox/GITHUB_ACTIONS.md) · [Backend](blackbox/BACKEND_COST_CENTRES.md) · [Caching](blackbox/CACHE_ANALYSIS.md) · [Scenarios](blackbox/SCENARIO_MODEL.md) · [Post-reset audit](blackbox/POST_RESET_AUDIT.md) · [Optimisations](blackbox/OPTIMISATION_REGISTER.md).

All findings are grounded in the preserved originals, which contain immutable GitHub source links. Production health and authenticated browser workflows have not been certified.


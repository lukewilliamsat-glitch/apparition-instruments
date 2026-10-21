# COMMAND 02 architecture
The candidate extends COMMAND 01 from its frozen final checkpoint. Production main and all existing Admin modules remain unchanged. The sole inherited source change is an optional extension in `prototypes/command01/view.mjs`: an action guard and state notification. With no extension, COMMAND 01 retains its existing behaviour; its 42 Node and 32 Chrome regressions run in the same isolated CI job.

## Responsibilities
- **COMMAND 01 model/controller/view:** image-free catalogue summaries, local search/filtering, stable ID selection, explicit refresh, stale read protection and the original inspector.
- **schema.mjs:** editable whitelist, exact integer-pence parsing, limits/types, semantic diff, safe patch validation and read-response validation.
- **persistence.mjs:** per-page in-memory authority, atomic compare-and-set, operation journal/idempotency, explicit read/write permission simulation and injected faults. No network or browser storage.
- **session.mjs:** isolated editor baseline/draft/server snapshots; version-aware review/save/reload; generations and pending-save coordination.
- **editor-view.mjs:** persistent form controls, six sections, field messages, modified-field links, native confirmation/review dialogs, focus and navigation protection.
- **fixture-entry.mjs:** explicit injection of the synthetic authority and existing catalogue transport. No default production adapter.

## State machine
Closed → loading → editing. Edits change the local draft only. Validation errors block review. Review reads the current fixture version; a mismatch enters conflict. A valid review records the exact patch fingerprint. A subsequent edit invalidates that review.

Review → saving → saved, confirmed error, conflict or unknown outcome. Save success is reported only after the adapter returns a matching identity, operation ID, patch values and next synthetic revision. Success advances the baseline; edits made after submission remain in the draft and remain dirty. Same-operation submissions coalesce.

Conflict preserves the original, local and latest authoritative values. There is no force-save. The user may keep reviewing local values, or explicitly discard/reload the current authority. Unknown outcome blocks resubmission and discard until an operation-status query proves committed or not applied.

Reload/discard reads current authority before replacing the draft. Failed reload retains local values. Closing, switching products and manual refresh use a native modal when edits would be lost. Filtering and clearing filters retain the editor and its stable ID, so they do not need a destructive reset. Background catalogue refresh never replaces the editor draft.

Native beforeunload protection covers reload/closing the page when dirty, saving or unresolved. Browsers control that generic prompt; it is not a promise of durable local recovery. A clearly local fixture-exit route exercises explicit navigation without any production link.

## Rendering and performance
Form controls are created once and retain focus/caret during editing. Per-keystroke editor updates do not rebuild the catalogue or request details. Catalogue metadata refresh follows confirmed save once per product/revision. The original inspector may reload metadata on a changed revision under COMMAND 01's existing contract; no image bytes are requested.

14, 100 and 500 fictional products are exercised. Browser measurements are synthetic interaction timings on a hosted runner, not production latency or egress savings.

## Boundaries
Stable IDs, category, manufacturer/key relationships, stock/unit, original image and private cost are outside the patch. Series and Reference use existing legacy spec keys; specialised electrical/physical facts remain read-only. Read-only metadata is distinct from writable source image data.

The fixture revision is not a deployed database column or verified production write capability. See FIELD_AUTHORITY.md and RELEASE_GATES.md.

## Final lifecycle hardening

Read, review, save and operation-status calls have real bounded client deadlines (8 seconds by default; the acceptance fixture uses 2 seconds). A stalled save remains uncertain, because a client deadline does not prove the adapter could not commit later. Pending/unknown status never enables duplicate submission. The regression suite proves a late commit can be reconciled without a second write.

Catalogue invalidation keys include both product ID and revision. Saving two different products at equal revision numbers therefore refreshes each correct identity. Session generations protect late read errors and save completions after switching or teardown. No polling, network fallback or live authentication import is introduced.

Final implementation inventory: eight files under `prototypes/command02/`, three under `tests/command02/`, the isolated `.github/workflows/command02-acceptance.yml`, and optional hooks in `prototypes/command01/view.mjs`. Exact tested hashes are in TEST_RESULTS.json. Documentation and pending screenshots are separate from that source manifest.

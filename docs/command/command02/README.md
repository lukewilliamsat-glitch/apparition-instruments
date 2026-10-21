# COMMAND 02 — The Forge Editor

**Outcome: PARTIAL.** The isolated editor and functional acceptance pass. Required screenshot preservation in Git is incomplete because automatic approval review rejected public PNG publication. No production integration or deployment has occurred.

## Verified identities

| Reference | Commit | Tree |
|---|---|---|
| Production main, unchanged | `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f` | `eb2c9f1824602d19ed27f010cf080190a06c713e` |
| Frozen COMMAND 01 starting point | `3b84871ccb338296b52b4fe3fe350be17284d235` | `be3867b1d1adfcf64c0783dce2e9c1e1c7eee7d3` |
| Final tested COMMAND 02 source | `04bd1adfd8b6b1e21180b4f78622a404b9eb5701` | `b59e0039dae486477907fd541eb965d9df451564` |

Branch: [engineering/command02-forge-editor](https://github.com/lukewilliamsat-glitch/apparition-instruments/tree/engineering/command02-forge-editor). This text handover follows the tested source; it does not change that source.

## Implemented

A functioning selected-product workspace extends the existing COMMAND 01 catalogue and Admin visual language. Six sections cover General, Specifications, Pricing, Availability, read-only Inventory and read-only Images.

Editable fields: name, SKU, description, existing Series/Reference text specifications, selling price, kit price/quantity and active/individual-sale/kit eligibility. Selling price is not promotional pricing; eligibility is not a draft/publication system. Category, manufacturer identity, specialised specifications, canonical ID, stock, source images and private costs remain protected or deferred.

Baseline, local draft and current authority are separate. The synthetic adapter genuinely updates its in-memory store after validation and compare-and-set. Review, save, discard/reload, conflict comparison, permission/validation errors, real request deadlines, uncertain-outcome reconciliation and idempotency are implemented. Older responses cannot clear newer edits. There is no force-save and no real backend adapter.

Typing preserves controls/focus/selection and causes no extra reads or catalogue-row reconstruction in the measured fixtures. Filtering retains stable dirty selection; switching, refresh, close and navigation have explicit loss protection.

## Acceptance

[Final CI run](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39630582702): **SUCCESS**, Node 22.20.0, Chrome 155.0.8059.39.

| Suite | Passed | Failed |
|---|---:|---:|
| COMMAND 02 Node | 54 | 0 |
| COMMAND 02 real Chrome groups | 39 | 0 |
| Inherited COMMAND 01 Node | 42 | 0 |
| Inherited COMMAND 01 real Chrome groups | 32 | 0 |
| Pre-application browser network controls | 10 | 0 |

Five viewport widths (390/768/1024/1440/1920), increased text size, reduced motion and 14/100/500 fictional-product workloads pass. Process-level network namespaces, a clean environment, disposable browser profile, sandbox and pre-application negative controls are evidenced. No application external traffic, console errors or unhandled page errors were observed.

The first CI run, [39629517340](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39629517340), also succeeded (48 Node/37 Chrome plus inherited regressions). Final hardening adds bounded stalled-request recovery and product-aware save invalidation checks; the final run above is authoritative.

## Evidence and current blocker

- [Field authority](FIELD_AUTHORITY.md)
- [Architecture](EDITOR_ARCHITECTURE.md)
- [Persistence](PERSISTENCE_CONTRACT.md)
- [Chrome results and exact ten-PNG approval manifest](BROWSER_ACCEPTANCE.md)
- [Machine-readable results and tested source manifest](TEST_RESULTS.json)
- [Integration and release gates](RELEASE_GATES.md)

Ten genuine final-run PNGs and original reports are preserved in the [CI artifact](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39630582702/artifacts/12359356215), expiring **20 November 2026**. Artifact ZIP: 2,260,908 bytes; SHA-256 `f54fcec558d89cddd6bf94c02580542da3ab91bd0e7177d7b6c290e636cae4ae`. Download hash, ZIP CRC and source identities were verified. Owner-side download is not a prerequisite for continuing.

**Zero COMMAND 02 PNGs are committed in this branch.** Two blob objects were created before the upload block; none was linked into a branch tree. `validation-errors.png` was rejected twice by automatic approval review as specifically unauthorised for public publication, including after the exact approval and payload were rechecked. Further PNG operations stopped. No alternate API, re-encoding, splitting or embedding was used to bypass the decision.

The next owner decision is explicit confirmation to publish the ten exact synthetic PNG payloads listed in BROWSER_ACCEPTANCE.md to this public branch. Until that evidence gate clears, Authorisation 38 acceptance criterion 16 remains incomplete and the overall outcome remains PARTIAL.

## Preservation and limits

All 899 production-main blobs are unchanged. The frozen COMMAND 01 branch is unchanged; this descendant adds optional extension hooks to its prototype view and passes its complete regressions. No unrelated workstream was merged or modified. Candidate code is outside production `dist`; existing production workflows and daily schedule are unchanged.

Fixtures persist only for one page lifetime. This is not production authentication, database atomicity, real-data testing, comprehensive accessibility certification, cross-browser/device acceptance or deployment readiness. The existing real generic save is sequential and does not expose the simulated component revision/idempotency contract.

After screenshot preservation and owner interface review, the smallest separate engineering milestone is a **COMMAND authenticated read/write contract design and security review**. No next phase is automatic. Supabase, Stripe, customer records, inventory, emails, live pages, hosting and DNS were not accessed or changed.

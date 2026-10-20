# Apparition Instruments — reset checkpoint, 20 October 2026

Authorisation 28. GitHub-only consolidation; no implementation, service access, reconstruction, certification or deployment. Repository: `lukewilliamsat-glitch/apparition-instruments`. This documentation branch starts from Authorisation 27, not Atlas, and changes only this file.

## 1. Executive summary

Atlas Phase2G is the preserved engineering checkpoint, not a certified production baseline. Its tests and reconstruction evidence remain useful; further certification is paused. Production main and the Authorisation 27 documentation reference match the expected commits. Spectre, Phoenix and the separately reported FORGE V4 RC03 commit could not be retrieved through the GitHub commit API; this is a remote-recoverability gap, not proof their preserved bytes are lost.

Next development should be a separately authorised COMMAND 01: a small, synthetic-fixture, read-only catalogue workbench. Existing Admin and commerce capabilities must be reused and preserved. Cloud-first policy applies: no mandatory owner setup or routine ZIP transfer. Supabase and Stripe health, current database state and the live storefront were not checked. The expected 24 October billing reset is not verification or permission to contact services.

## 2. Verified GitHub references

Checks performed during this authorisation; expected values were compared with GitHub responses.

| Reference | Checkpoint | Result |
| --- | --- | --- |
| Production main | `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f` | Branch matches; tree `eb2c9f1824602d19ed27f010cf080190a06c713e`. |
| Atlas `atlas/phase2g-certification-closure` | `fe16cc5752460dcc2a26968d4ee144b7bc940893` | Branch matches; recorded tree `7f755f189ebe88ddf4d8232708cceb00bf57a3b0`. |
| Authorisation 27 `docs/atlas-freeze-command-handover` | `4e2bf850cf2705447f051c8a75d84c0bb5ace678` | Branch matches; all three handovers read from this exact revision. |
| Spectre V02 | Expected `2c85049b8583fc225d79406ba36e56b01bec9ad4` | Commit API returned 404; no corresponding recovery branch in the enumerated branch list. Atlas retains a Spectre identity/file-hash manifest. |
| Phoenix | Expected `0b2831040213df9b257fb8db0edafe59b9188f42` | Commit API returned 404; no corresponding recovery branch visible. Expected identity remains owner-supplied, not remotely verified. |
| Separate FORGE V4 RC03 | Previously reported `07f07f4faff874ccbe7e2e46982ddf4a7008a3d5` | Commit API returned 404; no FORGE V4 recovery branch visible. Do not assume merged or remotely recoverable. |

Branch enumeration returned 16 branches. No COMMAND implementation branch was visible. API 404s and branch-list absence do not establish archive contents, global object deletion or tag coverage; no archive was opened or downloaded.

[Atlas CI 39402161682](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39402161682) is successful at the exact Phase2G SHA. Its retained report records 370/370 Node 22 tests and nine network-denial probes. Tests were not rerun here.

## 3. Workstream status

| Workstream | Established state | Stopping point / next condition |
| --- | --- | --- |
| **ATLAS** | Phases2A–2G provide offline validation, protected overlay assembly, preflight, provenance and recovery tooling. Historical path set: 423; source-associated objects: 415; prior exact observations: 54. All 325 priority source transformations reproduce. Of 44 priority generator paths: 39 seed matches, one source template, four unresolved historical catalogue inputs. | **Frozen, not certified or complete.** Historical payload/current live identity, witnesses, dynamic dependencies and 24 browser cases remain unresolved. Reopen only for an explicit owner-approved deployment/baseline decision, scoped incident response or authorised checkpoint reconciliation. No automatic reopening on 24 October. |
| **COMMAND** | Existing Admin has a shared shell/auth gate; component content/specifications, stock set/adjust, single-image preview/replacement/removal, sale/kit pricing, assemblies/BOMs, catalogue options, exports, orders/fulfilment, aftercare and email tools. Source review identified no general multibuy editor or voucher-management flow. | Planning only. COMMAND 01 below is recommended, not implemented or authorised by this checkpoint. Galleries, discounts/vouchers, shipping controls and write UX are later proposals. |
| **SPECTRE** | Owner-recorded frozen V02 design; Atlas manifest identifies four V02 files and tree `e1136da6ba9b3b8312dfbce0f73113dd2f2a7a19`. The complete main tree contains no `dist/landing-v02/` path. | Publication is not established by reviewed main source; live URL was not visited. Original candidate commit is not remotely retrievable in this review. No immediate roadmap action or publication. |
| **PHOENIX** | Owner-recorded recovery checkpoint above; current GitHub retrievability unverified. | Preserve; no reconstruction, import or merge. No action now. Revisit remote preservation only if explicitly prioritised and authorised. |
| **FORGE** | Main contains Circuit Forge, Forge Pro and V3 instrument-workspace source. V3 documentation records revision-bound physical documentation, owner/capability checks, CAS/idempotency and historical migration verification. | Source presence is not current authenticated acceptance. Separate FORGE V4 optimisation candidates are not established as merged; RC03 is not remotely verified. Preserve accepted shared-core/electrical behaviour; no new family, optimisation or feature pass. |

Historical reconstruction confidence remains **Partially attested, publication blocked**; current production baseline confidence remains **Unknown**. Exact local-candidate rollback is not proof of restoring the current live Pages payload.

## 4. Production and infrastructure risks

- **Pages:** main has only `.github/workflows/static.yml`. Triggers are push to main, manual dispatch and `0 3 * * *` (daily 03:00 UTC, not guaranteed start time). Concurrency group is `pages`, cancellation disabled. It uploads `dist/` and deploys through Pages with Pages/OIDC permissions. Documentation-branch pushes are outside its push filter.
- **Backend-dependent builds:** product/Operations generation has conditional skips, but CMS generation is unconditional. A `[static-only]` message does not establish a Supabase-free production route. No Atlas replacement pipeline is installed on main.
- **Observed Actions failure:** latest returned main run [39391123342](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39391123342), scheduled at 2026-10-20 08:07:16 UTC, failed at main SHA above. Failure cause/stage was not inspected; do not assert HTTP402 or infer storefront health. Artifact retention, authentic deployed-byte completeness and live rollback remain limitations.
- **Supabase:** historical egress documentation records owner-reported 13.44 GB against 5 GB included, plus controlled response-size reductions; those are not current billing measurements. The expected reset on **24 October 2026** is owner-reported and unverified. Backend restrictions, applied migration ledger, function versions, grants/RLS and authenticated access have not been checked now. Do not rerun previously applied migrations. V3 documentation explicitly distinguishes migration filename timestamp from the historically assigned ledger timestamp.
- **Stripe/security:** repository contracts keep Checkout creation and signature-verified webhook/payment processing server-side; price, stock, order ownership and idempotency remain authoritative there. Admin uses user Auth tokens, membership checks and a resource/RPC allowlist; migration source declares RLS. No fresh service health, secret configuration or permission verification occurred. Git history is not a database/deployment backup.

## 5. Frozen/deferred initiatives and handover reconciliation

Preserve Atlas, Spectre, Phoenix, GIGA V2/RC07 static-publisher preparation and separately frozen FORGE work. No adapter activation, real image publication, automatic email or hosting migration is implied.

The September master handover's row counts, successful-payment claims, “Signal Forge planning only” status and five-minute schedule are historical. LATEST_STATE and the older reactivation prompt recommend Forge work that is no longer the immediate mission. The appended ASTRA_V4_REACTIVATION status records V1 implementation completion while retaining owner mobile acceptance; this is distinct from the later FORGE V4 optimisation programme. None proves current live acceptance.

The current workflow overrides older five-/15-minute descriptions and its own stale 15-minute comment. Older GIGA V2 documentation describes proposed SQL and image URLs not ready at that time; it cannot establish today's migration ledger or asset availability. Earlier archive/local-runner instructions are optional historical recovery material, superseded for routine work by the cloud-first policy. Protected tags and durable evidence retention are policy goals, not settings implemented by these documentation passes.

Use this checkpoint for session ordering and the Authorisation 27 handovers for scope. Retain older files as dated evidence; do not silently rewrite their historical claims.

## 6. Recommended next milestone

**COMMAND 01 — fixture-backed, read-only catalogue workbench.** Business outcome: find a component and inspect stock, price and details in one coherent view. Deliver search/category/status filters, stock/price columns, stable selection and a read-only detail panel. Reuse existing field/repository vocabulary. No editing, upload, discounts, order actions, live authentication or backend/schema changes.

## 7. NEXT SESSION START HERE

1. Read this file and the three Authorisation 27 documents linked below. Verify only main, this documentation reference and the frozen Atlas tip; report movement without overwriting it. Do not repeat historical research.
2. Obtain explicit COMMAND 01 implementation authority. This checkpoint alone is not implementation approval.
3. Agree the small field/interaction scope and create a dedicated engineering branch from the then-verified application baseline. Do not merge Atlas or separate frozen candidates as scaffolding.
4. Implement against synthetic injected transports. Cover search/filter/selection, reversed responses, errors/retries and explicit unloaded-image state. Preserve production routes, writes and security boundaries.
5. Prefer a separately authorised non-deploying GitHub Actions validation path. Demonstrate process-level browser network isolation and negative controls before fixture loading; retain remote synthetic evidence. No mandatory owner installation or ZIP transfer. Stop at the independently reviewable milestone.

## 8. Prohibited actions and approval gates

Under Authorisation 28: no application changes, new workflows, dependency installs, browser runs, archives, reconstruction, certification, production/service access, main merges, deployments, SQL/RLS changes, customer data, transactions or emails. No Supabase, Stripe or live-storefront requests were made.

Future service access, backend changes, production publication, baseline adoption, workflow/settings changes and disaster recovery each need appropriately scoped explicit owner approval. A date, old approval, passed test or documentation commit does not grant it. Preserve existing infrastructure and frozen references.

## 9. Owner decisions still open

- Approve COMMAND 01's read-only fixture scope and cloud validation boundary? Should private unit-cost display remain excluded from the first milestone?
- Keep Spectre/Phoenix/FORGE V4 remote-preservation gaps deferred, or commission a separate bounded continuity task later? Do not request ZIP downloads now.
- If production work becomes necessary, separately choose a baseline-adoption/release approach and scoped service verification after the expected reset; neither is needed to start isolated COMMAND fixtures.

## 10. Source references

- [Atlas freeze](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/4e2bf850cf2705447f051c8a75d84c0bb5ace678/docs/atlas/ATLAS_FREEZE_HANDOVER.md), [cloud-first policy](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/4e2bf850cf2705447f051c8a75d84c0bb5ace678/docs/engineering/CLOUD_FIRST_POLICY.md), [COMMAND discovery](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/4e2bf850cf2705447f051c8a75d84c0bb5ace678/docs/command/COMMAND_DISCOVERY_HANDOVER.md).
- [Phase2G evidence report](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/fe16cc5752460dcc2a26968d4ee144b7bc940893/docs/atlas/phase2g-release.md), [Spectre identity manifest](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/fe16cc5752460dcc2a26968d4ee144b7bc940893/docs/atlas/spectre-source.json).
- [Production workflow](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/.github/workflows/static.yml).
- [Master historical handover](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/docs/handover/APPARITION_CURRENT_HANDOVER.md), [LATEST_STATE](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/docs/handover/LATEST_STATE.md), [older new-chat prompt](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/docs/handover/NEW_CHAT_REACTIVATION_PROMPT.md).
- [Forge V3 audit/publication-continuation record](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/docs/forge-instrument-workspace-v3.md), [older Forge reactivation](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/docs/signal-forge/ASTRA_V4_REACTIVATION.md).
- [Egress V1](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/docs/supabase-egress-optimisation-v1.md), [inactive static-assets V2 preparation](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/docs/supabase-egress-static-assets-v2.md), [backend foundation](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/supabase/README.md).

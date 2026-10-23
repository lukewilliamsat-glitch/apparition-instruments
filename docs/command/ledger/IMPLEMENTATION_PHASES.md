# Independent phases and acceptance gates

This document proposes future work only. **No phase below is authorised for implementation, backend inspection or production execution by the requirements request.** Each needs a separately scoped instruction and reviewable checkpoint. Failure of one phase cannot be hidden by a combined PASS.

| Phase | Independent scope | Exit gate before continuing |
|---|---|---|
| L0 — policy/contract design | Resolve opening evidence, WAC precision/UOM, recognition, VAT/FX, landed allocation, return/variance, build modes, permissions and reports | Owner approves explicit policy decisions and bounded contracts; unresolved facts marked UNKNOWN. No schema/application implementation. |
| L1 — isolated costing reference | Synthetic receipts, WAC issues/returns, immutable cost snapshots, rounding/allocations and unknown coverage | Independently checked arithmetic/value conservation, quantity boundaries, full depletion, partial returns, late-variance policy and no old-sale rewrite. No live records. |
| L2 — isolated transactional ledger | Synthetic persistent journal, balance projection, operation receipts/audit, identity, revisions and multi-item commands | Real disposable-database concurrency/rollback/fault/replay/permission tests; caller cannot forge identity or bypass writes. Every durable change has one audit/receipt. This is not a production migration. |
| L3 — acquisitions and opening reconciliation prototype | Receipt review, duplicate/partial delivery protection, private evidence and synthetic cutover/import | Existing product reused; multi-currency frozen correctly; freight allocated once; no double opening/receipt count; unknown value remains unknown; no generic stock setter masquerades as acquisition. |
| L4 — marketplace financial prototype | Existing-Order association, synthetic new external sale/issue, cost events, refunds/returns and payout matching | No second deduction; actual customer total reconciles visibly; combined fees/tax/delivery counted once; original facts/COGS immutable; fee-only changes do not alter stock/payment/email; incomplete costs cannot show final profit. |
| L5 — assemblies and instruments | Versioned virtual BOM, stocked build/WIP/finished transfer, returns/scrap and specific-job cost | Component/build/sale conservation; no duplicate consumption; mode cutover reconciled; labour/packaging counted once; configurable kits and serial units accepted only with explicit contracts. |
| L6 — reporting and COMMAND interaction acceptance | Permission-scoped private reports and responsive forms, owner review package | Reproducible as-of totals, Order/product allocation tie-outs, unknown coverage, separate payout/contribution/company-profit labels; genuine browser/keyboard/focus/error/uncertain-state evidence at 390/768/1024/1440/1920, enlarged text and reduced motion; owner UI approval separate. |
| L7 — separately authorised deployed compatibility review | Exact read-only Supabase schema/security/writer inspection plan, only after independent recovery/egress gates | Reviewed calls/statements, privilege, limits/hash/redaction and approval before access; establish schema parity, all writers, auth/capabilities and migration dependencies. A mismatch stops integration; no repair is implied. |
| L8 — migration/integration/release proposal | Exact adapter/DDL/data mapping, authoritative cutover, backup/rollback, bounded acceptance and deployment route | Separate approval of exact source/SQL/data scope and full rollback; independent rehearsal and reconciliation. No live write or deployment follows automatically from an engineering PASS. |

L1–L6 are candidates for future isolated development. L7 is a distinct access decision; it may reveal contract revisions requiring earlier isolated phases to be revisited. These are dependencies, not a promise to execute consecutive phases in one mission.

## Mandatory future regression cases

| Area | Acceptance requirements |
|---|---|
| Money/FX/allocation | Original currencies and historical GBP preserved; rate direction, included fees and tax basis validated; shared freight/rounding sums exact; zero/unknown distinct; no floating-point drift; agreed range/precision overflow rejected. |
| WAC/history | New receipt changes only current pool; prior issue cost unchanged; sold-out pool zero value; free/evidenced and unvalued stock differ; returns use original issue cost; no bogus average over unknown mixed stock. |
| Quantity/BOM | Negative/oversold/duplicate receipts rejected; sale/build multipliers aggregate correctly; unit mismatch/circular BOM rejected; inputs/output/WIP/scrap reconcile and legacy sales do not deduct twice. |
| Concurrency/security | Competing receipts/sales/builds and revocation/expiry; deterministic locking, CAS/shared revisions; rollback after each stage and process loss; same-ID changed-payload/other-actor denial; business duplicate under a different UUID blocked. |
| Uncertain outcomes | Committed response loss, uncommitted/pending status, missing receipt and denied reconciliation all retain the original identity; no automatic duplicate posting or false success/failure. |
| Sales/refunds | Original totals/discounts/delivery preserved; fee bundles not duplicated; refunds separate from physical returns; multiple partial refunds/returns/credits bounded; chargeback/reserve states do not fabricate expenses. |
| Reporting/migration | Grand totals equal allocated line totals; cutover/import replay makes no second quantity/value event; historical COGS not fabricated; closed/as-of reports reproduce; unknown/provisional/reconciled states cannot be hidden by aggregation. |
| Privacy/UI | Anonymous/customer/nonfinance Admin cannot read costs/profit through any projection, receipt, error, cache or export; labels/currency clear; keyboard/focus and responsive evidence; future export injection protection. |
| Existing COMMAND/commerce | Retain filtering, selection, on-demand detail, draft/review/discard, validation, conflicts, session/permission/stale-response protection and IRONCLAD mutation/receipt/audit guarantees; preserve pricing, website payment/refund/email and legacy stock guards while reconciling writers. |

Use fictional records and established pre-fixture process-level network negative controls for future offline/Chrome tests. Do not use production services to make an isolated acceptance pass. No such programme or CI workflow was created or run in this requirements mission.

## Adoption stops

HOLD authoritative adoption for missing opening/count evidence, uncontained legacy writers, unknown granular authority, incomplete source-to-deployed mapping, unsupported cost precision/unit policy, unreviewed tax/recognition rules, missing durable audit/recovery, or inability to reconcile quantities/value. Retain any independently completed design work. Do not infer implementation permission from this proposal, provider restoration, a documentation commit or previous COMMAND acceptance.

DAWNBREAKER A remains ON HOLD and public catalogue UNTESTED. No recovery Phase B/C, SQL, financial-record update, workflow modification, main merge, image publication or deployment is part of LEDGER design approval.

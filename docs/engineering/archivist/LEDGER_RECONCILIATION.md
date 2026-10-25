# LEDGER versus existing backend architecture

The complete seven-file package at c614da6b7a9148b8c3958255a7c791436b3bc34e is a requirements/architecture proposal, with a documentation-integrity and fictional arithmetic check. It contains no implemented financial engine, migration, stock movements or UI. Its unknown opening costs stay unknown. Current programme scope includes future manufacturing/QC traceability; recording instrument documentation or public QC copy does not implement that traceability.

| Requirement | Reusable existing source | Gap / prerequisite |
|---|---|---|
| Product identity and receipts | Stable components/assemblies, quantity/unit balance | Acquisition documents/batches, supplier/historical FX/GBP evidence and landed allocation ledger absent from inspected paths; receipt must not create duplicate products |
| Marketplace orders | create_external_order, channel/reference uniqueness, snapshot/BOM, shared atomic deduction | Fees/ads/postage expense/contribution/reconciliation and audited financial adjustments not implemented; existing-Order supplement cannot deduct stock again |
| WAC/valuation/COGS | Current private nullable integer cost and quantity | Perpetual remaining quantity/value pool, exact fractional-unit cost precision, immutable issue snapshots, unknown coverage and period rules required |
| Builds/materials/yield | Fixed BOM and configured kit stockRequirements; Forge design UUIDs | Separate raw→WIP→finished transfers, actual substitutions/yield/scrap, labour/packaging policy and unique-instrument cost. Current BOM-at-sale must not also consume already-built components |
| Refunds/returns | Existing payment refund history and no automatic restock | Linked physical inspection/resellable recovery at original issued cost, losses and bounded corrections; refund is not receipt |
| Atomic financial authority | IRONCLAD's tested isolated transaction/receipt principles | New bounded multi-entity contract, deployed auth/capability mapping and every legacy writer reconciled; no copy of synthetic schema/trust auth |
| Reporting | Existing Orders totals/stock overview, not company accounts | Posted/as-of contribution, inventory value, supplier history, payout matching, unknown/provisional coverage and private permissions |

Preferred initial policy is perpetual WAC for interchangeable components, not a lifetime average of all purchase expenditure. Unsold acquisition spend remains inventory value under the proposed policy; COGS is the frozen cost assigned to issued/sold units at the approved recognition point. Unique instruments require specific/job-cost assessment. New receipts change current average, not prior COGS. Historical imports must not fabricate costs using today's average or issue stock already deducted by legacy Orders.

Dependency chain: owner policy (VAT/recognition, original GBP evidence, allocation, unit precision, opening counts/costs, build modes and labour) → synthetic arithmetic/reference → durable atomic multi-entity journal → receipts/opening reconciliation → marketplace financial events/returns/settlement → build/QC traceability → private reporting/COMMAND UI → separately approved deployed compatibility → exact migration/cutover/rollback/release. Policy/design can proceed offline independently of service recovery. Live adoption cannot.

Before a schema proposal: inventory all direct stock writers, shared paid-order/external helper, generic component/private-cost save, scripts/jobs and future builds. Define one quantity/value authority with revisions, immutable audit, actor-operation receipts and cross-actor business-fact deduplication. Preserve channel/reference alias changes instead of freeing historical sale identity for duplicates. Data privacy includes summaries, error/conflict/status payloads, caches and exports, not only hiding price columns.

No company VAT registration, rates, cost evidence, inventory count, financial opening balance or supplier cost was inferred here. Contribution excludes wider company overhead/tax/net profit. See the original LEDGER phase contracts; they remain unimplemented and require new authorisation.

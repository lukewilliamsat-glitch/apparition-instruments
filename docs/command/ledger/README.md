# PROJECT LEDGER — inventory costing and sales profitability

Owner-requested COMMAND programme, recorded 23 October 2026. **REQUIREMENTS AND ARCHITECTURE PROPOSAL ONLY. Implementation is not authorised.** No application code, SQL, migration, workflow, financial record or production configuration changes form part of this programme record.

Recommended direction: extend the existing Orders domain with private financial events; introduce recorded acquisitions and an auditable inventory/value journal; use **perpetual weighted-average cost for interchangeable components** as the preferred initial candidate. Preserve sale-cost snapshots when later receipts change the current average. Use explicit build transfers for stocked finished assemblies, and assess specific identification for unique instruments. These are proposed policies, requiring approval and isolated verification before implementation.

Read the [architecture](ARCHITECTURE.md), [calculation rules](FINANCIAL_RULES.md), [workflows and interface concepts](WORKFLOWS_AND_UI.md), [independent phases and gates](IMPLEMENTATION_PHASES.md), and [source review](SOURCE_REVIEW.md).

## Owner requirements and proposal coverage

| Owner scope | Required outcome | Design location |
|---|---|---|
| A — manual marketplace orders | Channel/reference/date, products/quantities/prices, actual customer payment, delivery, fees/ads/postage/packaging/direct costs, discounts/refunds/adjustments, COGS and contribution; reconciliation without double-counting | FINANCIAL_RULES; WORKFLOWS_AND_UI |
| B — acquisition batches | Existing product, supplier/reference/date, quantities, original currency/price, historical GBP conversion, freight/import/landed allocations, unit cost and notes | ARCHITECTURE; FINANCIAL_RULES; receipt workflow |
| C — inventory costing | Multiple batches, quantity/value, issue snapshots, returns/damage/corrections, duplicate protection and count reconciliation | ARCHITECTURE; FINANCIAL_RULES; historical migration |
| D — kits/assemblies | Raw components, build consumption, finished stock and sale separated; materials/packaging/labour counted once | Assembly workflow and costing rules |
| E — reporting | Channel/product/order/month contribution, costs, current/historical valuation, suppliers and unresolved evidence; tax-aware without assuming VAT status | Reporting matrix; financial rules |
| F — security/integration | COMMAND 01–04/IRONCLAD, existing Orders/inventory and every writer, private cost access, durable audit and reconciliation | ARCHITECTURE; SOURCE_REVIEW; implementation gates |

The ten requested deliverables are covered by: entities/relationships and permissions/audit in ARCHITECTURE; calculations and adjustments in FINANCIAL_RULES; acquisitions, marketplace orders, builds, historical migration and interface concepts in WORKFLOWS_AND_UI; independent phases/acceptance gates in IMPLEMENTATION_PHASES. SOURCE_REVIEW records exact existing contracts and unresolved deployed-state questions. DOCUMENTATION_VERIFICATION.json records the source inventory and documentation-only scope.

## Boundaries and terminology

There is already an external-order implementation in the pinned source; this programme extends it, rather than creating duplicate sales or taking stock twice. Existing source is not proof of the current installed schema, policies or service state. No Supabase inspection, authentication, SQL, marketplace API, payment/refund execution, email, deployment or workflow trigger is authorised.

Contribution is order/product revenue less the defined attributable costs. It is **not full company net profit**: overheads, financing, corporation tax and other operating expenses are outside the initial calculation. Inventory valuation is an operational cost ledger, not a complete statutory accounting system or VAT return engine. Applicable accounting framework, VAT status/scheme, recoverability, revenue/cost recognition and tax treatment remain owner/accountant decisions.

All numerical examples are explicitly fictional. No existing stock cost, purchase, fee rate, opening valuation, profit or exchange rate has been inferred or populated. Unknown is distinct from confirmed zero. Reports must expose incomplete evidence rather than manufacture precise margins.

## Decisions to settle before implementation approval

1. Costing/recognition policy, reporting basis and applicable VAT/accounting treatment; no company VAT status assumed.
2. Opening-count/cost evidence and permitted handling of unresolved opening quantities/value.
3. Which products are sold as virtual BOMs, assembled to order, stocked finished goods or unique instruments; actual versus imputed labour presentation.
4. Landed-cost allocation defaults, historical GBP evidence and treatment of late supplier/FX/cost adjustments.
5. Finance/cost/stock posting and approval permissions, period closing and correction authority.

These decisions do not block recording this proposal. The next LEDGER mission, if separately commissioned, should finalise policies/contracts and review isolated acceptance plans. No automatic implementation follows. DAWNBREAKER Phase A remains **ON HOLD**, provider recovery **UNKNOWN**, public catalogue **UNTESTED**. NIGHTFALL, HOMECOMING, NOCTURNE and existing COMMAND checkpoints remain frozen.

# Proposed workflows and Admin concepts

Concepts only; no screens, components, schema or mutation handlers have been implemented. Existing catalogue, order fulfilment, protected fields and COMMAND state-machine guarantees remain intact.

## Stock acquisition: add a receipt to an existing product

1. From the selected product or Inventory → Receipts, choose **Receive stock**. Bind its existing stable product ID, name/SKU and base unit. The flow must say it adds a batch to this product; it does not create a new catalogue record.
2. Enter supplier, purchase/invoice and delivery reference, acquisition/received dates, quantity/pack conversion, original currency/price and notes. One invoice can contain several products or partial deliveries; actual receipts have separate identities.
3. Enter actual GBP cost or historical conversion evidence; itemise freight, import charges, acquisition taxes and other landed costs with inclusion flags. Review shared allocations across products and partial receipts. Confirm missing, zero and provisional costs distinctly.
4. Review current and proposed quantity/value/average, allocation totals, cost coverage, source references and stock-count discrepancies. Preview is advisory; the server validates current revisions and recomputes before commit. Quantity increases do not modify the selling/kit price.
5. An authorised posting commits receipt, quantity/value movements, shared revisions, audit and operation receipt atomically. Exact retry cannot receive twice. Stale baseline returns conflict with review choices; no force-post. Unknown response keeps original operation identity and pending/unknown state until authoritative reconciliation.
6. View the immutable receipt in supplier/product history. Corrections open a linked case, not an edit to historical quantity/cost. Ordinary stock-set must not impersonate receipt or invent purchase value.

## Manual marketplace order / financial supplementation

Start with an explicit choice: **Record a new external sale** or **Add financial details to an existing Order**. The latter must never call a stock-deduction path. Detect current canonical channel/reference duplicates before posting and enforce the same uniqueness authoritatively. Future other-marketplace/account support needs an approved channel mapping rather than bypassing current EBAY/DIRECT/OTHER validation.

New sale: capture marketplace/reference, sale date/timezone, supported existing products, quantities and agreed selling prices. Preserve current required customer fields and supported product restrictions unless a future contract explicitly changes them. Record actual customer total and delivery charged separately, state whether entered prices already include discounts/tax, and reconcile the breakdown. Do not create a payment session or claim to execute a marketplace payment.

Choose the correct inventory mode for each product (component, virtual BOM or stocked finished item). Commit the existing Order association, one stock issue, valuation and COGS snapshots together through the future approved boundary. Do not call the old deduction helper and then a second ledger decrement. Evidence of an already-recorded/deducted sale belongs in the existing-Order supplementation or controlled historical-import path.

Capture actual transaction/payment fees, ad fees, actual postage, optional packaging/labour/other costs and source references. A combined fee and its included parts cannot both count. Missing later statement fees are pending, not zero: operational sale recording can remain unreconciled/provisional, but must not display complete profit. Retain observed customer payment and difference from the derived breakdown; never silently change an original Order total to balance an entry. The contract phase must distinguish a financial draft/exception from a reconciled posting without weakening existing Order invariants.

Fee-only supplements, marketplace refunds/credits and settlement matches add immutable events linked to the existing Order/line; they do not reset fulfilment, deduct stock, send email or change provider payment state. Item/quantity/price changes require a separate auditable amendment command with inventory/value deltas; the current metadata editor cannot be stretched into that capability.

Show an Order contribution bridge and independent payout reconciliation. A reviewer can trace each amount to a statement/invoice/reference and see missing costs. No marketplace API, automatic import, fee-rate scraping, automatic SKU matching, email or payment/refund execution is included in this initial programme.

## Assemblies, kits and instruments

| Mode | Inventory and costing flow | Double-counting prevention |
|---|---|---|
| Loose component | Purchase receipt → component pool → sale issue and frozen cost | No duplicate finished-product quantity |
| Virtual component kit / fixed BOM sold without prior build stock | Freeze validated requirements and issue components once at the approved fulfilment boundary; sum their issue costs | Do not also deduct a finished SKU or issue the same BOM again at dispatch |
| Treble bleed or harness made into stock | Build issues actual components to WIP; completion transfers value into finished-product stock; sale issues only finished stock | Components are consumed at build, not again when the finished item sells |
| Made-to-order harness | Versioned job holds actual input issues/WIP and completion/cost association to the Order; define when revenue/COGS is recognised | Reservation alone is not consumption; WIP/finished value and sale expense cannot coexist for the same completed unit |
| Configurable wiring kit | Use the saved, validated customer configuration and authoritative stockRequirements, not a default BOM | Existing manual Orders exclude configurable kits; expansion needs its own acceptance/authority |
| Future finished instrument | Job/serial-specific actual material and approved conversion costs; assess specific identification and linkage to existing instrument/design IDs | A Forge design document is not a financial/stock record; no customer workspace inherits private costs |

Each build freezes BOM/version, component substitutions, actual quantities, output quantity/yield, unit policy and cost snapshots. Multi-product transfers are atomic. No output without all valid input/cost movements. Part-finished work stays identifiable WIP; unused components can be returned at their original job issue cost with bounded references. Normal yield allocation, abnormal scrap, rework and cancelled builds need explicit policy and separate loss/variance records. Reject circular BOMs, incompatible units and duplicate component consumption.

Direct materials/consumables, packaging and labour are separately attributable to receipt, job, Order or expense. Each cost source is classified once. Approved capitalised conversion cost becomes output inventory value and later COGS; it is not deducted again as an Order expense. Actual paid labour and owner-time/imputed labour must be distinguishable. An optional after-imputed-labour metric must not be labelled cash expense or statutory profit. Manufacturing itself creates no sales revenue. Capitalisation/overhead policy needs accounting review.

Before adopting stocked builds, establish physical finished-goods counts and reconcile them with raw components. Existing source computes assembly availability from component BOM quantities and deducts those components at sale; it does not establish a finished-goods stock pool. Switching modes midstream without a reconciled cutover would double-count or oversell. Mode/BOM history is frozen per operation so a later change cannot reissue an old sale.

## Refunds, returns, adjustments

Separate three controls: **Record financial adjustment**, **Receive returned goods**, **Correct posted movement**. Recording an external refund is evidence capture, not sending money. A refund never automatically restocks; a return never automatically proves money was refunded. Inspect physical goods, record condition/disposition, cap accepted units against outstanding original issues, and restore only supported historical cost for resellable items. Keep quarantine/unknown valuation visible. Apply the detailed treatment in FINANCIAL_RULES.

Corrections require original-event selection, reason, proposed quantity/value/reconciliation effects and approval where required. Supplier credits, late freight, damage, sample consumption and count variances have distinct types. Preserve original values, append reversals/adjustments, reject over-reversals and show both current-period and original-Order links. Resolve downstream sales/builds before attempting to reverse a consumed receipt.

## Historical migration and reconciliation proposal

No migration or data extraction is executed now. A future separately authorised inspection must first establish actual schema/migration parity, counts, writers, permissions and evidence availability without broad business-record export.

1. Approve scope, cutover timestamp/sequence and product/unit mapping. Obtain consistent, authorised stock balances and an owner-reviewed physical count. Enumerate in-flight payments/external sales/builds and every writer; implement the agreed atomic cutover/containment before authoritative adoption.
2. Record one opening quantity/value posting per adopted pool with evidence, reviewer and coverage. Existing private unit cost can be a review candidate only; it does not prove historical landed cost or a cost layer. Unknown value remains unknown and keeps whole-pool average/affected contribution incomplete. No invented FX, purchase prices, free stock or sale-cost history.
3. Import historical purchase evidence as reference-only/included-in-opening/additional-receipt categories with explicit mutually exclusive effects. Purchases already represented in opening stock must not add stock again. Map aliases/pack units to existing products; ambiguous matches become exceptions.
4. Link existing paid Orders and existing fulfilment/deduction markers without calling stock application again. Backfill COGS only from sufficient approved historical evidence and a versioned reconstruction; never use today's WAC as if it were the original sale cost. Preserve original snapshots and report any estimated/reconstructed classification separately. Unknown historical contribution is acceptable evidence, not a reason to invent values.
5. Reconcile opening + receipts + accepted returns + approved increases − sale/build/loss/supplier-return issues = closing quantity, with explicit WIP/finished transfers. Reconcile value, settlement statements and cost coverage separately. Do not use profit numbers to force stock counts to balance.
6. Dry-run and independently verify mapping, idempotency, all-writer behaviour, totals, failure rollback and rollback inputs on synthetic/approved nonproduction data. Only a later explicit migration/release mission can apply an exact reviewed plan. Retain original exports securely and avoid public Git business data.

## Admin interface concepts

Extend COMMAND navigation deliberately: Catalogue; Inventory/Receipts/Movements/Builds; Orders/Financial details; Reports/Reconciliation. Add private financial sections only when authorised. Keep COMMAND 01's efficient selected-product context and filters, COMMAND 02's draft/review/discard behaviour and COMMAND 03/04's conflict/session/uncertain-save states. Generic product fields still cannot edit valuation or erase stock history.

Selected product: existing identity and stock unit; quantity with count-reconciliation status; current average and inventory value only for permitted users; cost coverage; Receipts and Movements tabs; Receive stock / Record adjustment / Build actions as permitted. Receipt drawer/page groups original purchase, GBP conversion, landed allocations and review. Derived average is read-only. Batch rows retain original currency, received quantity, effective unit cost, reference and corrections.

Order financial panel: original sale facts, editable draft cost entries, revenue-to-contribution bridge, recorded/unknown/confirmed-zero labels, adjustment timeline, separate settlement matches and review controls. Use **contribution**, not company net profit. Costs classified as estimates stay visibly provisional. A posted record is inspected/corrected, not silently overwritten through a generic edit button.

Desktop keeps list/product/Order context during review. Tablet/mobile use focused steps and full-width currency/date fields with persistent context; avoid compressing a wide spreadsheet. Reachable review/post/cancel controls must not obscure errors or the on-screen keyboard. Show currency codes and clear GBP/rate direction, associated labels, field errors plus an accessible summary, status text that does not rely on colour, stable keyboard focus and meaningful restoration after dialogs. Escape cancels an unposted dialog, never reverses a committed event. Preserve drafts safely after denial/session expiry without implying they were saved. Unknown outcome disables new posting pending reconciliation; successful posting updates the baseline only after a verified committed response. These are acceptance requirements, not claims of tested UI.

## Reporting definitions

| Report | Required distinctions |
|---|---|
| Sales by channel/product | Seller sales and refunds separately; delivery income and tax pass-throughs; original sale date and posting/as-of basis |
| Fees and advertising | Actual payment/transaction fees, promoted charges and credits, tax basis, pending/unmatched charges |
| Postage/packaging | Delivery income versus actual outbound expense; packaging in COGS versus separately expensed once |
| Order/product contribution | Frozen COGS, adjustments, direct costs, common-cost allocation basis, complete/provisional/unknown coverage |
| Inventory quantity/value | Raw/WIP/finished/quarantine, count reconciliation, carrying value and unknown coverage, policy/unit and as-of sequence |
| Acquisition/supplier history | Immutable original currency/GBP/landed allocations; received batches, returns/corrections and purchase references |
| Current/historical average | Pool WAC as of a sequence versus separate acquisition-weighted history statistics; never silently recompute old issues |
| Monthly profitability | Posted monthly contribution versus lifetime contribution of sale-date cohorts, Europe/London calendar with source timezone preserved; neither is full company net profit |
| Exceptions/reconciliation | Missing costs/FX/tax, unexplained payment/payout differences, duplicate candidates, unresolved outcomes, stock variances, unapproved corrections and closed-period issues |

Every report exposes basis, period/as-of timestamp, policy/version, currency, cost completeness and reconciliation state. Closed reports remain reproducible from immutable events; later corrections can be traced without erasing previous results. Private exports require their own permission and redaction rules. No automatic tax filing or complete company P&L is included.

# Proposed domain architecture

Logical entities and contracts only: these are not existing tables, an executable schema or a migration plan approved for application. Use existing stable catalogue and Order IDs. Never identify products by editable name/SKU alone, clone a product for each purchase, or infer a BOM from a sales price.

## Entities and relationships

| Logical entity | Relationships and retained facts |
|---|---|
| Existing catalogue product | Stable component/assembly identity; archived name/SKU snapshots on events; cost policy and unit profile version. A receipt adds stock to this identity. Product deletion must not cascade into financial history. |
| Supplier | Private stable supplier identity and minimal purchase-reference details; no unnecessary bank details/credentials. One supplier has many acquisitions. |
| Acquisition document | Supplier, invoice/purchase reference, original transaction currency/totals, dates and notes; one document can have multiple lines and partial receipt events. |
| Acquisition line / receipt batch | Existing product ID, ordered/received/rejected quantity, original purchase value and basis, received date, currency/GBP evidence, allocation version, immutable posted landed-cost snapshot. Each actual receipt creates its own batch, not a catalogue product. |
| Landed-cost charge / allocation | Freight, duty, import tax, handling and other approved charges; original and GBP values, tax/recoverability state, evidence and whether already included in another total. Allocations link to receipt lines and must conserve the full allocated charge. |
| Currency/tax evidence | Per-fact original currency/amount; actual GBP settlement or historical rate with direction/date/source; tax-inclusive/exclusive/unknown basis, seller/platform tax responsibility and effective policy. Commercial FX and any required tax FX are distinct. |
| Inventory posting group | One authorised business operation, posting sequence/time, effective business date, source identity, operation ID, actor, reason and policy version. Groups atomically contain all quantity/value movements and linked cost snapshots. |
| Movement / value allocation | Receipt, sale issue, build input/output, return, quarantine, damage, supplier return, opening balance or correction; product/unit, signed quantity/value, predecessor and reversal references, pre/post balance revisions. Record economic attribution, not imaginary physical FIFO lots under WAC. |
| Inventory balance / valuation pool | Rebuildable projection of posted movements for owned product/unit/policy; quantity, carrying value, known/unknown coverage, revision. Initially one owned pool per product with explicit sellable/quarantine/WIP states. Reservations do not duplicate owned stock or expense it. |
| Existing Order and line snapshot | Existing identity/channel/reference/date, immutable original sold quantity/price/BOM facts; links to posting group and issue-cost snapshots. LEDGER does not generate a second paid Order for an existing sale. |
| Financial event / cost entry | Original payment/revenue evidence and later fee, ad, postage, packaging, discount, refund, chargeback or adjustment facts; source reference, amount/currency/tax basis, status and optional line allocation. Original facts survive corrections. |
| Sale-cost snapshot | Order line → actual inventory issue(s), quantity, pool revision, unit/extended cost, policy, cost coverage and posting date. Historical snapshots are immutable, including explicit unknowns. |
| Reconciliation / settlement | Many Orders/events can link to many payouts/statement lines. Record signed credits/debits, matched amounts, timing/reserves, unexplained difference, evidence, reviewer and as-of date. A payout is not new sales revenue. |
| BOM version / build job | Approved component requirements and substitutions, actual issues, output identity/quantity, materials, labour classification, yield/scrap and job version. Build transfers link both sides of inventory valuation. |
| Return / correction case | Original Order/receipt/movement, quantities/value allowed to reverse, physical disposition, financial adjustment references, reason and approvals. A monetary refund is not a stock receipt. |
| Period / reconciliation checkpoint | Posting window, lock status, statement/count baseline, approved variances, report policy/version and cutover marker. |
| Operation receipt / audit | Trusted actor, persistent collision-resistant operation ID, canonical command fingerprint, committed outcome and immutable audit links. Receipt, audit and business changes commit together. |

Relationship spine: acquisition → receipt lines → inventory posting/movements → balance; Order line → issue movement → frozen COGS; build job → input movements + output movements; financial events → Order/line allocations → reconciliation. Cost-flow attribution supports corrections without asserting physical batch consumption when WAC pools are mixed.

Keep separate state dimensions: an operation may be draft/ready/posting/committed/rejected/unknown; cost evidence may be missing/provisional/recorded; reconciliation may be unmatched/partial/reconciled/closed. Physical receipt/inspection/issue state and the existing Order payment/fulfilment states remain distinct. Paid, stock deducted, confirmed posting and reconciled profit are not interchangeable labels. Closed records can acquire approved correction events without editing the original.

Keep source evidence in an approved private store when eventually implemented. Git reports contain only synthetic examples and contracts, never invoices, supplier prices, real orders or financial exports. A purchase-reference text field is not authority to retrieve an attachment or connect an account.

## Atomic boundary compatible with IRONCLAD principles

Propose a separately versioned, bounded multi-entity command contract; do not overload `command04-v1`'s single-product patch or treat a stock-set operation as a receipt. Trusted server identity must establish current Admin membership and explicit action permissions. Client-supplied roles, cost totals, average values and capability flags are never authority.

For a receipt, sale issue, build or correction: authorise; lock affected identities/pools in deterministic order; validate expected revisions, quantities, period and source uniqueness; recompute costs and allocations on the server; stage all changes; recheck current authority under the approved lock/revocation model; commit movement/value changes, balance, COGS/financial facts, shared product/order revisions, audit and receipt together. A failure applies none. The exact real schema/transaction mechanism remains a future design gate.

Use both actor-scoped operation identity **and business-fact uniqueness across actors**. A new UUID cannot receive the same supplier delivery twice or record the same marketplace sale/statement fee twice. Partial deliveries need distinct receipt references under one invoice, not blanket invoice uniqueness. Preserve current channel/reference duplicate protection; a future seller-account dimension must not silently relax it.

The existing metadata editor can change channel/reference. Preserve those changes through audited identity/alias history; do not free an original sale identity for accidental duplicate re-entry. The interaction between current editable metadata, immutable financial facts and business-fact uniqueness needs an explicit compatibility contract.

An identical operation replay returns its original committed result only after current authority checks. Different content under the same ID fails. Missing receipt means unknown until safely resolved, not confirmed failure. Session expiry/denial must not enable a second posting. No automatic retry or force-save after timeout; status/reconciliation uses the original identity and restricted projections. Business corrections are new linked operations, not edits to a committed command.

## Quantity and value authority

The journal and stock projection must form one authority at cutover, not two independently editable stock counters. Every paid website/external order, legacy stock-set/adjust path, component save, assembly issue, import, service job and privileged writer touching an adopted pool must participate or be explicitly contained. A browser dual-write or nightly repair is insufficient. Require expected revision and quantity safeguards and reject stock below zero; late oversold marketplace evidence becomes an exception requiring resolution rather than fictitious stock.

Existing `internal_unit_cost` is a nullable integer-pence field, not a batch history or reliable opening WAC. Do not silently replace its meaning or let generic cost edits overwrite a derived pool. Decide its read-only legacy/reference or derived-display role separately and reconcile every dependent calculator. Selling/kit prices retain their original pricing semantics.

Initially support counted items. Existing source also has whole `m` and `g` stock units; fractional wire/material consumption requires an explicit versioned unit/precision conversion contract and compatibility tests before adoption. Never reinterpret old quantities or mix incompatible units/policies into one average.

## Permissions, privacy and audit

Proposed permissions (not claims about deployed roles): catalogue read; stock read/receipt; cost read; financial-order read/post; build post; refund/return record; correction approve; reconcile/close; private export. An Admin may have only a subset. A product editor without finance permission must not discover supplier costs, purchase values or profits through summaries, errors, receipts, conflict payloads, status endpoints or exports.

Enforce data access in the approved server/database boundary, with private projections, reviewed grants/RLS/view/function ownership and no service secret in a browser. Ordinary authenticated customers must never inherit financial authority. Existing membership checks are a compatibility input, not proof that granular capabilities already exist. Keep all current image/inventory/private-cost protections until separately reviewed integration replaces a pathway.

Audit actor/action/time, original and correction references, old/new revisions, quantity/value deltas, allocation/policy/FX/tax evidence versions and reasons. Financial detail belongs only in appropriately restricted audit views. No generic update/delete/truncate or cascading product deletion can erase posted history. Define retention, secure backup/export and any privacy redaction policy before implementation; do not invent a statutory retention period here.

Private financial records must stay out of public catalogue projections, customer Order responses, saved baskets, CMS/Forge customer workspaces, analytics and static generation. No default browser-local persistence or shared cache of cost drafts; clear restricted views on sign-out/permission loss. Paginated permission-scoped reporting and explicit exports avoid copying the entire private catalogue. Any future export must address spreadsheet formula injection and unauthorised disclosure.

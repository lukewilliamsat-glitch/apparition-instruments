# Calculation and historical-value proposal

These are requirements for a future verified engine, not calculations applied to company records. GBP settlement/source totals use exact pence. Original currencies retain their currency precision; quantities, rates, unit costs and allocations require bounded exact decimal/rational arithmetic, never binary floating point. Approve the final internal scale/range and rounding policy in the contract phase. Do not truncate fractional-penny component costs into the existing integer unit-cost field.

## Acquisition and landed cost

For each posted receipt line:

**Landed value GBP = allocated purchase cost GBP after supplier discounts + allocated qualifying inbound freight/duty/handling/other landed costs + nonrecoverable acquisition taxes.**

Effective landed unit cost is this value divided by accepted received units, not ordered units or a supplier's pack count. Preserve pack-to-base-unit conversion, rejects and partial receipt references. Expenses outside the approved acquisition-cost policy remain separate expenses. Tax marked recoverable is excluded only when the approved policy and evidence support it; unknown recoverability must prevent a falsely final valuation.

Store original purchase amount/currency and whether it is line, pack or document total. Freeze either actual GBP cost or an evidenced historical conversion rate, including rate direction (GBP per foreign unit), date/source and which charges the amount includes. If both are supplied, reconcile them and identify any fee/spread/rounding difference. An actual bank debit may already include FX fees/freight: record inclusion flags and never add them twice. No automatic/current-rate lookup or historical rewrite is proposed. Later settlement FX differences require separate classification/adjustment, not silent recosting of sold items.

Shared freight/charges require a versioned, explained allocation. Proposed default for mixed products is relative purchase value; weight, quantity or justified manual allocations may be more suitable. Zero-value lines or mixed units require an explicit alternative basis. Allocate each document charge once across eligible lines/receipts; deterministic residual allocation must make line totals equal the source total exactly. Partial deliveries cannot each capitalise the entire invoice/freight. Unreceived allocations remain tracked separately, not stock on hand.

Posting requires complete costs or an explicitly approved provisional-cost policy. Unknown purchase cost is not free stock. Pending late landed costs/corrections stay visible in an exception queue; a later approved variance must retain original facts and use traceable allocation between remaining inventory and already issued expense. Do not guess a physical remaining-batch fraction in a mixed WAC pool. Require cost-flow attribution or HOLD the valuation correction for review. Preserve original issue snapshots; identify current-period and order-linked variance events separately.

## Perpetual weighted-average candidate

Let Q be owned costed quantity and V its carrying value immediately before a posted operation.

| Operation | Proposed treatment |
|---|---|
| Receipt of q units with landed value L | Q becomes Q+q; V becomes V+L; average becomes (V+L)/(Q+q). Retain the individual receipt/batch. |
| Issue of s units | Snapshot extended cost C=s×(V/Q), using the agreed exact-precision/residual rule; Q becomes Q−s and V becomes V−C. Reject s>available and incompatible units. |
| Full pool depletion | Allocate the full remaining carrying value to the final issue; Q=0 requires V=0 after explicitly classified residuals. Do not leave orphan value. |
| Reservations / bin transfers | No new expense or duplicated valuation; sellable availability and location change without creating stock or revenue. |
| Resellable customer return | Restore linked original issued cost for accepted units, not current WAC or selling price; combine returned quantity/value into today's pool and recalculate current average. |
| Damage / consumption / count decrease | Issue at current pool cost to the correctly classified loss/consumption/variance destination; do not fabricate a sale. |
| Count increase / unknown opening stock | Require evidenced value or explicit unknown coverage. No automatic value at current selling price or assumed zero. |

Round source settlements to their actual currency precision; retain higher precision in cost allocations/balances. Display rounding must not become the stored average used for issues. Cost allocation must conserve value across partial issues, returns, builds and final depletion; any reporting rounding bridge must be explicit. The accepted numeric scale/range and fractional-unit policy are prerequisites, not implementation choices silently delegated to a browser.

Perpetual WAC uses **remaining quantity/value**, not lifetime purchase spend divided by all units ever purchased. Historical purchase-average statistics are a different report. If any mixed opening quantity is unvalued, the full pool average is unknown until resolved; a numeric average of only its known subset must not be labelled the total pool average. Quantity may remain known while COGS and contribution are incomplete. Confirmed free stock can have zero value only with explicit evidence/classification.

### Fictional arithmetic acceptance example

No values below describe Apparition stock, orders or VAT status.

| Event | Quantity after | Value after | Consequence |
|---|---:|---:|---|
| Opening, 20 units costing £100 | 20 | £100 | Average £5 |
| Receive 10 for £60 landed | 30 | £160 | Average £5⅓, not stored as £5.33 |
| Sell 3 | 27 | £144 | Frozen issue COGS £16 |
| Receive 10 for £30 landed | 37 | £174 | Current average £174/37; prior £16 COGS unchanged |

New receipts must never write earlier sale-cost snapshots or recalculate their original profit. A refund, actual fee or approved correction can legitimately change an Order's later lifetime contribution; retain the adjustment, posting period and as-of version so that this is distinguishable from repricing old sales.

Unique serialised instruments and other noninterchangeable items should be assessed for specific job/item cost rather than automatically sharing a components WAC pool. The IAS 2 overview describes WAC/FIFO for interchangeable inventory and specific identification for noninterchangeable items; this is a design reference, not a determination that Apparition reports under IFRS. Statutory framework and any impairment/net-realisable-value adjustments require a separately approved accounting policy.

## Manual sales: revenue, costs and payouts

Preserve entered source amounts and their tax/discount/inclusion basis. Derived amounts cannot overwrite an observed customer payment to conceal a mismatch.

1. **Seller customer gross (G)** = item amounts after applicable discounts + postage charged after delivery discounts + other seller-attributable customer income. Item price entry must say whether a discount is already included. Capture optional list/before-discount values as evidence, without subtracting the same discount again.
2. **Observed customer total** must reconcile to G + marketplace-collected/remitted taxes outside seller income + any separately identified buyer/platform pass-through charges. Preserve the marketplace's original total and a visible unexplained difference. Do not assume all tax belongs to the seller or subtract platform tax twice.
3. **Net sales revenue** = G − seller-attributable gross refunds + signed seller revenue adjustments − net seller output-tax liability, where applicable. Refund output-tax effects belong in the tax component of the same event, once. Marketplace-tax refunds/pass-throughs are reconciled separately.
4. **Net COGS** = frozen sale issue costs − accepted linked resellable-return cost credits + explicitly approved COGS adjustment events. A refund alone gives no cost credit.
5. **Order contribution** = net sales revenue − net COGS − payment/transaction fees − promoted-listing/ad charges − actual outbound postage − expensed packaging − other direct expenses − separately expensed direct labour, net of evidenced related credits. Every cost uses its approved recoverable/nonrecoverable tax basis. Labour/materials/packaging already capitalised and issued through COGS are not charged again.

Fees can be entered as one combined source charge or mutually exclusive detailed components. Require a source/group identity and inclusion flags so a marketplace fee that already contains payment processing is not counted with a second processing fee. Preserve actual statement charges, not current advertised percentages. Ad fees, marketplace label costs, fee credits and tax on fees need their own classification. Zero must be affirmatively recorded; blank/missing fees or COGS produce **incomplete/provisional contribution**, not a precise final profit.

**Payout reconciliation is separate.** Statement credits/debits, refunds, fees, withheld/released reserves, chargebacks and adjustments bridge marketplace receivables to bank settlements. A payout can cover multiple Orders and one Order can span payouts. These are matches to existing revenue/cost events, not a second revenue or fee posting. Off-platform postage reduces contribution but does not appear as a marketplace payout deduction unless the statement actually records it. Unmatched differences/holds are not automatically losses.

### Fictional no-tax order example

Items £30 + customer postage £3 = customer payment £33. Transaction fee £4, ad fee £1, actual postage £3, expensed packaging £1 and frozen COGS £16 give **£8 contribution**. If only the two fees are deducted by the marketplace, payout is £28: it is not the £33 revenue figure, nor a second sale. No VAT/tax is assumed in this synthetic example; it establishes no company status. Postage income is not added to £33 again, and fees are not deducted both from a payout-derived revenue number and the cost list.

Product-level reporting must distinguish directly attributable contribution from allocated order-level contribution. Snapshot the allocation basis (proposed net item revenue after discounts), rounding/residual rule and policy version. Free items/zero-revenue Orders require an explicit quantity/manual alternative; do not divide by zero or pretend common postage/fees were measured per product. Allocations across lines must exactly reconcile to Order totals. Product reports identify common-cost allocations as allocations.

## Refunds, returns, corrections and chronology

| Event | Money / cost treatment | Physical treatment |
|---|---|---|
| Refund without return, goodwill or partial refund | Linked revenue/tax adjustment; original payment/price retained; fees credited only on evidence | No automatic restock or COGS reversal |
| Goods returned pending inspection | Retain refund event separately; mark cost/disposition unresolved where necessary | Quarantine/custody record, not immediately sellable stock; valuation/recognition follows approved disposition policy |
| Accepted resellable return | Credit only the original issued cost for accepted units; bound total returns by actual prior issues | Receive once into correct pool; no double reversal for refund and return |
| Damaged/nonrecoverable return | No unsupported inventory recovery; retain original COGS or explicitly reclassify it to loss, never expense twice | Disposition/scrap evidence; no sellable quantity increase |
| Supplier return/credit | Link acquisition and quantity/value movement, actual credit and variance separately | Use reviewed WAC/cost-flow policy; supplier refund can differ from carrying value |
| Fee/refund reversal or chargeback | New referenced signed event, evidence and reconciliation; distinguish temporary dispute from final loss | No inferred physical movement |
| Mistaken receipt, stock count or financial entry | Reversal/correcting event with reason, authority and revision checks; no destructive rewrite | Reverse only remaining reversible effect; if goods were issued/built, use a reviewed linked correction rather than blindly undoing stock |

Record sale/acquisition business dates, source timestamps/timezones and immutable UTC posting time/sequence separately. Inventory valuation order follows committed sequence; a backdated date field must not replay all past WAC or rewrite closed periods. Define sale recognition/COGS timing consistently with approved policy. The initial operational source deducts paid-order stock; accounting recognition or allocation to WIP before dispatch needs an explicit bridge rather than calling every reservation a sale expense.

Late historical orders require an explicit import/reconciliation path and a historical cost-coverage label. Current average is not evidence of cost on the historical sale date. Posted financial periods close under authorised review. Corrections post to an approved open period with original-period links; any formal restatement is a new approved report/version, retaining original issued snapshots and reports.

## VAT and currency policy boundary

Store tax amounts, inclusive/exclusive/unknown basis, rate/category where evidenced, seller/platform responsibility, recoverability, invoice/tax-point date, policy version and corrections. Do not assume registration, a standard rate, full reclaimability or that marketplace-collected tax is seller revenue. Where status is unknown, show raw observed gross facts and provisional/unknown net contribution rather than label them tax-adjusted profit. Review effective-dated changes explicitly; changing a settings flag must not rewrite past records.

HMRC's foreign-currency guidance distinguishes VAT conversion from commercial conversion methods. Keep any required VAT conversion evidence separate from bank settlement FX. HMRC's reclaim guidance makes registration/evidence and scheme considerations material; the system must not automatically treat all charged VAT as recoverable. Applicable decisions remain with the owner/accountant; no VAT returns or tax calculations are implemented here.

Primary references reviewed 23 October 2026: [IAS 2 overview](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/), [HMRC foreign-currency transactions and VAT](https://www.gov.uk/guidance/foreign-currency-transactions-vat-and-tour-operators), [HMRC reclaiming VAT](https://www.gov.uk/charge-reclaim-record-vat/reclaim-vat-business-expenses). These inform bounded policy requirements; they are not evidence of Apparition's chosen framework, registration or actual finances.

# LEVIATHAN 74 release checkpoint

| Workstream | Status | Evidence / next gate |
| --- | --- | --- |
| I. ASCENSION, Release A | Exact package rehearsed; production pending | ANCHOR owner receipt and unchanged live preflight. Apply the exact 68C files in the [69B manifest](../../../tests/release69b/manifest.json). Existing postage £3.99, free from £50, and Aftercare Direct sending off. |
| I. ASCENSION, Release B | Exact atomic IRONCLAD package approved by 74; production pending | Same ANCHOR gate, plus preflight on the deployed A or verified independent baseline and new immediate application rollback target. No additional exact approval needed for unchanged bytes. |
| II. OMNISCIENCE | Independent candidate | Read-only reporting over BLACK LEDGER, period/channel and product evidence, pricing calculator, private expense and director-purchase register, audited partial reimbursements, and loaded-row CSVs. |
| III. MARKETPLACE | UK provider boundary researched | Seller OAuth and connection unverified. No live or fixture integration is represented as done. |
| IV. IRONCLAD UNITY | Not started in this checkpoint | Canonical physical stock/allocation, extended stocktakes and attribution remain future candidates. |
| V. QUARTERMASTER | Not started in this checkpoint | Accepted ECLIPSE Fulfilment Cost Library remains in Release A; no postal purchasing or packaging stock changes. |
| VI. CONJURE | Existing application unchanged | Visual editor and publication extensions outstanding. |
| VII. HERALD | Existing storefront unchanged | SEO and product discovery changes outstanding. |
| VIII. SIGNAL FORGE EVOLUTION | Existing tools unchanged | Circuit expansion and grounded active pickup specifications outstanding. |
| IX. COMMERCE CORONATION | Deferred | Unity, controlled commercial activation and genuine provider acceptance remain separate. Stripe Sandbox not provisioned. |
| X. GRAND ASCENSION | Independent checkpoint only | No production publication without the relevant gate. Recompose against the then-current canonical production application. |

## OMNISCIENCE package and checks

- Depends on the existing BLACK LEDGER production schema and validated finance functions. Optional incumbent Release A and B changes are tested separately. It adds a reporting index and private append-only outlay and reimbursement tables. Orders, financial revisions, providers and physical stock are untouched.
- Migration: `20261117162718_omniscience74_v1.sql`, SHA-256 `f73d9b68df1eb8bd4a251d29ec58df1941132a4549d80c79e1790260fd9ea6be`. No production migration is approved by this checkpoint.
- London commercial dates, keyset pagination (10 rows per request per register, 250 rows loaded per register), SQL statement limits and 384 KB/24 KB client response caps. Orders omit customer, address and provider identifiers. Admin membership is checked in each RPC. The worksheet does not write or infer new catalogue prices.
- Only reconciled order financials enter verified contribution totals. Sources still marked estimated, missing, stale or unreconciled remain labelled. Fee components that cannot be split are not shown as zero. Mixed orders' shared fees and refunds are not apportioned to arbitrary products. Stock purchases, linked spend and reimbursements are excluded from overhead totals; optional links record a reference for review, not a verified procurement foreign key.
- Native PostgreSQL and isolated browser cases are in [tests](../../../tests/leviathan74/). Browser data, quoted prices and all financial evidence used by the tests are synthetic. There is no live provider test or payment.
- Before any production application: approved exact SQL, valid ANCHOR for that package, canonical preflight, index lock impact check on current order volume, and immutable composition with an independent Cloudflare rollback. No DDL rollback by deleting legitimate expense/audit history.
- Outstanding: formal correction/reversal UI, verified procurement-to-expense links, full inventory valuation and procurement exports, all-period export beyond the bounded workspace, and product-level allocation for mixed-order charges. No statutory or tax accounting determination.

## Provider boundary

- eBay Fulfillment `getOrders` documents date/identity filters and order and shipment data. Separate seller Finances `getTransactions` documents fees, credits, refunds and settlements; those endpoints require signed HTTP requests for UK-domiciled sellers in addition to appropriate OAuth. Use the UK seller context and read-only capabilities, and validate campaign charge coverage and existing manual orders before any integration. Sources: [eBay Fulfillment](https://developer.ebay.com/develop/api/sell/fulfillment_api/order/getOrders), [eBay Finances](https://developer.ebay.com/api-docs/sell/static/finances/transaction-info.html), [eBay signatures](https://developer.ebay.com/develop/guides/sell/digital-signatures-for-apis).
- Live Aftercare remains disabled. No eBay listing writes, customer email, postage purchase, Stripe provider request, payment, DNS change, paid infrastructure or production customer data use.

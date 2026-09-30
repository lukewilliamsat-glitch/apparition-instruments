# External Orders V1

Admin Orders → + Add external order records an already paid sale from eBay, Direct or Other. Supply the channel reference, sale date, customer name, 1–10 existing product lines, quantities (1–99), agreed unit prices and postage. GBP item revenue and total are derived. Email and address are not required.

Existing individually sold components and active fixed BOM assemblies are supported. Configurable wiring kits are excluded because their customer-selected configuration cannot be inferred from a default BOM. The picker shows name, SKU and indicative availability; the database checks current stock at save time.

`create_external_order` checks Admin membership, resolves product identities and snapshots the existing `assembly_bom`. Channel plus trimmed case-insensitive external reference has a partial unique index. Transaction advisory locks serialize both request UUID and sale identity before catalogue reads. An identical UUID/payload retry returns the existing order. A different request with the same sale identity is rejected with the existing AI reference. Creation and shared `apply_order_inventory` run in one transaction. The engine aggregates requirements, multiplies quantities and deducts components in sorted order using conditional updates. Insufficient stock rolls back the entire order and every deduction.

Website Stripe fulfilment calls the same inventory helper and retains its existing event/payment checks. External sales reuse paid Orders and the existing fulfilment transitions without inventing Stripe IDs or checkout sessions. They remain Admin-private under the existing Orders RLS. `apply_order_inventory` is not executable by browser roles; external creation is authenticated and checks `admin_members` inside the privileged RPC.

External sales never enqueue website fulfilment emails. Confirmation and lifecycle/refund claim functions also reject external channels. Website invoice and Stripe contact retrieval controls remain website-only. Marketplace communication stays outside Apparition.

The migration `20260930114021_external_orders_v1.sql` was already present in production at the start of this pass, but absent from canonical GitHub. Its exact persisted migration SQL was recovered from the connected database migration history and tested locally; it must not be reapplied to production.

Run `npm run test:external-orders` for the ephemeral PGlite PostgreSQL fixture and Happy DOM Admin fixture. The SQL runner contains no production connection or credentials. It covers BOM/quantity aggregation, persistence, retries, normalized duplicate identity, failure rollback, permissions, channel isolation and the existing website inventory replay fixture. Calls submitted together in PGlite are serialized by the local engine; production concurrency safety is enforced by transaction advisory locks and the unique index. Happy DOM decimal step validation is bypassed in the DOM fixture because it uses floating remainder; application GBP validation remains exercised.

Deferred: marketplace APIs, email parsing, automatic import/SKU matching, tracking synchronization, fees/accounting and automatic external customer emails.

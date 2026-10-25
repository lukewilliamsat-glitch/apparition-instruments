# Future transactional cutover — inactive

No write endpoint, migration, SQL execution or production adapter is introduced. COMMAND04's accepted disposable PostgreSQL contract remains the reference; it is not installed Supabase infrastructure. Its synthetic principal/session_user mapping, sim-N revisions and fixture schema cannot be used as JWT/auth.uid or deployed-schema evidence.

| Contract | Main source finding | Required future gate |
| --- | --- | --- |
| Identity | components.id is text; SKU uniqueness has a folded index; inventory/component_internal reference canonical component_id | Reconcile actual IDs/constraints; no receipt keyed only by mutable SKU |
| Prices/specs | Integer-pence sale_price/kit_price, kit_price_quantity and JSON specs/product_content; source generic save supports more fields than COMMAND | Explicit field authority and validated patch; private costs/images remain outside this read-only editor |
| Revision | updated_at is not a shared atomic mutation revision. Client read hashes are comparison/cache identities only | Server-owned revision changed by every participating product/inventory/cost writer; never use a client fingerprint as CAS |
| Actor/capabilities | Existing Auth verifies user plus admin_members; source policies use auth.uid/membership, not granular fixture role flags | Trusted JWT/session mapping, current capability checks, revocation during lock wait, read vs stock vs finance scopes |
| Transaction | Existing component-data save separately writes private cost, optional quantity-conditional inventory and product; create compensates incomplete setup | One server transaction for validated product/stock/cost revision, durable actor-bound receipt and audit; no partial fallback |
| Idempotency/outcome | Existing generic client save has no COMMAND durable operation status | Operation/payload/actor binding, same-operation replay, cross-actor denial, pending/committed/not-applied/unknown; absent receipt is unknown |
| Conflict | Legacy stock predicate protects old quantity only | Atomic shared revision plus stock constraints, typed conflict with least-data current values; no force-save |

## Source writer reconciliation

- `dist/backend/component-data.mjs`: direct REST create/update/private-cost/inventory operations and `delete_unused_component`; must be cut over, blocked or made revision-participating. Adding an IRONCLAD endpoint alongside it is insufficient.
- `20260925150000_p07b2a_paid_order_fulfilment.sql` and later patches: `fulfil_paid_stripe_checkout` deducts inventory in a paid-order transaction. Preserve paid-order idempotency while participating in shared inventory/revision authority. No payment action is part of this mission.
- `20260930114021_external_orders_v1.sql`: `apply_order_inventory` and `create_external_order` validate/deduct shared stock. External-detail editing in `20261008075917_external_order_editing_v1.sql` rejects item amendments; do not invent stock-adjustment behaviour for that edit.
- Assembly repository saves assembly/BOM/kit configuration through its own multi-step pathway; saving a BOM does not itself consume components. Wiring Kit Master calculates informational costing/buildability. Existing build-sheet production/QC state is a separate browser-local coordination facility. None constitutes a verified atomic stock-issue writer; future real assembly consumption requires an explicit transaction and reconciliation.
- FORGE instrument versions/private requests and email/fulfilment flows have separate version/operation contracts. Preserve them; do not co-opt their revisions as product-stock revisions. Identify actual deployed triggers/functions/jobs and any external writers before write cutover; Git source cannot prove that list complete.

Future adapter shape: authenticated `readProduct`, atomic `mutate({protocol,id,expectedRevision,operationId,patch})`, and actor-authorised `operationStatus(operationId)` with validated receipts. Server resolves actor and capability; the client cannot supply its own authority. No stock/image/cost bypass method or fallback to legacy save. Current editor's synthetic accept path is sim-specific and must be explicitly adapted/tested for a real revision/receipt protocol after backend approval; changing a kind marker is insufficient.

Acceptance requires original transaction/crash/replay/concurrent writer/receipt/audit tests plus real JWT/RLS/grant boundaries in a separately approved disposable environment and installed service compatibility. COMMAND04 SQL is not copied into migrations. LEDGER remains requirements-only.

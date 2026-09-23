# Customer-ready Pass 02: order foundation

## Scope and checkpoints

1. Central storage-independent order schema, browser-local adapter, unique reference allocation, Admin list/detail and status history.
2. Manual creation, supported basket-to-order handoff, mixed components/kits, customer/delivery details and GBP totals.

No payment processing, emails, documents, stock transactions, integrations or analytics. Existing basket, inventory, assemblies and configuration engines retain their behaviour.

## Persistence and reference limits

Orders are kept under `apparition.admin.orders.v1` in existing localStorage. No server persistence exists. Admin explicitly warns that records and references are local to this browser/device and clearing site data can remove them. This is not cross-device permanent business storage.

The storage envelope contains a schema version, monotonically increasing nextNumber and append-only orders. References start at AI-10001. Orders cannot be deleted through this interface; cancelling does not reuse a reference. All order writes run within one Web Lock to serialize competing tabs. Unsupported browsers fail closed for writes rather than risking duplicate local references. A creation request ID makes retries idempotent. Separate UUID identities prepare migration to server-side storage, where a global reference allocator must replace this local allocator.

Corrupt data is not reset. Quota/write failures report failure and do not present a successful order. Basket and central inventory are never written by order operations.

## Snapshots

Each order contains its own customer, delivery, channel, timestamps, external reference, notes, currency, item quantities/unit/line totals, subtotal/postage/total and status history. Component snapshots whitelist public descriptions/specifications and stable component identifiers; no image or costing payload is copied. Kits retain the complete Pass 01 record, including exact component metadata/quantities, price basis/add-ons, template/configuration and circuit snapshot.

Existing legacy kits without full component/circuit snapshots must be saved again in the Builder before order creation. Missing/unavailable basket entries fail the whole import rather than being silently skipped. Component agreed prices can be entered for manual/eBay sales; saved kit configured prices remain fixed. Delivery must be entered explicitly, including zero when free.

After creation, financial/item/customer snapshots have no edit or deletion operation in this pass. Status changes append a timestamped event. Marking Paid is an administrative record only, not payment verification. Drafts can be created but their item snapshots are also immutable after creation in this foundation pass.

## Admin workflow

Admin > Orders > Add manual order, or Create from basket. Choose WEBSITE, EBAY or MANUAL, enter customer/postage, add active individually sold components and/or complete configured kits from the existing basket. A new-tab Builder link allows configuring a kit without abandoning the form; Refresh choices reads the returned basket. Review saved kit selections before creating. Creation leaves basket and stock unchanged. Order detail renders snapshots without live catalogue resolution.

## Verification

Tests cover mixed basket handoff, kit/component snapshots, live Admin changes after ordering, reference sequencing, simultaneous serialized writers, idempotent retries, cancelled reference retention, status-only changes, reload persistence, zero/invalid amounts, invalid quantities, missing/legacy data, quota failure, corrupt storage and unchanged basket/stock. Existing kit/Admin/assemblies/Master/Designer and configuration-journey tests passed. Site audit checks 31 routes and imports.

Browser click/visual QA remains unverified because this plain static Site has no compatible supervised development preview. No production database or authentication was added.

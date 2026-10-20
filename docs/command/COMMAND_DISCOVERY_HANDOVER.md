# Project COMMAND — Admin V2 discovery handover

Authorisation 27, 20 October 2026. **Discovery and planning only; Admin V2 is not implemented.** Review baseline: main `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`. The inspected Phase2G checkout has identical `dist/` and `supabase/` trees to main. Findings below establish repository capabilities, not current production schema, configuration or authenticated acceptance. No Supabase/Stripe queries, customer data or live sessions were used.

## Confirmed existing architecture and capabilities

| Area | Repository evidence and boundary |
| --- | --- |
| Admin architecture | Static HTML/CSS and ES modules, rather than a new framework application. [`admin-gate.mjs`](../../dist/admin/admin-gate.mjs) authenticates, installs repositories and loads `data-admin-entry` modules. [`application.mjs`](../../dist/admin/application.mjs) already supplies a shared sidebar/topbar, workspace navigation and responsive menu. Its internal `v2` label does not mean Project COMMAND exists. |
| Product management | [`admin.mjs`](../../dist/admin/admin.mjs), product-content/specification modules and [`component-data.mjs`](../../dist/backend/component-data.mjs) support components, SKU/name/category/manufacturer, active/individual/kit eligibility, descriptive and technical content, fitment/QC fields, image editing and guarded deletion. Assemblies/BOMs, wiring-kit definitions, reusable catalogue options and export paths are separate existing consumers. |
| Inventory | Separate `inventory` records supply shared quantities and stock units. Existing set/adjust operations validate whole, non-negative quantities and condition updates on the previously read quantity. Internal unit costs are separate from public catalogue fields. Product creation/save uses multiple requests; do not claim the entire operation is one atomic transaction. |
| Images | [`images.mjs`](../../dist/admin/images.mjs) validates PNG/JPEG/WebP uploads up to 8 MB, including signatures; the editor supports one image value with preview, replacement and deliberate removal. Embedded data URLs and validated object references are supported. This is not a multiple-image gallery. GIGA static-delivery work remains a separate, unactivated workstream; do not activate or duplicate it. |
| Prices and multibuy | Existing fields include `sale_price`, `kit_price`, `kit_price_quantity` and private unit cost, with GBP input validation. Kit quantity pricing is not evidence of a general customer multibuy-discount engine. No operator-facing multibuy tier editor was identified in the reviewed Admin/checkout paths. |
| Orders | [`order-data.mjs`](../../dist/backend/order-data.mjs) and `admin/orders/` cover order lists/details, website/external channels, external creation/editing, fulfilment advancement/correction, dispatch details, partial-refund acknowledgement, email-delivery status and customer aftercare. Build-sheet/production/QC views and email review are existing specialised flows to preserve. |
| Promotions/vouchers | No promotion/voucher resource appears in the shared Admin transport allowlist; no corresponding Admin control was identified. The reviewed Checkout session builder does not enable promotion-code entry or attach coupon/discount parameters. Repository roadmap requests are proposals, not deployed features. Stripe Dashboard configuration and other unseen systems were not inspected. |

## Backend, payments and security boundaries

[`admin-auth.mjs`](../../dist/admin/admin-auth.mjs) uses Supabase Auth sessions, refresh and a membership check against `admin_members`. [`providers.mjs`](../../dist/backend/providers.mjs) sends the current user's token through an explicit resource/RPC allowlist; it is not service-role access. Catalogue repositories read components, inventory and private internal rows; separate repositories serve assemblies, options, orders, Operations and Email Template Studio. Migration source declares RLS and membership/ownership restrictions, but current grants/policies have not been reverified live.

The current Admin component list performs three full `select=*` reads and joins images, stock and internal costs. Saves and stock updates can read that full list again. Orders similarly request full orders and delivery history. These are opportunities for bounded projections/pagination later, not approval to change contracts now. Preserve full-record consumers, image values, stock conditions and explicit unloaded-versus-deleted image state. Reconcile any separately frozen FORGE V4 candidates before reusing their corrections; do not assume they were merged into main.

[`create-checkout`](../../supabase/functions/create-checkout/index.ts) is server-side: it checks store availability and optional customer identity, uses authoritative order validation, verifies totals/ownership, and creates an idempotent Stripe Checkout session. Privileged credentials remain server-side. [`stripe-webhook`](../../supabase/functions/stripe-webhook/index.ts) verifies webhook signatures and invokes fulfilment/refund processing. Admin refund acknowledgement is not evidence of an operator refund-creation control. Preserve payment, inventory, email audit/idempotency and marketplace restrictions; UI changes cannot become pricing/payment authority.

Browser gating is a usability boundary, not a replacement for server-side authorisation. Future COMMAND must retain RLS, membership checks, transport allowlists, sign-out invalidation and private-data separation. No service-role/Stripe secret belongs in browser code or public CI evidence. Do not expose private fields through public lightweight projections.

## Proposed Admin V2 direction — not existing functionality

- A clearer daily-work workspace: searchable catalogue, useful stock/price summaries and a stable selected-product panel; consistent loading, empty, error and retry states.
- Predictable editor lifecycle: dirty-state preservation, stale-response rejection, deliberate image replacement/removal and explicit save/conflict feedback.
- Mobile/keyboard-friendly tables, labels, focus handling and dialogs, using the existing shell where practical.
- Later, separately scoped work for image galleries/publication status, multibuy tiers, promotions/vouchers and shipping controls. Agree server validation, audit, stacking/rounding and historical-order behaviour before designing write interfaces or SQL.

## Recommended first milestone: COMMAND 01 — read-only catalogue workbench

**Business outcome:** find a component quickly and inspect its stock, price and product details in one coherent view before undertaking risky editing or commerce changes.

Deliver a small fixture-backed workbench with search/category/status filtering, stock/price columns and a read-only detail panel. Preserve existing Admin routes and navigation; no new production route is installed in this milestone. Use existing field vocabulary/repository contracts behind injected synthetic transports. No writes, image upload, discounts, orders, schema changes or live service access.

Acceptance: deterministic search/filter/selection; delayed/reversed response and failure/retry fixtures; no misleading missing-image/deletion state; desktop/mobile and keyboard checks; actual browser evidence only after process-level external-network isolation passes. Prefer isolated GitHub Actions validation and remotely retained synthetic evidence under the [cloud-first policy](../engineering/CLOUD_FIRST_POLICY.md). No mandatory owner-side installation or ZIP workflow.

The milestone is independently reviewable as engineering code and synthetic acceptance evidence. Real Admin integration, authenticated live validation, backend access, main merge and publication require subsequent explicit authorisation. Apply no migrations or new transport permissions merely to make the prototype run.

## Continuation decision

Request a narrow COMMAND 01 implementation authorisation next, with the above exclusions and acceptance criteria. Atlas stays frozen under its [handover](../atlas/ATLAS_FREEZE_HANDOVER.md); it is not a prerequisite for starting this isolated business-facing milestone. Do not implement COMMAND under Authorisation 27.

# P05A backend foundation

The existing project `Apparition Instruments Webstore` (`acdxpxvksvdwfajntzfx`) receives migrations from `supabase/migrations/`. No browser data is seeded here. The frontend and Admin keep using their local repositories until explicitly migrated in P05B and P05C.

## Ownership and credentials

- `dist/backend/public-config.mjs` contains the project URL and a **publishable** key. Both are safe to expose in the browser. This key confers no Admin access; RLS and database privileges enforce that boundary.
- Service-role/secret keys, database passwords, payment keys, and email-provider keys must remain server-side in the connected integration or future Edge Function secret storage. Never commit them or send them to GitHub Pages.
- `dist/backend/providers.mjs` chooses `local` explicitly by default; its Supabase adapter is read-only and must not be selected for live app data until data and Auth cutovers. Only repository adapters issue REST requests. Future Admin providers require authenticated user tokens and must implement the existing async contracts.
- The current static Admin gate is **not** Supabase Auth. `admin_members` is intentionally empty and cannot be self-enrolled. Provision membership only through a trusted operation after real Auth is designed. Generic signed-in users have no Admin privileges.

## Data and access

- Component IDs and Assembly IDs stay text; `kit_definitions.assembly_id` is the existing Kit Definition/Assembly identity. `family` is the stable slug. Money is GBP pence, not floating point.
- `components` contains public catalogue fields; `component_internal` stores cost, supplier details and notes under Admin-only RLS. `inventory` is Admin-only. The public `catalogue_components` and `catalogue_wiring_kits` views are security-invoker, contain no internal cost or exact stock, and require underlying RLS/grants. Fixed `assembly_bom` and configurable `kit_permitted_components` have separate relationships. `kit_definition_internal` contains non-public metadata.
- The `apparition-business-images` bucket holds future public product images under `components/<component-id>/<filename>` or `assemblies/<assembly-id>/<filename>`. Public downloads are allowed; uploads/updates/deletes require an explicit Admin membership and Auth. No existing data URLs or GitHub assets move in P05A. Never place Admin-only imagery in this public bucket; use a separate private bucket and signed access when needed.
- Future privileged commerce actions (authoritative pricing, Checkout creation, verified payment webhooks, order finalisation, stock transactions and email) belong in version-controlled Edge Functions with server-side secrets. No such function is deployed in P05A.

## Controlled browser-local import, deferred to P05B/P05C

1. Export the *actual* current browser's `apparition.admin.components.v1` and `apparition.admin.assemblies.v1` JSON under the user's control, with a recorded source/browser/time and checksum. Do not assume checked-in seeds match Luke's latest edits. Do not reset local records.
2. Validate envelopes/relationships with `planLocalImport` and existing domain validation, reviewing the report before any write. It preserves stable IDs, SKU, prices, stock, image record, kit defaults, BOM, permitted IDs and mappings. Resolve missing references explicitly; do not invent IDs or silently drop rows. Store exports securely, as they contain cost and possible embedded images.
3. P05B imports Components, cost, inventory and images first; P05C imports Assemblies, BOM and Kit Definitions after their referenced Components exist. Use a controlled, authenticated import with a dry-run diff and transaction, explicit conflict resolution, and a backup. Refuse overwriting a row with newer server `updated_at` or an unreviewed change. An import can be rerun as an idempotent ID-based upsert only after conflicts are resolved. Never run import from the public Pages bundle.
4. Compare counts, IDs, stock totals, flags, prices, permitted links, defaults and image access across browsers before deliberately selecting Supabase providers. Leave local data intact for rollback; never switch business authority during P05A.

## Deferred domain work

Additional component brands still require a configured customer option dimension; structured Component attributes and Kit Definition permissions will eventually drive option generation. The Builder currently charges selected kit adjustments once per option; physical Component ID plus quantity in a resolved BOM must eventually drive price, availability, basket, Build Sheet and stock deductions. The CTS ×4 correction belongs there, not in a family-specific patch. P04C families and payment/Auth work remain deferred.

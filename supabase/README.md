# P05A backend foundation

The existing project `Apparition Instruments Webstore` (`acdxpxvksvdwfajntzfx`) receives migrations from `supabase/migrations/`. P05B imported the approved browser export separately from migration SQL and switched Components and Inventory to Supabase. Assemblies and Kit Definitions remain local until P05C.

## Ownership and credentials

- `dist/backend/public-config.mjs` contains the project URL and a **publishable** key. Both are safe to expose in the browser. This key confers no Admin access; RLS and database privileges enforce that boundary.
- Service-role/secret keys, database passwords, payment keys, and email-provider keys must remain server-side in the connected integration or future Edge Function secret storage. Never commit them or send them to GitHub Pages.
- The production browser Component repository reads Supabase public catalogue and availability. The Admin repository uses the authenticated user's bearer token for Component, private cost and Inventory reads/writes. The explicit local provider remains available for isolated tests and legacy export diagnostics, never as production fallback.
- Admin entry uses Supabase email/password Auth and explicitly checks `admin_members` before loading Admin modules. The initial confirmed Auth user was granted membership through the connected project's trusted SQL integration. Membership remains live data and is not hard-coded in source. New users cannot self-enrol; generic signed-in users have no Admin privileges. The old static browser password is retired.
- The P05D-A Auth client stores standard Supabase refresh/access tokens in browser storage, refreshes expired sessions, verifies identity with `/auth/v1/user`, and signs out through `/auth/v1/logout?scope=local`. Admin repository transport obtains the user's refreshed bearer token, never a privileged key. P05B uses that transport for Component/Inventory writes.

## Data and access

- Component IDs and Assembly IDs stay text; `kit_definitions.assembly_id` is the existing Kit Definition/Assembly identity. `family` is the stable slug. Money is GBP pence, not floating point.
- `components` contains public catalogue fields; `component_internal` stores cost, supplier details and notes under Admin-only RLS. P05B grants a narrow public read of Inventory ID and exact quantity, restricted by RLS to active public or kit-eligible Components, because existing Builder quantity checks need it. `catalogue_components` joins this quantity without exposing costs; writes remain Admin-only. Both catalogue views are security-invoker and require underlying RLS/grants. Fixed `assembly_bom` and configurable `kit_permitted_components` have separate relationships. `kit_definition_internal` contains non-public metadata.
- The `apparition-business-images` bucket holds future public product images under `components/<component-id>/<filename>` or `assemblies/<assembly-id>/<filename>`. Public downloads are allowed; uploads/updates/deletes require an explicit Admin membership and Auth. No existing data URLs or GitHub assets move in P05A. Never place Admin-only imagery in this public bucket; use a separate private bucket and signed access when needed.
- Future privileged commerce actions (authoritative pricing, Checkout creation, verified payment webhooks, order finalisation, stock transactions and email) belong in version-controlled Edge Functions with server-side secrets. No such function is deployed in P05A.

## Controlled browser-local import: P05B complete; P05C deferred

1. Export the *actual* current browser's `apparition.admin.components.v1` and `apparition.admin.assemblies.v1` JSON under the user's control, with a recorded source/browser/time and checksum. Do not assume checked-in seeds match Luke's latest edits. Do not reset local records.
2. Validate envelopes/relationships with `planLocalImport` and existing domain validation, reviewing the report before any write. It preserves stable IDs, SKU, prices, stock, image record, kit defaults, BOM, permitted IDs and mappings. Resolve missing references explicitly; do not invent IDs or silently drop rows. Store exports securely, as they contain cost and possible embedded images.
3. P05B imported the privately reviewed, actual browser export in one guarded transaction after confirming empty tables: 33 Components, 33 private-cost rows and 33 Inventory rows, 18 with positive stock. Every mapped field matched; no embedded/object images required migration. The explicitly obsolete `price` field was retired; `salePrice` and `kitPrice` remain authoritative. Never package or replay the private export in the Pages bundle or GitHub repository.
4. P05C must separately validate the actual local Assemblies/BOM/Kit Definitions against the existing Component IDs before selecting shared repositories. The old local Component record is retained for private audit only and must never overwrite newer shared data.

## Deferred domain work

Additional component brands still require a configured customer option dimension; structured Component attributes and Kit Definition permissions will eventually drive option generation. The Builder currently charges selected kit adjustments once per option; physical Component ID plus quantity in a resolved BOM must eventually drive price, availability, basket, Build Sheet and stock deductions. The CTS ×4 correction belongs there, not in a family-specific patch. P04C families and payment/Auth work remain deferred.

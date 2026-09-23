# Admin foundation

`/admin/` has Components and Stock views only. A temporary Admin link is managed by `scripts/navigation.json` and shared navigation generation.

The approved site is plain static, with no database. `dist/admin/data.mjs` imports the existing component catalogue and existing kit hardware definitions to seed one development dataset. Existing component IDs/specifications are retained. Requested missing physical items are added without creating customer products or prices.

Both Admin views use `createComponentStore`. Its browser-storage adapter persists under `apparition.admin.components.v1`. Initial quantities are applied once; subsequent loads retain saved edits. Zero stock does not deactivate or hide components. Corrupt/unavailable storage produces a visible error instead of silently discarding data.

Data is local to the browser/profile/device, not shared between users or devices, and clearing site storage removes it. This limitation is stated on the page. Replace the adapter with server persistence in a later phase.

No storefront/Kit Builder integration, pricing editor, automatic deduction, reservations, orders, authentication, images, dashboard or Wiring Engine changes are included.

Validation: `node tests/admin.mjs` covers exact seed quantities, existing IDs, add/edit, active/individual/kit flags, stock set/adjust, integer and nonnegative validation, SKU uniqueness, reload persistence, and storage failure handling. Site route/asset/import audit passes. Existing pages were compared against the previous commit and differ only by temporary Admin links. Full browser interaction testing remains unavailable for this static checkout's supervised-preview setup.

## Pricing and development integration extension

The extension now connects the existing store to Components cards and explicitly mapped existing Kit Builder options. The earlier exclusions above describe the foundation release only. Catalogue and kit seed modules are immutable bootstrap/default references; all editable data lives in the same browser record store. Existing saved records migrate without resetting edits or stock.

Optional `salePrice` and `kitPrice` use independent integer GBP pence. Missing prices remain null and cannot become a free purchase. Availability toggles preserve saved prices. Zero-stock active products remain visible. Kit stock checks and deductions are intentionally absent.

`admin/kit-bindings.mjs` binds known physical record IDs to existing supported choices. Charges state their basis: four-pot set, each tone capacitor, treble-bleed pair, or one jack/switch. Unmapped records retain their kit flag/price but do not invent a new kit option or electrical definition. Base price and service upgrades retain existing kit definitions. Ineligible selections are removed from visible purchase choices; saved incompatible configurations cannot be added to the basket.

`admin/images.mjs` validates PNG/JPEG/WEBP uploads up to 1 MiB and stores a bounded data URL on the component record. Storage quota errors preserve the previous saved record. The adapter can later be replaced independently of the editor. No image galleries, editing, cloud storage, or backend were introduced.

Storefront and kit modules read current records on page load. Reload after an Admin change to refresh another open page. New individually eligible records use existing component cards; supported new categories appear in the existing compact filter. Existing Wiring Engine, Generator and circuit definitions were not modified.

Validation: `node tests/admin-integration.mjs`, foundation Admin tests, kit-system tests, configuration journey tests, and the site audit passed. Browser UI interaction and visual QA remain unverified because this static checkout has no compatible supervised preview.

## Customer-facing content extension

Optional `productTitle`, `shortDescription`, `fullDescription`, and ordered `productSpecifications` label/value rows live on the same component record. Internal name, description and technical specs remain independent. The editor supports adding, editing, removing and moving rows up/down with keyboard-accessible buttons. Partially completed rows require both fields; entirely blank rows are omitted. Full-description paragraph breaks are preserved.

The existing storefront has cards, not separate product-detail pages. Its title uses the customer title or internal name. Its existing description area uses short description, then full description, then legacy description. Ordered product specifications replace the existing displayed specification list when supplied; an empty list keeps the technical fallback. Technical filtering and kit configuration still use internal fields. Content is rendered as text, never interpreted as HTML.

Two completed checkpoints were published: editor/persistence first, then storefront integration. `tests/product-content.mjs` covers content persistence, ordered row edits/removal/reordering, fallbacks and unchanged operational data; Admin integration, kit system and route/import audits passed. Full browser click-testing remains unavailable for this static checkout's supervised-preview setup.

## Products / Assemblies and BOM foundation

Admin now includes Products / Assemblies beside Components and Stock. Assemblies have their own local record collection (`apparition.admin.assemblies.v1`) containing ID, unique assembly SKU, name, category, active flag and BOM rows with existing component IDs plus positive integer quantities. No component records or stock values are copied. The list starts empty; no existing finished-product records or products are converted. Deletion uses an explicit confirmation and only removes the assembly.

Buildable quantity is computed on demand from current central component stock. Requirements for repeated component IDs are summed before division. Each capacity is rounded down; the smallest determines the result, including all tied limiting components. Empty BOMs show Not calculated. Invalid quantities, missing/inactive components, invalid stock and unsafe integer sums produce warnings rather than a misleading quantity. Zero valid stock yields zero buildable. The table recalculates whenever it opens or refreshes; the editor recalculates on BOM changes and cross-tab inventory storage changes. No availability result is persisted as assembly stock, and no calculation reserves or consumes stock.

Two working checkpoints were published: assembly/BOM editing, then live buildability. `tests/assemblies.mjs` covers persistence, creation/edit/removal, validation, central inventory references, calculation edge cases and unchanged stock. Existing Admin, integration, content, kit-system and site audit checks pass. Browser UI click-testing remains unverified under the existing static preview limitation.

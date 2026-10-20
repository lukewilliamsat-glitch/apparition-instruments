# Integration contract

## Public browser path
The existing `readCatalogueComponents` boundary is used by the public component repository and raw catalogue client. Both accept an optional injected delivery configuration for isolated tests. Default callers retain the bundled disabled switch; there is no browser query-string, storage or remote flag that activates the feature.

Enabled operation requests the same required metadata projection minus `image` from `catalogue_delivery_v2`, plus `image_identity,image_reference`. No private fields are added. Public price/stock are display data; unchanged server-side checkout remains authoritative. Technical image-free callers retain their existing projection.

Rows must have unique stable IDs and an explicit null or SHA-256 identity; an unexpected embedded `image` field is rejected. The manifest is version 1, revision SHA-256 over deterministic entries. Every entry binds product ID, source hash, decoded asset hash, MIME, byte count and exact content-addressed path. Alias or explicitly pinned immutable manifest paths are supported; pinned revision must match its filename.

Static fetches omit credentials/referrer and reject redirects. Manifest bytes are bounded to 1 MiB; asset bodies to their expected size and 8 MiB maximum. Complete MIME/byte/hash verification replaces HEAD-only proof, including matching-length corruption. At most four asset verification jobs run concurrently. Request-function/generation-scoped caches coalesce repeated work and use the existing 30-second expiry/invalidation boundary. Asset fetch uses force-cache; actual browser/CDN reuse is not certified by that directive.

No-image rows need no manifest. Missing manifest, identity mismatch, missing asset, invalid reference, wrong MIME, corrupted bytes or image publication lag yield `image:null,imageDeliveryState:'unavailable'`. Metadata outage fails the catalogue read; it never substitutes a static stock/price snapshot. No active-path fallback queries `catalogue_components` for image bytes. Arbitrary HTTPS image_reference URLs are not followed. Outstanding results are rejected after invalidation.

## Generator
`readGeneratorCatalogue({config,request,root,staticImages:true,revision})` first validates the retained archive, then reads lightweight metadata with the original product eligibility filters. It resolves rows through `retainedCatalogueSnapshot`; missing or mismatched assets block generation. Optional revision pins a verified historical manifest for explicit rollback.

Call `generate({rows,options,root,preserveProductAssets:true})` for this isolated static flow. The future shared activation switch also enables this retention by default. Only owned index.html output is removed from prior product directories; companion image/other asset files remain, including retired products. Current static assets outside products are never removed. Existing rendering produces product pages, category links, OG and JSON-LD using verified references without re-encoding images.

The real CLI still uses the disabled switch and unchanged legacy network source until separate activation approval. It was not run against production. A complete existing Pages payload is still required before any publication; committed dist alone is not asserted to be that payload.

## Publisher and archive
Reused callable modules have no automatic CLI or installed Actions integration. `preparePublication` accepts lightweight rows, prior verified archive and injected per-ID image fetch. Unchanged identities and retained historical/deduplicated sources require no image fetch. Replacement bytes must match the requested source identity before any output writes. Initial capture requires a matching approved inventory. No resizing or garbage collection occurs.

`openStore/commitStore/exportStore` use a data-only Git branch plus initialisation marker. Writes are non-force, guarded against branch movement, and bootstrap branch/marker publication is atomic. Every prior path must survive. Recovery scans and verifies durable history rather than requiring an expiring Actions artifact. Read-only export rejects an uncommitted repair; a reviewed forward repair commit is required. Tests use local bare fixture repositories only.

## Admin and commerce
Authenticated Admin repository implementation, transport allowlist, upload/replacement/removal, private fields, stock CAS and save validation are unchanged. Static URLs are never written back as replacement source images. Cart snapshots and checkout/Stripe/SQL sources are untouched. No browser credential or new production secret exists in this implementation.


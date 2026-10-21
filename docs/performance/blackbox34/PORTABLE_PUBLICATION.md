# Provider-neutral publication and recovery

## Reuse and changes

The RC07-derived `trusted-image-publisher.mjs`, hardened `durable-image-store.mjs` and existing `catalogue-image-assets.mjs` are reused unchanged from BLACKBOX 33. Their exact-byte planning, source binding, MIME checks, immutable writes, Git compare-and-swap, atomic bootstrap marker and refusal of uncommitted repairs remain intact. RC07 itself remains clean at commit `55e5fba390f7cf648490f7e7b5e0114a4d0d510c`, tree `8bd71a5e69dcdaf77add68afcbec5f65a11ece4c`.

New `static-image-contract.mjs` separates logical asset paths from a controlled HTTPS origin and optional safe base path. `retained-catalogue-snapshot.mjs` and the generator's injected static path accept that configuration. Existing defaults and site canonical metadata remain unchanged. The trusted publisher's legacy convenience snapshot still has its historical domain default; portable assembly does not consume that snapshot or put its URLs into authoritative records.

## Portable contract

| Field | Contract |
| --- | --- |
| Logical image path | `/assets/catalogue-images/<SHA-256>.<png|jpg|webp>` |
| Source identity | SHA-256 of canonical `data:<mime>;base64,<original bytes>`; never a hosting URL |
| Manifest | Existing version 1, stable product IDs, source hash, asset hash, MIME, byte length and logical path |
| Manifest identity | SHA-256 of its serialised entries; immutable `manifest.<revision>.json`, plus current `manifest.json` selection |
| Asset validation | Complete bytes, exact size, MIME and source/hash binding; existing maximum 8 MiB/image |
| Host mapping | Explicit HTTPS origin; no credentials/query/fragment; base path allows safe ASCII path segments only |
| Receipt | Version, committed archive SHA, initialisation marker, selected manifest, sorted retained file paths/sizes/hashes and deterministic bundle revision |

No provider API, paid service, browser credential or provider URL is required by the receipt/bundle. Unsafe paths and arbitrary reference URLs are rejected. MIME, immutable image cache headers, current-manifest freshness and cross-origin CORS must be configured and verified at a future approved host; packaging is not deployment.

## Executed fixture lifecycle

The non-deploying workflow runs the actual existing planner → approved synthetic inventory check → source capture simulation → local bare Git archive → atomic committed branch/marker → portable assembly → complete verification sequence. It uses no live repository-write token.

`assemblePortablePublication` requires the expected committed archive and initialisation marker, calls the reused `exportStore`, validates every retained manifest/image, writes an integrity receipt in a temporary directory, rechecks remote refs and atomically renames the completed output. A destination lock prevents concurrent writers. Receipt contents contain no timestamps or temporary paths: repeated assembly of the same archive commit/selection produces identical bytes. Different Git commits are different inputs; independently created Git commits may carry different timestamps.

Every assembly restores the entire required archive, independently of new capture. Three ordinary capture-disabled assemblies matched exactly and fetched no source images. Replacement added a new immutable asset; removal did not erase history; historical selection retained newer versions. Fresh-checkout restoration requires no Actions artifact. Missing files, corrupt bytes/manifests/receipts, stale publisher heads and uncommitted repairs block assembly. The final guard also requires regular 100644 Git objects and regular filesystem files/directories, rejects symlinks before reading/exporting, and checks receipt/file/aggregate sizes before full-body verification. Two matching-byte symlink regressions reproduce the original acceptance defect and now pass. No garbage collection, ref truncation, reset or force push is implemented.

The reused archive retains its existing 256 MiB asset and 384 MiB Git-object budgets. Actual production growth/permissions are unverified. Before any real bootstrap, independently establish a protected archive-required lifecycle policy (the existing `CATALOGUE_ARCHIVE_REQUIRED=true` requirement) and durable marker/branch protections. An application rollback must not downgrade that policy. Portable assembly has no uninitialised-archive fallback; the separately tested legacy/uninitialised state applies only before bootstrap and must not excuse missing required history.

## Portability and generator evidence

The same synthetic identities/bytes were resolved at two independent loopback HTTPS origins: a root Pages-style layout and a neutral `/shop/v2` base path. Authoritative rows were unchanged. Node tests also exercised `readGeneratorCatalogue` and retained snapshots with two neutral HTTPS configurations. The existing generator regression regenerated product pages with metadata, structured data, image URLs and historical companion assets preserved.

This is a complete **asset** bundle, not an attestation of the current live website payload. A future authorised site assembler must combine it with independently verified complete site output on every relevant deployment. This mission did not install that production integration or create a Pages deployment artifact.

## Admin changes and late races

Admin continues storing original images through unchanged authenticated write paths. The existing publisher reuses unchanged/shared sources and checks fetched source fingerprints before any publication output. A concurrent replacement before capture is rejected. A later source change can make a manifest stale; identity binding then produces a placeholder until a matching publication is available, never another photograph or an embedded-image download. No cross-system atomic database/publication transaction is claimed.

Image-only rollback is valid only for compatible source identities and preserves current price/stock metadata. An incompatible pin fails closed. It does not authorise database rewrites or restoration of stale business values.

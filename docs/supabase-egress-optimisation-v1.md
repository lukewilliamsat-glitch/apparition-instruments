# Supabase egress optimisation GIGA V1

## Baseline and authority

Canonical starting HEAD 4e51f8c2d635fc068e05ba023e2fcec567ba23e0, tree c0a28f9276e7edf988302beca6211511c3e61140. Separate egress-optimisation-v1 worktree; original V3 checkpoint and bundles untouched. Starting recovery bundle export/egress-optimisation-v1-start.bundle. No migrations, backend deployments, credentials, billing or production writes authorised or performed. Actual project acdxpxvksvdwfajntzfx is ACTIVE_HEALTHY. Application-only non-force publication authorised after checks.

## Consumer map and query changes

| Consumer | Fields / image requirement | Change |
| --- | --- | --- |
| Component listings, search/filter, homepage commerce, product details | Public descriptive fields, prices/stock and image | Existing image-bearing projection/rendering preserved; 30-second bounded reuse |
| Wiring kit builder and choice panels | Public components including images; kit configuration and permitted mappings | Image-bearing behaviour preserved; shared public cache |
| Forge possible catalogue matches | Descriptive/electrical facts, eligibility, stock/price; no image UI | Explicit technical projection omits image |
| Product commercial support handoff | One product's eligibility/context; no image UI | Technical projection filtered by exact stable product ID |
| Admin catalogue, upload/replacement, exports | Private authenticated source and image audit/export | No private caching, editor/export/write logic unchanged |
| Inventory / price changes | Existing authenticated CAS and private transport | Successful shared catalogue mutation invalidates public cache; other visitors expire within 30 seconds |
| Checkout / orders / fulfilment | Existing authoritative SQL/Edge validation, private order data | No changes |
| Pages product generator | Public product projection, including image for existing static output | Cache bypass explicit; scheduled builds retained, interval 15 minutes |
| CMS, News, scheduled store notices | Existing published public content | Existing generation steps preserved; browser store/announcement poll remains one minute and checks known boundaries |

No image is fetched in technical matching/handoff reads. Image-bearing storefront consumers still need their legacy fields until a separately approved static reference transition. Public cache never receives private operational/customer data. Current metadata/stock/price share a strict short lifetime rather than splitting fields into a new backend contract.

## Cache contract

Concurrent and settled identical requests coalesce. Every caller gets an independent structured clone. Maximum age 30 seconds, maximum 32 entries and 20 MiB serialized public rows per native-fetch cache. Small navigation entries use sessionStorage: 64 KiB per entry, 256 KiB total row payload budget. Large public image-bearing results can use Cache Storage, hashed internal keys, same 30-second expiry and 32-entry/20 MiB limits. Cache Storage keys are never fetched as URLs, no service worker is installed. Browser storage is optional and failure falls back to live reads plus bounded memory caching.

Successful catalogue/inventory/configuration writes through the actual authenticated Admin transport invalidate local public data and signal other same-origin tabs via a non-sensitive generation marker. In-flight data cannot repopulate the cache after invalidation. Expired responses are never substituted during outages, malformed/non-array/network-error responses are not cached, requests remain retryable. Origin caches remain subject to browser eviction. Cached display stock never authorises a sale: all unchanged server-side checkout/stock validation remains in force. Other visitors see edits on their next read after expiry, within 30 seconds; this is not an automatic rerender of already displayed pages.

## Pages responsibilities

Schedule changed from */5 to */15, not disabled. Nominal scheduled invocations fall from 288 to 96/day (66.7% fewer); actual GitHub execution frequency is not guaranteed. Push/manual triggers remain, static-only/cms-only existing guards remain, CMS generation remains, one artifact upload remains and cancel-in-progress stays false. Public SEO/content snapshots can lag 15 minutes plus queue/build/cache delay; live purchasing/store/announcement enforcement is unchanged. Static-only publication avoids product extraction for this pass. A manual normal build remains available for urgent snapshot refresh. No new workflow retries or artifacts added.

## Image architecture and approval boundary

Existing product generation already extracts legacy data URLs into per-product image.png/jpg/webp for normal Pages builds. Those filenames are not content-addressed, and public browser queries still return embedded source data. No production images were extracted into a new bundle, rewritten, deleted or uploaded in this optimisation pass.

Proposed next phase: existing trusted GitHub Actions publisher writes immutable SHA-256 filenames and a manifest keyed by stable component ID. Retain old assets across deployment/rollback; validate MIME/signature and size, allow only public images, never expose private source fields. Browsers use a static asset only when the manifest version matches the current lightweight image identity; otherwise request the single legacy image by ID. Use the current Admin save flow, with automatic publication through the trusted existing Action, never browser GitHub credentials.

A cheap server-side image-identity/digest projection is needed to detect Admin replacement without transferring the image. Prepare/review that exact SQL separately, preserve RLS and public-only grants, and obtain separate approval for its application and initial bulk asset publication. No new RPC, hash column, database trigger, secret or infrastructure was created here. This phase intentionally remains a design, not a partially active image migration.

## Measurements

Production aggregate serialization (14 public rows): image-bearing JSONB projection 11,947,341 bytes; no-image projection 9,195 bytes, 99.923% smaller. JSONB formatting differs from HTTP JSON.

Controlled read-only live HTTP comparison, identical public key and Accept-Encoding:gzip: existing full explicit component projection 11,946,961 raw JSON bytes / 9,007,039 encoded body bytes; technical projection 8,843 raw JSON bytes / 1,875 gzip body bytes. Both returned 14 rows. Raw reduction 99.926%; gzip body reduction 99.979%. Body sizes exclude headers/TLS. One comparison, not billing attribution or future traffic savings. First Node HTTPS attempt timed out through the proxy; curl completed both reads.

Isolated six-image synthetic fixture: 4,194,745 raw bytes / 4,810 gzip bytes before, 235 raw / 79 gzip after. Repetitive fixture deliberately compresses much better than real images; never extrapolate those gzip savings to billing.

Production image aggregate before changes: 36 component rows, 11,937,960 image-text bytes, ordered image fingerprint 3b2c810ac3b3aa4347246a501256e80c. No production mutation used to manufacture results.

## Validation and rollback

Focused cache/domain/browser integration tests use controlled mocked HTTP and storage, never customer delivery. Browser integration exercises the actual authenticated Admin transport with a fixture token, large-image navigation reuse, invalidation and expiry/offline behaviour. Relevant commerce, Admin, email/Studio/Aftercare, Forge V1/V2/V3 and responsive gates are fixture-based; static site audit validates 94 pages. Historical Forge scope tests are milestone-specific and intentionally not repurposed: current dedicated preservation test checks exact accepted production boundaries plus the engine manifest. Product detail legacy test needed its isolated OPEN store fixture and callback-instance feedback assertion; the baseline failed without them. The legacy Operations test also expected Article although the published generator emits NewsArticle; the fixture expectation was aligned after reproducing that failure on the starting checkpoint. No production product/News behaviour was changed to satisfy those tests.

Rollback is an ordinary non-force commit restoring the seven application/workflow/script files from the starting HEAD, followed by a clean Pages run. No database rollback or asset deletion is necessary; old code ignores optional public cache buckets and retains live reads. Thirty-second expiry bounds mixed-version staleness.

## Further work

Separate approvals: lightweight public image identity SQL and initial content-addressed asset publication. Later independent optimisations: Admin pagination, Forge lazy revision loading, attribution of Supavisor bytes, privacy-safe service usage/response-size monitoring. The 13.44 GB bill-cycle total remains owner-reported and is not attributed by these projection measurements.

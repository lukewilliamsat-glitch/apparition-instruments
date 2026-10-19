# Production snapshot capture — design only

No capture, website download, live-only image reconstruction or Supabase request was performed under Authorisation 19. Phase 1's static sample remains historical audit evidence, not test input. These tools validate a supplied local directory; they cannot discover or attest production completeness.

## Preferred evidence hierarchy

1. **Authentic complete successful deployment artifact** with known run/source/deployment identity, whole artifact hash and extracted full-file manifest. Recover an existing owner-held artifact if possible; no new production read needed. Verify source provenance, artifact integrity, archive path safety and published-output identity. A source checkout is not a deployment artifact.
2. **Other independently preserved full public-output backup** with demonstrable production provenance and a coverage inventory. Reconcile capture time and later deployments before use.
3. **Best-effort public-site reconstruction**, separately authorised, explicitly labelled reconstructed. It cannot become an authentic complete deployment artifact merely by matching a sitemap or a set of HTTP200s. Owner must accept residual coverage risks after a detailed gap report.

## Separately approved capture scope

Inventory sources without executing page JS: previously successful build logs/artifact file list, current repository dist, sitemap and robots, generated route registries, HTML asset/link refs, CSS imports/URLs, static ESM imports, manifests and owner knowledge. Include live-only product pages/PNGs, News, generated category content, shared CSS/scripts, fonts where licensed/served, legal pages, checkout shell, Signal Forge and other protected routes. Do not resurrect source-only obsolete routes simply because committed source contains them.

Bound the operation explicitly before approval: origins, allowed path inventory, maximum GET/HEAD count, encoded/decoded/per-file/aggregate bytes, concurrency1–2, timeout, retry policy0 or one separately justified retry, duration and stop conditions. Large photo bytes must be individually budgeted; no implicit Supabase extraction. No authentication, production API invocation, JS execution, forms, checkout, cookies, request payload collection or private authoring inputs. Stop on off-origin redirects and never follow a Supabase URL. Runtime JSON dependencies must be documented, not fetched opportunistically.

Record UTC, requested/final URL, status, content type/encoding, encoded and decoded byte counts, SHA-256 of stored decoded bytes, Content-Length comparison when present, ETag/Last-Modified/Age/Vary/cache headers, known source/deployment revision and provenance method. Set safe limits on decompression; 200 with wrong MIME/HTML error body is not an image. Verify image signatures and decoded dimensions/pixels if actually authorised to retrieve images. Store raw decoded content unchanged; no minification/reformatting or marker rewriting.

A changing live deployment during capture invalidates coherence: pin/reconcile deployment revision at start/end, retain per-resource observations, and fail or explicitly report conflicts. ETags/timestamps are not cryptographic proof. CDN stale variants, geographic caches and content negotiation may serve different revisions; a cache-busting query alone is not authority and increases reads. Reconcile discrepancy before accepting a manifest.

## Evidence thresholds before overlay publication

- Independently verified baseline origin/provenance and source/deployment identity; original archive and manifest hashes retained.
- Complete file inventory from an authentic artifact, or a reconstruction coverage matrix with owner-accepted remaining gaps. Include nonlinked assets and documented dynamic/static dependency boundaries.
- Exact protected-set manifest covers every supplied baseline file; mandatory critical routes/assets identified before validation rather than chosen to hide omissions.
- All manifest hashes/sizes match; no duplicate/traversal/symlink/private/recovery files; MIME/signature checks appropriate to each type; local supported references pass.
- Runtime URLs/external fonts/dynamic imports and hidden dependencies documented as unverified; no claim that a successful static reference check proves authenticated functionality.
- Baseline and overlay JSON digests independently approved; actual Spectre source diff/asset hashes reviewed; no Phoenix or unrelated development content imported.
- Deterministic local assembly passes; every original file byte identical except exact homepage insertion; V02 noindex/return link and untouched sitemap/homepage canonical confirmed.
- Baseline rollback artifact and candidate retained durably before upload; immediate pre-upload pinned verify and exactly one Pages artifact, with separately approved workflow/permissions/publication.
- Current main and production revision reconciled immediately before publication; intervening legitimate changes preserved.

## Hidden dependencies and limits

Sitemaps list indexable pages, not all files. A crawl misses unlinked resources, conditional routes, dynamically constructed URLs, runtime-fetched assets, old image versions, private inputs and deploy metadata. Source references miss live-only output. A 200 says only that a sampled representation was served, not that a complete site or checkout works. No public capture reconstructs database ownership/RLS, unpublished CMS/Studio drafts, private customer records, server secrets or removed-product history.

## Rollback

Keep the exact pre-overlay full artifact and its independent manifest. The assembler has no deletion support and cannot remove V02 as a rollback shortcut. A later authorised rollback must use a separately verified earlier artifact or reviewed reverse overlay mechanism, reconcile subsequent legitimate publications, and preserve retained product-image versions. Never roll back database records, reset main or replace production with stale committed dist. Archive restoration/lifecycle requirements from frozen GIGA RC07 remain a separate workstream and are not installed here.

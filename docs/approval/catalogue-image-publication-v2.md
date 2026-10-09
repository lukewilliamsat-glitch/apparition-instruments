# V2 production approval boundaries — no operations authorised by this file

Target: Supabase `acdxpxvksvdwfajntzfx`; existing GitHub repository and Pages domain.

## First approval: additive read-only view only

Exact SQL: `docs/approval/catalogue-delivery-v2.sql`.
SHA-256: `3ecfbf51934c0d750f0635a2ac798278ed9e3b56dd130bdc6c02592c85d97ece`.
Creates only `public.catalogue_delivery_v2`, in one transaction, with `security_invoker=true`, selecting the existing invoker catalogue view. Grants SELECT to anon/authenticated; revokes default privileges on this new object only. No DML, table, function, policy, foreign-key, cascade, source-image or business-record changes. No existing object replacement. A second application fails without overwriting anything; this is intentionally one-shot, not silently repeatable.

Before approval/application: confirm the exact target and SQL hash; confirm new name absent; compare existing view definition/grants/RLS and pgcrypto availability; compare all six source/asset hashes in `docs/catalogue-image-inventory-v2.json`. Unexpected differences stop the operation. Isolated PGlite/pgcrypto tests validate the exact SQL, invoker RLS, hidden/private rows, SELECT-only privileges, stock/prices and unchanged source rows. Production hash computation scans existing image values server-side; monitor CPU after eventual activation. No authenticated owner session has been used for this review.

Application remains `enabled:false`. Adding the view alone does not change storefront delivery. On failure roll back the transaction. After successful creation, leave the unused view in place for rollback; do not delete anything without separate approval.

## Separate approval: trusted image publication infrastructure and initial extraction

Not implemented or deployed. Proposed changes to existing `.github/workflows/static.yml` require review of an exact future patch/hash before approval. Retain the existing single Pages upload/deploy and concurrency lock. Do not retry a contaminated duplicate-artifact run.

Use the existing Actions runner/GITHUB_TOKEN; no browser GitHub token, no privileged browser API, no new paid service. Add only `actions:read` if required to retrieve the previous successful Pages artifact. Keep contents:read, pages:write, id-token:write; do not request repository write. A reviewed publisher must retrieve and validate the prior immutable asset archive, fail closed if retrieval fails, compare lightweight identities, and fetch `id,image` only for changed public products. Scheduled publication must not repeatedly fetch unchanged embedded images. Never use service-role credentials to bypass public catalogue restrictions.

Initial extraction is six PNGs / 8,953,356 decoded bytes, contingent on unchanged fingerprints. Use the existing pure planner/writer; never re-encode images. Match decoded SHA-256, MIME/signature and byte count. Identical bytes produce one file. Keep previous assets and versioned manifests. Package assets and manifest in one atomic Pages artifact; verify live GET hashes, HTTP status, MIME and bytes after deployment. No production image data rewrite is needed or proposed.

The product-page generator currently reads image-bearing catalogue data and writes fixed product-slug image filenames. Its later integration must reuse the validated static plan/reference data to avoid a parallel full-image read, while preserving JSON-LD, Open Graph, product pages, search and kit imagery. This future workflow/generator integration is separately approval-gated; neither existing file is changed in this preparatory release.

Publication failures must report revision, public product IDs, counts and safe error messages. No customer data or credentials in logs. Retain all old assets. No garbage collection before an approved retention policy. Artifact expiration/previous-artifact retrieval reliability is a rollout gate, not assumed solved.

## Separate approval: live cutover

Only after view and publisher pass independent live verification: review exact one-line config change `enabled:false` to `enabled:true`, its commit/hash and expected manifest revision. Validate each public image against the source identity and live bytes. Confirm new HTTP catalogue responses omit embedded images and test owner Admin upload/replacement/removal through the trusted pipeline. Require a clean deployment and mixed-version check.

During normal Admin edits the existing source image remains authoritative: upload/replace/save unchanged, removal remains null. The new metadata identity changes; unmatched/unavailable assets use a scoped legacy read, never an old image attached to a new identity. Concurrent replacement producing a third identity displays a safe placeholder until fresh metadata, without losing source data. Automatic publication runs on the existing 15-minute cadence plus queue/build/CDN latency. The owner needs no routine GitHub editing. A future status/explicit publish control can be reviewed separately; this preparation adds none.

Rollback: publish the reviewed config with `enabled:false` non-force; restore the previous manifest/artifact if required. Existing source image values and prior assets remain available. No database/image deletion is part of rollback. Cached old frontend modules have build-specific URLs; the old public catalogue view remains available throughout. Do not activate until legacy and new clients both pass tests.

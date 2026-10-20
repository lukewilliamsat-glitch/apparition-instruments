# Release readiness — PARTIAL, production prohibited

| Gate | Evidence / state |
|---|---|
| Frozen B31 provenance | PASS: exact commit/tree, 914 blobs, original files preserved |
| Node 22 compatibility | PASS: exact frozen baseline and corrected source, 8/8 final suite invocations |
| Image association/integrity | PASS in fixtures after bounded correction; source/asset hashes, MIME, size, stale identity, mapping and rollback checks |
| Generator and retention | PASS in fixtures: lightweight reads, no-image-bearing active path, legacy default unchanged, pinned history, removed/replaced assets retained, missing/corrupt history blocked, uncommitted repairs refused |
| Ordinary capture-disabled assembly | PASS in fixtures: three successive assemblies retain both versions; zero new source-image reads |
| Admin, stock, kit, basket, checkout | PASS existing synthetic contracts; protected source unchanged |
| Browser / visual / real HTTP cache | BLOCKED: supported controls cannot demonstrate required network isolation; no application page opened |
| Production compatibility and readiness | UNVERIFIED; no production service contacted |

## Ranked remaining activation risks

1. **Browser acceptance missing.** Complete actual engine, isolation negative controls, request/cache/DOM-byte behaviour, failure cases and 390/768/1440 px screenshots. The resolver's verification fetch followed by a normal image URL needs measured browser cache/served-byte behaviour; Node fixtures cannot settle it. Extra source hashing/base64 conversion also needs a realistic mobile resource assessment.
2. **Gate A — backend view compatibility.** Separate post-reset read-only approval must verify `catalogue_delivery_v2` columns, source identity representation, grants, public visibility/RLS, current fingerprints and hashing cost. Do not rerun SQL or assume the anticipated billing reset occurred.
3. **Gate B — actual durable infrastructure.** Fixture Git success is not production archive certification. Review isolated write permissions, non-force concurrency, initialisation marker plus required-archive policy, retention and restoration on every deployment regardless of capture flag. No such live workflow has been installed here.
4. **Gate C — complete publication and rollback.** Establish trustworthy complete deployment inputs and current served assets, one Pages artifact and verified rollback payload. A source tree or historical reconstruction is not current production certification. Atlas stays frozen.
5. **Gate D — commercial hosting suitability.** The previously documented GitHub Pages commercial-use concern remains unresolved. No terms reassessment, hosting migration or architecture activation occurred.
6. **Gate E — explicit production activation approval.** Separate exact deployment sequence, preservation/rollback strategy and live acceptance conditions are mandatory even after engineering acceptance.

No new database, privileged service, secret or publisher architecture is introduced. Public APIs are preserved. Canonical embedded data-URL identity is enforced consistently with the retained publisher; object-image source references remain outside its supported capture contract and require separately approved live compatibility evidence before activation.

## Scope and rollback

Application correction: `dist/backend/catalogue-image-delivery.mjs` only. New tests: `tests/blackbox32-hardening.mjs`, `tests/run-blackbox32.py`. All additional evidence is under `docs/performance/blackbox32/`. No workflow changes. B31 documentation and results remain intact.

No live rollback is needed because nothing was deployed. Keep this isolated branch or choose frozen B31 for comparison; do not rewrite either. Any future application rollback must assemble the complete current durable asset set. Image-only rollback selects a retained compatible manifest while preserving current authoritative prices/stock. Missing required history blocks assembly. Never remove newer assets, source images or durable refs to perform rollback.

The next recommended authorisation is limited to securely isolated cloud-browser acceptance of source commit `c7c6bdf565ba727426344dbe154251e387f637ae` and its recorded tests/evidence. It does not include production gates, database access, archive activation, public assets, Pages deployment or a main merge.

Production main and B31 must be independently rechecked before any next mission. No Supabase/Stripe/storefront HTTP, customer data, orders, payments, source images, database objects or production credentials were accessed or changed here. Official Node runtime acquisition and GitHub engineering operations are the only external data operations required for this acceptance. No owner-side setup or download is required.

# Future rollback baseline assessment

**Authentic static-payload baseline: YES. Tested rollback route: NO. Rollback authority: NONE.**

The retained ZIP contains the Pages-compatible `artifact.tar` envelope, the root `index.html`, 404 page, static modules/styles/images, generated product and content pages, sitemap, discovery and Operations output. It is a complete inventory of this exact publication artifact, not a complete backup of the business system. No archive corruption, unsafe types, missing sitemap target or missing static asset was found by the selected offline checks.

| Assessment | Verified evidence / limitation |
| --- | --- |
| Payload completeness | 423 files, 115 directories; all 423 paths in original upload log; independent per-file hashes match |
| Generated catalogue | Nine product detail pages; six local product-image files; three product pages need no local image file; actual HTML references resolve in the scan |
| Generated content | Successful build reports 31 CMS articles and one effective News article; archive includes hub HTML, 23 CMS presentation JSON inputs, discovery, sitemap and Operations snapshot. These counts describe different categories |
| Static assets | 236 `.mjs`, two `.js`, 41 CSS and 20 image files; no separate font files |
| Selected local-reference check | 1,506 literal HTML/module/CSS references resolve; a source-confirmed synthetic Cache API key is excluded; 20 bare/unresolved module patterns are outside this regex scan |
| Sitemap / JSON | All 70 sitemap paths exist; all 27 JSON files parse |
| Engine manifest | All 45 listed files exist. 12 archive hashes match directly; 33 differ after stamping. All 45 hashes match exact pre-stamp source and match archived text after removal of the exact build query. The inherited manifest is not an authoritative final-payload digest list |
| Build stamps | 1,238 selected module/style URL occurrences checked: 1,231 have the source stamp; seven bare-relative references in root homepage do not. Their files exist. The stamper intentionally matches slash/dot-relative URLs and therefore misses these forms; no correction made |
| Hosting compatibility | ZIP wraps a regular TAR with site files at its root and no links/special files; existing deploy-pages action reported success. No new upload, restoration or hosting compatibility test was performed |
| External dependencies | At least one archived stylesheet reference uses a remote font service. Runtime catalogue/auth/checkout/CMS/asset services are not preserved as operational services by a static archive; no external request was made |
| Configuration outside archive | Pages permissions/environment/custom domain/DNS/TLS, active deployment routing, service configuration and secrets are not restored by possession of the ZIP |

The static content is historically frozen. It must not be taken as current product price, stock, publication state, customer data, provider quota or authoritative order state. Private database records, authentication, payment processing and inventory transactions require their existing services and protections; they are not backed up or certified here.

A future separately authorised rollback must select this exact digest as its target, obtain the private original, verify its bytes, safely validate it again, and establish a supported Pages upload route and deployment identity. It should stage an isolated offline acceptance with external networking blocked, test route/module/focus/application behaviour without production credentials, assess the inherited manifest/stamp conditions, and preserve a separately verified current release before any replacement. Restoring these bytes should avoid backend-dependent regeneration, which would create a different payload. An exact re-upload and a source rebuild are different release candidates.

Owner decisions remain: whether this historical payload is the desired rollback target, whether additional private backup retention is wanted, and whether to authorise an isolated rollback rehearsal and later production release. No decision is inferred from successful preservation. No rollback, frontend integration or recovery phase follows automatically.

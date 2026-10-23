# Production Pages execution and failure boundaries

Source: main `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`; [workflow](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/.github/workflows/static.yml), blob `a43d31b3d7371d02fe016a57a19a2690ceb0ea86`. Inspected as text; no build or dispatch.

## Triggers, authority and inputs

Pushes to **main**, manual `workflow_dispatch` without inputs, and cron **`0 3 * * *`** enter the same `deploy` job. The fifteen-minute comment is stale. Cron expresses a nominal daily UTC time, not a start-time guarantee: the two latest scheduled runs started after 08:00 UTC. Environment is `github-pages`; permissions are contents:read, pages:write and id-token:write. Concurrency group `pages` has `cancel-in-progress:false`; this is not proof that queued work or outside publishers cannot interfere.

Ubuntu-latest, checkout@v4, setup-node@v4 with Node `22` and npm caching precede generation. The latest failure log reports **Node 22.23.3**; this is separate from engineering acceptance under Node 22.20.0. Action/runtime patch versions are not fully pinned. `npm ci` uses package-lock; happy-dom resolves to 20.14.5. Root package.json has no install hook, but the lock identifies an esbuild install script. Dependency retrieval/install is network-capable and was not executed or audited as an offline distribution here.

The application generators import the committed public project URL/publishable key from `dist/backend/public-config.mjs`; no workflow secret expression supplies these reads. Do not copy keys into evidence. `vars.GOOGLE_SITE_VERIFICATION` supplies an optional verification token. Pages uses GitHub's platform token/OIDC and configured environment/site settings; those settings and the effective active deployment were not independently inspected. No production credentials were accessed.

## Exact ordered job graph

The three conditional steps below use the same expression: run unless this is a **push** whose head message contains `[static-only]` or `[cms-only]`. Manual/scheduled events run them regardless of message markers.

| Order | Step / command | Condition | External dependency / output |
|---|---|---|---|
| 1–2 | checkout; setup-node | All | GitHub source; Node/npm setup/cache |
| 3 | `npm ci` | Conditional | Dependency packages/install scripts; no application generation |
| 4 | `node scripts/generate-product-pages.mjs` | Conditional | Two concurrent public GETs, then product/category HTML, images, sitemap |
| 5 | `node scripts/generate-site-operations.mjs` | Conditional | Two concurrent public RPC POSTs, then News HTML, Operations snapshot, sitemap |
| 6 | `node scripts/generate-hub-cms.mjs` | **Always** | Public CMS RPC POST, then articles/discovery/tool HTML and JSON/sitemap |
| 7 | `node scripts/prepare-search-verification.mjs dist` | All preceding steps successful | Local `dist/index.html` verification metadata |
| 8 | `node scripts/stamp-static-assets.mjs dist` | Same | Local first-party HTML/module URL build revisions using GITHUB_SHA |
| 9 | configure-pages@v5 | Same | Pages configuration |
| 10 | upload-pages-artifact@v3, path `./dist` | Same | Upload assembled complete dist tree |
| 11 | deploy-pages@v5 | Same | Actual Pages publication |

There is no `continue-on-error` release bypass. A nonzero generator exit stops downstream steps. No deployment was attempted in the latest failures. A failed job does not prove its earlier requests cost zero bytes; concurrent peers may already have run. A successful job does not, by itself, attest the complete payload currently served.

## Product generation

`scripts/generate-product-pages.mjs` → `dist/backend/public-read.mjs` and `component-data.mjs` → product model/presentation. The CLI starts these GETs together:

```text
/rest/v1/catalogue_components?select=id,sku,name,category,manufacturer,description,specs,product_content,individually,sale_price,image,stock&individually=eq.true&category=in.(potentiometers,capacitors,treble-bleeds)&sale_price=gt.0
/rest/v1/catalogue_options?select=option_set,option_key,label,aliases,active,sort_order
```

The first projection **includes image**. The options read has no active filter, ordering, row limit or pagination. `maxAgeMs:0` bypasses settled/persistent public cache; the runner is a fresh process. Transport uses apikey/Accept JSON and `cache:no-store`; it has no explicit response-body cap, request deadline, row cap or retry loop. Native redirect behaviour is not restricted by this generator.

After both reads succeed, eligible products are mapped to source IDs/prices/availability. The generator reads `dist/products/index.html` as its shell, deletes existing product subdirectories, writes each product's HTML and, for canonical base64 PNG/JPEG/WebP, decodes/writes `products/<slug>/image.<ext>`. Its **8 MiB per-image check occurs after network retrieval/JSON parsing**, so it is not a catalogue response budget. Generated references use the canonical storefront origin. It also updates the three component category pages, `dist/components/index.html` and sitemap. No production response size was sampled here.

## Operations and CMS generation

Operations CLI POSTs `{}` to `/rest/v1/rpc/get_site_operations` and `/rest/v1/rpc/public_news` concurrently, with public apikey and JSON content type. It filters public News fields/time eligibility, regenerates News index/article directories, writes `dist/operations/snapshot.json` and updates sitemap. Rendering imports `operations/model.mjs` and `news-render.mjs`; happy-dom explicitly disables CSS/script file loading and script evaluation. There are no explicit transport body/row/deadline bounds.

CMS CLI **always** POSTs `{}` to `/rest/v1/rpc/public_hub_articles`, then parses JSON. At least 22 published records, unique identities/slugs, accepted template keys, content validation and canonical checks are prerequisites. It uses committed `hub-cms/presentation/*.json`, repository guides, `luthier-hub/discovery.json` and existing route shells. Outputs include article pages, Hub index, category pages, `knowledge.json`, `discovery.json`, the three tool landing pages and sitemap. Body/schema constraints limit rendering semantics; they are not network-body ceilings. No real CMS body was inspected.

CMS stages generated outputs before replacing targets, but performs individual renames. This is not an atomic transaction across the entire site. Product/News directory regeneration is also destructive within the disposable working tree. Any failed assembly must be discarded, never reused as a trusted complete payload. Existing deployment is not replaced when upload/deploy are skipped.

## Transitive imports and local utilities

A source-only recursive import enumeration from the five script entry points resolved **62 repository modules** (including the five roots), plus `happy-dom` and Node built-ins. No application module was imported/executed. The meaningful transitive branches are:

- Product model/presentation → knowledge registry → electronics/circuit state and wiring model/session → Les Paul config → wiring-kits/kit-data. CMS render → forge-journey → the same registry branch. `kit-data` has top-level `await loadConfiguredKitDefinitions()`.
- In these ordinary Node CLIs, component/assembly repository selectors see no global `window` and choose their local in-memory seed adapters. That top-level kit load therefore does **not** add the browser's three public kit/catalogue requests in this execution context. It does introduce committed seed/configuration dependencies. Do not infer browser behaviour from that Node branch.
- Public-image adapter manifest/HEAD network functions are transitively present, but the Node seed branch does not call them; production `imageDeliveryConfig.enabled` is **false**. The product CLI uses its explicit image-bearing GET, not NIGHTFALL's retained-archive generator path.
- CMS discovery imports authoring metrics/config plus repository guide modules. These render local content; string URLs in generated links are not automatically HTTP requests.
- Verification preparation and static stamping use only filesystem/path utilities. Stamping traverses HTML/JS/MJS and rewrites first-party JS/MJS/CSS references, not CSS bodies. Their lack of backend calls does not make the enclosing workflow backend-free.

Product rendering creates happy-dom Windows without the Operations generator's explicit resource-loading disable settings, including one with the real canonical origin. Dependency defaults and any incidental shell-resource I/O have not been established as safely disabled. The five explicit Data API calls are a **known normal application call set**, not a hard whole-job network maximum. Setup/actions/npm also have their own traffic. No existing path is classified as backend-free, including marker pushes.

## Fresh historical execution evidence

| Run / source | Start UTC / completion UTC | Reached stage and result |
|---|---|---|
| [39922853022](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39922853022), main `2e3c45…` | 2026-10-23 08:10:58 / 08:11:13 | Job `120312000218`; product generator failed; `catalogue_components` 402 logged 08:11:10.3847143. Operations, CMS, verification, stamping, setup/upload/deploy skipped. |
| [39746257791](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39746257791), same source | 2026-10-22 08:14:19 / 08:14:38 | Job `119715333987`; product generator failed; `catalogue_options` 402 logged 08:14:35.5003213. Same downstream skips. |
| [38167017686](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/38167017686), `bb4ba2a932239a3ef397272b27143f0cd3adcccf` | 2026-10-11 19:12:16 / 19:12:48 | Job `114551575060`; all generation, upload and deployment steps succeeded. Latest successful Pages run observed in successful-run history. |

The first two errors differ because concurrent requests can reject in either order; this does not prove the peer request was absent or successful. They establish logged HTTP 402, not independently verified billing causation. Source `dist/` is identical between the historical success source and current main: 416 files / 94 HTML pages. Generation and stamping mean those source bytes are not the uploaded payload. [HOMECOMING_GATES.md](HOMECOMING_GATES.md) records the missing payload/rollback association.

Caching proposals must preserve current stock/checkout authority: explicit metadata/image separation, shared exact public projections, controlled successful snapshot reuse with freshness provenance, and bounded generator transports could reduce duplicate bytes. None is installed here; authenticated data must not enter public caches, and old price/stock snapshots must not silently authorise checkout.

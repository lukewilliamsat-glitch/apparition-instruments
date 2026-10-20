# Project BLACKBOX — GitHub-only traffic assessment
Date: 20 October 2026. Repository: lukewilliamsat-glitch/apparition-instruments.

## Status and scope
The seven investigation priorities in the Authorisation 29 execution addendum have been assessed using GitHub evidence and isolated synthetic tests. No application optimisation was implemented.

**Completion/publication blocker:** the original full Authorisation 29 specification and its designated research-branch name are absent from accessible conversation context. Personal Context and Library searches did not recover a uniquely identified specification; no BLACKBOX research branch appeared in the GitHub branch inventory. The clarification request returned no answer. Consequently this report does not claim completion of unseen workstreams, and no GitHub branch, commit or push was created. Do not guess the destination branch or replace the original specification with an earlier Atlas brief.

All observed production information below comes from GitHub. No Supabase, Stripe or storefront request was sent. Live service health, billing attribution, database state and actual visitor traffic remain unknown.

## 1. Verified baseline and failure
| Item | Verified identity |
|---|---|
| Main commit, before and after | 2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f |
| Main tree | eb2c9f1824602d19ed27f010cf080190a06c713e |
| Authorisation 28 handover branch | docs/apparition-reset-checkpoint-20261020 |
| Handover commit | c0c8a8f4ee65fbcfc3f800685ae1a219d992fda7 |
| Failed run / job | 39391123342 / 118522610080 |
| Run event / creation | schedule / 2026-10-20T08:07:16Z |
| Runtime in failed CI log | Node 22.23.3 |
| Local synthetic runtime | Node 24.19.0; no new runtime acquired |

**VERIFIED:** step 5, “Generate public product pages from Supabase,” ran the product generator. At 08:07:28.2592444 UTC its log reported:

> Error: Public catalogue_components is unavailable (402). No browser-local data was used. No local configuration was substituted.

The process exited 1. Operations generation, CMS generation, artifact upload and deployment were skipped. This run did not publish a replacement Pages artifact. It does not establish what the previously deployed website currently serves.

**UNKNOWN:** response-body size, gateway billing reason, plan/restriction state, response headers, actual successful response size for this filtered query and whether the parallel options request succeeded. A 402 must not be assigned the bytes of a successful catalogue response.

### Exact source-derived request
The run uses scripts/generate-product-pages.mjs at the main commit above. Its CLI invokes two reads in Promise.all, with maxAgeMs:0. The component request is:

~~~http
GET https://acdxpxvksvdwfajntzfx.supabase.co/rest/v1/catalogue_components?select=id,sku,name,category,manufacturer,description,specs,product_content,individually,sale_price,image,stock&individually=eq.true&category=in.(potentiometers,capacitors,treble-bleeds)&sale_price=gt.0
Accept: application/json
apikey: [intended public publishable key; value omitted]
~~~

Fetch uses cache:no-store. There is no Range, limit or pagination in this generator request. The parallel options request is:

~~~text
GET /rest/v1/catalogue_options?select=option_set,option_key,label,aliases,active,sort_order
~~~

This is a **source reconstruction of the request**, not a captured wire trace. The product projection is explicit rather than select=*, but still contains image. The generator bypasses the disabled static-image adapter and reads the legacy view directly. It needs embedded bytes to write existing product image files, product HTML, category links, metadata and sitemap output. No generator CLI was executed in this investigation.

### Workflow cause and request fan-out
**VERIFIED:** the sole main workflow is .github/workflows/static.yml. Triggers: push to main, manual dispatch and cron 0 3 * * *. Daily scheduling is already installed; the 15-minute comment is obsolete. Cron time is nominal: the observed run started at 08:07 UTC.

A fully successful normal build has five explicit Supabase calls in the inspected generator sequence:
1. Product catalogue GET.
2. Options GET, parallel with 1.
3. POST rpc/get_site_operations.
4. POST rpc/public_news.
5. POST rpc/public_hub_articles.

The failed run reached the first pair only. There is no automatic fetch retry in readPublicRows. Later scheduled, manual or push runs are separate executions.

Push messages containing [static-only] or [cms-only] skip dependency installation and the product/Operations steps. **CMS generation is unconditional**, so these messages do not establish a backend-independent publication route. No workflow changes or dispatches were performed.

## 2. System-wide consumers and cache boundaries
| Consumer / source | Read pattern and image involvement | Transfer sharing / limits |
|---|---|---|
| Public component/category cards, homepage commerce: components/catalogue.mjs, components/components.mjs | Top-level catalogue load; default component repository includes images. Filtering/search after loading is local. | Same exact URL and fetch object can share public cache. More imports do not necessarily mean more requests. |
| Product details: products/app.mjs | Imports the full catalogue and commerce; default detail load refreshes the catalogue, rather than fetching only selected product. Public options read adds order=option_set,sort_order,label. | Full catalogue reads can coalesce; ordered options differs from generator options key. |
| Basket and checkout: commerce.mjs, basket-ui.mjs, checkout/checkout.mjs | Commerce imports catalogue plus kit snapshot/configuration. Kit configuration starts component and kit metadata reads. Shipping is a separate commerce_shipping GET. Checkout authority remains server-side. | Catalogue often shares one identical cached read within a context. Shipping/checkout are independent operations. |
| Les Paul kit builder / choice panels: wiring-kits/kit-data.mjs | Top-level loadConfiguredKitDefinitions reads full components, catalogue_wiring_kits and kit_permitted_components. Choice panels use productRecords including images. | Three resources; component read can share with storefront catalogue. |
| Forge matching: circuit-forge/app.mjs and parts.mjs | Dedicated matching repository uses includeImages:false. | Technical projection is already image-free; do not “optimise” it a second time. |
| Forge and tool startup: knowledge/kit-project.mjs, electronics/state/project.mjs | Static imports reach Les Paul config and kit-data, which eagerly loads image-bearing catalogue and kit metadata. This affects Forge/project UI and other tools using the shared project model. | An image-free matching request does not make the complete application startup image-free. |
| Shared basket count: basket-count.mjs | Empty baskets avoid commerce. Non-empty baskets dynamically import commerce and its catalogue/kit dependencies. | Conditional; do not count a heavy catalogue read for every empty-basket informational visit. |
| Product commercial support: operations/public.mjs | When configured destinations exist, exact product-ID technical projection, without image. | Separate small ID-filtered URL; do not attribute the full catalogue body to this call. |
| Admin catalogue / inventory: backend/component-data.mjs | list() independently GETs components?select=*, inventory?select=* and component_internal?select=*, then joins them. No public cache. | Each list is three reads. Main does not contain the frozen FORGE V4 summary/detail correction. |
| Admin saves / stock | Save validates against a fresh full list. Stock update reads one inventory row, conditionally PATCHes, then lists all three tables; Admin UI lists again after successful stock update. | Write-side validation is intentional; image-heavy rereads are an optimisation opportunity, not permission to remove stock conditions. |
| Admin overview, catalogue settings, order-create, kit master and build-sheet picking | Several call componentRepository().list(), including workflows whose immediate display needs no photograph. | Separate authenticated transfers. Settings additionally reads options. Assemblies and exports must retain required full-data contracts. |
| Admin external-order picker | Explicit image-free components, inventory, assemblies and BOM projections in backend/order-data.mjs. | Already scoped; preserve this path. |
| Admin Orders and delivery history | Orders select=* with descending creation order, plus delivery audit/status rows and conditional refund-review rows. No client pagination in this path. | Potential growth risk; server-side row caps and live sizes unknown. Private, never put into public catalogue caching. |
| Shared Operations: operations/public.mjs | On public pages with a site header, initial two uncached RPCs, then visible-page polling at 60 seconds, plus known time boundaries and visibility/BFCache events. | In-flight requests coalesce within a controller. Errors schedule another cycle; no exponential backoff in main. Hidden timer ticks skip network. |
| Forge cloud: forge-pro/repository.mjs | Private project/template lists, full revision snapshots up to 200, measurements up to 500, documents up to 200; instrument-version list already metadata-only and detail lazy. | Bounded but potentially large; history is not an unbounded table download. Actual sizes/usage unknown. |
| Auth | Admin token refresh near expiry plus user/membership checks. Customer SDK auto refresh and auth-state callbacks. | No measured storm. Admin refresh lacks an explicit shared refresh promise; possible simultaneous-expiry fan-out requires observation before changes. |
| Studio and email | Studio list/preview on initialisation or explicit actions; order delivery status loads with Orders. No catalogue-image polling identified in these interfaces. | HTML/text previews have bytes, but no volume evidence implicates them as a primary source. |
| Email background automation | Committed migration defines a minute cron job, but net.http_post occurs only if eligible pending deliveries exist; dispatcher reads at most 10 pending IDs. Canary is retired in that migration. | Do not claim 1,440 Edge calls/day from the cron interval. Actual installed job/function state and invocation counts were not queried. |

**VERIFIED source coupling:** circuit-forge/app.mjs → knowledge/kit-project.mjs → les-paul-kits/config.mjs → wiring-kits/kit-data.mjs. Also forge-pro/app.mjs / treble-bleed-designer/app.mjs → electronics/state/project.mjs → the same kit configuration.

A source import graph found 28 tracked HTML files with static paths to top-level catalogue/kit read modules. This is not 28 independent requests, proof of live routes or browser acceptance. Conditional dynamic paths were recorded separately. A direct import of the actual shared project model, with fetch entirely mocked, initiated three GETs including image before rejecting intentionally empty synthetic kit definitions.

### What existing caching actually provides
**VERIFIED:** 30-second expiry; 32 entries / 20 MiB serialised public data maximum. Cache keys include public key plus exact URL and are scoped to request-function identity. Identical pending requests coalesce. Small entries may use sessionStorage; large public catalogue results may use optional Cache Storage across navigation. Session payload limits are 64 KiB per entry and 256 KiB total.

This is not a shared server/CDN cache. Different visitors, processes, wrappers, filters, projection order, expired entries and failed browser storage can result in separate reads. Two approximately 12 MB projections exceed the 20 MiB cache budget and can evict one another. Failed/non-array results are not cached. Admin writes invalidate public caches; stale stock never authorises checkout. Browser persistent-cache reuse was not exercised in a real browser here.

## 3. Attribution and historical timeline
| Service | Evidence | What cannot be determined |
|---|---|---|
| PostgREST / API gateway | Legacy catalogue JSON carries embedded image data; authenticated lists and Forge revisions use Data API. | Actual outbound bytes by endpoint or service and billing category. Do not double-count one response as separate database and gateway egress. |
| Direct database / Supavisor | Application repository does not supply session-level traffic metrics. | Query-tool, MCP, backup or development-automation downloads; bytes and actors unknown. |
| Auth | Source identifies sign-in/user/refresh paths. | Production counts, bytes, retry patterns or attack traffic. |
| Edge Functions | Source identifies checkout, order/account, preview/email and conditional dispatcher calls. | Deployed versions, invocation counts, response sizes and attributable billable traffic. |
| Storage | Source defines a business-image bucket; historical six product images are embedded in database rows. | Current Storage traffic; existence of a bucket does not prove those photos are downloaded from it. |
| Realtime / other | No application channel/postgres_changes subscription identified in reviewed non-vendor application sources. | Other clients or project-wide activity; bundled SDK capability is not evidence of active subscriptions. |

**No billing-grade egress breakdown is available under GitHub-only access.** Endpoint rankings below describe source fan-out and potential bytes, not measured production frequencies. No anonymised live logs, user agents, origins or error-rate exports were available. Automated abuse cannot be confirmed or excluded. An intentionally public key is not a privileged credential; rotating it alone would not remove oversized public responses.

| Date / GitHub evidence | Finding | Classification |
|---|---|---|
| 28 September, 0a3a6d7ff255fc952c64fce80ab711cdd626f729 | Product generation introduced with */5 schedule. Historical generator used GET catalogue_components?select=* and catalogue_options?select=*. | VERIFIED historical source |
| 29 September, 54d75821c91a0bc64555d21d4baded5db3749d99 | Five-minute schedule still present; asset stamping added. | VERIFIED historical source |
| 27 September–2 October spike | Frequent image-bearing generation is a plausible contributor after 28 September. Exact successful run count, payloads then, visitor volume and development traffic unavailable. | INFERRED, not attribution |
| 9 October, e7b68b885dc201ef99707fe1e458a18eba2ee3e7 | Public cache/technical projections and 15-minute schedule introduced. | VERIFIED GitHub history |
| 19 October, current main | Schedule reduced to daily with source-only change. | VERIFIED |
| 20 October, run 39391123342 | Product generator rejected HTTP 402 before publication. | VERIFIED |
| 24 October | Owner-reported expected billing reset, not independently confirmed service recovery. | HISTORICAL expectation |

The previously reported 13.44 GB / 5 GB allowance is not independently verified current usage. Earlier references to 506 identical requests were not corroborated with primary logs during this pass and are not used to calculate attributed traffic.

## 4. Quantitative evidence and scenario model
Historical controlled measurements are recorded in the committed V1 report, not repeated against production:

| Historical full 14-row public projection | Raw JSON bytes | Gzip response-body bytes |
|---|---:|---:|
| Image-bearing | 11,946,961 | 9,007,039 |
| Technical projection without image | 8,843 | 1,875 |

This corresponds to 99.979% less gzip body for that comparison. Headers, TLS, service overhead and billing adjustments are excluded. The V2 historical inventory records six PNGs totalling 8,953,356 decoded bytes and six content fingerprints. Those bytes/fingerprints were not revalidated in production.

### Successful-generation scenarios
Apply the historical full-response gzip size as an illustrative per-run proxy. **The current filtered generator response has not been measured; these are neither actual totals nor guaranteed bounds.**

| Successful scheduled runs/day | Cadence | Catalogue-body bytes/day | Bytes/30 days |
|---:|---|---:|---:|
| 288 | Historical five minutes | 2,594,027,232 | 77,820,816,960 |
| 96 | Historical fifteen minutes | 864,675,744 | 25,940,272,320 |
| 1 | Current daily | 9,007,039 | 270,211,170 |

Push/manual runs, options, CMS and Operations are excluded. Failed requests are not charged a successful response in this model. Daily scheduling already reduces this nominal component by 98.96% relative to 96 runs/day; this is not an additional optimisation remaining to implement.

For visitor-driven independent uncached reads, the same historical proxy gives 90,070,390 bytes per 10 reads, 900,703,900 per 100 and 4,503,519,500 per 500. A “read” is not a unique visitor or page view. Cache hits and module-import sharing must be subtracted from call counts before multiplying.

For Operations, two RPCs at initial load plus 59 minute cycles in a half-open one-hour visible session gives 120 RPCs, excluding boundary/visibility events and request duration. At hypothetical 1 KiB or 10 KiB combined data per individual RPC, 120 calls mean 120 KiB or 1,200 KiB respectively. Those sizes are sensitivity inputs, not observations. Do not compare request counts alone with the catalogue's measured bytes.

### Synthetic 14-product fixture
Six deterministic pseudo-random binary values were base64-embedded. They are not production images or a visual PNG test.

| Fixture representation | Raw JSON | Local gzip |
|---|---:|---:|
| Legacy image-bearing | 1,053,897 | 792,110 |
| Image-free summary | 5,011 | 473 |
| Lightweight identity/reference | 6,013 | 774 |

Image-field contribution is 1,048,886 raw bytes; decoded synthetic data is 786,432 bytes. A repository Admin list transferred 1,055,551 synthetic raw response bytes across three GETs. Two lists caused six GETs. Stock update plus an explicit UI-style refresh caused seven GETs and one fixture-only PATCH, including two full component responses / 2,111,167 raw read bytes total. This executes repository behaviour and models the UI's explicit list call; it is not DOM or browser acceptance.

These fixture ratios must not be extrapolated to a monthly bill.

## 5. Prioritised optimisation intelligence
Savings overlap; do not add rows together as independent opportunities. All fixes below require new implementation/publication authority.

| Rank | Proposal and evidence | Potential impact / confidence | Effort, risk and required tests |
|---:|---|---|---|
| 1 | Complete separately gated image-reference delivery, reusing frozen GIGA work rather than rebuilding it. Main adapter is explicitly disabled; browser and generator paths still carry images. | Historical 9,007,039→1,875 gzip comparison establishes dominant bytes per successful heavy read. Future view payload and real traffic unknown. High confidence mechanism; unknown monthly share. | Medium/high operational risk: asset bootstrap, durable retention, exact bytes, concurrent Admin replacement, manifest/source match, missing assets, fallback, rollback, browser cache and metadata/RLS checks. Do not activate or publish now. |
| 2 | Remove eager kit/catalogue I/O from shared project normalisation and tool startup; inject/lazily obtain catalogue only for actual commerce needs. | Actual shared-model import produced three mocked reads. Can avoid one heavy plus two kit metadata requests per uncached affected context. High confidence coupling; visit frequency unknown. Benefits overlap rank 1. | Medium effort/risk: legacy project validation, kit references, Free/Pro startup, exports, handoffs, deferred availability, outage behaviour and no accidental cached-price authority. Preserve existing saved-project schemas. |
| 3 | Separate controlled static publication from backend refresh, with verified complete deployment inputs. Ensure all generators including CMS honour the selected mode. | Removes up to five explicit API calls from a genuinely static release; current daily successful image component is only about 9 MB/day under the proxy. Reliability gain is substantial but not quantified as egress. | High deployment risk until current complete output and rollback are attested. Atlas remains frozen; historical reconstruction must not be adopted as a live baseline. No workflow patch under this mission. Test zero-network assembly and asset retention with fixtures before separately approved release work. |
| 4 | Authenticated Admin summary/detail reads plus coordinated refresh; reuse existing frozen V4 work only after reconciliation. | Main list is three uncached full reads; summary fixture 5,011 vs 1,053,897 raw. Per selected image, detail adds a read. Write-side full-list validation still exists and must be budgeted. High confidence read mechanism; total user traffic unknown. | Medium effort/risk: omitted image≠deleted, original image fetch before editing, dirty forms, selection/auth races, stock CAS, exports, order picker, assemblies and post-save authority. No private data in public cache. |
| 5 | Operations error backoff, lifecycle suspension and appropriate shared in-tab reuse without weakening fresh purchasing checks. | 120 nominal RPCs/visible hour/controller; body sizes unknown. High confidence request mechanism, low confidence billed-byte ranking. | Low/medium effort, medium business risk: pause/resume timing, announcements, visibility/BFCache, boundaries, recovery and fail-closed checkout. Do not simply cache “OPEN” indefinitely. |
| 6 | Paginate private Orders/delivery history; fetch Forge revision metadata first and snapshots on demand. | Orders path lacks client pagination; Forge can return 200 full snapshots. A hypothetical 200×20 KiB is ~3.91 MiB of snapshot content, not a measurement. | Medium effort/risk: filtering completeness, ownership, historical read-only revisions, comparison/export, immutable audit and owner acceptance. |
| 7 | Measure Auth expiry fan-out and conditional email dispatcher traffic before optimising them. | No observed storm or byte measurements. Minute cron is conditional; no evidence supports disabling email infrastructure. Low attribution confidence. | Narrow diagnostics first; preserve refresh-token semantics, recipient binding, signing, idempotency, audit and delivery eligibility. |

**Immediate recommendation before reset:** preserve the already reduced daily cadence and inactive adapter, avoid repeated failed rebuilds, and review the evidence. No configuration change is recommended under this authority. A billing upgrade decision needs current usage/plan facts and owner approval; a paid plan would not remove oversized responses.

## 6. Narrow post-reset measurement plan — approval required
Do not execute merely because 24 October arrives. Obtain explicit authorisation for this bounded read-only exercise.

1. Review existing service-level usage exports for the billing period and daily 27 September–2 October window. Request counts, bytes, decimal/binary units, cached/uncached categories and retention gaps must be recorded separately. Do not download customer rows, request bodies or secrets. Dashboard/log access is outside this mission.
2. At the then-current main, review source and allowlist at most three public GETs with no automatic retry, no redirect following and no generator execution:
   - Filtered catalogue metadata using the exact generator projection **minus image**, with limit=20.
   - catalogue_delivery_v2 selecting id,image_identity only, matching generator filters, with limit=20. Run once: its digest expression hashes stored image values and may be computationally expensive despite the small response.
   - catalogue_options with the generator's explicit fields and limit=100.
3. Hard budget: no more than three application HTTP requests total, at most 32 KiB decoded per response / 96 KiB aggregate, at most 64 KiB aggregate encoded body, 15-second timeout each, no retries. Stop on 402/401/403, schema mismatch, redirect, cap breach or unexpected row-limit saturation. Count encoded and decoded streams separately; do not call auto-decompressed length “wire bytes.” Header-declared length alone is not proof.
4. Never select image, select=*, customer/order fields or privileged resources. Use only the existing intended public key. Do not invoke email or checkout, authenticate, browse the site, dispatch Actions or activate adapters.
5. Compare row IDs and supported identity formats with preserved inventory, and record any drift without rewriting data. Schema and payload success are not permission/RLS certification.
6. Correlate existing anonymised endpoint/status/client-class counts with the new small measurements. Hash any actor identifiers with a private rotating salt; omit IPs, emails, tokens and payloads from public research evidence. Do not equate a GitHub run with a successful full response.
7. If compressed legacy bytes are still required, request a separate one-response image-bearing measurement approval with its own explicit multi-megabyte budget. It is deliberately excluded here.
8. Only after attribution, approve one small implementation milestone. No automatic Gate B, SQL, image extraction, workflow edit, deployment or restart of Atlas follows from measurement approval.

Pass: three or fewer allowlisted requests within budgets, valid image-free schemas, no forbidden endpoint, a documented service/log coverage gap statement and a revised ranking. Fail: stop, preserve diagnostics and ask for the specific additional authority required.

## 7. Tests, reproducibility and limitations
**Executed:** 19/19 synthetic scenarios on Node 24.19.0; three import-trace assertions; six process-level network-denial probes. No dependency install, runtime acquisition, existing broad suite, browser, live authentication or production API call was used.

Before tests, 490 local dist/scripts/Edge-function blobs were matched to GitHub main, then rehashed from actual bytes. Six local-only Atlas scripts were excluded. The inspected existing test harness C file was copied into the new research directory and compiled locally; it sets no_new_privs and an inherited x86_64 seccomp filter denying sockets, connect, message sends and io_uring. The probes verified IPv4/IPv6 TCP/UDP denial, synthetic-hostname DNS failure and inherited child denial; no socket descriptors were inherited. Environment variables were cleared for test execution. All application responses were injected fixtures. No app CLI or browser page was opened.

Scenarios covered concurrent and settled cache reuse, filters/projection-key differences, separate fetch functions, strict expiry, 402 and malformed-response retry behaviour, invalidation, disabled adapter, technical ID projections, shared raw/mapped reads, options-query differences, caller clones, private list/stock fan-out, authenticated no-cache behaviour, image-free fixtures and actual shared-model eager requests.

**Not established:** Node 22 compatibility of the new research scripts, persistent browser cache acceptance, real HTTP compression/caching, actual deployed frontend source, current backend schema/function versions/RLS, live billing/service health, traffic origin, malicious automation or a complete current production baseline. The CI log's Node 22 version is evidence for that failed build only.

Reproduction inputs are the exact main commit/tree, GitHub blob identities and the attached research evidence JSON. No frozen candidate or application source was modified. Local source working tree remained clean. No rollback is needed for production because nothing was published. Discarding only the new research directory would remove local outputs; do not clean any existing checkout or frozen artifacts.

## 8. Sources and durable continuation
All links below are GitHub-only evidence; they must not be treated as live-service checks.

- [Main](https://github.com/lukewilliamsat-glitch/apparition-instruments/commit/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f)
- [Failed run](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39391123342)
- [Workflow](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/.github/workflows/static.yml)
- [Product generator](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/scripts/generate-product-pages.mjs)
- [Public projections/cache](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/backend/public-read.mjs)
- [Public/Admin component repository](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/backend/component-data.mjs)
- [Kit startup](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/wiring-kits/kit-data.mjs)
- [Shared project model](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/electronics/state/project.mjs)
- [Operations controller](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/operations/public.mjs)
- [Forge repository](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/forge-pro/repository.mjs)
- [Private Orders](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/backend/order-data.mjs)
- [Historical payload evidence](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/docs/supabase-egress-optimisation-v1.md)
- [Historical six-image inventory](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/docs/catalogue-image-inventory-v2.json)
- [Inactive adapter](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/backend/image-delivery-config.mjs)
- [Reviewed identity view SQL](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/docs/approval/catalogue-delivery-v2.sql) — source is not a fresh production installation check.
- [Conditional dispatcher migration](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/supabase/migrations/20260927112500_p08b5b_global_activation.sql)
- [September generator](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/0a3a6d7ff255fc952c64fce80ab711cdd626f729/scripts/generate-product-pages.mjs)
- [September workflow](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/54d75821c91a0bc64555d21d4baded5db3749d99/.github/workflows/static.yml)
- [Reset handover](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c0c8a8f4ee65fbcfc3f800685ae1a219d992fda7/docs/handover/APPARITION_RESET_CHECKPOINT_2026-10-20.md)

**Next session:** obtain the original BLACKBOX specification and exact research branch; reconcile any additional deliverables, recheck main/ref and workflow isolation, then commit only reviewed research evidence/reports to that branch. No implementation or production operation is implied. The separate research evidence JSON preserves scripts, results, hashes, source identities and redacted log evidence without a recovery ZIP.


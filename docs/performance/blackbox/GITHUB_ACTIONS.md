# BLACKBOX — GitHub Actions traffic

Authorisation 29A · 20 October 2026 · documentation-only research.

Derived from the preserved [original assessment](BLACKBOX_GITHUB_ASSESSMENT_2026-10-20.md) and [unchanged research evidence](RESEARCH_EVIDENCE.json). Findings distinguish VERIFIED source, SYNTHETIC tests, HISTORICAL measurements, DERIVED models and UNKNOWN production usage. No new production measurements or test reruns were performed for publication.

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

## Publication isolation under Authorisation 29A
The research branch is separate from main. Visible main workflow has push branches:[main], manual dispatch and daily default-branch schedule. Documentation-only branch publication does not match the push trigger. No dispatch or workflow modification is authorised. Original helper HTTP 403 is unrelated to the GitHub workflow.


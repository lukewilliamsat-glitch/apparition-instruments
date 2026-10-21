# Next phase — prepared only, not executed

The homepage production stage is safely blocked. Do not reopen Atlas certification, deploy the CSS-only source candidate without complete payload/rollback evidence, or activate NIGHTFALL. No next mission starts automatically.

## NIGHTFALL continuity

Canonical isolated branch `engineering/blackbox34-nightfall`: commit `c3003c6a56075964f5036ea57507aed8f431b64e`, tree `e724bd72db397eccd6d3a2277d7e7ad373c5b775`. Tested source `135d2c8c6b177631c5c06358030aa610e44e322d`; [successful CI 39577122377](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39577122377). The remote ref/tree and run were rechecked; no code or branch was modified. All components below are preserved engineering, not newly production-verified:

| Preserved component | Evidence / remaining gate |
|---|---|
| Provider-neutral image bundles, origin/base path | Shared static contract and portable publication; real hosting headers and commercial terms still need verification |
| Trusted publisher and durable history | Existing capture/archive code reused; production archive/write permissions/bootstrap not installed |
| Every-deployment retention | Full historical assets/manifests must restore regardless of new-capture flag; no automatic deletion |
| SHA-256 verification and Blob leases | Demand path, four concurrent loads, 24 MiB resident/reserved, 32-entry/queue bounds; full-resolution mobile decode/memory unverified |
| Image replacement and rollback | Identity binding, historical manifests and safe placeholders; no real assets captured/published |
| Backend harness | Exact bounded plan, 25 injected-response checks; no live schema/grant/RLS proof |
| Node22 / Chrome | 13 Node suite invocations, 32 demand browser cases, seven scale/portability cases, ten isolation controls in retained evidence |

Production `image-delivery-config.mjs` remains Git blob `22d069be5d23efe764e2e38598bed611dd7a7522`, `enabled:false`. NIGHTFALL application code is absent from this main-derived release branch. See its [release gates](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c3003c6a56075964f5036ea57507aed8f431b64e/docs/performance/blackbox34/RELEASE_GATES.md).

## Paste-ready proposed backend authorisation — NOT APPROVED

> **PROPOSED AUTHORISATION — NIGHTFALL IMAGE-FREE COMPATIBILITY PREFLIGHT**
>
> Authorise one bounded, read-only application-transport preflight against Supabase project `acdxpxvksvdwfajntzfx`, only in a separately agreed recovery window. The expected 23–24 October reset is not proof of recovery or consent. Do not add a preliminary ping: the first approved request is the recovery observation. Stop on failure.
>
> Reuse the exact preserved `cataloguePreflightPlan()` and `runCataloguePreflight()` from NIGHTFALL. Independently recompute the serialized plan SHA-256 and require `bd9aca0efc68e8921150fbd0aefbce97059919f34d066d6b59c2cec9191e4f44`. Do not edit or substitute the plan. The source has no CLI/default fetch; provide only a deliberately scoped transport and the explicit approval record `BLACKBOX34_READ_ONLY_PREFLIGHT`. The code guard is not a substitute for this owner approval.
>
> Use an existing intended public publishable key, or verified legacy anon key. No privileged/service-role key, signed-in session, credentials in chat/source/logs, SQL, auth calls, customer/order/payment records or writes. Maximum **three sequential GET requests**, in the exact order below; maximum rows 20/20/100. Reaching a row limit is potentially incomplete and must fail acceptance. No pagination or fallback.
>
> Maximum body: **65,536 bytes each; 131,072 total**. Require identity/uncompressed responses so encoded and decoded body limits are bounded together; reject unexpected compression rather than estimate billing-grade wire bytes. Eight-second deadline per request (maximum 24 seconds of request deadlines), no retries or redirects, no cookies/cache reuse. Headers: approved public apikey, Accept application/json, Accept-Encoding identity. No real image values or asset downloads.
>
> Stop immediately on HTTP402/401/403, any non-200/partial/redirect, content-type/encoding mismatch, invalid UTF-8/JSON, missing/unknown/private fields, embedded image data, unsupported identities/object references, duplicate IDs, mismatched metadata/identity sets, unresolved option relationships, row/byte limit or timeout. Do not log rejected payload bodies, repair schema, widen projection or retry. Record only redacted status, row counts, response hashes/body byte counts and elapsed times.
>
> Successful responses establish sampled contract compatibility and effective public readability only. They do not establish RLS/grants/security_invoker completeness, hidden-row exclusion, database image-hash execution cost, billing cause or actual egress attribution. Any structural read-only database review, migration, image capture, deployment or activation needs separate authority. Stop and report; do not start BLACKBOX30 automatically.

Exact requests for that proposed approval:

```text
1. GET https://acdxpxvksvdwfajntzfx.supabase.co/rest/v1/catalogue_delivery_v2?select=id,sku,name,category,manufacturer,description,specs,product_content,individually,in_kits,sale_price,kit_price,kit_price_quantity,stock&order=id.asc&limit=20
2. GET https://acdxpxvksvdwfajntzfx.supabase.co/rest/v1/catalogue_delivery_v2?select=id,image_identity,image_reference&order=id.asc&limit=20
3. GET https://acdxpxvksvdwfajntzfx.supabase.co/rest/v1/catalogue_options?select=option_set,option_key,label,aliases,active,sort_order&active=eq.true&order=option_set.asc,option_key.asc&limit=100
```

These are plan text, **not executed requests**. [Original reviewed protocol](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c3003c6a56075964f5036ea57507aed8f431b64e/docs/performance/blackbox34/BACKEND_PREFLIGHT.md). Any request-byte limit is a response-body budget, not a complete TLS/header or billed-egress guarantee. Only the identity request causes the view's image-identity computation; no polling is proposed.

## BLACKBOX30 — separate attribution decision

| Evidence needed | Can establish | Cannot establish / next permission |
|---|---|---|
| Genuine project usage totals by service/day and cycle | Actual billed/measured egress concentration and spike timing, where provider exposes bytes | Requires separate scoped read-only access or owner-provided authentic aggregate export; no fabricated breakdown |
| Privacy-safe endpoint/status/time/request counts | Highest-frequency RPCs/REST paths, failed-build patterns and repeated clients | Counts are not bytes; do not retain IPs, customer payloads, JWTs or private query parameters |
| Historical BLACKBOX response observations | 9,007,039 vs 1,875 compressed response-body bytes demonstrate an image-heavy projection's cost per observed response | Historical measurements, not current billing or a visitor-count/monthly-savings forecast |
| NIGHTFALL synthetic browser scale tests | Engineering effect of demand/static resolution; 25.6 MB → 1.536 MB in a specific 500-product fixture | Not actual production/CDN transfer, native real-photo memory or billed savings |
| Future three image-free responses | Current sampled fields/types/identities, body sizes and round-trip timing | Does not attribute September spike or prove execution plans/policy completeness |
| Existing failed Actions logs | Exact generator/HTTP402 failure boundary and run cadence | Does not prove billing cause or count all development/visitor traffic |

BLACKBOX30 should reconcile provider-byte totals first, then endpoint counts and independently labelled historical/synthetic models. Stop when bytes are unavailable rather than assigning request-count proportions as bandwidth. The preflight's round-trip time is not the view's database hash cost. No service metrics, dashboard, SQL, billing settings or production endpoints were accessed here.

## Hosting release dependencies — no migration

| Dependency | Existing Pages route | Provider-neutral static target |
|---|---|---|
| Complete site input | Must recover/attest a complete artifact; current missing payload blocks release | Same complete-input requirement; changing host cannot fix provenance |
| Image addressing | NIGHTFALL supports current HTTPS origin and immutable filenames | Explicit approved HTTPS origin/base path; same manifest and source identity contract |
| Durable retention | Separate archive history and every-deployment restoration; requires isolated approved write permissions | Can reuse verified bundles/history; provider retention must be verified, not assumed |
| Deployment authority | Existing Pages/OIDC route, shared concurrency, one complete artifact | Separately approved least-privilege upload credential/integration and controlled rollback; none configured |
| Browser delivery | Real MIME, cache, CORS, paths and rollback still require verification | Same verification; no provider-specific implementation is assumed |
| Commercial suitability | Previously documented Pages suitability concern remains unresolved; not revalidated or waived in this mission | Require provider's actual commercial terms/limits/cost review before selection; no target chosen or account opened |
| Domain/TLS/cutover | Existing domain and hosting preserved | Separate reversible approval; no DNS/TLS/account changes now |

Do not introduce a second uncontrolled deploy path. No new credentials, publisher infrastructure or image archive branch were created. No asset deletion/garbage collection is proposed. Current source photographs remain authoritative and untouched.

## One recommended implementation milestone: COMMAND01

**Outcome:** find a product quickly and inspect stock, pricing and complete read-only details in one clear catalogue workbench. Implement only after separate owner authorisation, on an isolated engineering branch with synthetic fixtures and no production integration.

Reuse the existing static Admin ES-module architecture, field vocabulary and reviewed async lifecycle patterns where recoverable; do not merge a frozen FORGE candidate wholesale. Scope: searchable table, category and existing publication/eligibility filters, stock/GBP price visibility, stable selection and a read-only detail panel. Map “publication” to actual existing individually/in-kits/active semantics after source verification; do not invent a product draft/published workflow. Unloaded image data is explicit, never null/deletion authority. The current single-image contract remains.

Use injected fixture transports, no new production route or auth bypass. Acceptance: deterministic search/filter/selection, rapid reversed detail responses, empty/missing/malformed data, failure/retry, synthetic sign-out/teardown, keyboard/focus and desktop/mobile. Demonstrate browser process isolation before fixtures; preserve evidence remotely. No save, stock/price write, image upload, schema, RLS or transport-allowlist changes. Editing/publishing must not send email. No owner-side software installation or routine ZIP delivery.

Future, separately scoped enhancements: multiple images/order/alt text; general multibuy tiers; promotions/vouchers; inventory, fulfilment and shipping controls; reporting; better discovery, component imagery and product details. Existing kit_price_quantity is not a general discount engine. Server-side pricing/checkout validation, historical orders, audit and marketplace restrictions must remain authoritative. None of these enhancements is implemented here.

## Owner decision sequence

1. Review this safe block and the preserved CSS-only commit. To resume production, supply/authorise a complete authentic cloud recovery source and active-release evidence, or separately decide a controlled rebuild/adoption scope. Do not weaken the current mandatory gates.
2. The future bounded backend preflight and BLACKBOX30 remain distinct optional approvals; neither is implied by the calendar or COMMAND01.
3. For tangible new product work, approve only **COMMAND01 read-only synthetic workbench** next. Do not launch the future enhancements simultaneously.

## Canonical sources

- [Reset checkpoint](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c0c8a8f4ee65fbcfc3f800685ae1a219d992fda7/docs/handover/APPARITION_RESET_CHECKPOINT_2026-10-20.md)
- [Cloud-first policy](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/4e2bf850cf2705447f051c8a75d84c0bb5ace678/docs/engineering/CLOUD_FIRST_POLICY.md)
- [Atlas freeze](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/4e2bf850cf2705447f051c8a75d84c0bb5ace678/docs/atlas/ATLAS_FREEZE_HANDOVER.md)
- [COMMAND discovery](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/4e2bf850cf2705447f051c8a75d84c0bb5ace678/docs/command/COMMAND_DISCOVERY_HANDOVER.md)
- [BLACKBOX executive report](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/64383164a5e8ece12e7245c8b50e9dfa50f83c18/docs/performance/BLACKBOX_EXECUTIVE_REPORT.md)
- [NIGHTFALL](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c3003c6a56075964f5036ea57507aed8f431b64e/docs/performance/blackbox34/README.md)

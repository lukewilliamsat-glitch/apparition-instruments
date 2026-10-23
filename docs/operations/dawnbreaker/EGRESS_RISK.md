# Egress evidence, exposure and protection proposals

No billing/service connection was made. All current traffic volumes, current allowance and effective quota state remain **UNKNOWN**. The approximately 13.44 GB consumed against approximately 5 GB, and 24 September–24 October cycle, are historical owner context, not refreshed usage.

## Keep the measurements separate

| Evidence class | Supported observation | Limit |
|---|---|---|
| Demonstrated source behaviour | Image-bearing public reads, authenticated full lists, cold generator reads, visible-page Operations polling | Execution frequency and real response sizes not established by source |
| Historical controlled HTTP bodies | 14-row image-bearing JSON: 11,946,961 raw / **9,007,039 gzip bytes**; image-free technical comparison: 8,843 raw / **1,875 gzip bytes** | Earlier projections/date; not today's filtered generator response, headers/TLS or billed usage |
| Synthetic experiments | BLACKBOX Admin list/read fan-out; NIGHTFALL demand-image workloads and cache/lease tests | Fictional bytes/catalogues; not real photo, monthly traffic or invoice attribution |
| Possible contributors | Builds, browsers, Admin, tools, private services and unknown clients | Ranked investigation opportunities, not assigned billed totals |
| Actual billed bandwidth | Requires approved provider usage/export with units, interval, lag and accounting definitions | Unavailable in this GitHub-only mission |

The original [BLACKBOX payload report](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/64383164a5e8ece12e7245c8b50e9dfa50f83c18/docs/performance/blackbox/PAYLOAD_ANALYSIS.md) preserves the controlled measurements. Its scenario tables are historical illustrations, not a production forecast. Later lightweight measurements use different projections; do not silently substitute them for 1,875 bytes. No monthly total is derived here.

For arbitrary **hypothetical independent uncached bodies**, arithmetic sensitivity only:

| Bodies N | N × historical image-bearing gzip body | N × historical image-free gzip body |
|---:|---:|---:|
| 1 | 9,007,039 bytes | 1,875 bytes |
| 10 | 90,070,390 bytes | 18,750 bytes |
| 100 | 900,703,900 bytes | 187,500 bytes |

N is not a visitor/page/build count. Current response size has no source-proven hard ceiling, so these are not worst-case bounds. Phase B has a logical **accepted-body maximum of min(3 × 65,536, 131,072) = 131,072 bytes**; transport/accounting limitations are described in [NIGHTFALL_PREFLIGHT.md](NIGHTFALL_PREFLIGHT.md). There is no finite source-derived whole-production egress maximum without traffic and response limits.

## Why large transfers are plausible

Historical source introduced five-minute image-bearing generation, later fifteen-minute generation, then the current daily schedule. Base64 photos were inside catalogue JSON, so consumers could transfer originals even when they needed only labels/prices or displayed a few cards. Base64 encoding adds representation overhead; gzip does not turn already compressed photos into small metadata. Reducing the schedule has already happened; do not claim it as a new DAWNBREAKER optimisation.

Current-main source confirms these categories (details in the pinned [interaction inventory](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/64383164a5e8ece12e7245c8b50e9dfa50f83c18/docs/performance/blackbox/INTERACTION_INVENTORY.md)):

| Consumer | Exposure / reuse boundary |
|---|---|
| Pages generator | Filtered catalogue still includes `image`; `maxAgeMs:0`; fresh process per job. Options and three RPCs add unknown bodies. Concurrent peers can transfer before a failure. |
| Catalogue/category/home commerce and product details | Default component repository includes images; details can refresh the full list. Local search is not a query per keystroke. Exact requests can coalesce/cache. |
| Kit builder / shared tool startup | Components plus wiring kits and permissions load through kit-data. Browser registry/tool imports can reach this eager path, including when the tool's own matching query is already image-free. |
| Basket/checkout | Shared commerce/kit imports and separate shipping/Edge requests. Empty-basket informational pages can avoid the dynamic commerce path. Do not count every page as a large catalogue transfer. |
| Admin catalogue/inventory/settings/build tools | `list()` independently reads `components?select=*`, inventory and private-cost table; no public cache. Save performs a fresh list. Stock change lists afterwards and the UI can list again. Original images/private values may be in authorised reads. |
| Operations browser controller | Two uncached public RPCs at startup; 60-second visible-page refresh plus boundaries/visibility events. In-flight coalescing; errors schedule another cycle; no exponential backoff. Counts alone do not establish significant bytes. |
| Private Auth, Forge, orders, email/Edge | Independent protected traffic and bounded or growing collections exist. No evidence assigns their current share. Do not touch them speculatively. |
| Direct DB/Supavisor, Storage, unknown clients | Project-wide traffic may extend beyond this repository. A defined image bucket does not prove original product photos are currently served from it. No reviewed non-vendor Realtime subscription was identified; absence in source is not a project-wide zero-traffic guarantee. |

`public-read.mjs` provides 30-second public expiry, 32 entries / 20 MiB serialized cache, pending-request coalescing per fetch-function identity, optional persistent public storage, and session limits of 64 KiB/entry and 256 KiB total. It is not shared CDN caching or a transport limit. Different projections/filters/wrappers/processes/visitors miss; large entries can evict one another. Failed/non-array reads are not cached; no stale fallback is supplied. Writes invalidate public caches. Authenticated results must remain outside this cache.

## Proposed protection, requiring separate authority

| Priority | Proposal | Required boundary |
|---|---|---|
| Before any manual recovery request | Owner-confirmed allowance/baseline, exact mission budget, no retries/probes, account for existing cron/visitors | Phases A/B approvals; budget observation is not automatic production enforcement |
| Immediate engineering option | Temporarily pause or constrain scheduled generator exposure while recovery is assessed | **Separate production workflow authority**; no pause/disable is made here |
| Immediate engineering option | Explicit lightweight projections; avoid duplicate authenticated full-list refreshes while retaining validation and stock CAS | Separate source change/compatibility tests; protect costs/images and stale-response semantics |
| Immediate engineering option | Bound generator requests, rows, streaming body size, timeouts, redirects and release-wide attempts; fail closed | Separately reviewed workflow/transport candidate; do not dispatch a full build as a diagnostic |
| Near term | Reuse verified snapshots with revision/freshness provenance; unify identical public requests and back off noncritical polls | Price/stock freshness and server checkout authority must be preserved; no stale private caching |
| Longer term | NIGHTFALL verified immutable static images and demand loading | Backend compatibility, archive/publisher infrastructure, hosting/commercial choice, real capture and activation all separately gated |
| Commercial/operational | Provider budget alerts and escalation, hosting choice or plan change | Owner decision and service permissions; no upgrade, external account or infrastructure assumed |

## Future billed-usage measurement contract

After explicit approval, record project, cycle boundaries/timezone, allowance units, current usage, enforcement/service state, observation timestamp and provider reporting lag. Prefer owner-supplied aggregate exports. No product/customer/auth logs or raw IPs/user agents are needed for the first baseline. Retain one redacted report, not entire dashboards.

Before a bounded workload, define its request manifest, maximum attempts and accepted body bytes, observation window, abort rules, and owner-selected minimum remaining reserve. Let A be confirmed allowance, U baseline usage and R the owner-approved reserve; proceed only if the approved experiment plus explicitly accepted concurrent exposure fits A − U − R. Unknown lag/concurrent usage prevents billing attribution; a successful small response does not remove that uncertainty.

Keep actual attempts/status/body lengths/timeouts in an aggregate workload ledger; count failed and partial attempts. Obtain only separately approved, provider-supported aggregate usage by service/interval where available. Reconcile Data API, direct database, Storage, Edge, Auth and other categories using provider definitions. Do not count the same PostgREST response twice as both gateway and database egress. Distinguish decimal GB from GiB and compressed body from billed bytes.

Proposed alerts: notify at an owner-set early warning, hold experiments before the agreed reserve is crossed, and stop on any unexpected request, 402/429, body/row/timeout failure, stale baseline or unexplained material usage change. Numeric provider alert thresholds and monitoring access require a fresh decision after actual allowance/reporting delay is known. No provider alert or automatic kill switch is installed. Existing scheduled/visitor traffic remains untouched, and may resume after reset without any manual recovery request.

# Egress, catalogue and image delivery

## Distinct evidence classes

Historical GIGA V1 measurements report image-bearing public catalogue bodies of 11,946,961 raw / 9,007,039 gzip bytes versus a technical projection of 8,843 / 1,875 bytes. Historical V2 source reports 8,953,356 decoded embedded-image bytes, not a new current inventory. These are dated application/SQL/body observations, **not attribution of billed Supabase usage**. NIGHTFALL's synthetic 500-product 25.6MB→1.536MB scenario and warm-zero image transfer are isolated workload evidence, not monthly savings. The owner report of a reset and today's build do not establish current used/remaining allowance or traffic attribution.

## Current source consumer map

| Consumer | Current main dependency | Proposed or isolated change |
|---|---|---|
| Public catalogue/cards/product detail | Explicit catalogue projections; image-bearing componentColumns/productColumns via inactive image-delivery adapter | NIGHTFALL uses identity-bound metadata + verified immutable manifest/demand loading |
| Kit details/configurator/tool matching | Image-free technical/configuration projections where supported; component/configuration authority remains backend | Preserve exact eligibility and no stale stock/price fallback |
| Public read reuse | 30-second bounded memory/session/CacheStorage policy, generation invalidation after supported Admin writes | Cache is not a backend outage substitute; cross-tab invalidation does not guarantee every outside writer invalidates it |
| Admin catalogue/editor/export | Authenticated components/inventory/component_internal, original-image authority and explicit writes | COMMAND read projections exclude private cost/original images; real adapter still gated |
| Product SEO generation | scripts/generate-product-pages.mjs public catalogue/options reads; embedded sources may be extracted into per-product generated images | NIGHTFALL generator can reuse a verified retained archive, but still needs approved metadata and matching source identities |
| Operations/News | Public RPCs, same-origin snapshots and live Operations authority | Image work does not remove these backend dependencies |
| CMS generator | public_hub_articles RPC in production workflow | Unconditional in static.yml, including static-only marked main pushes |
| Checkout/stock/payment | Server-authoritative current price/stock/order operations | Never replace with cached image/SEO data; outside image-byte optimisation |
| Trusted image publisher | Pure inactive planner in main; evolved injected publisher/archive candidate in NIGHTFALL | Real extraction permissions, inventory, origin, archive lifecycle/bootstrap and host need separate approval |

Main's imageDeliveryConfig.enabled is **false**. The normal disabled path still permits image-bearing catalogue responses. Merely having catalogue_delivery_v2 SQL or a historical lightweight-view report does not activate this adapter. The review-only SQL accepts HTTPS object references while preserved Phase B requires image_reference=null; legitimate IDs/option keys may also exceed that narrower validator. These are compatibility questions, not permission to widen the preflight or change records.

## Evolved infrastructure and gates

NIGHTFALL supersedes BLACKBOX31–33's image candidate as the integration target. It binds source identity to asset hash/MIME/size, retains deterministic immutable names/manifests, verifies demand loads, bounds concurrency/cache/reservations and handles missing/mismatched sources as placeholders. Real portable archive/publisher/host bootstrap and lifecycle are not installed by isolated tests. Original Admin images remain authoritative and protected; image-only rollback is not a complete site rollback.

Safest activation sequence: exact deployed view/identity compatibility; trusted complete inventory; approved changed-image capture limits and least privilege; genuine asset/hash verification and durable private/archive retention; host/cache/CORS/TLS and bootstrap/lifecycle decisions; integrated generator/demand/cache/stock/placeholder tests; complete site payload and rollback; explicit activation/release approval and bounded live/device acceptance. A preview, public key or fixture receipt cannot grant capture/deployment rights. No image payload or current billed-egress observation was retrieved here.

The daily production build remains a possible substantial backend consumer after restoration. Its 25 October success confirms work ran, not how much quota it used. Owner must decide reserve/concurrent-exposure policy before another bounded live experiment. Any schedule pause/change or monitoring installation needs its own authority.

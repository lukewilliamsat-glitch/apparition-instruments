# Performance results

## Actual Chrome measurements

Final Chrome 155.0.8059.84, Node 22.20.0, loopback HTTPS, no request interception. Existing application pages/modules run against synthetic catalogue/kit/image responses. The eager compatibility mode and demand mode use the same fixtures on the candidate; the separate Node reference below executes the frozen BLACKBOX 32/33 resolver.

| Products / image size | Unique assets | Cold eager → demand GETs | Image body bytes eager → demand | Fewer first-viewport bytes | Metadata usable ms eager → demand | First verified image visible ms eager → demand |
| --- | ---: | --- | --- | ---: | --- | --- |
| 14 / 100 KiB | 10 | 10 → 3 | 1,024,000 → 307,200 | 70% | 468.9 → 342.3 | 545.4 → 496.0 |
| 100 / 500 KiB | 25 | 25 → 3 | 12,800,000 → 1,536,000 | 88% | 816.9 → 349.6 | 912.1 → 544.7 |
| 500 / 500 KiB | 50 | 50 → 3 | 25,600,000 → 1,536,000 | 94% | 1318.8 → 416.0 | 1542.4 → 685.5 |

All six browser scale variants had **zero additional image body transfers on warm reload**. The seventh case verified a second origin plus `/shop/v2` using unchanged source identities. Thirty-two separate browser scenarios cover valid display, filters/details/basket, replacement, rollback, stale/invalid/corrupt data, suspension/resume, navigation and responsive layouts.

“Metadata usable” is the controller-observed time until the expected authoritative fixture cards exist; “first image” includes scrolling the required card and native decoding. Neither is FCP/LCP or a production speed measurement. Byte columns count product-image response bodies only; tracked CDP values may include protocol overhead. Unrelated page assets, the unchanged large branding logo, TLS and billing totals are excluded. Offscreen images remain deferred; scrolling through all products can eventually transfer the complete asset set.

## Frozen-resolver Node comparison

`tests/blackbox34/baseline-resolver.txt` exactly matches the frozen resolver SHA-256 `0f52310bd39a66f62d393f69f355b39801a2f1e97c7d7f349eaff4f85cdc55f8`. The harness checks this before adding one post-verification timing callback to a disposable copy. Existing public-read/config dependencies are unchanged. It runs the eager reference first and the candidate second against identical injected byte transports.

| Products | Bytes/image | Unique assets | Cold reference → six requested candidate images | Reference metadata usable ms → candidate |
| ---: | ---: | ---: | --- | --- |
| 14 | 102,400 | 10 | 1,024,000 → 614,400 | 72.71 → 1.80 |
| 14 | 512,000 | 10 | 5,120,000 → 3,072,000 | 163.88 → 0.85 |
| 14 | 1,048,576 | 10 | 10,485,760 → 6,291,456 | 316.21 → 0.86 |
| 14 | 3,145,728 | 10 | 31,457,280 → 18,874,368 | 907.15 → 0.95 |
| 100 | 102,400 | 25 | 2,560,000 → 614,400 | 84.49 → 1.37 |
| 100 | 512,000 | 25 | 12,800,000 → 3,072,000 | 385.98 → 2.50 |
| 100 | 1,048,576 | 25 | 26,214,400 → 6,291,456 | 803.97 → 1.63 |
| 500 | 102,400 | 50 | 5,120,000 → 614,400 | 168.04 → 4.63 |
| 500 | 512,000 | 50 | 25,600,000 → 3,072,000 | 791.17 → 5.60 |

Three independent 3 MiB full-byte/source verifications took 295.68 ms wall time, 190.77 ms user CPU and 117.41 ms system CPU on this runner. Exact per-workload CPU, first-verification, warm-cache, RSS/array-buffer and pool counters are retained in TEST_RESULTS.json.

Node warm results measure the JavaScript verified-result cache, not HTTP caching. Browser reload tests measure actual native HTTP cache reuse: the application module/pool is recreated, verified bytes are fetched from browser cache, and the server observes zero new image bodies. In-page leases also coalesce shared image verification. No Supabase image-bearing request is permitted by the fixture transports.

## Limits and tradeoffs

The custom verified pool caps resident plus reserved body bytes at 24 MiB, entries at 32 and active verification at four. Idle URLs are evicted/revoked; active consumers retain leases. Offscreen/disposed views release leases, page suspension clears cached resources, and persisted resume reestablishes correct images. Queue or memory exhaustion fails to a placeholder; it does not fetch arbitrary/embedded substitutes. Transient hashing/base64 strings, image decoder memory and native HTTP cache are outside that body-byte ledger.

The PNGs are real 64×48 images with deterministic ancillary padding to produce 100 KiB, 500 KiB, 1 MiB and 3 MiB bodies. This measures actual transfer/hash/source-binding work, not full-resolution photograph decoding. Shared assets keep the 100/500-product matrix bounded. The current contract supports one photograph per product; no gallery was invented. JPEG/WebP full-size performance, other browser engines and physical mobile memory remain unverified.

Timings are single-run observations with JIT/order/scheduling effects, not statistical guarantees. Node RSS includes fixture allocations and garbage collection; Chrome heap values are estimates, not isolated image peaks or OS process memory. No production/CDN performance, billed egress or monthly monetary reduction is claimed. The production switch is still disabled, so this mission itself realises no production egress saving.

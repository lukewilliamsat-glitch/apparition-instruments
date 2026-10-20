# Synthetic transfer measurements

Synthetic 14-product fixture: six PNG-signature binary payloads with deterministic appended bytes; not photographs or a decoded-pixel/browser benchmark. Identical metadata semantics, with legacy image values versus lightweight source identities. Tests measure JSON UTF-8 bytes and local gzip only.

| Representation | Raw JSON bytes | Local gzip bytes |
|---|---:|---:|
| Embedded legacy response | 530,471 | 397,508 |
| Lightweight metadata and identities | 6,339 | 711 |

Separate synthetic image bytes: 393,624, served from the static origin in the model. Moving them out of Supabase does not eliminate cold browser image transfer or prove a lower monthly bill. Historical 9,007,039/1,875 gzip comparison is distinct and was not remeasured.

A valid one-image optimised read made one lightweight metadata GET, one manifest GET and one verified static image GET. Repeated in-memory cached read made zero additional request-function calls; invalidation made fresh calls. Static fetch uses force-cache but actual wire reuse is unmeasured. The actual mapped repository and raw public client share the transport/cache. No image-bearing Supabase request is allowed by any optimised fixture transport, including missing/stale/corrupt asset cases.

The generator made one lightweight metadata GET and resolved local verified assets with zero embedded image reads. Pure publisher metrics show one changed image read for replacement and zero source bytes on unchanged capture; those are fixture/planner counters, not production network observations.

See TEST_RESULTS.json for 25 named focused scenarios and six regression suite outputs, plus six process-denial probes. All tests ran on Node 24.19.0. No new image quality conversion, production measurement, billing allocation, browser cache claim or live transaction occurred.


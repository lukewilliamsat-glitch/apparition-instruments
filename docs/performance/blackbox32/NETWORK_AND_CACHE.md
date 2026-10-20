# Executed synthetic requests and unmeasured browser caching

All numbers below come from injected transports, local compression or disposable local Git/filesystem fixtures under inherited network denial. They are **not HTTP wire transfers, Supabase billing measurements or live browser/CDN cache evidence**.

## Comparable catalogue payload

The unchanged 14-product B31 representative fixture was rerun under Node 22.20.0 after correction.

| Payload | Raw JSON bytes | Local gzip bytes |
|---|---:|---:|
| Legacy image-bearing rows | 530,471 | 397,508 |
| Lightweight metadata and identities | 6,339 | 711 |

Decoded separate image bytes in that fixture: 393,624, six synthetic image bodies. These are deterministic signature-based payload fixtures, not production photographs or browser decoding/visual tests. The additional B32 red/blue fixtures are fully formed 1x1 RGBA PNGs, 70 bytes each; hashes are recorded in REGRESSION_RESULTS.json.

Historical 9,007,039/1,875 compressed-byte reports are not new measurements and are not used to claim production egress savings here. No monthly cost reduction is estimated.

## Request observations

| Fixture interaction | Metadata GET | Manifest GET | Asset GET | Embedded-image GET |
|---|---:|---:|---:|---:|
| Valid first reader | 1 | 1 | 1 | 0 |
| Repeated read inside JavaScript cache expiry | 0 additional | 0 additional | 0 additional | 0 |
| Three concurrent readers, two products sharing one image | 1 | 1 | 1 | 0 |
| Immediate repeat after failed asset | 0 additional | 0 additional | 0 additional | 0 |
| Retry after simulated 2,001 ms failure expiry | 0 additional | 0 additional | 1 additional | 0 |
| Lightweight generator with valid retained archive | 1 | Local archive | Local archive | 0 |
| Generator with missing required historical image/immutable manifest | 0 | Local validation fails | Local validation fails | 0 |

Three successive ordinary/application-rollback assemblies exported both durable image versions and matching manifests without calling the source-image fetch callback. New source-image reads: **0**. Capture-disabled assembly and image identity refresh are distinct operations; no production workflow was invoked.

The existing 30-second metadata/verification lifetime, four verification slots, bounded maps, two-second failure cache and cache invalidation remain. Asset requests retain `cache:'force-cache'`, credentials omission and redirect rejection. These directives and injected request counts do not prove real HTTP-cache reuse.

## Explicit gaps

- Actual browser metadata/manifest/asset request counts: **not measured**.
- HTTP cache hits, cold/warm navigation, image-element reuse after verification fetch: **not measured**.
- Encoded network bytes, response timing, failed/duplicate requests, resource timing and console errors: **not measured**.
- Real image decoding, DOM fetch versus verified bytes, CDN immutability/cache headers and complete production publication inputs: **unverified**.
- Browser negative-control attempts/interception logs: **not executed**; supported isolation controls unavailable.

Do not interpret zero real fixture network transfers as successful HTTP-cache behaviour: Node networking was deliberately denied and Responses were injected. Six executed process-denial probes apply only to Node and its children. No production endpoint was used as a probe or contacted during the mission.

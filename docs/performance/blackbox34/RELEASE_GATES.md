# Release gates, limitations and rollback

NIGHTFALL passes its isolated engineering scope. It is not a production certification, complete live-site baseline or deployment authorisation.

## Required production gates

1. **Actual recovery and attribution:** owner-confirmed Supabase recovery; separately approve BLACKBOX 30 traffic/billing measurements. Do not infer health or a billing reset from the calendar.
2. **Backend compatibility:** separately authorise the exact image-free plan in BACKEND_PREFLIGHT.md. Current view schema, public visibility, grants/RLS/invoker behaviour and image-hashing cost remain unverified. Stop for separate approval if a genuine database change is required.
3. **Hosting decision:** resolve commercial suitability and actual static-host behaviour. The provider-neutral bundle is ready; no provider was selected/configured or migrated here. The documented Pages suitability concern remains unresolved.
4. **Trusted publisher permissions:** approve actual isolated archive-write infrastructure, protections and independent required-archive lifecycle policy. The fixture workflow has only repository read permission; its local Git success is not production permission certification.
5. **Real assets:** approve current source fingerprints, exact initial extraction, committed durable archive and asset publication. Preserve source images and all historical versions; no garbage collection.
6. **Complete deployment and rollback input:** independently attest the complete application payload and historical image set, integrate restoration into every relevant assembly regardless of capture flags, verify served MIME/CORS/cache headers and retain a recoverable previous payload. Source history alone is not a complete database/deployment backup. Atlas stays frozen.
7. **Activation:** separately approve integration/deployment and controlled `enabled:true` plus demand mode, bounded live acceptance, error observation and rollback. Synthetic tests cannot open this gate.

The smallest next approval is the exact three-request image-free compatibility preflight after confirmed recovery. It excludes SQL, real-image reads, publisher credentials, deployment and activation. No further mission starts automatically.

## Remaining limitations

- Single-photograph contract only. No text-search control, basket photograph feature or externally loaded font fidelity was added; BLACKBOX 33's exclusions remain documented.
- Full-resolution decoding, real mobile memory, other browser engines, actual CDN cache recovery and real host headers are unverified. CPU/time/byte gains are fixture observations, not production savings.
- A custom 24 MiB body budget and bounded queue can yield placeholders under pressure. Missing IntersectionObserver also leaves catalogue placeholders rather than eagerly fetching every image. Detail demand remains explicit. These are safe failure states, not an unverified-image fallback.
- Old/corrupt/stale or unsupported source references fail closed. Late Admin edits may remain placeholders until a matching manifest is published. Do not silently restore embedded-image downloads or display a different product photo.
- There is no actual production archive, workflow integration or new secret configured by this mission. Required history must not be skipped merely because capture is disabled or an old application is restored.

## Correction history

The initial run passed Node 22 but exposed old eager-oriented browser assertions and offscreen waits. A stable observable card area, reserve height, lease suspend/resume fixtures and demand-aware checks were added. Subsequent scale bootstrap failures exposed an incomplete synthetic kit graph, first a missing definition and then default/permitted-ID inconsistency. The final fixture reuses B33's known-valid identifiers/specifications with synthetic names/prices/images, and now prevalidates all 14/100/500 workloads through the actual assembly repository and kit model. No production dependency was substituted silently. A final adversarial fixture then showed that a committed matching-byte symlink could be accepted as portable content. Read-only Git object-mode validation and filesystem type/size guards now reject it; both committed and standalone bundle symlink regressions pass. All failures and final successful reruns are linked in TEST_RESULTS.json.

## Recovery and rollback

Before production: recover branch `engineering/blackbox34-nightfall` or tested source commit `135d2c8c6b177631c5c06358030aa610e44e322d`; BLACKBOX 33 `4f8138d079f5e5598420e74f0baadb161d51ed1c` remains an independent checkpoint. The final evidence commit is a normal descendant and changes only this documentation directory. No ZIP or owner-side software setup is required.

No production rollback is currently needed. After a future separately approved cutover, disable the adapter through an approved release if necessary, while retaining the full durable image history and restoring independently verified complete site output. Never reset/force-push the archive, delete newer immutable versions or roll back business data. A compatible historical manifest selection preserves current price/stock fields; incompatible identities must remain placeholders. Any archive repair must be reviewed and committed forward before assembly. Actual rollback commands and authority belong to the future deployment package.

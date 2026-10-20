# BLACKBOX — image delivery assessment

Authorisation 29A · 20 October 2026 · documentation-only research.

Derived from the preserved [original assessment](BLACKBOX_GITHUB_ASSESSMENT_2026-10-20.md) and [unchanged research evidence](RESEARCH_EVIDENCE.json). Findings distinguish VERIFIED source, SYNTHETIC tests, HISTORICAL measurements, DERIVED models and UNKNOWN production usage. No new production measurements or test reruns were performed for publication.

## Existing state
VERIFIED source: the storefront adapter is hard-coded disabled. Public image-bearing reads continue through catalogue_components; the product generator reads that legacy view directly and bypasses cache. Original image values remain authoritative for authorised Admin editing.

HISTORICAL inventory: six PNGs total 8,953,356 decoded bytes. The prior committed inventory holds their identities and fingerprints. No image bytes were downloaded, republished or rehashed against production during BLACKBOX.

HISTORICAL body comparison: 9,007,039 gzip bytes for the full public catalogue versus 1,875 without image. This is response-body evidence, not a Storage traffic measurement or a future invoice prediction.

## Architecture assessment, not implementation
Reuse existing separately frozen GIGA design: stable product IDs, content hashes, verified immutable assets, source-identity matched manifest, durable restoration on ordinary deployments and retained prior image versions. Do not rebuild the publisher or reopen Atlas under this mission.

The browser may use a static asset only when its manifest identity matches current public metadata and asset availability/integrity is established. Admin replacements must retain the original source through partial failure; static URLs are not writable image values. Legacy fallback, concurrent replacement, corruption, capture-disabled restoration and rollback need existing gated validation.

The generator must eventually reuse approved static references instead of downloading the entire embedded image catalogue on every normal run. Initial extraction, trusted publisher permissions, asset publication and adapter activation remain separate owner gates.

## Limits
No current asset URL availability, decoded pixel parity, deployment completeness, live manifest, repository retention state, actual CDN cache headers or browser cache performance was verified. Earlier source documents contain time-specific 404 observations and later recovery observations; neither establishes current live health.


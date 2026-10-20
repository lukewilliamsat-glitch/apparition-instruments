# BLACKBOX — payload analysis

Authorisation 29A · 20 October 2026 · documentation-only research.

Derived from the preserved [original assessment](BLACKBOX_GITHUB_ASSESSMENT_2026-10-20.md) and [unchanged research evidence](RESEARCH_EVIDENCE.json). Findings distinguish VERIFIED source, SYNTHETIC tests, HISTORICAL measurements, DERIVED models and UNKNOWN production usage. No new production measurements or test reruns were performed for publication.

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

## Interpretation
Raw JSON, local synthetic gzip, historical encoded HTTP bodies, decoded image bytes, browser transfer and billed egress are different measurements. The current filtered generator response was not sampled. See FREQUENCY_MODEL.md before applying any payload value to a call count.


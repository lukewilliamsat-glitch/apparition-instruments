# Real-browser acceptance results

Executed checks: **30 PASS, 0 FAIL**. Overall requested acceptance: **PARTIAL**, for the three scope exclusions in the README. Tests executed on the exact inherited BLACKBOX 32 application, with only synthetic fixture response overrides; no candidate application defect was identified.

## Functional and failure coverage

| Area | Observed result |
| --- | --- |
| Catalogue | Fourteen synthetic products; six image-bearing records with five unique original PNGs; actual category/manufacturer filtering works |
| Image presentation | Native 64×48 decoding, alt text, positive dimensions, `object-fit:contain`, lazy attribute and correct immutable URL |
| Navigation | Actual detail route, product switching, return and revisit; correct image association |
| Basket | Actual purchase button and existing basket renderer; synthetic names, quantities/prices and text-only layout preserved |
| Concurrent consumers | Actual repository requests share the expected image association; two products reuse identical image bytes |
| Replacement | New content-addressed URL; canvas decoding confirms new RGBA `[25,185,190,255]` |
| Pinned rollback | Retained original image with current synthetic price £7.77 and stock 2, rather than restoring stale commerce metadata |
| Missing/outage | Missing manifest, 503 manifest, missing image, interrupted response and removed image produce existing placeholders |
| Integrity rejection | Corruption, equal-length corruption, invalid hash, stale identity, MIME/size mismatch and wrong product mapping fail closed |
| Reference rejection | Unapproved origin and arbitrary reference fail closed without external fetch |
| Repeat failure navigation | Missing/corrupt image revisits remain placeholders, never a different product photo |
| Boundaries | Zero unexpected destinations and zero uncaught browser errors in final run; expected deliberate-failure console messages retained |

The exact thirty case names, console messages, dimensions, phase metrics and selected original events are in [NETWORK_CACHE_RESULTS.json](NETWORK_CACHE_RESULTS.json). The final run used no real order, authentication, checkout, customer delivery or business-data mutation. Basket acceptance is not an end-to-end payment test.

## Native browser cache observations

These are actual synthetic-loopback response observations, not production/CDN measurements, billed Supabase egress or monthly savings.

| Phase | Metadata GET | Manifest GET | Image HTTP attempts | Image body bytes | Tracked body bytes | CDP encoded bytes | Cache-flagged events |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Cold catalogue | 1 | 1 | 5 | 895 | 2,664 | 4,070 | 5 |
| Warm repeat | 0 | 1 | 0 | 0 | 627 | 832 | 10 |
| Warm replacement | 1 | 1 | 1 | 179 | 2,062 | 2,672 | 11 |
| Warm pinned rollback | 1 | 1 | 0 | 0 | 1,770 | 2,181 | 10 |

Tracked scope is only `catalogue_delivery_v2` plus `/assets/catalogue-images/`; it excludes other page assets and wiring-kit responses. Cold metadata gzip is 1,142 bytes and manifest gzip 627 bytes; each synthetic PNG is 179 bytes. CDP byte values may include protocol overhead and are not TLS/billing totals. Warm metadata reuse includes the application's session cache. Independent server counts and Chrome cache flags corroborate image reuse; cache-flagged events are not unique downloaded assets.

For transparency, all fixture response bodies in those phases were respectively **2,674,344; 2,671,416; 2,673,742; 2,673,515 bytes**. They include the unchanged 2,201,238-byte branding logo and other static resources, which this fixture serves no-store. The small tracked figures must not be presented as total page weights or production browser-cache behaviour for those unrelated assets.

Important limitation: the resolver eagerly fetches all five unique image bodies for integrity checking before card rendering. The later lazy `<img>` attribute does not defer those verification transfers. This test establishes cache reuse and correctness; it does not establish a loading-time improvement or memory/CPU suitability for full-size production photographs.

## Visual and keyboard evidence

Eleven actual browser PNGs are retained in [SCREENSHOTS/](SCREENSHOTS/). Catalogue, detail and basket were captured at **390, 768 and 1440 × 1000**; two additional screenshots show correct placeholders after missing/corrupt image rejection. Original PNG bytes, dimensions, SHA-256 and Git blob IDs are recorded in the JSON. They contain synthetic product labels/data, not production catalogue photographs or customer information.

The screenshots were reviewed: cards/details retain contained image geometry, basket text remains usable and no horizontal page overflow was recorded at the three widths. The narrow native filter control truncates some labels; no unrelated UI correction was made. Keyboard Tab reaches the skip link with a solid focus outline. This is basic keyboard/visual acceptance, not screen-reader or comprehensive accessibility certification. The external-font visual limitation remains explicit.

## Retest scope

Node 22 executed the browser controller and final suite. The earlier BLACKBOX 32 focused/regression evidence remains independently preserved under `../blackbox32/`; these historical suites were not rerun merely to duplicate evidence. Full tree comparison confirmed all 926 inherited files unchanged. No new blanket claim about the entire application test suite is made.

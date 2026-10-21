# Publication safety decision

## Mandatory gates

| Gate | Result | Evidence / consequence |
|---|---|---|
| Current main and exact CSS scope | PASS | Main unchanged; CSS-only commit `ee2ca60616c61304d26b7a2f7b9ff04555337cd0`, one file changed |
| Reviewed CSS / prior visual acceptance | PASS, inherited scope | Exact SPECTRE35 bytes; [successful Chrome CI](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39583250290) |
| Complete active publication input | BLOCKED | No retained complete Pages payload or independent current inventory |
| Exact active release association | UNKNOWN | Latest successful run/logs visible; current deployment configuration endpoints unsupported |
| Backend-free production workflow | FAIL | Existing unconditional CMS CLI makes a Supabase request |
| Full prior payload for rollback | BLOCKED | Known successful artifact currently returns 404 |
| Deployment concurrency | Not exercised | Latest inspected main run completed/failed; no deployment attempt. Recheck immediately before any future publication |
| Production release / live acceptance | NOT EXECUTED | Conditional authority was not activated |

## Inspected production workflow

`.github/workflows/static.yml`, unchanged Git blob `a43d31b3d7371d02fe016a57a19a2690ceb0ea86`: push to main, manual dispatch and daily `0 3 * * *`. The old fifteen-minute comment is stale; the cron is daily. `pages` concurrency has `cancel-in-progress:false`. Permissions: contents read, Pages write, OIDC write; production environment `github-pages`.

Product and Operations generation skip for recognised push-message markers. CMS generation has no such condition; its CLI POSTs to `rpc/public_hub_articles`. This was verified in source without running it. Search Console preparation and static stamping also transform output. Therefore neither a CSS-only commit message nor untouched repository paths establish backend-free publishing or full payload completeness. Manual/scheduled runs do not take the marker bypass.

Latest inspected main run `39567549124`, job `119113386245`, failed with `Public catalogue_components is unavailable (402)`. Upload/deploy were skipped. This is log evidence, not a new backend probe or proof of the billing cause.

## Authentic artifact check — bounded

Latest visible successful Pages run `38167017686`, job `114551575060`, source `bb4ba2a932239a3ef397272b27143f0cd3adcccf`. Log: artifact `11712976121`, ZIP SHA-256 `d3e804f37e04ea25bbd5e5df3764d8ea2c2ea201f71c381f102142e1be29f3d8`, 20,301,778 bytes, retention one day; successful workflow environment URL is the public domain. Current listing is empty and one direct artifact retrieval returns 404. No repeated downloads/searches or reconstruction were attempted.

Repository source from that run and current main have identical `dist/` blobs. Their only overall source difference is the workflow schedule configuration. The source inventory is 416 files / 94 HTML pages. Generated content, stamping and deployment bytes remain unproven. Hashes in an old upload log do not recover their missing bytes.

Pages and deployments API URL attempts returned connector `400 INVALID_ARGUMENT` (endpoint allowlist), not a verified repository permission denial. Do not claim these endpoints prove current active deployment state. No browser login or alternate credential route was attempted.

## Allowed preparation, not production installation

A separate `homecoming36-validation.yml` exists only on the preparation branch. It is exact-branch push-only, path-filtered, contents-read, with no secrets, dispatch, schedule, Pages/OIDC permissions or publishing steps. Checkout does not persist credentials. It runs standard-library fixtures under inherited kernel socket/connect/send denial and uploads only test JSON. It cannot publish the website. The production workflow file remains byte-identical.

The fixture contracts in `tests/homecoming36/` do not establish provenance. They verify bytes against an explicitly supplied synthetic inventory, reject missing CMS/product/assets and unexpected files, compare protected bytes and demonstrate deterministic receipts and inverse overlay recovery. The actual release manifest deliberately retains blocked gates and null authoritative payload fields. It must never be promoted merely because fixture tests pass.

## Smallest production prerequisite

Obtain a complete authentic current publication payload plus independent inventory/digest and active-release association through an approved cloud mechanism, with an equally complete rollback copy. Alternatively, a separately authorised adoption/rebuild decision would need explicit acceptance of provenance limitations, approved backend access if essential, complete content verification and a new rollback plan. This authorisation does not adopt reconstructed Atlas bytes or widen service access.

Only after those prerequisites are met should a minimal publication-only route be designed and independently tested. Do not install a speculative bypass now. It must preserve the entire verified payload, overlay only reviewed CSS (and precisely reviewed fingerprint references if required), retain previous payloads, share Pages concurrency and reject drift before uploading exactly one Pages artifact. No new route was installed in this mission.

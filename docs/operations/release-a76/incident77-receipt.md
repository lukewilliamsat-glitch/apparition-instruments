# Operation Sentinel 77: Release A Admin incident

19 November 2026, GMT. **Contained by an application-only rollback; corrected candidate verified in isolation, not published.** Release A authenticated owner acceptance remains open. Releases B and C stay paused.

## Cause and impact

The exact 476-file Release A and 465-file rollback inventories were verified from their existing published artifacts. Comparing only the two source branch versions missed the packaging changes. In the actual packages, the rollback Admin gate imported stamped module URLs; Release A overlaid source imports without those stamps, while retained workspace files still used them. Chromium evaluates different query-bearing URLs as separate module instances. After successful membership verification, the gate populated its own repository instance, then a workspace retrieved state from a different instance. This was reproduced from the exact package over a no-cache local origin. It does not require CDN staleness or an authentication denial; the original publication's transient byte readback provides no evidence that CDN caching caused this incident.

A separate packaging rewrite replaced a single statement under an unbraced eBay-only Aftercare condition with a const declaration and statements. The resulting `customer-aftercare.mjs` failed native syntax checking and Chromium module parsing, blocking Orders import. The settled audit and replay recorded:

| Workspace | Exact Release A browser evidence |
|---|---|
| Orders list and order details, Checkout Attempts, external order form, Customer Aftercare | Gate failed after successful synthetic membership; dynamic import reached the invalid Aftercare dependency. |
| ECLIPSE and Fulfilment Cost Library | Unreachable through the failed Orders workspace. |
| Site Operations and its Commercial/eBay entry | Gate failed. The Operations repository was initialised in the unversioned module, while the retained commercial entry used a stamped copy. Rollback has a separate inverse split at the native Operations entry, reproduced against the exact old package. |
| Catalogue Settings | Gate failed when it looked for the authorised catalogue repository in a different module instance. |
| Email Template Studio | Shell opened, but workspace threw “Admin email template repository unavailable”. |
| Dashboard, Inventory, Assemblies, Maintenance, Overview, Delivery, COMMAND alias, Conjure, CMS, Media, Email Preview, Wiring Kit Master, Build Sheet, Invoice, Armoury | Authorised shell entry opened with contract-shaped fixtures. Shell entry alone does not prove every feature. The correction audit separately found a Conjure layout defect: a block skipped by the native sampler could keep a fallback placement outside the reduced measured grid. A synthetic measurement test reproduced the validator rejection at both breakpoints. |
| Circuit FORGE, storefront, components, product detail, checkout | Covered as preservation checks in the correction suite. |

## Containment and rollback

Cloudflare project `apparition-instruments` was moved from `17e4c767-75da-4e2c-8505-892a56713f0f` back to approved deployment `41fab337-e7df-499f-9292-fef300e46fe7`, source `783a30a0523c11625f1d07a806dda51e4c66ae48`. The provider canonical ID was independently re-read; the homepage, checkout, Admin, Orders, Site Operations, Email Templates, Armoury and Operations snapshot independently served byte-exact old files. Synthetic authorised rollback control opened Orders, Admin, Catalogue Settings and Email Template Studio; it reproduced the older Site Operations problem, so containment is partial. Rollback source artifact `14327320952`, SHA-256 `52f876edfba409ef1442eceae9a283b0024b53f2a195711f43113b0d6dd43cfe`.

Kept all four approved additive migrations and checkout Edge v16, digest `22732f6a3f48ea243b69524a721b7b2bd7dc7205453dec5b8450b6f9c464de14`; no database or Edge rollback was needed. Checkout production-origin preflight returned 204. Transactional Email and Stripe Webhook stayed v15. A bounded production read confirmed the expected contract fingerprints, Operations OPEN, Aftercare Direct off, and UK tariff 399p with free delivery from 5000p. No orders, payments, email or business records were created or altered in testing.

## Exact correction and evidence

Source `0f8ea5e42519f57221df62ed08d4168548391530`, isolated [acceptance run 44559817826](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44559817826), completed successfully at 15:54 GMT. The composer applies one versioned URL per local Admin graph asset, restores valid conditional Aftercare-off messaging and retains the full visible placement extent when measuring Conjure. The gate logs only the startup phase, without error values, identities or tokens. Extent validation, Auth and permission checks remain in place.

Candidate artifact [14545793854](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44559817826/artifacts/14545793854). The deployed unit would be its inner `release-a77-candidate.zip` SHA-256 `27181e8e32c5014b356af88174a7c347d7f85a414bc80011699e098670b30c2f`, not the GitHub outer ZIP. Inventory SHA-256 `716948f419cf17fb8c7c92d4f8647898e7c796b46dd413aabc0f57214df2991e`, 476 files. Of 133 changed files, 130 changed only in version-query identity and three had code changes (Admin gate, Aftercare panel and Conjure native layout). All non-Admin HTML, checkout code, basket UI, storefront entry and Operations snapshot retained Release A bytes. The independently downloaded inner ZIP was byte-identical to the locally composed candidate. All 276 JavaScript modules parsed.

[Browser evidence artifact 14546932045](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44559817826/artifacts/14546932045) confirms 30 successful journeys (24 Admin plus six public/checkout) and 12 access denials. No application exceptions, script parse errors, failed local requests or unexpected write attempts in the corrected run. Isolation intentionally blocked external fonts and absolute production static URLs; no tests sent a live checkout or email. Browser checks exercised authorised repository requests, navigation, OPEN Operations, delivery settings, checkout quotes £3.99 and free above the threshold, order date history and cancel, ECLIPSE advanced reconciliation, Fulfilment Cost Library, Aftercare Direct off with manual preview present, four email templates and Email Preview, Conjure's mounted frame, and existing catalogue and tools. This does not substitute for a real owner sign-in on the published correction.

## Shortest safe release path

Review this exact candidate and evidence. After production publication is authorised, guard on canonical `41fab337-e7df-499f-9292-fef300e46fe7`, explicitly verify the inner ZIP and inventory, and publish only those static bytes. Do not reapply migrations or deploy Edge code. Verify the new canonical ID and public package, then repeat the authorised owner walkthrough of Orders, Site Operations, Catalogue Settings, Email Template Studio, Delivery and ECLIPSE without writing fixture data. Retain the current rollback deployment if containment is necessary again. Record the owner result before resuming Release A acceptance or planning B/C.

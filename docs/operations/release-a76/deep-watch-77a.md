# SENTINEL DEEP WATCH · Release A incident record · 19 November 2026

**Correction passed isolated acceptance. Production remains on the partially effective rollback.** No application publication, Edge deployment, migration, permissions change or business write was performed. GRAND ASCENSION and Releases B and C remain paused. No P0 defect was found within the paths tested.

## Actual production and immediate rollback

Cloudflare reported canonical deployment `41fab337-e7df-499f-9292-fef300e46fe7` from `783a30a0523c11625f1d07a806dda51e4c66ae48`. Failed Release A `17e4c767-75da-4e2c-8505-892a56713f0f` is historical, not canonical. Forty-four independent responses from the public domain matched the rollback bytes, covering Admin entries, Admin gate and Operations module URL variants, storefront routes and an image. No mixed bytes were observed in those requests. The failures also reproduced with caching disabled, so CDN caching is not needed to explain them. The connected browser was unavailable from this session; nothing in this record asserts what an individual owner browser cached or proves an authenticated live Admin session.

The complete immediate static rollback is [artifact 14327320952](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44086149319), 465 files, ZIP SHA-256 `52f876edfba409ef1442eceae9a283b0024b53f2a195711f43113b0d6dd43cfe`; its inventory is `9cb89a3d9b5db7b0bfc5fe5698980b2d2bb7549b635907663595a14741a793c7`. It remains the containment rollback, with the B limitations recorded below.

Bounded read-only production checks on project `acdxpxvksvdwfajntzfx` verified:

- Operations OPEN. Effective postage quote 399p at 4999p and 0p at 5000p. New Delivery rates and Aftercare Direct off; existing transactional mail enabled. No live Commerce promotions, full IRONCLAD or Omniscience activation. The earlier BLACK LEDGER functionality remains in the rollback.
- The four additive Release A migration entries are installed: `20261119130030`, `20261119130043`, `20261119130052`, `20261119130058`. Matching read-only contract fingerprints: checkout `ba4bf95a75a64036cb04f280be006d92`, external orders `df2e46524aba50edb6140f4eb87d3f3e`, inventory `9d1c421b855ded51ce681ec46cf32a13`, finance validator `289cf4e98092b59ab9b51d5aa0f1bb34`. A bounded recent-order metadata sample returned counts only: 34 rows, zero malformed item arrays or missing/non-object item snapshots.
- Edge functions active: checkout v16, Stripe webhook v15, transactional email v15, my-orders v5, checkout-status v10, contact-enquiry v3, sync-order-contact v8, SMTP diagnostic v4, send-legacy-confirmation v2. Version/status checks are not evidence of new live payments or messages.
- RLS was enabled on reviewed private tables; anonymous access was not granted to protected Orders, Inventory, Admin, financial, template or Operations data. Public projections remain intentional. Ten guarded reads were denied in read-only tests: five endpoints (date history, Delivery Admin, fulfilment cost library, financials and templates) tested both without authentication and with authenticated-role context lacking Admin membership. No production customer record content was retained in this evidence.

Production checks did not poll or load catalogue image payloads. No egress regression was measured. A known singleton alias can execute duplicate work but no production transfer increase was attributed to it. Existing broad Orders refresh remains a potential scale follow-up, not a newly established incident cause.

## Exact baseline and acceptance comparison

| Label | Complete composition | Allowed Admin shells | Finding |
| --- | --- | ---: | --- |
| A | Release A artifact `14329886408`; 476 files; outer ZIP `ac7b361723c2eea4b75fb4b9c6827ae542ae36c7a8f6bcdf2b84c0365f6ea023` | 19/33 | Split Admin repositories and invalid Aftercare module syntax. Email Studio could fail after its shell opened. |
| B | Canonical rollback artifact `14327320952`; 465 files | 26/33 | Orders initially available, but no fresh read after re-sign-in; Operations and linked sections still failed. Two Delivery journeys are absent by design. |
| C | Previous candidate `0f8ea5e42519f57221df62ed08d4168548391530`; artifact `14545793854`; 476 files; inner ZIP `27181e8e32c5014b356af88174a7c347d7f85a414bc80011699e098670b30c2f` | 33/33 | Initial Admin boot restored. Re-sign-in still stale, and three public paths resolved the same repository at two URLs. |
| D | Deep Watch candidate below; 476 files | 33/33 | 58 authorised/public functional journeys, 99 named depth checks, 24 permission and session cases, 9 native lifecycle groups plus the Conjure regression. Re-sign-in proved a new protected Orders fetch. |

The [comparative browser run](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44562968152) ran 53 journeys per baseline using the actual composed historical packages. The [final browser run](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44564484251) used the exact sealed D bytes. D's separate Admin checks exercised anonymous, signed-in nonmember, expired/rejected refresh and successfully renewed sessions on six routes each. Tests captured unexpected console/page errors, failed local loads, rejected promises and unexpected writes. D had none; deliberately injected Orders failure and unavailable browser-local maintenance sample were checked explicitly. A/B/C shell counts do not imply feature coverage. An unmet early probe is kept separate from a proven defect: some historic probes had incomplete fixture data or targeted the wrong control. The D suite corrected those probes and asserts actual data, dialogs, state changes, or safe denial.

The local JavaScript audit parsed every shipped JS file and followed HTML entry roots, static imports and literal dynamic imports with case-sensitive resolution and export linking. The observed runtime covered boot-selected modules not represented by a literal path. D checked 278 files, 100 HTML entries and 972 dependency edges, with no syntax, missing local files, link errors, cycles or duplicate known singleton identities in that graph. A had one syntax fault and 1,034 edges; B, 927 edges and two audited Admin singleton alias entries; C, 974 edges and three public singleton alias entries. The evidence includes exact route closures and browser event outcomes; it does not establish coverage of arbitrary unexecuted runtime paths or third-party services.

## Defect register

| ID and severity | Reproduction, affected scope and expected behaviour | Root cause, correction and evidence | Remaining risk / production impact |
| --- | --- | --- | --- |
| DW-01 · P1 | Mount A through the real gate with a synthetic Admin session. Catalogue Settings and associated Operations dependencies fail; Email Studio can open its shell without loading its workspace. Registration should feed the same repository invoked by its consumer. | The A overlay gave shared modules distinct browser URLs, with and without `?build=`. The gate registered one instance while affected consumers invoked another. C and D align the references; graph and Chromium cover Catalogue Settings and template edit/preview and cancellation. | Release A package must not be redeployed. D verified in isolation. |
| DW-02 · P1 | In A open Orders and its details, Checkout Attempts, external orders, Customer Aftercare, ECLIPSE and Fulfilment Cost Library. All should load after auth. | The packaged `customer-aftercare.mjs` contained a lexical declaration under an unbraced `if`. Parsing the transitive dependency failed before mount. C/D fix the declaration, retain the disabled Direct path and pass the actual Orders family import and functional checks. | Do not use HTTP 200 as a substitute for execution. Live Direct sending remains disabled. |
| DW-03 · P1 | Open B Site Operations, eBay/commercial or News view. An authorised user should see OPEN status and working sections. | B already used mismatched versioned vs unversioned Operations repository imports in the gate and workspace. A also splits the instance. C/D use the same identity; Chromium exercises OPEN state, commercial list and unsent News preview. | This is why rollback did not restore all workspaces. Still present in canonical B. |
| DW-04 · P2 | In synthetic Conjure measured layout skip a visible block whose fallback placement lies beyond a newly shortened extent. All retained blocks should remain in bounds. | The sampler shortened the extent despite retaining a fallback placement. C/D preserve the needed extent; native geometry regression and browser mode/preview checks pass. | No independently confirmed owner-visible occurrence; isolated reproduction only. |
| DW-05 · P1 | In B/C load Orders, sign out through the UI, sign back in without an independent reload. After the verified sign-in, fresh protected data should load. | App modules that start on evaluation stayed evaluated for the document lifetime. The gate opened again without a new Orders request. D reloads only after verified interactive sign-in when that document already attempted workspace startup. Normal Auth and membership checks are reapplied before fresh mount. It records distinct safe import and mount failure stages. Native and Chromium tests pass; Chromium requires a fresh protected fetch. A Orders is already blocked and this symptom was not tested there. | Still applies to canonical B. Owner session behaviour after publication remains to be checked once. |
| DW-06 · P3 | Trace C landing and builder graphs at `/les-paul-kits/`, `/wiring-kits/` and `/wiring-kits/build/`. One shared assembly repository should resolve once per document. | Partial version stamping gave the landing/builder and the family repository different module URLs. D aligns the family repository and shell/entry references and propagates touched URLs. The graph and Kit Builder journeys pass. | Confirms a latent duplicate, not a confirmed customer outage or egress increase. C was never published. |

## Immutable candidate and file delta

| Item | Identity |
| --- | --- |
| Candidate source | `a50dfb712ddd6420d648f6388bd6702f4566713c`; tree `6ab60c99c4ae1ca52a1ea8c68ea14f53eb1ad671` |
| Exact package | [Artifact 14552190395](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44564484251/artifacts/14552190395); 476 files |
| Download wrapper SHA-256 | `2471ba75da48ee4084932f3ab7963dd9e851ada73e65803d6199377cf8db5e11` |
| Inner release ZIP SHA-256 | `4c092c6e51d30e180c244c245cc25878fa5d29ae006e589bdcb3456890ea3810` |
| Composition manifest SHA-256 | `b07789ba58f28eef5492a16a4b3aa9f43e470728cfc57f25e3e92ccd62fd3bab` |
| Static inventory SHA-256 | `2856d9ab919d1c0ed0a10981d4d3a237abfc297e7eb09c03b98046b5fa3b8eb8` |
| Full acceptance evidence | [Artifact 14552030893](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44564484251/artifacts/14552030893); SHA-256 `edc00d83feea0fad1e4f15563dcf80bfc22d682c38cf3d7b9c4ba86b07f2a51d` |

Both final downloads were independently read back and their hashes checked. The evidence contains the all-file inventory, 139 revised files versus C and 140 versus A with reasons, closures for all four baselines, browser permission outcomes and per-journey assertions. The meaningful new runtime logic versus C is in the Admin gate; other application deltas align changed module URLs and their consumers. The artifacts are short-lived. Preserve the exact accepted ZIP and evidence before expiry, or reconstruct the identical bytes from the pinned inputs and verify every listed hash before requesting publication.

## Release control and remaining verification

Release A's earlier publication checks established asset availability and identity but did not execute the final composed package through successful Admin membership and workspace boot. Source checks alone could not detect a malformed module introduced during composition or two URL instances of an otherwise valid module. The isolated Deep Watch workflow now seals the candidate before testing and gates on syntax, dependency closure, identities, native auth lifecycle, Chromium workspace and public journeys, permission failures and unexpected writes. Publish only the resulting tested bytes; served-byte checks and an authenticated walkthrough are distinct acceptance steps.

The tests use synthetic production-shaped sessions and repository responses. Some representative writes run only against those fixtures; customer payments, outbound email, production mutations, complete provider-backed lifecycles, all desktop/mobile combinations and availability under real sustained load were not tested. The responsive navigation probe covered a 390 px mobile viewport plus desktop; this is not every mobile state. Existing backend contract and denial checks support compatibility, but no legitimate Admin read was verified live during this pass. The absent routes and capabilities recorded as disabled are release boundaries, not defects.

**Shortest path to production, after separate exact publication approval:** recheck Cloudflare canonical B and its complete rollback; guard the current deployment identity and target production; publish only D's verified static ZIP; confirm canonical deployment and served file identity; check storefront, imagery, checkout preview below and at threshold, and OPEN status. Leave existing schema, checkout Edge v16, webhook, mail, tariffs and all disabled features as they are. Restore B by deployment identity if a material regression occurs, with no database rollback.

**Single authenticated owner walkthrough after publication:** open the normal Admin once with the existing session. Check an existing order, commercial date history and ECLIPSE read-only; open Fulfilment Cost Library, Catalogue Settings, Email Studio, Site Operations/Commercial, then Delivery and the active legacy tariff. Do not save, create, send or pay. If anything still fails, report the first route, local time and the displayed message. This is enough to correlate the specific live boot stage; no browser-console script, credential sharing, repeated sign-ins or whole-suite owner rerun is needed. Keep GRAND ASCENSION and Releases B and C paused until D is published and authenticated production acceptance is recorded.

## Route matrix legend

Fixtures and query probes are isolated test cases. “Functional” is the behaviour named, not all actions in that workspace. “Blocked at gate” refers to a failure during post-authorisation boot where the fixture identity and membership were valid; it does not imply access was denied. “Shell only / probe unmet”, “partial” and “test incomplete” are limited evidence, not new defects.

## Admin matrix

| Route | A: failed Release A | B: production rollback | C: first correction | D: Deep Watch candidate |
| --- | --- | --- | --- | --- |
| `/admin/` | Functional: inventory-rows-search-reset, component-editor-cancel | Functional: inventory-rows-search-reset, component-editor-cancel | Functional: inventory-rows-search-reset, component-editor-cancel | Functional: inventory-rows-search-reset, component-editor-cancel |
| `/admin/?view=assemblies` | Functional: assembly-data | Functional: assembly-data | Functional: assembly-data | Functional: assembly-data |
| `/admin/?view=inventory` | Functional: inventory-rows-search-reset, component-editor-cancel | Functional: inventory-rows-search-reset, component-editor-cancel | Functional: inventory-rows-search-reset, component-editor-cancel | Functional: inventory-rows-search-reset, component-editor-cancel |
| `/admin/?view=inventory&probe=mobile` | Functional: inventory-rows-search-reset, mobile-navigation | Functional: inventory-rows-search-reset, mobile-navigation | Functional: inventory-rows-search-reset, mobile-navigation | Functional: inventory-rows-search-reset, mobile-navigation |
| `/admin/?view=inventory&probe=stock` | Partial: inventory-rows-search-reset | Partial: inventory-rows-search-reset | Partial: inventory-rows-search-reset | Functional: inventory-rows-search-reset, stock-tab-and-cancel |
| `/admin/?view=maintenance` | Shell only / probe unmet | Shell only / probe unmet | Shell only / probe unmet | Functional: maintenance-actions |
| `/admin/catalogue-settings/` | Blocked at gate | Functional: manufacturer-reference-guard | Functional: manufacturer-reference-guard | Functional: manufacturer-reference-guard |
| `/admin/command/` | Functional: inventory-rows-search-reset, component-editor-cancel | Functional: inventory-rows-search-reset, component-editor-cancel | Functional: inventory-rows-search-reset, component-editor-cancel | Functional: inventory-rows-search-reset, component-editor-cancel |
| `/admin/conjure/` | Shell only / probe unmet | Shell only / probe unmet | Shell only / probe unmet | Functional: conjure-frame-and-mode |
| `/admin/delivery/` | Functional: legacy-tariff-and-draft | Absent by design before Release A | Functional: legacy-tariff-and-draft | Functional: legacy-tariff-and-draft |
| `/admin/delivery/?probe=non-live-draft` | Shell only / probe unmet | Absent by design before Release A | Shell only / probe unmet | Functional: legacy-tariff-and-draft |
| `/admin/email-preview/` | Functional: preview-different-email-type | Functional: preview-different-email-type | Functional: preview-different-email-type | Functional: preview-different-email-type |
| `/admin/email-templates/` | Workspace error | Functional: select-template-preview-cancel-dirty | Functional: select-template-preview-cancel-dirty | Functional: select-template-preview-cancel-dirty |
| `/admin/hub-cms/` | Functional: cms-library-filter-and-open-draft | Functional: cms-library-filter-and-open-draft | Functional: cms-library-filter-and-open-draft | Functional: cms-library-filter-and-open-draft |
| `/admin/hub-media/` | Functional: media-template-state | Functional: media-template-state | Functional: media-template-state | Functional: media-template-state |
| `/admin/ironclad/` | Functional: calculator-line-and-estimate | Functional: calculator-line-and-estimate | Functional: calculator-line-and-estimate | Functional: calculator-line-and-estimate |
| `/admin/orders/` | Blocked at gate | Shell only / probe unmet | Functional: order-list-search-sorting | Functional: order-list-search-sorting |
| `/admin/orders/?id=<synthetic-order>` | Blocked at gate | Functional: order-detail-initialisation | Functional: order-detail-initialisation, existing-financial-revisions | Functional: order-detail-initialisation, existing-financial-revisions |
| `/admin/orders/?new=external` | Blocked at gate | Functional: external-order-form-and-available-product | Functional: external-order-form-and-available-product | Functional: external-order-form-and-available-product |
| `/admin/orders/?probe=backend-error` | Blocked at gate | Functional: visible-repository-failure | Functional: visible-repository-failure | Functional: visible-repository-failure |
| `/admin/orders/?probe=empty` | Blocked at gate | Functional: empty-orders | Functional: empty-orders | Functional: empty-orders |
| `/admin/orders/?probe=session` | Blocked at gate | Shell only / probe unmet | Shell only / probe unmet | Functional: sign-out-and-sign-back-in |
| `/admin/orders/?view=aftercare` | Blocked at gate | Functional: aftercare-queue-filter | Functional: aftercare-queue-filter | Functional: aftercare-queue-filter |
| `/admin/orders/?view=attempts` | Blocked at gate | Functional: checkout-attempts-filter | Functional: checkout-attempts-filter | Functional: checkout-attempts-filter |
| `/admin/orders/build-sheet/?order=<synthetic-order>` | Functional: build-sheet-saved-kit | Functional: build-sheet-saved-kit | Functional: build-sheet-saved-kit | Functional: build-sheet-saved-kit |
| `/admin/orders/invoice/?id=<synthetic-order>` | Functional: invoice-historical-order | Functional: invoice-historical-order | Functional: invoice-historical-order | Functional: invoice-historical-order |
| `/admin/overview/` | Functional: overview-and-linked-workspaces | Functional: overview-and-linked-workspaces | Functional: overview-and-linked-workspaces | Functional: overview-and-linked-workspaces |
| `/admin/site-operations/` | Blocked at gate | Blocked at gate | Partial: open-state-and-commercial-list | Functional: open-state-and-commercial-list |
| `/admin/site-operations/#announcements` | Blocked at gate | Blocked at gate | Partial: open-state-and-commercial-list | Functional: open-state-and-commercial-list |
| `/admin/site-operations/#commerce-offers` | Blocked at gate | Blocked at gate | Partial: open-state-and-commercial-list, commerce-intentional-hold | Functional: open-state-and-commercial-list, commerce-intentional-hold |
| `/admin/site-operations/#commercial-destinations` | Blocked at gate | Blocked at gate | Partial: open-state-and-commercial-list | Functional: open-state-and-commercial-list |
| `/admin/site-operations/#news` | Blocked at gate | Blocked at gate | Functional: open-state-and-commercial-list, news-edit-preview-no-write | Functional: open-state-and-commercial-list, news-edit-preview-no-write |
| `/admin/wiring-kit-master/` | Shell only / probe unmet | Shell only / probe unmet | Shell only / probe unmet | Functional: wiring-cost-stock-projection |

## Public matrix

| Route | A: failed Release A | B: production rollback | C: first correction | D: Deep Watch candidate |
| --- | --- | --- | --- | --- |
| `/` | Functional: homepage-render | Functional: homepage-render | Functional: homepage-render | Functional: homepage-render |
| `/account/` | Functional: customer-signed-out-navigation | Functional: customer-signed-out-navigation | Functional: customer-signed-out-navigation | Functional: customer-signed-out-navigation |
| `/account/?fixture=customer` | Not run in initial matrix | Not run in initial matrix | Not run in initial matrix | Functional: customer-owned-order-list |
| `/account/order/` | Functional: missing-order-fails-closed | Functional: missing-order-fails-closed | Functional: missing-order-fails-closed | Functional: missing-order-fails-closed |
| `/account/order/?reference=AI-099901&fixture=customer` | Not run in initial matrix | Not run in initial matrix | Not run in initial matrix | Functional: customer-owned-order-detail |
| `/basket/` | Functional: basket-render-no-checkout | Functional: basket-render-no-checkout | Functional: basket-render-no-checkout | Functional: basket-render-no-checkout |
| `/checkout/` | Functional: eligible-basket-to-delivery-without-payment | Functional: eligible-basket-to-delivery-without-payment | Functional: eligible-basket-to-delivery-without-payment | Functional: eligible-basket-to-delivery-without-payment |
| `/checkout/?fixture=free-delivery` | Functional: eligible-basket-to-delivery-without-payment | Functional: eligible-basket-to-delivery-without-payment | Functional: eligible-basket-to-delivery-without-payment | Functional: eligible-basket-to-delivery-without-payment |
| `/checkout/success/` | Functional: order-status-or-safe-missing-session | Functional: order-status-or-safe-missing-session | Test incomplete | Functional: order-status-or-safe-missing-session |
| `/checkout/success/?session_id=<synthetic-session>` | Functional: order-status-or-safe-missing-session | Functional: order-status-or-safe-missing-session | Test incomplete | Functional: order-status-or-safe-missing-session |
| `/circuit-forge/` | Functional: circuit-forge-layout-and-tools | Functional: circuit-forge-layout-and-tools | Functional: circuit-forge-layout-and-tools | Functional: circuit-forge-layout-and-tools |
| `/circuit-forge/projects/` | Functional: forge-project-access-entry | Functional: forge-project-access-entry | Functional: forge-project-access-entry | Functional: forge-project-access-entry |
| `/components/` | Functional: components-catalogue | Functional: components-catalogue | Functional: components-catalogue | Functional: components-catalogue |
| `/contact/` | Functional: contact-entry-no-mail | Functional: contact-entry-no-mail | Functional: contact-entry-no-mail | Functional: contact-fixture-validation-and-simulated-success |
| `/interactive-tools/` | Functional: public-content | Functional: public-content | Functional: public-content | Functional: public-content |
| `/les-paul-kits/` | Not run in initial matrix | Not run in initial matrix | Not run in initial matrix | Functional: kit-builder-selection-or-missing-family-guard |
| `/news/` | Functional: public-content | Functional: public-content | Functional: public-content | Functional: public-content |
| `/privacy/` | Functional: public-content | Functional: public-content | Functional: public-content | Functional: public-content |
| `/products/bleed-cap/` | Shell only / probe unmet | Shell only / probe unmet | Shell only / probe unmet | Functional: product-route-and-image |
| `/terms/` | Functional: public-content | Functional: public-content | Functional: public-content | Functional: public-content |
| `/treble-bleed-designer/` | Functional: designer-graph | Functional: designer-graph | Functional: designer-graph | Functional: designer-graph |
| `/wiring-generator/` | Functional: wiring-diagram-output | Functional: wiring-diagram-output | Functional: wiring-diagram-output | Functional: wiring-diagram-output |
| `/wiring-kits/` | Not run in initial matrix | Not run in initial matrix | Not run in initial matrix | Functional: wiring-kit-family-catalogue |
| `/wiring-kits/build/` | Shell only / probe unmet | Shell only / probe unmet | Shell only / probe unmet | Functional: kit-builder-selection-or-missing-family-guard |
| `/wiring-kits/build/?family=les-paul` | Not run in initial matrix | Not run in initial matrix | Not run in initial matrix | Functional: kit-builder-selection-or-missing-family-guard |


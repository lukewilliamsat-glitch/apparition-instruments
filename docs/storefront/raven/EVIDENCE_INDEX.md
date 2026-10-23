# RAVEN evidence index

Authorisation44, 23 October 2026. GitHub/source-only audit plus existing evidence review. No live storefront, Supabase/Auth/REST/RPC/SQL, Stripe, customer data, mail, build, workflow dispatch, implementation or deployment. No competitor website or remote font was contacted.

## Verified remote baselines

| Ref | Verified commit |
|---|---|
| main | `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f` (tree `eb2c9f1824602d19ed27f010cf080190a06c713e`) |
| engineering/command04a-nocturne | `993108aa7d65ac204ef54a7018a85f5c783813fd` |
| engineering/nightfall-dawnbreaker-readiness | `542cc90cf9c301b4571d246ce9ae105bddefc2d0` |
| engineering/blackbox34-nightfall | `c3003c6a56075964f5036ea57507aed8f431b64e` |
| release/spectre35-homecoming | `f89657ec28c73a153f65c1f346fc974747bd5994` |
| engineering/spectre-hero-responsive-fix | `4f09bd5b4d5109df6028a8dc0d00468512d9af1c` |

All expected remote heads matched before audit. The new branch was created directly from main. The authoritative [COMMAND04 migration](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/20002c45933a7f24b08f6d5f0199a7fc8fa1a282/docs/engineering/ASTRA_CHAT_MIGRATION_20261022.md), [DAWNBREAKER runbook](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/542cc90cf9c301b4571d246ce9ae105bddefc2d0/docs/operations/dawnbreaker/RECOVERY_RUNBOOK.md) and prior reset restrictions remain authoritative. Phase A **ON HOLD**; provider recovery **UNKNOWN**; public catalogue **UNTESTED**.

## Source/evidence keys

All unqualified source paths below are pinned to main above. These are evidence references used by the roadmap, not assertions of deployed state.

| Key | Exact source / evidence | What was inspected |
|---|---|---|
| **E01** | GitHub branch list and main Git commit; complete 899-file local tree | Expected heads/parent tree; per-file Git blob hashing before documentation; final remote preservation/readback checked at handover |
| **E02** | 22 core routes: homepage, four Components routes, product shell + nine snapshots, basket, checkout, contact, FAQ, Terms, Wiring Kits and Les Paul builder | HTMLParser main/H1/IDs/labels/status structure, product content counts, static discovery controls. No JavaScript executed. |
| **E03** | [catalogue.mjs](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/components/catalogue.mjs), components.mjs/cards.mjs; products/app.mjs; commerce.mjs | Top-level await before downstream catches, rendering/filtering, basket validation/filter/save dependency and source failure paths |
| **E04** | [checkout.mjs](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/checkout/checkout.mjs), backend/order-data.mjs, checkout/success/success.mjs; basket-ui/storage/basket modules | Source-defined handoff, pricing/store checks, pending/paid/cancel states, local storage and form lifecycle; no checkout invocation |
| **E05** | [FAQ](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/faq/index.html), index.html, contact/index.html, terms/index.html, scripts/navigation.json | Exact ordering contradiction, broad versus product-scoped claims, help/policy destinations and shared shell |
| **E06** | style.css → navigation.css/brand.css/knowledge.css/homepage.css → customer-ui.css; route CSS; site.mjs/forge-reveal.mjs | Cascade/tokens, focus/reduced-motion/responsive source, font import, local SVG request, existing SPECTRE root cause |
| **E07** | [SPECTRE root cause](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/4f09bd5b4d5109df6028a8dc0d00468512d9af1c/docs/engineering/spectre-hero-fix/ROOT_CAUSE.md), BROWSER_ACCEPTANCE, TEST_RESULTS.json and two PNGs below | Genuine historical Chrome scope, viewport/keyboard measurements and limitations; original PNG bytes/digests independently compared |
| **E08** | Committed dist/assets files; style.css font import; standard-library sRGB calculation | Actual file lengths and image headers via existing Pillow; contrast of explicit customer tokens. No encoded HTTP, browser speed or billing measurement. |
| **E09** | backend/public-read/component-data/catalogue-image-delivery/image-delivery-config; operations/public/purchase-controls; DAWNBREAKER pipeline/egress reports | Image-bearing main reads, public-only cache boundaries, poll/authority rules and unconditional CMS generation |
| **E10** | [products/model.mjs](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/products/model.mjs), presentation.mjs, physical/electrical/pot helpers; generator; nine snapshots | Electrical derivation and conditional content sections, single-image contract, missing generated paths in Git, qualified compatibility/technical copy |
| **E11** | Local runtime executable inventory; inherited COMMAND/SPECTRE isolation source; safe `unshare -n -- true` prerequisite | Chrome not found; namespace creation denied. No application was launched. Fresh browser results are NT. |
| **E12** | contact/contact.mjs, contact HTML/CSS, operations/public.mjs and checkout render | Source-proven uncertain submit label; periodic render/focus concern. Fresh contact/checkout browser reproduction not available. |
| **E13** | docs/premium-storefront-v1.md; tests/premium-storefront-v1.mjs, p10c-storefront-truth.mjs, p10d-product-detail.mjs, fixtures/catalogue-fixture.mjs, egress-cache-browser.mjs | Existing DOM/fixture contracts and explicit visual limitations. Inspected only, not rerun or promoted to browser results. Old storefront document's static-only backend-free statement is superseded by verified unconditional CMS source. |
| **E14** | [NIGHTFALL gates](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c3003c6a56075964f5036ea57507aed8f431b64e/docs/performance/blackbox34/RELEASE_GATES.md), README/portable evidence; [HOMECOMING safety](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/f89657ec28c73a153f65c1f346fc974747bd5994/docs/releases/spectre35-homecoming/PUBLICATION_SAFETY.md), release manifest/rollback; DAWNBREAKER gates | Existing solved isolated work, missing production compatibility/archive/complete publication provenance and separate approval requirements |

The source-only parser counted **80 non-Admin index pages** in the repository, but detailed structural assertions cover the **22 listed core pages only**. It does not claim full accessibility coverage of all 80. Core counts, asset measurements and findings are retained in FINDINGS.json; no executable audit script is committed.

## Genuine images reviewed — inherited evidence only

Source ref for both: `4f09bd5b4d5109df6028a8dc0d00468512d9af1c`, directory `docs/engineering/spectre-hero-fix/SCREENSHOTS/`. Captured historically by [CI 39583250290](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39583250290), application source `232017a80fd6c5f2a3083d99cd9f647d8f4db27e`, Chrome155.0.8059.84/Node22.20.0. Local fallback fonts; synthetic read substitutions and namespace isolation described in that report.

| PNG | Dimensions / original bytes | SHA-256 verified against committed manifest |
|---|---|---|
| [before-390.png](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/4f09bd5b4d5109df6028a8dc0d00468512d9af1c/docs/engineering/spectre-hero-fix/SCREENSHOTS/before-390.png) | 390×900 / 374,663 | `e35821dca53ae70d2bb362c44038419d24e9a74f25fab682fc5ce36ef1bd5c18` |
| [before-768.png](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/4f09bd5b4d5109df6028a8dc0d00468512d9af1c/docs/engineering/spectre-hero-fix/SCREENSHOTS/before-768.png) | 768×1024 / 815,822 | `853867a5f8e12f6c5238e18f87f1a24cb40b3c93c2e95ebc405f970f8fa90ce7` |

Git blobs are respectively `1f32c4ca9212ab86647ec61e3e0b89cead77aa73` and `7fccc473d70fb9105a64b0278b2e3bbe4ee2e22b`. The wider before-2560 file returned empty base64 content through fetch_file; one supported blob read returned a Unicode decode error. Its original bytes were not recovered/reviewed here; the historical root-cause measurements remain available. No alternate production URL was used. No new screenshot/artifact retention claim is made.

## Outcome and unverified items

**PARTIAL** accurately reflects missing fresh isolated browser journey acceptance. Source audit/roadmap are complete; there is no production visual/checkout/health/accessibility certification. Production payload may differ from source/generated snapshots. Actual catalogue records/photos, supplier dimensions/QC facts, traffic/billing, real fonts, physical devices, 200% layout/text, assistive technology and effective customer/service state remain unverified.

Documentation scope, links, JSON/ID cross-references, credential patterns and inherited blob integrity are checked offline. Final GitHub tree/content/ref readback belongs to the enclosing audit commit and handover, avoiding a circular self-hash. No recovery phase, test workflow or follow-on implementation starts automatically.

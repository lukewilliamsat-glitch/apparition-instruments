# Proposed first customer-facing release

**Recommend the exact SPECTRE/HOMECOMING responsive hero CSS correction only**, with the minimum separately reviewed cache-fingerprint reference changes required by a complete release assembly. No NIGHTFALL activation, schema migration, LANTERN/SENTINEL bundle or COMMAND integration is needed for this scope. Production adoption remains BLOCKED by publication/rollback/provider-exposure/owner gates.

## Verified source comparison

| Candidate | Exact preserved ref | Main-relative application paths (`dist`/`scripts`) | Assessment |
| --- | --- | ---: | --- |
| SPECTRE | `4f09bd5b4d5109df6028a8dc0d00468512d9af1c` | 1 | Smallest customer-visible correction, `dist/customer-ui.css` |
| HOMECOMING | `f89657ec28c73a153f65c1f346fc974747bd5994` | 1 | Same exact CSS, alternative release packaging, not another fix |
| LANTERN | `b396ec59d317b58ed1c9cd94f8f65620cd50a04c` | 20 | Startup/error/ordering-copy surface across HTML/module entries; wider behavioural scope |
| SENTINEL | `31186e01cedd0ea74f7d68a05624ff96efb66b33` | 23 | Includes LANTERN/LIGHTHOUSE source line plus basket/checkout/contact safeguards; larger risk boundary |
| NIGHTFALL | `c3003c6a56075964f5036ea57507aed8f431b64e` | 15 | Separate backend/view/image/archive infrastructure gates |

These counts exclude candidate docs/tests/workflow harnesses; they are not merge-size recommendations. Main-relative changed paths were recomputed. SPECTRE has zero changed-path overlap with LANTERN/SENTINEL; LANTERN and SENTINEL share all 20 LANTERN application paths. NIGHTFALL and SENTINEL have no changed-path overlap but share semantic catalogue/product-generation/lifecycle contracts. No-overlap does not prove composed compatibility; do not apply LANTERN twice or merge historical test/workflow trees wholesale.

Reviewed CSS SHA-256: **16d6ebbd2372d54e32565a7999edfd1bc9152c785b77f1bcbf79ee47bba1794a** on both SPECTRE/HOMECOMING. Original main CSS: **f72258fb8d455513d2cb38e3672f914207f81ee37664c7e6b32edc7d9c320f26**. The old CSS-only overlay commit `ee2ca60616c61304d26b7a2f7b9ff04555337cd0` is a recorded candidate, not deployed authority or a complete site payload.

The fix removes the capped hero-content width conflicting with viewport-based gutter calculation, keeps headline word wrapping normal, constrains supporting-copy width and lowers the smallest mobile heading floor. It preserves original artwork/brand composition and does not alter price, stock, payment, catalogue or backend contracts. No substantial schema change is necessary. Shared CSS still needs cross-route regression checks.

## Inherited acceptance versus required new acceptance

SPECTRE run **39583250290** tested app source `232017a80fd6c5f2a3083d99cd9f647d8f4db27e`, Chrome155.0.8059.84/Node22.20.0, process-isolated loopback fixtures. Its report records 46 layout cases, 21 functional checks and ten normal widths from 320 to3840, resize, long text, enlarged text, reduced motion and keyboard/menu/CTA checks. Those are historical isolated results, not rerun here or live acceptance. HOMECOMING run39612316997 has 27 Python safety fixtures, not new live browser proof.

LANTERN's original browser gap was subsequently addressed by LIGHTHOUSE run39981284222 (33 Chrome checks plus targeted offline/DOM evidence). SENTINEL run39988495190 records 31 dedicated Chrome checks plus all33 LIGHTHOUSE browser regressions and38 targeted Node tests. These programmes remain alternative later releases requiring owner acceptance, composed payload verification and new scope; they are not silently bundled into the first CSS release.

| Future gate | Required acceptance for the exact release assembly |
| --- | --- |
| Authentic baseline / rollback | Current served association or explicit adoption decision; complete retained previous payload; verified full restoration route |
| Exact composition | Only reviewed CSS plus named cache-reference changes; full manifest diff rejects any other path/byte change; preserve generated product/News/CMS/assets |
| Backend exposure | Owner evidence and schedule/budget decision; approved backend-free assembly/publish route; do not run current full production build as validation |
| Responsive/functional | Real isolated Chrome at320/390/768/1024/1440/1920/2560/3840; desktop/tablet/mobile hero/CTA/menu, repeated resize and shared CSS routes |
| Accessibility-oriented | Native keyboard order/focus/Escape, 200% text, reduced motion, long copy, action reachability; true browser UI zoom/manual assistive technology limitations explicitly recorded |
| Failure and essential journeys | Synthetic public catalogue/Operations failure, missing font/image behaviour, basket/checkout/contact smoke without real payment/email; no regression in existing failure semantics |
| Evidence | Exact application/source/assembled payload and browser identities, original screenshots privately retained under separate scope; hash/read-back and owner review |
| Owner release decision | Review font/rendering/zoom/device limitations and known header overflow; approve exact route/payload, bounded served checks and rollback conditions separately |

Known pre-existing SPECTRE limitation: at320px with150% default text, header has about7px overflow while hero fits; exact external-font parity, physical devices, true browser-chrome zoom and comprehensive spoken assistive-technology acceptance are not established. LIGHTHOUSE has its separate2px overflow at enlarged390px. These must not be hidden by a PASS label. Owner may require their separate repair before release; that would be a new candidate/scope.

Generated output is not just committed `dist`: actual ANCHOR payload has423 files versus416 main source files, includes generated images/News/product changes and stamped modules. LANTERN changes `products/index.html`, the shell used by the product generator; source inspection does **not** prove generation loses LANTERN entry. Any later generation/stamping/NIGHTFALL/SENTINEL composition needs fresh acceptance. For the proposed CSS release, prefer complete verified payload reuse under separately approved access rather than backend-dependent regeneration.

NIGHTFALL additionally requires exact deployed-view/preflight compatibility, approved capture/asset/archive lifecycle and host/bootstrap, genuine verification and full-payload acceptance. COMMAND additionally requires real auth/capability mapping, deployed schema/security parity, all legacy stock writers sharing the atomic/revision/receipt authority, protected cost/image/inventory boundaries and owner NOCTURNE UI acceptance. Neither belongs in a first hero fix.

Sources: [exact CSS](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/4f09bd5b4d5109df6028a8dc0d00468512d9af1c/dist/customer-ui.css), [SPECTRE Chrome report](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/4f09bd5b4d5109df6028a8dc0d00468512d9af1c/docs/engineering/spectre-hero-fix/BROWSER_ACCEPTANCE.md), [LANTERN original gates](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/b396ec59d317b58ed1c9cd94f8f65620cd50a04c/docs/storefront/lantern/RELEASE_GATES.md), [SENTINEL Chrome report](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/31186e01cedd0ea74f7d68a05624ff96efb66b33/docs/storefront/sentinel/BROWSER_ACCEPTANCE.md), [current product generator](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/scripts/generate-product-pages.mjs), [ARCHIVIST storefront register](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/faa860df58901a1c4ebbf7cba5b3677b3fd6bafc/docs/engineering/archivist/STOREFRONT_REGISTER.md), [integration register](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/faa860df58901a1c4ebbf7cba5b3677b3fd6bafc/docs/engineering/archivist/INTEGRATION_DEPENDENCIES.md). Frozen earlier HOLD wording is a historical snapshot; FIRST LIGHT's current Phase A classification is PARTIAL, not an edit to those frozen records.

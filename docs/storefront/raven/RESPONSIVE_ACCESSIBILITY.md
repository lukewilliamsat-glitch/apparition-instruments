# Responsive and accessibility-oriented acceptance boundary

**Fresh Chrome acceptance: NOT TESTED.** The checked local runtime has no Chrome executable. The inherited namespace prerequisite failed with `unshare: unshare failed: Operation not permitted`. No application fixture launched, no browser protection changed, no connected privileged browser substituted and no workflow triggered. A JavaScript fetch stub alone was not treated as equivalent process isolation.

Historical SPECTRE proof remains valuable but narrowly scoped: CI **39583250290**, tested source `232017a80fd6c5f2a3083d99cd9f647d8f4db27e`, Chrome **155.0.8059.84**, Node **22.20.0**, disposable Playwright core **1.56.1**, loopback-only namespace and ten negative controls before application launch. Those were executed then, not rerun for RAVEN. Existing premium-storefront tests are DOM/CSS contracts, explicitly not full real-browser shopping acceptance.

## Required viewport matrix

| CSS width | Available evidence | Fresh full customer journeys / 200% text / reduced motion |
|---:|---|---|
| 390 | Genuine historical baseline 390×900 PNG reviewed; SHA-256 matches SPECTRE manifest. Hero 358px usable width, three lines. Historical menu/CTA checks. | **NOT TESTED** |
| 768 | Genuine historical baseline 768×1024 PNG reviewed; digest matches. Hero 691.22px usable width, three lines. | **NOT TESTED** |
| 1024 | Historical hero measurements: 921.62px usable width, three lines. No shopping screenshot reviewed here. | **NOT TESTED** |
| 1440 | Historical hero measurements: 1280px usable width, three lines; correction geometrically unchanged at this width. | **NOT TESTED** |
| 1920 | Historical baseline hero: 910px usable width; corrected 1280px; both retain three heading lines. | **NOT TESTED** |

Do not read that historical matrix as a catalogue/basket/checkout pass. Wider baseline failure at 2560 (270px usable width, six lines) and 3440/3840 (zero usable width, 22 lines) is already fixed in SPECTRE. Larger PNG retrieval was unavailable through the tested connector path here; its committed measurements/report were inspected, not a fresh wide-screen screenshot. RAV05 remains release-blocked.

At **320px/150% default text**, SPECTRE measured unchanged header scrollWidth **327px**, Menu edge x=326.84px. The corrected hero fit, but whole-page overflow remained. That is an **existing verified historical header defect** (RAV08), not a new claim of failure at 390px/200%. Historical 125/150% visual scale checks were not browser-chrome layout zoom. No comprehensive 200% result exists here.

## Fresh source-only structure checks

Python standard-library HTML parsing examined **22 core shopping/support pages**. Twenty-one have one H1 and one main; `products/index.html` is a dynamic detail shell with no initial H1, one main and loading status. No duplicate IDs or unlabelled static input/select/textarea fields were found in that sample (nested labels counted). This does not cover dynamically created controls or accessible-name computation.

| Area | Source / historical strength | Defect, concern or open check |
|---|---|---|
| Keyboard menu | Native details, aria-expanded/controls, Escape trigger restoration, arrow-key desktop disclosure. Historical homepage checks passed. | Fresh shopping routes, full tab order, touch and announcements **NT**. |
| Focus visibility | Explicit :focus-visible outlines, skip link and focusable confirmation region. | Every actual background/overlay and focus obstruction **NT**. Token contrast alone is insufficient. |
| Labels/errors | Static form labels associated; native validation; basket/component/product/contact status regions; product availability described by text. | Import rejection can prevent feedback (RAV01). Checkout replaces form on status events without focus restoration (RAV15). Error announcements after rerender **NT**. |
| Responsive layouts | Source includes mobile Menu at ≤1180px; single-column product at ≤760px; specification stacking at ≤480px; basket/contact responsive rules and sticky-summary release. | Effective cascade, horizontal document scrolling, action reachability, footer and long labels **NT**. Do not substitute an old DOM test's expected column count for measured layout. |
| Touch targets | Source min-height 44/48px on key menu/purchase/help controls. | Actual rendered areas, adjacent targets and diagram controls **NT**. |
| Images | Descriptive product-name alt, contain sizing, image-error fallback, explicit decorative/background artwork treatment. | Real generated photos, meaningful detail at zoom, layout shifts and gallery access **NT**. |
| Reduced motion | CSS disables ticker/reveal motion in relevant preferences; site/Forge scripts listen to preference changes and retain static content. | Fresh product/kit/basket/checkout with preference enabled **NT**. |
| Text enlargement | Wrapping/min-width rules and stacked definitions exist; historical hero text tests only. | Real 200% text/layout zoom and combined mobile/long-content states **NT**; known header issue remains. |
| Dialog/zoom | Native disclosures and inline kit-diagram enlargement exist. | No product lightbox/dialog gallery contract found. Any actual modal journey and assistive-tech behaviour **NT**, not assumed supported. |

Three text-token contrast ratios are measured in DESIGN_AUDIT. This is an accessibility-oriented audit, **not WCAG certification or screen-reader acceptance**.

## Next authorised verification package

Use the inherited harness in an environment where its namespace and disposable Chrome prerequisites pass unchanged. If they do not, stop application launch. Synthetic fixtures must cover successful, empty, long-name/SKU, missing image, catalogue rejection, denied/unavailable store, storage failure, removed item, quantity/stock validation, cancelled/uncertain checkout and contact states. No real records, original images, credentials or external services.

The existing SPECTRE harness targets the homepage and a small injected read set; it does not already implement the complete synthetic contact/checkout journey matrix. Any new fixture/transport coverage needs a separately scoped test-engineering authorisation. No existing harness, infrastructure or production file was altered to make this audit runnable.

At each requested width, measure document/element bounds and action reachability; exercise Tab/Shift-Tab, Enter/Space, arrows and Escape; check focus restoration and live-region outcomes. Repeat with true 200% text/layout enlargement and reduced motion. A screenshot is evidence of that specific source/fixture/font/viewport only. No new CI or harness change is authorised by this audit.

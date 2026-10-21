# Verified cause and original measurements

## Reproduction basis

The complete 899-blob production-main tree was materialised and independently matched by Git blob identity before modification. Main: `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`; tree: `eb2c9f1824602d19ed27f010cf080190a06c713e`. Only one baseline application blob is modified in the candidate. The final CI replays the exact original `customer-ui.css` fixture (Git blob `5a77dc0a6ee40fab7d1335c9c9c3003f36a36891`, SHA-256 `f72258fb8d455513d2cb38e3672f914207f81ee37664c7e6b32edc7d9c320f26`) and the corrected file in the same browser.

Homepage stylesheet order is `style.css`, `navigation.css`, `brand.css`, `knowledge.css`, `homepage.css`, then `customer-ui.css`. The `brand.css` import for operations CSS remains present. The external Google Fonts import in `style.css` is omitted completely at the isolated server boundary; all following `:root` rules remain intact and asserted. Only local fallback fonts are used for baseline comparisons.

## Responsible cascade

- `style.css`: universal border-box sizing; `.hero-content` is an auto-width block, `max-width:1550px`, auto horizontal margins and initial percentage gutters.
- `brand.css`: vertical padding and `.hero h1` display styling; does not remove the container cap.
- `homepage.css`: paragraph/CTA layout and overlay refinements; does not remove the cap.
- Last-loaded `customer-ui.css`: `--ui-width:1280px`; `.site-ui.home-page :is(.hero-content,.section) {padding-inline:max(var(--ui-gutter),calc((100% - var(--ui-width))/2))}` overrides the earlier inline gutters. Padding percentages reference the containing hero width, not the capped inner box.
- `.site-ui.home-page .hero h1` wins font-size/line-height/max-width over `.hero h1`: desktop clamp `3.5rem,8vw,7.5rem`, line-height 1.02, max-width 900px. Letter spacing remains -.06em from `brand.css`.
- Body `.site-ui` supplies inherited `overflow-wrap:break-word`; white-space and word-break are normal. The two original explicit breaks remain. Word splitting is a consequence of the collapsed width, not the original cause.

At 2560px each gutter is 640px. Subtracting 1280px of padding from the 1550px box leaves 270px. At 3440px each gutter is 1080px: padding exceeds the cap, so the used border-box expands to at least 2160px and usable content reaches zero. At 3840px each gutter is 1280px and the border-box becomes 2560px with zero usable width. The heading then breaks into 22 visible-character lines.

| CSS viewport | Hero usable width, before → after | Heading width, before → after | Font size, before → after | Lines, before → after | After overflow / CTA visible |
|---|---:|---:|---:|---:|---|
| 320 | 288.00 → 288.00px | 288.00 → 288.00px | 56px → 51.2px | 3 → 3 | None / Yes |
| 390 | 358.00 → 358.00px | 358.00 → 358.00px | 62.4px → 62.4px | 3 → 3 | None / Yes |
| 768 | 691.22 → 691.22px | 691.22 → 691.22px | 61.44px → 61.44px | 3 → 3 | None / Yes |
| 1024 | 921.62 → 921.62px | 900.00 → 900.00px | 81.92px → 81.92px | 3 → 3 | None / Yes |
| 1280 | 1152.00 → 1152.00px | 900.00 → 900.00px | 102.4px → 102.4px | 3 → 3 | None / Yes |
| 1440 | 1280.00 → 1280.00px | 900.00 → 900.00px | 115.2px → 115.2px | 3 → 3 | None / Yes |
| 1920 | 910.00 → 1280.00px | 900.00 → 900.00px | 120px → 120px | 3 → 3 | None / Yes |
| 2560 | 270.00 → 1280.00px | 270.00 → 900.00px | 120px → 120px | 6 → 3 | None / Yes |
| 3440 | 0.00 → 1280.00px | 0.00 → 900.00px | 120px → 120px | 22 → 3 | None / Yes |
| 3840 | 0.00 → 1280.00px | 0.00 → 900.00px | 120px → 120px | 22 → 3 | None / Yes |


All dimensions are CSS pixels, not physical screenshot-display sizes. At 2560/3840 the desktop font remains 120px before and after; line-height remains 122.4px and letter spacing -7.2px. Fixing the containing block restores width without hiding text or shrinking the desktop type. The paragraph grows from 95.17px to 516.11px on wide screens. At <=1550px container geometry is unchanged; only the 320px mobile clamp floor changes its heading from 56px to 51.2px in the default fixture.

## Other hypotheses checked

The severe collapse occurs with every relevant local stylesheet loaded, at 100% visual scale, before scrolling, with the original image and overlays. It does not require animation or a transform; reduced-motion and no-JavaScript tests also pass after correction. A diagnostic with the final customer UI stylesheet disabled restores the older uncapped-padding combination and does not reproduce the zero-width problem. That diagnostic is not a supported partial-CSS design or a claim that every missing stylesheet leaves the site intact.

Fallback rendering and a delayed controlled local font were checked. Exact external-font metrics were not. At 1440px before and after are geometrically identical; the failure emerges on wider viewports, explaining why common-width review could miss it. The owner's screenshots' exact viewport/zoom data was not available, so these are source-confirmed reproductions of the same symptom classes, not claims about their capture settings.

# Customer UI consolidation V2

Starting authority: `0a50dedbd2a70a7d5773576c76caef77d298af98`.

The hub is `dist/customer-ui.css`, loaded last on 50 existing public shells. `scripts/sync-customer-ui.py` projects the shared stylesheet and one mode class without rewriting content or controls. Navigation generation invokes the projection, the knowledge generator emits it, and product generation inherits it from its existing shell. The projection is idempotent.

## Shared authority

The hub owns dark graphite/paper/gold colour roles, the existing font-family roles, display/title/section/body/metadata scales, an eight-pixel spacing rhythm, responsive gutters, 1280px public and 1920px technical workspace limits, 72ch reading measure, controls, focus, selected/disabled/error presentation, and primary/secondary/tertiary/utility action treatments.

Commercial, editorial, technical and service modes are density/content adapters of that authority. Commercial product primitives from Storefront V1 are retained. Their colour and width tokens alias the common authority. Editorial sections favour rules and reading measures; service surfaces preserve native forms; technical tools retain compact 44px controls and their established workbench layout. Primary purchase/submit actions are 48px. Google sign-in is a 48px secondary action. Native checkboxes, radios, selects and range inputs remain native.

All seven spokes use the hub: Homepage, Components/Products, Wiring Kits, Tools, Luthier Hub/Education, Account and Basket. Contact, FAQ and legal surfaces inherit shared shell/typography treatments. There is no independent legal-page redesign. The only direct action-class exceptions are Account Sign Out (secondary) and Generator SVG export (utility). Homepage information architecture, content, circuit path and staged explanation are preserved.

## Boundaries and intentional exceptions

- No business/electrical JavaScript, graph, equation, terminal, price, stock, checkout calculation, auth, order, email or schema change.
- Admin receives no changes. Its existing footer link remains an operational utility, outside customer primary/mobile navigation.
- Checkout/success receive the shared shell stylesheet and service class only, with main content and scripts unchanged.
- Technical paper drawings and response graphs retain their established identities, geometry, conductor/trace colours, and light surfaces. Their keyboard focus uses a contrasting paper-specific token.
- Forge's existing phone workbench/sheet layout, blade contacts, pot/jack artwork and Guided Build progression remain authoritative.
- Existing article tables may scroll within their labelled specification region; long technical drawings retain their existing viewport/zoom mechanisms.
- Print-only invoice and redirect/operational surfaces without a shared customer shell are excluded.
- One bounded source sweep covered colour/width/motion declarations in representative tool, Hub, Account, Contact and Designer styles. Legacy rules remain underneath the final common layer where deleting them would risk diagram or route behaviour. Local illustration/graph palettes and bespoke editorial compositions are intentional exceptions. No open-ended CSS cleanup was performed.

No font, raster asset, image generation, dependency or client-side UI framework is added. One shared CSS request replaces independent future spoke styling; existing generated HTML only adds a mode and stylesheet. Existing reduced-motion preferences suppress animation and transitions through the common layer.

## Deterministic verification

`tests/customer-ui-v2.mjs` compares all 50 shells to the starting commit after removing exactly the authorised projection and two action classes. It preserves 219 native-control attribute contracts and verifies 72 computed responsive contracts across 12 representative routes at 320, 390, 768, 1024, 1400 and 1920px. It checks token contrast, control/CTA dimensions, route density, shell breakpoints, service grids, reading-layout collapse, future product generation and projection idempotence. The DOM emulator receives semantically identical whitespace before legacy media-query parentheses because its parser otherwise ignores that syntax. No browser is used.

Focused regressions include commerce/product metadata, basket/pricing/checkout fixtures, Account/Google/recovery/session, Contact and order detail, Designer modelling and unavailable catalogue, Forge/Generator/HSS/HH electrical/configuration, Guided Build, Hub, shared artwork and landing TIP termination. All run with native HTTP/TLS/socket networking blocked.

Final automated result: 47/47 focused suites pass, including the corrected isolation fixture. Seven tested text/focus contrast pairs meet 4.5:1.

Two test-boundary updates preserve substantive assertions: the historical Hub byte-boundary fixture permits the exact common shell projection, and the Designer catalogue-outage fixture bootstraps its independent Kit Definition from local fixture records before failing the catalogue boundary. Production implementations are untouched.

## Rendered acceptance

No browser, browser automation, screenshot, rendered inspection, visual QA or image generation is performed. Automated contracts do not establish subjective rendered quality.

- Rendered desktop acceptance: PENDING LUKE
- Rendered mobile acceptance: PENDING LUKE
- Guided Build visual acceptance: PENDING LUKE
- Shared visual system acceptance: PENDING LUKE
- Blade switch visual acceptance: PENDING LUKE

Luke is the rendered visual acceptance gate after publication.

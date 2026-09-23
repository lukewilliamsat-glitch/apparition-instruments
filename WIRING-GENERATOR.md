# Apparition Wiring Diagram Generator

Dedicated `/wiring-generator/` route. The Kit Builder now uses this same physical renderer through `les-paul-kits/diagram.mjs`; its configuration, pricing and basket remain independent. The retired `/wiring-diagrams/` page redirects here.

## Architecture

- `model.mjs`: component terminal contracts, circuit factory, conductor code registry, endpoint resolution, connected-net tracing, validation and compatible kit conversion.
- `render.mjs`: reusable physical diagram glyphs, bound to the terminal contracts. Components have local anchors; their page positions and wire waypoints are separate from electrical connectivity. The two channels share one circuit factory, not separate diagram SVGs.
- `app.mjs`: configuration UI, graph-derived terminal inspection, wire/net selection, filters, zoom, optional walkthrough, print and SVG export.
- `generator.css`: isolated page styling and clean A3 portrait print rules. Exports always include all wiring, irrespective of the active inspection/filter.

## Supported circuit

Les Paul / SG style, two passive four-conductor humbuckers, two 500k audio volumes, two 500k audio tones, a five-terminal open-frame toggle and mono jack. Three wiring styles and the standard bleed options only. This is traditional dependent Les Paul volume wiring: either volume at zero mutes both in the Both selector position. The Les Paul/SG preset does not expose coil splits or push/pulls. Additional factory-independent presets live in `layouts.mjs`.

The pot convention is explicitly stated: rear view, lugs down, 3–2–1 left to right. Lug 1 is the CCW track end; lug 2 is wiper; lug 3 is CW end. Hardware illustrations are generic functional outlines. Verify actual terminal identity and orientation by continuity, especially on switches and jacks.

Modern: tone branch leaves volume lug 3 and enters tone lug 2; tone lug 1 grounds. 60s: branch leaves volume lug 3 and enters tone lug 1; tone lug 2 grounds. 50s: branch leaves volume lug 2 and enters tone lug 1; tone lug 2 grounds. Tone lug 3 is unused. Each volume lug 1 and all casings/shields/bridge grounds connect to jack sleeve. Bleeds bridge volume lugs 3 and 2; Duncan resistor and capacitor are parallel. 50s plus a bleed is rejected in the core; the UI explicitly clears it with an explanation.

All conductor functions are independent of displayed colours. Only generic labels and the checked Seymour Duncan four-conductor colour mapping are enabled. Add manufacturer mappings in the registry after checking their primary documentation; never infer colours from other makers.

Net tracing crosses soldered wires and closed selector contacts, not resistor/capacitor/pot internals. It is a continuity-net inspection, not a simulation of frequency response or impedance. Terminal inspection comes directly from those connections. The optional explanatory stages are separate from continuity tracing; tone is explicitly a branch to ground, not a serial main-signal stage.

## Extending safely

Add terminal contracts and matching glyph implementations before adding circuit factories. A DPDT push/pull would extend a pot with A1/A2/A3 and B1/B2/B3 anchors; verify internal contacts in each pull state before enabling any switching function. Add new layouts and compatibility rules with connectivity tests before exposing them. Do not enable placeholder functions merely because a visual exists.

Generic jack/toggle components transfer to the current Epiphone kit hardware choices, explicitly disclosed before transfer. SG uses the same electrical topology but has no product/fitment mapping, so its kit CTA is disabled. Pickup colours and visual selector position are drawing settings, not kit components.

## Reference checks

- Seymour Duncan, Guitar Wiring Explored – Humbucker Internals: https://www.seymourduncan.com/blog/latest-updates/guitar-wiring-explored-humbucker-internals
- Seymour Duncan, Introduction to 3-Way Toggle Switches: https://www.seymourduncan.com/blog/latest-updates/introduction-to-3-way-toggle-switches
- Dirk Wacker, Three Ways to Wire a Tone Pot: https://www.premierguitar.com/diy/mod-garage/tone-pot-wiring

Use these for connectivity and conductor identification. Their subjective tone language is not reproduced as product claims.

## Verification

`node tests/wiring-generator.mjs` checks 54 combinations: all supported wiring/bleed pairs, each selector position, with/without shielding. Checks include selected output contacts, ground isolation, grounded cases and shields, isolated pickup series links, correct tone terminals, parallel bleed topology, no route through an unrelated terminal, inspection data, export SVG and builder transfer. Unsupported configurations are rejected. `node tests/kit-system.mjs` checks the existing kit and basket behavior. Exported Modern, 50s and 60s SVGs were parsed and rendered for diagram inspection. No live hardware assembly or browser QA is implied.

## Additional layouts and kit integration

- Classic Stratocaster SSS: 250k audio master volume, neck and middle tones, shared capacitor (default 0.047µF), no bridge tone, two-pole five-position blade. Positions 1–5 are bridge, bridge+middle, middle, middle+neck, neck.
- Standard Telecaster SS: 250k audio master volume/tone, default 0.047µF, two-pole three-position blade. Positions are bridge, both, neck.
- PRS Custom 24-style conversion: 500k audio master volume/tone, default 0.033µF and 180pF bleed, four independent SP5T superswitch poles. Matches the published 2021–2025 pickup combinations: bridge HB; bridge HB + neck single; both HB; both single; neck HB. Neck split shunts its series link to ground; bridge split shunts to hot. This is NOT a factory PRS switch terminal map. Four-conductor pickups and mapped coil polarity are required. Generic and Duncan colour choices do not purport to describe PRS factory lead colours.

PRS reference: https://support.prsguitars.com/hc/en-us/articles/4408356662683-Custom-24-Wiring-Diagram (2021–2025 attachment). Fender model-specific reference index: https://support.fender.com/hc/en-us/articles/43339315080859-Fender-Guitar-Service-Manuals . These presets are named circuit arrangements, not universal diagrams for every production model.

Physical routing clearance uses soldered-wire nets without switch contacts, so routes stay stable when the selector moves. New layouts remain Modern-only; incompatible wiring settings are rejected. New products are not fabricated: Build This Kit only transfers supported Les Paul products.

`node tests/generator-layouts.mjs` checks 52 new circuit configurations, selected pickup combinations, coil shunts, Strat tone assignments, grounds, terminal route clearance and the kit adapter. Premium kit bleeds use labelled two-terminal modules without inventing component values. Existing kit pricing and metadata remain unchanged.

## Connected documentation and colour conventions

`session.mjs` makes diagram state URL-addressable and preserves the complete commercial kit configuration separately. Kit → diagram → Article 04 → diagram and diagram → kit use the same adapter, with no retail price data in the circuit model. Existing pickups/grounds and omitted purchased hardware are outlined. Basket items link to their installation diagram and guide. Premium modules intentionally show only their external connection contract until their internal BOM is formally defined in the generator.

`colours.mjs` separates northStart/northFinish/southStart/southFinish/shield from drawing roles and manufacturer colours. All requested manufacturers have registry entries; only generic and the checked standard Seymour Duncan four-conductor convention are enabled as verified. Others explicitly fall back to generic. Per-model overrides are supported by `resolveConvention`. Do not mark conventions verified without checking exact maker/model evidence.

`explain.mjs` derives stage members and connection explanations from the same component/terminal graph. Push/pull and P90 visual/terminal contracts are prepared, but unsupported circuits are not offered. `circuitFamilies` retains named variant identities and future capabilities; PRS three-way/partial-split, Tele four-way and HSS remain future work under the requested phases.

The four Luthier Hub articles use shared diagram fragments and link to explicit circuits. `scripts/navigation.json` and `scripts/sync-navigation.py` maintain the common accessible Components disclosures and footer links in the static documents. Native details work without JavaScript; site.mjs adds Escape, outside click and arrow-key support.

Verification: `tests/configuration-journey.mjs` covers 18 kit round trips, prices, generic fallbacks, existing hardware and graph explanations. `tests/site-audit.py` checks all local CTAs, fragments, IDs, imports, menus and footer destinations. SVG artwork was raster-inspected. Responsive CSS was reviewed at the 1100/800/680/480/380 breakpoints; live viewport/browser QA is unavailable because this plain static Site has no supported managed preview server. No physical harness test is implied.

Contact details are not present in the project. The contact page prepares a local enquiry draft without claiming to send it. Terms and Privacy are explicitly awaiting approved business/legal copy. No invented legal policies, contact details or backend services were added.

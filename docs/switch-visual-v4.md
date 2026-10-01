# Switch Hardware Visuals V4 / Push/Pull Composition V3 / Hub Hero V4.1

This presentation pass starts at `d271e78cd55b06c2e8897d48004911cd563cf141`.

## Shared hardware

The blade mechanism projects the supplied circuit contact pairs into two banks of physical wipers. It contains no selector-position contact table. The mean selected throw coordinate sets the mechanical lever angle; three-way states and all five five-way states are distinct. Intermediate positions fork the wiper on both banks and label the bank BRIDGED. Closed lugs have a filled treatment and dashed ring, so state is also expressed without relying on colour. Trace strengthens the actual contact overlay. Explain retains the shared participation system.

Build shows the mechanical lever position while leaving solder information and copper routes invariant. It omits closed-contact overlays, wipers and selected-lug emphasis. Existing Build regression comparisons normalize only the mechanical lever attributes.

The detached workbench projection places each associated DPDT at its pot's x coordinate and 110 units above its pot origin. The six switch terminals and housing sit above the pot body. A shared title-position helper also supplies protected routing regions. Mechanical case supports connect the two physical sections; they are not circuit wires. The pot's centre lug caption is staggered below its two outer captions. Source components, terminals, contacts, connections and passive elements are unchanged. Pot and switch remain separate electrical identities. Actual UP/DOWN contacts and the externally unused B pole remain unchanged.

## Hub hero

Only the hero figure and scoped `.hero-v41` CSS change. Shared SVG artwork forms five isolated component studies: pickup, control, selector, capacitor and output. Labels use HTML at a fixed readable font size rather than shrinking inside a composite SVG. There are no inter-component wires or pseudo-circuit frame. A lead pickup study anchors the arrangement; narrow layouts recompose its label and artwork vertically. The caption establishes the progression from meeting physical parts to Follow the Signal, then actual circuit tools.

Every non-hero HTML byte is checked against the starting commit. Follow the Signal, guides, intent navigation, search, keyboard interaction, contextual links and reduced motion remain unchanged.

## Verification

- `tests/switch-visual-v4.mjs`: all 13 Tele/SSS/HSS blade positions, both banks, exact contact-derived wipers/engaged lugs, P2/P4 bridges, Build/Trace/Explain, contact-order independence, metadata independence; HSS and dual LP/SG switch identities, projection/source integrity; hero-only boundary and five responsive studies.
- `tests/workbench-composition-v21.mjs`: 185 projected hardware/style/selector configurations; physical endpoints, protected signal/tone/switch routes, authoritative contacts and source integrity.
- Existing Control Console electrical and seven DOM scenarios, Advanced Switching, HSS, Generator, presentation and Luthier Hub regressions.
- Responsive DOM/CSS and fit/zoom contracts at 320, 390, 768, 1024, 1400 and 1920. These checks do not substitute for rendered browser layout inspection.
- Installed Inkscape raster inspection of the three-way/five-way hardware states and representative baseline/dual LP and baseline/split HSS SVGs. No browser infrastructure installed. Desktop/mobile Hub browser QA unavailable; Luke's rendered visual acceptance remains pending.

No equations, electrical topology, contact truth, supported capabilities, schema or production data change. Supabase and commerce/Admin are outside scope.

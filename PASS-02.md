# Pass 02

Built on the approved Pass 01 source, without importing the abandoned inventory/Admin work.

## Customer experience
- Wiring Kits retains two primary routes, compact family browsing and concise fitment checks, with model/year and retained-hardware advice.
- Builder uses native, keyboard-accessible disclosures with current selections and upgrade charges. Central integer-pence prices and CTS-only options remain unchanged.
- Running total, readable configured-kit summary, basket metadata and configuration-specific installation links remain connected to the existing configuration module.
- Full Circuit / Your Kit switches SVG presentation only. All components and paths remain in place; exported SVG retains the selected presentation. Installation links open the complete circuit by default.

## Shared visuals
- `wiring-generator/components.mjs` provides reusable physical component glyphs, including rear-view pots, push/pulls, humbuckers with cable breakout, single coils, toggle, standard blade, jack, film/Orange Drop/disc capacitors and resistors.
- Logical terminal IDs retain their electrical meanings. Updated local positions are artwork geometry, not electrical changes.
- `routing.mjs` computes immutable orthogonal presentation routes, avoids bodies and unrelated terminals, and caches geometry independently of highlight state. Existing routes remain as a fallback for crowded legacy layouts.
- Solder ovals and shared-terminal dots are part of exported SVG. Wire-clear strokes separate crossings without implying junctions.
- Premium Duncan and Overkill-Pasitor now use the existing parallel capacitor/resistor topology, with product appearance stored separately. Their numerical values were absent from the approved kit data, so values are not invented in the illustration.

## Validation
- All 106 captured baseline circuit definitions retain identical component terminal IDs, wire connections and closed switch contacts.
- Existing pricing, basket, recommendation, configuration roundtrip, Generator and export checks pass.
- Additional checks cover exact route endpoints, orthogonal paths, immutable circuit/view state, and parallel premium bleed topology.
- Exported diagrams inspected as raster previews; responsive styles inspected for desktop, tablet and mobile scrolling/controls.
- Full browser-based responsive and click-through QA remains unavailable: this plain-static checkout has no compatible supervised Sites development server. No framework migration was introduced solely for testing.

## Scope
No new Generator circuits, manufacturer colour tables, comparison tools, inventory, stock checks, Admin, CMS, backend, interactive articles or simulation were added. Existing Generator circuits remain available as in Pass 01; only their shared artwork/routing changes.

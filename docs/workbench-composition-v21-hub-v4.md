# Workbench Composition V2.1 and Luthier Hub V4

Starting checkpoint: `4f0a0774ece6a2a11bfa48ea4c1339cccc0d5f2d`.

## Shared workbench presentation

Both tools move their existing controls into compact shared workbench chrome.
Circuit State remains separate from hardware configuration. Circuit Lab / Signal
Lab, Build / Trace / Explain and magnification retain their existing state owners.
Secondary orientation guidance moves below the drawing; Trace controls reserve no
space in Build or Explain. Resizing does not reopen collapsed Trace guidance.
Native controls retain 44px targets, visible focus and responsive wrapping.

`composition.mjs` creates a detached geometry projection. Pot and DPDT stay
separate authoritative elements with unchanged terminals, wires and contacts.
The projected switch housing sits 260 diagram units below its own host and joins
it through a non-conductive chassis. Host names distinguish neck and bridge.
Every pot lug, casing pad and all six DPDT destinations remain inspectable.

Three- and five-way blades share two physical wafers, fixed solder lugs, common
outlines and a contact-derived lever. The open-frame toggle has a stronger frame,
output-lug distinction and short physical output bridge. Build preserves terminal
identities without closed-contact overlays; Trace and Explain project the exact
closed pairs. Decorative substrate detail never creates a contact.

Routing first considers short orthogonal paths from protected terminal exits,
then uses the existing grid search. Foreign components, titles and terminal
escapes remain protected. Signal, switching, tone, ground and shield have distinct
labels/width/pattern treatments. Crossing hops and graph-backed junctions remain
separate. Ground/shield conductors remain present in Build.

Inspector's unselected overview derives participation from connectivity and coil
state. Selected parts lead with function/current state, followed by destinations
and practical information. Terminal references and component inventory remain
available through native disclosures. At constrained desktop widths Forge moves
inspection below the workbench.

## Luthier Hub V4

The page uses editorial typography, fine rules, restrained brass and static SVG
component artwork from the shared physical vocabulary. It adds no generated
raster, fonts, dependencies, accounts or backend calls.

Five intent disclosures lead to existing content and supported tools. Three
numbered learning paths give reading order without an account. All 11 existing
library guides, search metadata and routes are preserved; the library uses rows
rather than a card grid. Article bodies are unchanged.

Follow the Signal is educational navigation, not another circuit model. Its
illustration shows pickup → selector → volume → output and a tone branch toward
ground, explicitly acknowledging topology variation. Focus, pointer and touch
select the same explanation. No-JS and reduced-motion views expose all five
explanations and their links. Reduced motion can be enabled dynamically.

Signal Lab links select the supported single neck pickup. Copy preserves response
limits for split/coupled pickups and acoustic sound. Kit links describe only the
existing Les Paul builder; split hardware does not promise a matching product.
Component Passport and ownership/account features remain deferred and unexposed.

## Verification and boundaries

Network-disabled fixtures cover 185 workbench configurations with protected
signal/tone/switch routes, all physical endpoints and actual contacts; 162 LP/SG
state/hardware/style cases; HSS selector/layout/full/split states; 54 Generator
configurations; 86 presentation cases; instrument/project/privacy/handoff and
both tools' Inspector/mode/zoom contracts. Hub fixtures check every main link and
anchor, all 11 guides, query context, search, keyboard/pointer/touch parity,
no-JS completeness and dynamic reduced motion.

Responsive verification covers DOM/CSS contracts at 320, 390, 768, 1024, 1400 and
1920. No browser executable was available and none was installed. Actual rendered
composition and visual acceptance remain for Luke's review; automated contracts
are not a claim of screenshot verification or pixel-measured vertical savings.

Electrical equations, supported capabilities, source graph topology, schema
versions and migration requirements are unchanged. Commerce, Admin, production
business data and Supabase are outside this pass. Publication uses the established
`[static-only]` commit mechanism to skip Supabase product generation.

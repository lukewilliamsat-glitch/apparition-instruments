# Tool Experience V3

Instrument v1 remains the description authority. Pickup positions/types, control assignments and values, selector architecture, wiring and load are independent dimensions. Optional `family` identifies the instrument family without changing legacy envelopes; absent values are inferred from the existing reference. Unknown optional fields retain the existing safe degradation rules. Labels and local extensions remain excluded from public sharing.

`configureInstrumentDimensions` edits descriptions, not graphs. SSS, HSS, HSH and HH layouts can be described for Strat/Superstrat families. Existing matching/capability functions still decide whether an exact graph, response segment or Kit Definition exists. Family checks prevent a Superstrat HH description from borrowing a Les Paul graph. Selector arrangements with no descriptive position mapping use numbered, explicitly unmodelled positions. No approximate wiring or response is generated.

Forge uses Configure → Explore → Inspect. Configuration facts are compact; component values and assumptions use native disclosure. Circuit Lab uses the shared Build/Trace/Explain policy. Signal Lab and Designer retain their current calculations, comparisons, freeze state and handoff authority. Mobile retains the existing native configuration/inspection drawers and diagram panning.

Blade artwork consumes existing terminal anchors. Wafer, frame, lug and lever geometry do not define contacts. Build omits diagnostic contact overlays and prioritises solder destinations; Trace uses exact contacts and identities; Explain uses the same graph for selected pickup context and connection meaning. Ground/shield patterns and crossing hops remain distinct in monochrome. Existing pot, capacitor and jack artwork is preserved.

Future HSS/HSH/HH switching, split/phase/series/parallel and PRS systems require separate validated electrical milestones. Available artwork or a representable instrument never grants electrical capability. Publication uses the existing `[static-only]` marker; this milestone does not query Supabase or modify commerce.


## V3.1 visual workbench

The three-column Forge composition remains Configure → Explore → Inspect. Compact capability lines use text and symbols; inventory is a secondary native disclosure. Selector positions retain physical order, wrapped labels and 44px controls. Tele's middle position reads Both. Small pickup previews reuse the physical glyphs and remain descriptions, never capability evidence.

Both workbenches load the shared `workbench.css` control, drawing-surface and explanation hierarchy. The canvas remains warm, light and printable. Orientation and construction keys are disclosed without pushing the drawing down. Component labels and values precede terminal diagnostics; blade labels sit outside lug rows and the component heading sits above the switch frame.

`diagram-navigation.mjs` fits the SVG viewBox uniformly inside available width and height, with a small margin. Fit is the overview; zoom preserves aspect ratio and provides detail. Generator navigation changes only display sizing, not SVG or graph state. Forge retains its mobile drawers, touch selection, pan and pinch; the same fit calculation now also serves desktop controls and resize. Tablet places Inspector below the working columns. Mobile keeps the active drawing inside its bounded viewport.

Explain has three emphasis levels: selected part and direct wires, medium emphasis on directly connected components, and faded unrelated content. Shared explanation sections present role, current selector, destinations, then supported value/change guidance. Trace retains exact nets and contacts. Build keeps every required physical conductor while suppressing contact diagnostics. Electrical coordinates, lug anchors, switch contacts, equations, capability matching and handoff authority remain unchanged.

Rendered QA requires Luke's real-device acceptance when browser infrastructure is unavailable. Automated fixtures verify geometry, SVG labels, selection and responsive contracts without production network access. Static-only publication skips product generation and leaves the deployment workflow unchanged.

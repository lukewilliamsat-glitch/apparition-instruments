# Signal Forge architecture

Status: conceptual architecture, not yet an implementation contract.

## Shared-core rule and current boundary (September 2026)

Electrical truth, component truth, circuit topology, switch/contact behaviour, reusable diagram behaviour and validated electrical models belong at the lowest appropriate shared layer. Tool-specific UI and workflow remain local. Duplication of shared truth needs explicit justification.

**Shared now:** Circuit Forge uses the Wiring Generator's component and terminal definitions, circuit graph, closed contacts, conductive `net`, graph validation, orthogonal router and SVG renderer. Generic conductive-path inspection and external-wire endpoint diffs live in `wiring-generator/inspection.mjs`; the Generator directory currently serves as the shared circuit core despite its tool-specific name. Catalogue Component IDs and Kit Definitions remain separate authorities; a circuit instance ID is not a catalogue Component ID. The supported Les Paul Builder handoff uses the existing configuration contract and leaves stock, price and checkout authority in commerce.

**Tool-specific by design:** Forge owns its constrained template controls, workbench presentation and contextual explanation. The Generator owns its kit/physical wiring workflow. The Treble Bleed Designer owns its graph UI, Frozen Reference and single-pickup state validation. Its `engine.mjs` contains validated single-pickup transfer, taper and treble-bleed-admittance functions that can become shared electrical modules when a consuming circuit model can state the same assumptions. Do not label that response as a complete 2V2T Les Paul simulation.

**Shared router V2:** The common orthogonal router keeps component exclusion and terminal escape ports and now prices occupied grid lanes, close parallel runs and perpendicular crossings. Occupancy compares conductive net identity derived from external wires and closed contacts; the exported route semantics identify signal, ground, tone, auxiliary treble-bleed and switch wires from graph connection metadata, not position or colour. The shared SVG renderer exposes these roles and net identifiers for future styling without changing the current palette. The route cache keys on category, network and contact state as well as geometry and route hints. Explicit terminals remain the only solder junctions; visual crossings do not join nets. No guitar-family routing offsets were added.

**Shared router V3:** Multi-terminal pot and pickup ports snap inside their terminal markers, then use longer straight escapes. Short external lanes are reserved for the corresponding terminal, and the route search cannot reverse into a protected port. Grid edges already occupied by an unrelated conductive net cannot be reused; perpendicular crossings retain their separate electrical meaning. Bend costs discourage short jogs while path length remains significant enough to prevent excessive detours. This is deterministic local fan-out/channel planning inside the same Forge/Generator router, not a family-specific layout. The physical layout may still constrain spacing; label exclusion and comprehensive channel planning remain future shared work. Routing V2's semantics and cache identity remain authoritative.

**Shared visual semantics:** `routeSemantics` is the graph-derived role/net contract. The shared SVG renderer exposes `data-route-role`, `data-route-net` and `data-view-state` on each wire plus role classes on wire paths. Its role filter de-emphasises other wiring without changing circuit state; an explicit inspection/trace overrides that view and gains a stronger non-colour line weight. The Generator's existing Switching and Tone filters retain their meanings, including auxiliary treble-bleed wiring under Tone; Forge may also isolate Auxiliary in its own view. Closed contacts are marked as switch paths. These are styling hooks, not a final colour palette. Manufacturer conductor mappings must translate physical colours onto existing semantic pickup terminals, not create topology variants.

**Future shared core:** A multi-pickup circuit solver and component-value/unit adapters need explicit validation and consumer contracts. The router's costs favour spacing, but do not guarantee it in every constrained layout; legacy fallback routes may still be used when the grid has no path. Label exclusion, systematic channel planning, and reduction of unavoidable crossings require comparative diagram fixtures and a separate bounded renderer pass. The Forge crossing-hop overlay remains presentation-local until its visual semantics are accepted for other Generator consumers. Manufacturer pickup conductor colours should map to semantic terminals, not fork the electrical circuit logic.

Static Pages builds stamp first-party HTML asset URLs and transitive ES module imports with the deployment revision. HTML itself may remain cached briefly by a client/CDN, so Forge offers delayed reload guidance only if initialization remains at its preparing state. This is a deployment-cache resilience measure, not a browser-specific compatibility claim.

## 1. Circuit model

Signal Forge should model a circuit as composable components, terminals and electrical connections rather than as one monolithic diagram per guitar configuration.

A preset such as `HSS Strat` should initialise the underlying model, after which compatible elements can be changed without requiring a separately hard-coded diagram for every permutation.

Primary component families include:

- pickups and pickup positions;
- volume and tone controls;
- potentiometer resistance and taper;
- tone capacitors;
- treble-bleed networks;
- loading resistors;
- selector switches;
- push/pull and other switching;
- output jack;
- cable capacitance and amplifier/input load where relevant to simulation.

Example use case: a guitar can use 500 kΩ controls with a loading resistor on a single-coil branch to approximate the loading associated with a 250 kΩ control. This should be representable explicitly rather than hidden inside a named preset.

## 2. Presets and variation

Presets provide approachable entry points. They must not define the limits of the engine.

A Strat-family preset, for example, may vary independently across pickup layout, number and role of controls, switch type and optional switching functions. The data model should therefore avoid assuming that all Stratocasters are SSS / 1V2T / 5-way.

## 3. Diagram semantics

The generated visual wiring path must clearly distinguish:

- electrical junctions;
- wires that cross without connecting;
- component terminals/lugs;
- casing solder joints / ground points;
- supplied versus existing components where a kit context exists.

A junction should have an explicit connection marker. A non-connected crossing should use an unambiguous bridge/hop or equivalent visual treatment and must not look merged.

Interactive path tracing is a target behaviour. Selecting a wire, terminal or component should be able to highlight its relevant electrical path while de-emphasising unrelated paths. The interface should be capable of explaining what a selected terminal is and what it connects to.

## 4. Design Mode

Design Mode is the exploratory environment. A user should be able to:

- choose a familiar starting topology;
- configure pickups, controls and switching;
- alter electrical component values;
- add supported modifications such as treble bleeds, loading resistors and coil-split networks;
- see the wiring diagram respond to the circuit;
- see the electrical/frequency-response model respond where supported;
- compare configurations without losing a reference state;
- match compatible Apparition products using structured electrical meaning;
- hand a supported design into a kit/product workflow.

The existing Treble Bleed Designer Frozen Reference behaviour is a useful precursor to broader comparison workflows.

## 5. Build Mode

Build Mode should turn a valid circuit into an installation sequence rather than presenting the complete circuit as the only instruction.

A step can identify:

- the component being installed;
- its role/position;
- the exact source terminal;
- the exact destination terminal;
- the one connection currently being made;
- any relevant solder/ground instruction;
- a visual highlight of only the current path.

The user should always be able to return to the full circuit.

For Apparition-supplied kits, core Build Mode assistance should be considered part of the product experience rather than a premium lockout.

## 6. Catalogue component vs physical component instance

Signal Forge should preserve a distinction between a catalogue definition and an individual physical part.

Example:

`Catalogue Component: CTS A500k, nominal 500 kΩ, tolerance ±10%`

may produce a physical instance:

`Physical Component Instance: measured 501.7 kΩ`

which can then be assigned to:

`Order / Kit: AI-xxxxxx → Neck Volume`

A future customer's `Your Circuit` view can therefore contain the actual measured values of the parts supplied rather than only nominal catalogue values.

Do not retrofit this distinction by overwriting catalogue nominal values with measurements.

## 7. Nominal vs actual simulation

Once measured component instances exist, a future circuit may support comparison between:

- designed / nominal circuit values; and
- actual measured values of the customer's supplied components.

This is a natural extension of Apparition's measured/QC approach and should be designed so the measurement data can be traceable to the supplied physical part.

## 8. Order and account integration

A future owned Order may expose a `Your Circuit` experience containing the customer's circuit definition, assigned physical components, measured values, diagram and guided installation flow.

A parcel/QC card may eventually include a secure QR route into that owned circuit. Security must rely on authenticated/authorised access, not possession of a predictable Order reference alone.

## 9. Commerce integration

Signal Forge should use structured compatibility/electrical rules to connect a design to Apparition products. Exact electrical matching should be preferred over name-based guessing.

A design-to-kit handoff should carry configuration semantics rather than merely linking to a generic product page.

Checkout, stock and final price authority remain with the existing commerce systems.

## 10. Subscription boundary

Initial principle:

Keep core discovery, education, practical design, core simulation, wiring guidance, product matching and Apparition-kit build assistance free where those capabilities materially help customers understand or successfully use Apparition products.

Potential future Pro territory includes advanced multi-circuit comparison, larger persistent project/guitar libraries, tolerance analysis, advanced exports, professional/client workflows and other high-depth functionality.

The exact paywall must be decided from actual usage and product maturity rather than imposed prematurely.

## 11. Protection strategy

Do not optimise the early architecture around hiding ordinary client-side implementation. If premium computation or proprietary datasets later require stronger protection, evaluate server-side execution, authenticated entitlements and API boundaries at that milestone. Security and subscription enforcement must never depend only on hiding browser code.

# P12 — Signal Forge V1 implementation contract

Customer-facing name: **Circuit Forge**. Status: P12A foundation and P12B interactive Les Paul slice; broader V1 slices remain open. This contract refines the accepted planning decisions in `README.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `DECISIONS.md` without promoting V2 features.

## Journey and source of truth

Template → composable terminal circuit → supported edits → model-driven wiring → conductive-path inspection → supported response/reference comparison → exact product or supported Kit Builder handoff.

A circuit consists of components with stable instance IDs, types and attributes; terminals identified by `<instance-id>.<terminal-key>`; wire connections with IDs and endpoint references; and closed switch contacts as endpoint pairs. Template IDs initialise this graph. Diagram coordinates and wire routes are presentation data, not electrical connections. Component IDs in the catalogue identify product definitions and are distinct from circuit instance IDs. No catalogue or Order row stores an exploratory circuit in V1.

The existing `wiring-generator/model.mjs` implements this graph today (`components`, `connections`, `contacts`, `terminalTypes`, `validateCircuit`, `net`). P12A uses it for a limited public Les Paul template, with `circuit-forge/model.mjs` validating the exposed controls. The Forge must not duplicate the generator's terminal meanings or invent a second kit price authority. Later V1 work may generalise graph editing while retaining these identities and validation rules.

## Electrical and diagram semantics

A terminal reference must resolve to exactly one declared component terminal. Wire endpoints and closed switch contact pairs join conductive paths. `net` deliberately does not traverse potentiometer resistance, capacitors, resistors or pickup internals as ideal shorts. Selector position determines the active contact pairs. Ground-to-output shorts and missing required hardware grounds are invalid. A crossing of routes does not create a connection. Shared terminal solder joints and connected junction markers are explicit; non-connected crossings remain separated/bridged visually. `wiring-generator/render.mjs` and `routing.mjs` supply P12A's diagram. Component, terminal and wire inspection uses these model references and is keyboard accessible.

The wiring illustration is a physical connection guide, not a multi-pickup frequency-response solver. `treble-bleed-designer/engine.mjs` currently models one passive pickup, one volume/tone chain, a treble-bleed network, cable and amplifier load. Its Frozen Reference is valid for that model; it must not be presented as an exact response for a full Les Paul, Tele, Strat or PRS circuit until the assumptions and cross-tool mapping are validated. P12A links to that separate tool and makes no graph or comparison claim for its full circuit.

## P12A support matrix

| Family | V1 priority | P12A public status |
| --- | --- | --- |
| Les Paul HH / 2V2T / 3-way | Modern, 50s, 60s | Supported template with wiring style, selector position, two tone cap values and defined bleed options. 50s + bleed rejected. |
| Telecaster classic SS / 1V1T / 3-way | Priority | Not exposed in Circuit Forge yet. |
| Strat SSS, HSS/SSH, HSH, HH | Priority, independently variable layouts | Not exposed in Circuit Forge yet. |
| PRS Custom 24 HH / 1V1T | Validated 3-way/5-way and splits | Not exposed in Circuit Forge yet; no factory pinout is implied. |

Values are illustrative supported choices from the current Generator, not arbitrary drag-and-drop circuit editing. Unsupported state is rejected instead of silently normalised. Physical hardware, pickup lead functions, shaft dimensions and fitment must be checked against the actual guitar.

## Existing integration contracts

- Structured catalogue electrical data and stable Component IDs remain authoritative for exact product matches. Existing `treble-bleed-designer/product-match.mjs` matches topology, capacitance and resistor value only where complete data is present. P12A does not assert that a complete kit exactly matches arbitrary circuit edits.
- `wiring-generator/model.mjs` `kitLink` / `les-paul-kits/config.mjs` `builderURL` transfer supported Les Paul configuration semantics. Kit Builder resolves Component eligibility, quantities, stock and price; final checkout authority is unchanged. A link is an invitation to review fitment and availability, not a purchase guarantee.
- Circuit Forge remains free and client-side in P12A. No Auth, persistence, migration, Edge Function, Order or inventory mutation is required.

## P12B interactive Les Paul slice

The shared Generator circuit still supplies the component instances, terminal references, external wires, closed selector contacts and orthogonal routes. Circuit Forge now derives a component inventory, connection-change explanation, conductive-path highlight, shared-terminal count and separated crossing markers from that circuit. The closed toggle contacts are drawn from the active contact pairs. Changing selector position changes conductive continuity without inventing a wire through an open contact. Diagram crossings remain non-junctions regardless of whether their wires happen to belong to the same remote electrical net. Keyboard inspection and a clear-highlight control remain available. The first family and electrical-model limits above remain unchanged.

## P12C — Classic Telecaster (next implementation pass)

The second public family is the **classic passive Telecaster SS / 1V1T / three-way blade**. Its baseline has neck and bridge single-coil pickups, one 250kΩ audio master volume, one 250kΩ audio master tone, a 0.047µF tone capacitor, three-way selector, mono output jack and bridge/string ground. Selector positions are 1 Bridge, 2 Both, 3 Neck. The existing Generator `tele` / `standard-ss-threeway` graph and shared `singlecoil`, `blade`, `pot`, `capacitor`, `jack` and `ground` terminal types supply the starting contract. Blade contacts, not drawing proximity, determine conductive continuity. The actual switch terminal identity and hardware fitment still require checking.

Expose only the shared Generator's already bounded choices where the Tele graph remains valid: selector positions 1/2/3; tone capacitor 0.022, 0.033 or 0.047µF (default 0.047µF); and optional master-volume treble bleed of None (default), PRS-style 180pF, capacitor-only 1nF or parallel RC 1nF + 150kΩ. Keep standard wiring only, with no arbitrary values or second tone channel. Any optional choice must be validated through the same graph and labelled as a circuit configuration, not an exact hardware/product match. No Tele Kit Builder handoff exists in the current `kitLink` contract; do not substitute the Les Paul link or imply availability.

Implementation acceptance:

- A Tele template initialises valid composable state with stable instance and terminal IDs, expected components, grounded hardware and no output-to-ground short. Unsupported family-specific choices fail closed.
- Positions 1, 2 and 3 close the correct shared blade contacts: bridge-only, both and neck-only signal paths respectively. Open contacts do not join paths. Passive pickup, pot, capacitor and resistor internals are never treated as ideal wires.
- The same model-driven renderer, routing, junction/crossing semantics, inventory and keyboard-accessible conductive-path inspection used by Les Paul work for Tele. A visual crossing does not create a graph edge; shared terminal junctions remain explicit.
- Supported tone-capacitor and bleed choices update the graph's component values/topology and diagram from one state. Changing selector position changes contact/path state without fabricated external wires. Controls and inspection remain usable on narrow screens.
- Focused Tele state/path/diagram tests and the existing P12A/P12B Les Paul and shared Generator regressions pass. Any changed shared Builder, Basket or checkout interface requires its relevant boundary tests; no commerce data changes are part of P12C.

Defer four-way and other series/parallel switching variants, Nashville layouts, humbucker variants, push-pull and other non-baseline wiring. Strat and PRS remain separate later families. Full-circuit response/reference modelling, speculative exact product matching, Build Mode, saved circuits, measured instances, Your Circuit, QR access, nominal-versus-actual comparison and Pro functionality are outside P12C. Reuse the shared Circuit Forge model, terminal graph, routing/renderer, catalogue and Kit Definition authorities; do not add a Tele-only diagram or parallel data/commerce authority. If implementation exposes a missing primitive, document and validate it in the shared model rather than masking it with a family-specific visual shortcut.

## Subsequent V1 gates

Before enabling another family, graph edit, response comparison or product/kit match, specify its supported primitives and switching contacts, electrical assumptions, unsupported cases, diagram crossing/junction semantics, authoritative product facts, and exact handoff rules. Test that a state edit changes the correct terminals/connections and that path inspection never connects mere crossings. Test relevant Generator, Designer, Builder, Basket and checkout boundaries only when their interface is changed.

Build Mode, saved circuits, physical component instances, measured QC values, `Your Circuit`, QR ownership and nominal-versus-actual simulation remain V2 or later. Pro entitlements are not part of V1.

# Signal Forge V1 — Desktop Workbench UX Contract

Status: canonical HQ product/UX specification for Astra V4 and later V1 implementation.

This document complements `V1_EXPERIENCE_CONTRACT.md`, `V1_CONTRACT.md`, `WIRING_SEMANTICS.md`, `ARCHITECTURE.md` and `ASTRA_V4_REACTIVATION.md`.

## Product principle

Circuit Forge is not an enhanced Wiring Diagram Generator. It is an interactive guitar-electronics workbench.

The Wiring Diagram Generator primarily answers:

**How do I wire this?**

Circuit Forge should increasingly answer:

**What is my circuit, how does it work, what happens if I change it, and how do I build it?**

The V1 journey remains:

**Configure → See → Understand → Analyse where validated → Build**

Desktop visual design and intuitive interaction are the immediate priority. Mobile/responsive optimisation remains required for V1 close-out but is deliberately deferred until the desktop workbench is substantially feature-complete and visually accepted.

## Desktop workbench hierarchy

The circuit canvas is the hero. Configuration and inspection support it rather than competing equally for attention.

The intended conceptual layout is:

- compact circuit identity / workbench header;
- configuration workspace at the left or equivalent supporting region;
- dominant central technical canvas;
- contextual inspector / explanation workspace at the right or equivalent supporting region;
- workbench modes/actions organised deliberately rather than accumulated as unrelated button rows.

Exact dimensions are implementation decisions. The hierarchy is not.

### Circuit identity

The workbench should make the current circuit immediately understandable, for example:

`Les Paul HH · Modern · 2V2T · 3-way`

The identity may later include pickup/profile and key component summary where useful, but should remain concise.

### Configure

Configuration should feel like editing a circuit, not completing a generic web form.

Group supported controls progressively by concepts such as:

- Circuit — wiring style, selector state and topology-level supported choices;
- Pickups — pickup construction/profile and later manufacturer conductor profile;
- Controls — volume/tone pot values and supported taper;
- Tone — capacitor values/options;
- Treble Bleed — supported topology/value choices.

Do not expose every advanced option at equal visual weight when progressive disclosure can preserve clarity.

### Central canvas

The diagram is the primary technical object.

The canvas should have a deliberate technical-workbench frame and a coherent toolbar/action model. Existing semantic views remain valuable, but controls should not grow into multiple unrelated rows.

The architecture should allow future/appropriate actions such as:

- Fit Circuit / reset view;
- semantic view selection;
- trace/highlight controls;
- Circuit / Response / Compare workbench modes;
- print/export actions.

Not every future action must be implemented in the first visual pass.

### Inspector / Understand

The Understand area should become contextual rather than remain a static explanation panel.

With no explicit selection it should show a useful Circuit Overview and teach the interaction model.

With a selection it should identify and explain the selected object from authoritative state.

The inspector is the natural home for context-specific actions and explanations rather than adding permanent controls everywhere on the page.

## Unified selection model

Circuit Forge should converge on one active workbench selection.

Representative selection types:

- circuit overview / nothing selected;
- component;
- terminal;
- connection/wire;
- conductive path/net;
- true electrical junction;
- selector/contact;
- physical pickup conductor when manufacturer profiles are available.

Selection is interaction state, not electrical state.

Changing selection must not mutate circuit topology.

### Contextual actions

Actions should depend on what is selected and what the authoritative model supports.

Examples:

- Volume pot: Overview / Connections / Trace / Analyse where validated;
- Ground junction: Overview / Connections / Trace;
- Treble bleed: Overview / Connections / Analyse;
- Pickup: Overview / Conductors / Trace / Analyse where validated;
- Wire/net: Overview / Trace;
- Selector/contact: Overview / Contact state / Trace.

These labels are UX direction, not a requirement to implement every action immediately.

The important rule is progressive disclosure: do not permanently display actions that are irrelevant to the current context.

Clicking/deselecting the canvas should provide a clear route back to Circuit Overview.

## Workbench modes

The intended V1 direction is a small number of meaningful workbench modes rather than several independent tools embedded on one page.

A likely model is:

**Circuit | Response | Compare**

Exact labels may be refined during visual acceptance.

### Circuit

The interactive wiring diagram is the main canvas. Configure and Inspector remain available.

### Response

The main canvas may present the validated selected-network response experience defined in `V1_EXPERIENCE_CONTRACT.md`.

This must consume the shared validated Treble Bleed Designer calculation boundary rather than duplicate an electrical engine.

The active analysis target should derive from the workbench selection/current circuit state where supported.

Do not call selected-network analysis a complete Les Paul response.

### Compare

Comparison should explain meaningful circuit differences such as:

- Modern vs 50s wiring;
- no treble bleed vs a supported bleed;
- other explicitly supported configuration differences.

Comparison should be graph/state aware rather than merely two screenshots.

Compare may be implemented after the core desktop workbench if necessary.

## Circuit summary and Build transition

V1 should provide a concise dynamically generated circuit specification based on authoritative state.

Representative content:

- guitar/circuit family;
- wiring style;
- pot values/tapers;
- tone capacitor values;
- treble-bleed networks;
- selector/switching configuration;
- pickup physical conductor profiles where selected.

This summary supports:

- customer understanding;
- print/export;
- exact supported product matching;
- Kit Builder handoff;
- future V2 Save Circuit/account workflows.

The Build transition should feel like a natural continuation of the workbench rather than an unrelated sales interruption.

Where exact supported matching exists, a clear action such as `Build this circuit` / `Configure matching kit` may hand the current configuration into the existing Kit Builder.

Do not guess unsupported product matches.

## Diagram visual grammar

The shared renderer remains authoritative for applicable diagram presentation across Forge and Wiring Diagram Generator.

V1 visual grammar:

- continuous conductor = continuous electrical path;
- filled node = explicit true electrical junction/branch;
- compact hop/interruption = crossing without electrical connection;
- terminal marker = authoritative component endpoint and potential interaction target;
- stronger/high-contrast route = explicit trace/selection interaction;
- de-emphasised route = outside the current semantic/view focus, not electrically absent.

Junctions must derive from graph truth, never SVG intersection geometry.

Manufacturer conductor colours apply to physical pickup conductors where represented. They must not replace the semantic visual system for the entire circuit.

## Diagram composition target

The remaining diagram work should be treated as composition, not repeated local coordinate patching.

### Routing hierarchy

Future shared routing/composition work should distinguish, where the model supports it:

1. **Component-local wiring** — treble bleeds, tone capacitors and other short networks that belong visually to a host component;
2. **Terminal fan-out** — protected local escape from pots, switches, pickups and other terminals;
3. **Functional branches** — signal, tone, ground and switching runs between component regions;
4. **Circuit trunks/channels** — longer deliberate shared or network-level routing, especially ground.

This hierarchy should influence composition without changing electrical topology.

### Ground architecture

Ground routing is a priority for professional legibility.

Where graph truth supports it, ground branches should approach deliberate trunks/junctions rather than appear as independent wires that accidentally collide.

Future off-terminal junction support should create explicit graph/render junction concepts rather than relying on overlapping SVG paths.

### Component satellites

Short networks that conceptually belong to a host component should be eligible for local/satellite treatment.

Examples:

- treble bleed attached to a volume pot;
- tone capacitor attached to its tone-control network.

The goal is to keep component-local wiring from competing unnecessarily with long circuit-level routes.

This is a routing/composition concept, not permission to hard-code Les Paul coordinates.

### Professional composition acceptance

A finished diagram should favour:

- fewer unnecessary bends and micro-jogs;
- consistent terminal departures;
- intentional branch convergence;
- predictable spacing;
- clear ground topology;
- clear separation of unrelated nets;
- no visually accidental merges;
- compact unmistakable crossings;
- deliberate component breathing room;
- stable deterministic output for identical state.

## Manufacturer UX direction

The shared manufacturer profile authority is defined in `WIRING_SEMANTICS.md`.

Forge should ultimately expose profiles per pickup, allowing mixed-brand circuits.

A future pickup inspector/configuration may present, for example:

`Neck Humbucker — Seymour Duncan — 4 conductor`

and physical instructions derived from semantic mapping, such as hot, series-link, ground and shield conductors.

Physical conductor selection/highlight may later trace the corresponding semantic terminal/path.

Do not turn the entire circuit into manufacturer wire colours. Manufacturer colours describe the pickup's physical leads; shared circuit semantics continue to describe the wider circuit.

Unsupported/model-specific profiles must fail safely and never invent conductor colours.

## Response UX direction

The response experience should reuse the shared validated Designer engine and feel like another view of the same circuit state.

When supported:

- selecting Neck Volume may target the neck volume network;
- selecting Bridge Volume may target the bridge network;
- selecting a supported treble bleed may expose its response effect;
- changing a shared supported value updates diagram/explanation/response consistently;
- Frozen Reference/comparison behaviour should reuse validated Designer semantics where appropriate;
- deeper experimentation may hand the current supported network to the standalone Treble Bleed Designer.

The response UI should clearly identify the active target and model boundary.

## Professional visual standard

For V1 desktop, `professional` means:

### Hierarchy

The circuit/diagram dominates. Configuration supports it. Inspection responds to it.

### Density

Technical and information-rich without feeling cramped.

### Consistency

One coherent spacing, border, typography, control-state and selection language.

### Progressive disclosure

Advanced/contextual information appears when relevant rather than occupying permanent screen space.

### Immediate feedback

A supported circuit change should make its effect on diagram/inspector/analysis obvious.

### Technical credibility

Values, terminal identities, paths, junctions and limitations are precise.

### Apparition identity

Retain the dark/cream/red Apparition gothic-industrial character while prioritising engineering-tool clarity. The workbench should not become decorative at the expense of technical readability.

## Immediate V4 implementation priority

The first substantial Astra V4 implementation pass should establish the desktop Workbench Visual System and unified interaction shell, using existing functionality rather than simultaneously adding several new electrical features.

Priority direction:

1. stronger workbench/circuit hierarchy;
2. circuit canvas as hero;
3. cleaner grouped configuration presentation;
4. contextual Understand/Inspector behaviour around the existing selection capabilities;
5. coherent diagram toolbar/view presentation;
6. circuit identity/overview treatment;
7. consistent professional spacing/typography/control/selection states;
8. preserve room for Circuit / Response / Compare without implementing the response engine in the same pass;
9. only small objective diagram refinements if naturally adjacent.

Do not combine this first visual-system pass with:

- manufacturer implementation;
- response-engine extraction;
- Classic Telecaster;
- mobile optimisation;
- systematic routing-channel rewrite;
- commerce changes.

Luke owns rendered visual acceptance.

## Deferred to V1 close-out

Mobile/responsive optimisation and final accessibility acceptance remain V1 requirements, but they are deliberately deferred until desktop V1 is substantially feature-complete.

Do not interpret this deferral as removal from V1 scope.

## V2 continuity

The V1 workbench shell should not block later V2 capabilities including account-backed saved circuits, My Circuits, measured component instances, Build Mode, My Components/My Pickups, nominal-versus-measured comparison, QR/reopen workflows and circuit revision history.

The V1 circuit summary and unified state/selection model should form useful foundations for those later capabilities without requiring V1 to implement persistence now.

## HQ ownership

Luke + ChatGPT HQ own final visual acceptance, UX/product prioritisation, terminology, manufacturer-source approval and scope promotion.

Implementation sessions should consume this contract rather than rediscovering product direction, avoid routine manual browser QA, and hand subjective/product questions back through HQ handoff.

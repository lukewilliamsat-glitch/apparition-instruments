# Signal Forge V1 — experience contract

Status: canonical HQ product/experience specification.

This document freezes the intended V1 customer experience so implementation passes can optimise code without repeatedly rediscovering product direction. It complements `V1_CONTRACT.md`, `WIRING_SEMANTICS.md`, `NEXT_IMPLEMENTATION.md` and `ARCHITECTURE.md`.

## V1 promise

Signal Forge V1 should let a customer:

**Configure it → See it → Understand it → Analyse it where validated → Build it.**

The workbench must feel like an interactive professional service manual, not merely a configurable SVG wiring diagram.

Accuracy outranks feature count. Unsupported combinations and unvalidated analysis must be stated honestly rather than approximated silently.

## V1 reference-workbench priorities

Before broadening circuit-family coverage, the Les Paul reference workbench should establish the reusable interaction language below.

### 1. Professional shared diagram

The diagram is a first-class technical output and should be suitable for practical wiring and clean print/export use.

Required direction:

- deterministic shared routing;
- minimal unnecessary bends, micro-jogs and backtracking;
- deliberate local lanes around terminals/components;
- separation of unrelated nets;
- deliberate convergence at real electrical junctions;
- compact, unmistakable non-conductive crossing treatment;
- graph-derived junction nodes at true multi-branch electrical joins where a node improves comprehension;
- predictable component exclusion and label clearance where practical;
- restrained semantic presentation that does not depend on colour alone;
- Forge and Wiring Diagram Generator remain consumers of the same shared graph/router/renderer authority.

A route that happens to overlap another route must never imply a connection. A rendered junction node must come from electrical graph truth, not SVG intersection geometry.

### 2. Junction visual grammar

V1 should establish one shared visual grammar:

- continuous conductor = same electrical conductor/path;
- filled junction node = explicit electrical join/branch;
- compact hop/interruption = crossing with no electrical connection;
- selection/trace treatment = interaction state only, never circuit truth.

Ground networks are an especially valuable use case for explicit nodes because several legitimate branches can otherwise look like accidental merges.

Where practical, junctions should be inspectable in Forge and expose graph-derived connected destinations.

### 3. Circuit configuration

For supported families, Forge should expose circuit-affecting choices that the authoritative model genuinely supports, including as applicable:

- wiring style;
- selector position/state;
- pickup configuration/construction;
- pot values and supported taper choices;
- tone capacitor values;
- treble-bleed topology/value;
- supported grounding/shielding choices;
- supported switching options.

Unsupported combinations must fail explicitly and safely.

### 4. Manufacturer physical conductor profiles

Use the canonical shared manufacturer-profile contract in `WIRING_SEMANTICS.md`.

The intended V1 customer direction is independent pickup profiles, including mixed-brand circuits, without manufacturer-specific circuit topology. Physical conductor presentation maps onto semantic pickup terminals and does not change electrical truth.

### 5. Interactive inspection

Forge should progressively support inspection of:

- component;
- terminal;
- physical pickup conductor where mapped;
- connection/wire;
- true junction;
- conductive path/net;
- selector/contact state.

Inspection text must derive from authoritative circuit state wherever possible.

Example future junction explanation:

`Ground junction — electrically joins the relevant casing/ground branch, bridge/string ground and output sleeve in this circuit state.`

Do not hard-code claims that can diverge from the graph.

### 6. Explain the circuit

V1 should answer useful circuit questions from current state, such as:

- what is this component/terminal?
- what connects here?
- why is this network present?
- what changes with selector position?
- what changes between supported wiring styles?
- what did adding/changing a treble bleed alter?

The explanation layer must not invent electrical behaviour beyond the model.

### 7. Semantic circuit views and trace

V1 may expose views such as All, Signal, Ground, Tone, Treble Bleed/Auxiliary and Switching where authoritative classification exists.

Views are presentation filters over one circuit state. Explicit trace/selection overrides de-emphasis. Selector state should make it easy to follow the currently conductive signal route.

### 8. Before/after circuit comparison

V1 should support a bounded comparison mode where useful, for example Modern vs 50s or no treble bleed vs a supported bleed network.

Comparison should identify graph/component/connection differences rather than merely place two unrelated screenshots side by side. This feature may follow the core Les Paul polish if implementation cost is material.

### 9. Component intelligence

Inspection/configuration should expose useful authoritative component facts such as role, nominal value, terminal identity and current connections.

This is the V1 nominal-component layer. Measured physical instances and nominal-versus-actual comparison remain V2 or later.

### 10. Exact product and kit handoff

Where catalogue/Kit Definition authority can make an exact match, Forge should identify the required supported Apparition components and hand the current configuration into the existing Kit Builder without asking the customer to recreate it.

Do not guess product matches. Unsupported/unavailable matches must remain explicit.

### 11. Export and print

V1 should provide a practical clean technical output once diagram polish is accepted. Intended direction:

- Save SVG;
- print-friendly diagram/workbench output;
- circuit specification and useful legend retained;
- interactive-only UI removed from print presentation.

PDF-specific export is optional if browser print already produces an excellent result.

### 12. Supported family breadth

The intended V1 progression remains:

1. Les Paul HH / 2V2T reference workbench;
2. Classic Telecaster as the next architecture-generalisation proof;
3. configurable Strat family within validated boundaries;
4. validated PRS Custom 24 switching within documented support boundaries.

Family breadth must not outrun diagram/inspection correctness.

### 13. Mobile and accessibility

Before V1 close-out, verify:

- useful responsive panel order;
- touch-friendly controls;
- diagram pan/zoom or equivalent usable navigation;
- explicit Fit Circuit/reset-view behaviour if needed;
- keyboard access and visible focus;
- selected/highlighted states that remain understandable without colour;
- accessible textual inspection/response alternatives where applicable.

## V1 response analysis

A response graph belongs in V1 because Apparition already has a validated Treble Bleed Designer engine. The implementation rule is **share the validated engine; do not duplicate it and do not overstate its scope**.

### Existing validated boundary

The canonical Treble Bleed Designer documentation records separate topology/default definitions, complex electrical calculations/taper, input state and SVG graph rendering. Its current model includes pickup R/L/Cp, volume control/taper, modern tone branch, cable capacitance, amplifier load and supported treble-bleed networks, with automated analytic/KCL validation and fixed source-relative dB behaviour.

This is currently a single selected pickup/volume network model. It is not validated as the complete passive Les Paul HH / 2V2T / selector circuit response.

### Shared response-engine goal

When implementation reaches this slice, extract or expose the validated calculation/state boundary at the lowest appropriate shared layer so:

- Treble Bleed Designer remains the specialist consumer;
- Circuit Forge can consume the same validated calculations for supported selected-network analysis;
- fixes/improvements to shared electrical calculations propagate to both consumers;
- Designer numerical behaviour remains unchanged by extraction unless an independently justified correction is made;
- graph rendering may remain consumer-specific if sharing it would couple presentation unnecessarily.

Do not create a copied `Forge response engine`.

### Forge V1 response presentation

Forge should label the feature precisely, for example:

**Selected volume network response**

not:

**Les Paul frequency response** or **full circuit response**.

The UI should clearly state that the graph models the selected supported pickup/volume/treble-bleed network under the validated Designer assumptions rather than the entire 2V2T guitar.

### State synchronisation

Where the validated assumptions match, Forge should pass current authoritative configuration into the shared response engine, including applicable values such as:

- selected neck or bridge volume network;
- volume pot nominal value;
- supported taper;
- tone capacitor/value where represented by the validated model;
- selected treble-bleed topology and values;
- volume position;
- validated pickup/load values when those are explicitly known or selected.

Changing a supported Forge value should update both diagram state and response state from the same authoritative configuration. Response state must not become a second independent circuit configuration.

### Interaction direction

Intended V1 behaviour:

- selecting Neck Volume can make the neck network the active analysis target;
- selecting Bridge Volume can switch the active analysis target;
- selecting a supported treble-bleed component can expose the relevant response;
- response/reference comparison should reuse validated Designer behaviour where possible;
- a deep-link/handoff to the standalone Treble Bleed Designer may expose the current supported network for deeper experimentation.

The exact panel/tab layout is a later implementation/UI decision. A likely direction is a workbench `Circuit | Response` or equivalent progressive-disclosure control rather than showing a large graph permanently.

### Response acceptance boundary

Before Forge exposes this analysis publicly:

- prove Designer outputs remain numerically equivalent across representative fixtures after shared-core extraction;
- prove Forge passes equivalent supported inputs to the same engine;
- test neck/bridge target switching without mutating circuit topology;
- preserve the Designer's reference/comparison semantics;
- retain numeric/text response samples or equivalent accessible alternative;
- unsupported/unvalidated configurations must suppress analysis or state the limitation clearly;
- no whole-guitar claim until a complete multi-pickup/selector/loading model is separately validated.

### Future full-circuit response

A validated multi-pickup/full-circuit response model is desirable but is not required for V1 close-out if it would delay a trustworthy release. The V1 selected-network analysis architecture should allow a future validated full-circuit engine to replace/extend the analysis target without redesigning the whole workbench.

## Explicit V1 exclusions

Unless separately promoted through a canonical contract, V1 does not require:

- account-backed saved circuits;
- My Circuits / My Components / My Pickups;
- Build Mode with measured physical component instances;
- nominal-versus-measured comparison;
- QR reopen/build records;
- arbitrary freeform circuit CAD;
- unvalidated full-guitar response claims;
- Pro-grade advanced simulation/documentation workflows.

Those belong to V2/Pro planning.

## Implementation order from current state

From the current Les Paul workbench, the preferred order is:

1. professional diagram composition polish: simplify redundant bends/merges, explicit true-junction nodes, compact crossing presentation and clean convergence;
2. complete the already-specified shared manufacturer-profile foundation and Generator consumption;
3. expose manufacturer profiles/physical-conductor meaning in Forge in a bounded UX pass;
4. extract/share the validated Treble Bleed Designer response engine and integrate selected-network analysis into Forge;
5. finish product/kit handoff, export/print, responsive/accessibility and comparison polish;
6. use Classic Telecaster to prove the accepted workbench/general shared architecture before broader Strat/PRS expansion;
7. V1 final regression, unsupported-state review and release acceptance.

A bounded implementation pass may combine adjacent items when safe, but should stop at a tested checkpoint rather than partially implementing multiple architectural boundaries.

## HQ / implementation split

HQ owns product direction, visual acceptance, manufacturer-source approval, terminology and scope promotion.

Implementation sessions should consume these contracts, inspect only the minimum relevant code, use deterministic tests instead of routine browser QA, and return unresolved subjective/product questions through HQ handoff rather than spending allowance rediscovering decisions already made here.

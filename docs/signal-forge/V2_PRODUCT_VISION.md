# Signal Forge V2 — Product Vision

Status: canonical HQ product-direction document. This records intended V2 product outcomes and differentiators; it is not an instruction to implement V2 before V1 is complete.

This document complements the V1 contracts and should guide later architecture so V1 foundations do not unnecessarily block V2.

## Product progression

- **V1 — Design and understand:** configure, inspect, trace, explain, analyse supported networks, compare supported changes and build a supported circuit/kit.
- **V2 — Own, build and maintain:** accounts, saved guitars/circuits, guided physical builds, measured components, troubleshooting, verification and persistent circuit records.
- **Pro — Engineer and document:** advanced/freeform circuit design, deeper simulation, professional documentation and advanced workflows.

V2 should remain generous. Accounts, saved circuits/guitars and core Guided Build should not be artificially restricted merely to force Pro conversion. Pro should monetise genuinely advanced/professional capability.

## V2 product pillars

Signal Forge should develop around five connected pillars:

1. **DESIGN** — configure circuits and explore compatible modifications.
2. **UNDERSTAND** — explanations, signal journeys, X-Ray views and supported response analysis.
3. **TEST** — Fault Finder, circuit health, failure simulation and guided multimeter checks.
4. **BUILD** — compatibility/preflight, parts, Guided Build and verification.
5. **OWN** — My Guitars, My Circuits, measured components, revisions and Circuit Passports.

These should be views/workflows over shared authoritative circuit/component state rather than disconnected mini-applications.

## Accounts, My Guitars and My Circuits

V2 should add account-backed persistence.

### My Circuits

Customers can save structured circuit state, not merely rendered SVGs. Saved circuits should therefore benefit from later renderer/UI improvements when reopened.

Expected capabilities include:

- save;
- rename;
- duplicate;
- edit;
- delete;
- share read-only where supported;
- build;
- maintain revision history where introduced.

### My Guitars

A saved instrument can own one or more circuit revisions/builds.

Representative sections may include:

- Circuit;
- Components;
- Builds;
- Measurements;
- Notes;
- Circuit Passport.

A guitar/instrument record should become the durable home for its electronics history without forcing private customer information into public sharing.

## Explore Mods / Modification Explorer

This is a flagship V2 direction and may begin in supported form earlier if appropriate.

A customer should be able to ask what compatible modifications are available for the current circuit/guitar, for example:

- treble bleed;
- Modern / 50s wiring where applicable;
- coil split;
- partial coil split;
- series / parallel;
- phase reversal;
- independent volume behaviour;
- kill switch;
- blower/bypass-style modifications where validated and supported.

Forge should explain:

- what the modification does;
- compatibility requirements;
- components required;
- physical pickup conductors involved;
- circuit connections changed;
- response implications where the validated model supports them.

A **Preview Modification** workflow should highlight additions/removals/changed connections before committing the experiment.

A future modification sandbox may allow temporary experiments that can be kept or discarded without overwriting the installed/saved circuit.

Do not offer modifications that cannot be deterministically supported by the current circuit/pickup/component model.

## Circuit compatibility and preflight

Signal Forge should become capable of deterministic compatibility guidance, such as:

- a modification requires a four-conductor humbucker;
- the selected pickup exposes or does not expose the required series link;
- a required switch/contact topology is unavailable;
- required components are missing;
- known physical constraints are incompatible where dimensional data is authoritative.

A future **Ready to Build?** preflight can combine:

- electrical health;
- modification compatibility;
- pickup conductor availability;
- required components;
- known physical compatibility;
- components already owned/supplied;
- build-instruction availability.

## Response Lab

The V1 selected-network response foundation should evolve into a broader **Response Lab** without overstating model validity.

Where validated, users should be able to manipulate supported variables such as:

- volume position;
- pot resistance;
- supported taper;
- treble-bleed topology/values;
- tone/control values where the validated model supports them.

Useful interactions include:

- live response updates;
- Frozen Reference;
- current vs proposed configuration;
- nominal vs measured component values;
- supported circuit/modification comparisons.

A future **Tone Map** may provide a more intuitive visualisation of modelled behaviour across control position/frequency or another validated parameter space.

Do not describe selected-network analysis as a complete guitar response unless the corresponding complete model has been independently validated.

## Component Playground

Where the electrical model supports continuous values, Forge may allow exploratory value controls such as pot/capacitor/resistor sweeps, then snap an experiment to real supported/stocked component values.

The goal is:

**experiment continuously → understand the effect → choose a physically available component.**

Product recommendations must remain electrically grounded and should avoid mythology-based tone claims.

## Show Me What Changed

Circuit differences should become first-class visual information.

When a supported change is made, Forge should be able to identify and explain:

- connections removed;
- connections added;
- component/value changes;
- topology/contact-state differences;
- response differences where validated;
- parts-list differences.

This should derive from structured circuit state rather than image comparison.

## Signal Journey / Follow the Signal

Forge should provide an educational walkthrough of the active signal path and, where useful, ground/return networks.

The presentation should highlight successive circuit stages without misleadingly depicting electricity as literal fluid flow.

Representative stages:

- pickup;
- volume/control network;
- selector/switching;
- output.

The walkthrough can explain each stage from graph/component truth.

## Ask the Circuit

Contextual deterministic questions should be available for selected objects where the graph/model can answer them reliably, for example:

- What is this?
- What connects here?
- Why is this grounded?
- Where does this signal go?
- What happens if this connection is broken?
- When is this switch contact active?
- Which components depend on this connection/network?

This is circuit intelligence derived from structured state. It should not depend on unconstrained generated answers for electrical truth.

## X-Ray learning views

### Switch X-Ray

Selecting a supported switch may expose an enlarged educational view of:

- physical terminals;
- internal contacts;
- currently closed contacts;
- contact changes across switch positions.

This is especially valuable for blade switches, toggles and push/pull DPDT switching.

### Pickup X-Ray

For supported pickup models/profiles, show:

- coils;
- semantic start/finish terminals;
- series link;
- hot;
- ground/shield;
- supported series/split/parallel relationships;
- manufacturer physical conductor mapping where approved.

### Pot X-Ray

An educational view may show the resistive track/wiper abstraction and explain supported taper/control behaviour as the control moves.

These views must remain technically accurate abstractions rather than decorative animations.

## Circuit Health Check

Signal Forge should be able to lint supported circuit graphs for deterministic issues.

Potential checks include:

- output path exists;
- expected ground path/network exists;
- selector/contact states are valid;
- unintended conductive crossings/merges are absent;
- supported tone/control networks are connected;
- required pickup profile information is complete;
- floating/unused terminals are identified appropriately;
- obvious shorts or disconnected paths are detected in future freeform circuits.

This is effectively circuit linting for guitar electronics.

## Failure Simulation

For supported deterministic cases, users may deliberately simulate faults such as:

- an open connection;
- short to ground;
- disconnected pickup/control path.

Forge can then explain graph-derived consequences and link the fault to an appropriate diagnostic test.

Do not claim to predict analogue/intermittent real-world faults beyond the supported model.

## Fault Finder

Fault Finder is a flagship V2 capability.

A user starts from a known/saved/supported circuit and chooses a symptom, for example:

- no output;
- no neck pickup;
- no bridge pickup;
- very quiet output;
- hum/noise symptoms where deterministic guidance is appropriate;
- tone control not functioning;
- volume not fully muting;
- selector behaviour incorrect;
- coil split/modification not functioning.

Signal Forge should use the actual circuit topology to produce an ordered diagnostic path and highlight relevant components/connections/test points.

Fault Finder should prefer deterministic electrical checks over generic troubleshooting prose.

## Virtual Multimeter / guided measurement

Fault Finder and educational workflows may expose a virtual meter interaction.

A user selects or is shown two authoritative test points and receives a supported expectation such as:

- continuity yes/no;
- expected switch/contact continuity state;
- resistance/result derived from the known model/components where valid.

The UI may show probe A/B placement directly on the diagram.

The user can enter the observed result, allowing Fault Finder to choose the next deterministic diagnostic step.

Never fabricate expected measurements where the circuit model does not support them.

## Guided Build / Paint-by-Numbers Builder

This is a flagship V2 and Apparition-kit experience.

Signal Forge should transform a known circuit into a connection-by-connection physical build workflow.

The experience should be usable for Apparition kits and, where supported, user-created/saved circuits.

### Core interaction

Rather than showing the complete diagram as the only instruction, Guided Build progresses through deterministic steps.

For each step:

- fade irrelevant circuit content;
- highlight the current component/terminal/conductor/connection;
- clearly identify physical orientation;
- explain the action at the selected guidance level;
- allow the customer to mark the step complete;
- reveal/progress the built circuit incrementally;
- retain progress safely.

Examples:

- install Neck Volume pot;
- ground lug 1 to casing;
- connect Neck Volume wiper to selector neck input;
- join/insulate manufacturer-specific pickup series-link conductors;
- connect pickup hot/ground/shield to the correct destinations.

### Guidance levels

A useful direction is:

- **Guided** — beginner-level preparation, tinning, soldering and verification explanation;
- **Standard** — concise connection-by-connection instructions;
- **Expert** — compact technical checklist.

All modes derive from the same circuit/build graph.

### Physical orientation

Every relevant instruction must make viewpoint/orientation explicit, for example:

- viewed from rear;
- solder-terminal side;
- shaft orientation;
- tip/sleeve identification.

Avoid common wiring-diagram ambiguity.

### Kit-aware wire identity

For an Apparition kit, the build manifest may know supplied wire colours, lengths, labels or pre-cut wire IDs.

A future instruction may therefore say, for example:

`W07 — white — 85 mm: Neck Volume wiper → selector neck input.`

Do not invent physical kit data that is not present in the authoritative kit definition/build manifest.

### Workbench Mode

Guided Build should eventually have a distraction-free workbench presentation suitable for a phone, tablet or laptop beside the guitar, with large Previous / Complete / Next controls and persistent progress.

Mobile optimisation is especially important for Guided Build even though desktop Forge visual work is prioritised during V1.

## Personalised Apparition-kit entry

Eligible Apparition kits should be able to launch a personalised Guided Build experience from a QR card or secure link.

A representative welcome experience is:

**Hello, [First name].**

**Thank you for choosing Apparition Instruments.**

Your [Kit Name] is ready to build. We have loaded the circuit and components supplied with your order.

**Ready to wire your guitar?**

`START MY BUILD`

The exact copy is subject to later UX/copy acceptance.

### Security model

Do NOT expose an order merely by using a predictable order number in a public URL.

The preferred direction is a cryptographically random Build Access token/secure link associated with an eligible build/kit record.

If manual recovery is offered, use appropriate verification such as order number plus matching order email or another secure mechanism.

The public build client should receive only the minimum safe build/customer data required for the experience.

### Build identity vs order identity

The durable QR/access identity should ultimately belong to the **build**, not merely the commerce order.

Conceptual relationship:

**Customer → Order → Kit → Build → Guitar / Circuit Passport**

One order may contain multiple kits and therefore multiple independent builds/passports.

The order is the initial provisioning source; the build becomes the long-lived technical identity.

## Apparition kit welcome and inventory check

Because the order/kit definition is known, Guided Build may begin with an exact supplied-component check.

Example categories:

- pots;
- capacitors;
- treble bleeds;
- selector/switch;
- output jack;
- wire;
- other included hardware.

If a customer reports a missing supplied component, the future support flow can retain the relevant order/build context.

## Personalised build progress

A secure build session should allow customers to resume later.

Representative return experience:

**Welcome back, [First name]. Your build is 44% complete. Continue from Neck Volume → Selector.**

Completion may record:

- build completion date;
- completed connection count;
- verification/check status;
- circuit revision;
- installed components where known.

## Verification during Guided Build

At appropriate checkpoints, Build Mode can ask the customer to perform deterministic continuity/resistance checks.

Example:

- show probe positions;
- state expected result where supported;
- ask for observed result;
- pass → continue;
- fail → launch the relevant Fault Finder branch.

This creates a coherent lifecycle:

**Build → Verify → Fault Finder if necessary.**

## My Components and measured instances

V2 should distinguish nominal component definitions from physical measured instances.

A physical component instance may record, where appropriate:

- component/product identity;
- nominal value;
- measured value;
- QC date/source;
- unique Apparition/component identifier;
- current assignment to a guitar/circuit position.

Examples include measured pots, capacitors, resistors and pickups where suitable.

A customer's My Components area can distinguish unassigned parts from components installed in a saved guitar.

## Apparition QC component identity

An Apparition-supplied measured component may have a QR/code allowing it to be added to a customer's circuit/build.

Example concept:

`AI-POT-004829 — CTS A500k — measured 501.7kΩ — Apparition QC`

This can support exact installed-component records and nominal-vs-measured analysis.

Do not expose internal/private manufacturing/order data unnecessarily through public component identities.

## Nominal vs actual circuit

Where the validated electrical model supports it, V2 should allow comparison between nominal circuit values and the user's actual measured installed components.

This is a natural extension of Response Lab and should remain explicit about model assumptions.

## Build history and circuit revisions

Saved guitars/circuits should be able to retain meaningful revisions such as:

- factory/reference circuit;
- component replacement;
- Modern → 50s conversion;
- treble bleed addition;
- pickup/switch modification.

Structured revision comparison can power **Show Me What Changed** and supported response comparisons.

## Shareable interactive circuits

Users should eventually be able to share a read-only interactive circuit rather than only a screenshot.

Recipients may inspect/trace/understand the shared circuit and, where permitted, duplicate it into their own account.

Private account/build/order data must not leak into a public circuit share.

Community discovery/library features are deliberately lower priority than making Save → Build → Measure → Share excellent.

## Circuit Passport

A completed build may become a long-lived **Signal Forge Circuit Passport**.

The Passport can be opened from a QR associated with the build/guitar and may include safe/shareable technical information such as:

- instrument identity/description;
- current circuit/revision;
- pickups;
- installed component specifications/measurements where appropriate;
- interactive diagram;
- build completion/verification record;
- service/revision history;
- last verified state.

The same QR lifecycle can evolve from build entry into ongoing technical support after completion.

Conceptual lifecycle:

**Scan → Build → Verify → Save → Passport → Fault Finder → Service**

### Transfer

A future Passport transfer workflow may allow a guitar's technical record to move to a new owner without transferring the previous owner's private account/order information.

This requires explicit privacy/security design before implementation.

## Physical QR card for eligible kits

Eligible Apparition kits may include a physical card with:

- Apparition branding;
- QR entry to the secure Guided Build;
- order/build reference safe for display;
- a short fallback Build Code if useful;
- concise explanation that the exact kit/build guide is preloaded.

The QR/token itself must not be a predictable order-number URL.

## Store and lifecycle integration

For eligible kit purchases, transactional/order surfaces may eventually provide an **Open Guided Build** action once the build record is provisioned.

This should reuse the same secure build identity as the physical QR.

For individual supported components, a smaller installation workflow may guide only the affected modification rather than forcing a full guitar build.

Guided Build is both a product capability and premium after-sales support. It should not become an excuse to lock general educational content behind purchases.

## Reuse what I already have

Signal Forge should support customer-owned/existing components and identify which parts can be reused for a proposed supported circuit/modification.

The output should distinguish:

- compatible existing parts;
- missing required parts;
- unsupported/uncertain compatibility.

This supports trust and avoids unnecessary product recommendations.

## Soldering / physical wiring view

A future physical/soldering view can prioritise practical installation orientation over abstract electrical layout.

Potential modes include:

- schematic/technical understanding;
- wiring diagram;
- soldering/build view.

This must remain derived from the same authoritative topology/component/terminal model.

## Beginner / Standard / Technical presentation

Signal Forge may expose different information densities without changing the circuit itself.

Possible modes:

- Guided/Beginner;
- Standard;
- Technical/Expert.

Technical mode can expose deeper terminal/net/contact/value information. Beginner mode can favour physical descriptions and explanations.

## Future camera-assisted build checking

A later experimental capability may use a customer-supplied control-cavity image to help identify visible components, wire destinations or obvious discrepancies.

It must NOT claim that a photograph electrically certifies a circuit.

Any visual assistance should lead to deterministic continuity/measurement verification where possible.

## Pro direction — freeform Circuit Forge

A major Pro direction is a blank/freeform circuit workspace where users can place supported components and create arbitrary supported connections.

The system can then provide:

- graph validation;
- circuit health/linting;
- switch/contact behaviour;
- supported response/simulation;
- generated wiring/build views;
- professional documentation.

This should evolve from the same shared component/terminal/graph infrastructure rather than becoming a separate circuit engine.

## Circuit Intelligence

The long-term differentiator is not a collection of disconnected features. It is **Circuit Intelligence** backed by structured, deterministic circuit truth.

Signal Forge should increasingly know, where supported:

- what each component is;
- what each terminal means;
- what is connected;
- what is conductive in the current switch state;
- why a path exists;
- what changed between configurations;
- whether a modification is compatible;
- which physical pickup conductor maps to which semantic terminal;
- which parts are required;
- which measurements/tests are meaningful;
- what deterministic consequences follow from a simulated fault.

Features such as Explore Mods, Fault Finder, Guided Build, X-Ray, Response Lab, Circuit Health and Circuit Passport should consume this shared intelligence rather than inventing independent electrical truth.

## Product-quality target

The intended customer reaction is:

**Don't hunt for a static wiring diagram. Put the guitar into Apparition Signal Forge.**

The strongest differentiators are expected to include:

- interactive self-explaining circuits;
- Explore Mods / modification preview;
- diagram + supported response changes together;
- manufacturer-accurate conductor mapping;
- circuit-aware Fault Finder;
- guided/virtual multimeter diagnostics;
- Guided Build / paint-by-numbers installation;
- actual measured component instances;
- Circuit Health and failure simulation;
- shareable interactive circuits;
- QR-backed Circuit Passports;
- later Pro freeform guitar-electronics CAD.

## Implementation boundary

This document is product direction, not permission to start V2 during V1.

Current implementation priority remains Signal Forge V1 desktop visual/UX completion and the V1 roadmap recorded in canonical V1 documents.

Future V1 architectural decisions should avoid unnecessarily blocking this V2 direction, but should not over-engineer V1 for speculative V2 requirements.

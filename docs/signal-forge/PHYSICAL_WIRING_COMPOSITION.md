# Signal Forge — Physical Wiring Composition Contract

Status: canonical HQ V1 implementation specification for the next substantial Astra V4 pass.

This document records Luke's rendered acceptance direction after the V3 routing/composition work. It is intentionally implementation-oriented. The goal is to remove remaining diagram spaghetti by representing how a guitar is physically wired, while preserving the complete electrical graph underneath for tracing, explanation and analysis.

## Core principle

**Electrical net truth is not the same thing as a physical conductor or physical termination.**

The shared circuit graph remains authoritative for electrical topology, conductive nets, terminals, switch/contact behaviour and path tracing. The physical wiring view should additionally understand where each real conductor terminates and how a technician would actually assemble the harness.

Default physical diagrams should answer **what do I solder, and where?** Electrical tracing may reveal the wider conductive net when requested.

Do not make the router infer physical assembly from conductive-net equivalence alone.

## Shared architecture

The intended pipeline is:

1. authoritative circuit/component/terminal graph;
2. semantic connection roles and conductive-net identity;
3. physical conductor and termination metadata;
4. physical harness composition;
5. shared router;
6. shared SVG renderer and consumer-specific interaction.

Circuit Forge and the Wiring Diagram Generator must consume the same physical-wiring semantics, router and renderer at the lowest appropriate shared layer. Do not create Forge-only, Generator-only or Les-Paul-only physical wiring logic where a shared rule applies.

## Terminal-first physical routing

Where a physical conductor terminates on a component terminal, route that conductor directly to the real terminal.

Do not visually merge it into another route belonging to the same conductive net before the physical termination merely because both are electrically equivalent.

A component terminal is an intentional convergence point. Separate physical conductors may meet electrically at that terminal while remaining visually distinct until they reach it.

This rule is especially important for pickup hot conductors and pot lugs.

## Pickup hot conductors

For a normal series humbucker profile, the pickup hot conductor should run directly from the pickup cable to its intended volume-pot input lug or other authoritative destination.

Example for the approved Seymour Duncan standard four-conductor profile:

- Black is the normal hot/output conductor.
- In the supported Les Paul reference circuit it should terminate directly at the appropriate Neck or Bridge Volume input lug.
- The renderer must not make Black appear to merge into a neighbouring signal/output route before reaching that lug.

The electrical graph may continue from that terminal through the rest of the circuit. The physical conductor itself ends at its solder termination.

## Series-link presentation

Where two pickup conductors form the normal series link, show a short local physical join associated with the pickup cable rather than routing either conductor through the wider circuit.

For Seymour Duncan standard four-conductor series wiring, Red + White form this local join. The diagram/inspector should be capable of communicating that the pair is joined and insulated.

Equivalent behaviour for other verified profiles must derive from the shared manufacturer mapping authority rather than hard-coded colour-specific circuit logic.

## Pickup ground and shield local termination

Where the pickup coil-ground conductor and shield/drain both terminate at the same local ground point, preserve them as distinct semantic/physical conductors but route them to the same intentional local solder point.

For Seymour Duncan standard four-conductor series wiring:

- Green is the coil-ground conductor;
- Bare is the shield/drain;
- Green + Bare should terminate locally at the respective volume-pot casing solder point in the supported Les Paul physical view.

Do not independently route Green and Bare around the wider ground network merely to demonstrate conductive equivalence.

The inspector/tracing system must retain their separate identities even when they share a physical solder point.

## Grounded pot lugs

Where an outer pot lug is intentionally grounded to its own casing, show the local physical operation rather than sending the lug into a long ground branch.

Preferred supported representations:

1. a compact bent-lug-to-casing representation where that is the intended build method; or
2. a very short local jumper from lug to casing.

The casing solder point is the local termination. The wider ground network begins from the casing/bus, not from an unnecessarily long independent lug route.

This is presentation of physical assembly and must not alter conductive truth.

## Pot casings as intentional local ground hubs

In the supported physical wiring view, pot casings may act as deliberate local ground hubs when the circuit/build specification says conductors terminate there.

A casing can therefore host explicit local terminations such as:

- pickup coil ground;
- pickup shield/drain;
- grounded pot lug;
- deliberate ground-bus continuation;
- other explicitly modelled local ground connections.

Do not collapse arbitrary same-net ground conductors onto a casing merely because it is convenient geometrically. Physical termination semantics must authorise the connection.

## Deliberate ground bus / ground loop composition

The physical Les Paul reference diagram should prefer a deliberate, legible ground-bus/harness representation over multiple independent long ground routes.

Once local terminations have been resolved, the remaining casing/common-ground connections should form an intentional physical grounding path between the required pot casings and onward to the output jack sleeve/ground.

The exact route should be selected by shared physical-composition rules and accepted physical build practice, not by drawing a separate path from every grounded object to the jack sleeve.

Bridge/string ground and cavity-shield connections should join the common ground system at explicit, sensible, graph-backed physical points rather than creating visually sprawling parallel branches.

The selector must not become an arbitrary waypoint for unrelated ground wiring. Only draw a switch ground connection where the supported physical/electrical model actually requires one.

## True junctions and solder nodes

A filled node/solder indication should represent a real physical/electrical junction, not a visual crossing.

Where several physical conductors terminate at one casing solder point, the renderer may show one explicit solder/junction node while retaining the individual conductor identities in metadata and inspection.

Non-conductive crossings remain non-conductive and must retain the shared compact crossing cue.

## Physical view versus electrical trace

The default wiring diagram may simplify the visible conductive network by showing local physical terminations and a deliberate harness/bus.

This must never remove electrical knowledge from the model.

Interaction should preserve the distinction:

- selecting a wire/conductor identifies that physical conductor;
- selecting a terminal or solder point identifies the physical junction and attached conductors;
- Trace Signal / Trace Ground / path inspection may traverse the complete authoritative electrical graph beyond the selected physical conductor.

A future Physical Wiring / Electrical view toggle is compatible with this architecture but is not required merely to complete this pass.

## Manufacturer conductor profiles in Circuit Forge

Circuit Forge V1 should expose the existing shared manufacturer conductor profiles already specified in `WIRING_SEMANTICS.md` and already consumed by the Wiring Diagram Generator.

Do not create a Forge-local manufacturer table.

Forge should consume the same shared manufacturer/conductor mapping authority, including support-state and provenance rules.

Intended Forge behaviour:

- manufacturer/profile selection belongs to each pickup instance at the shared-data level;
- mixed-brand neck/bridge configurations remain supported by the architecture;
- Generic / Semantic remains first-class;
- verified profiles expose their approved physical conductor colours and instructions;
- Fender without a verified family/model must not receive an invented universal mapping;
- unsupported/unresolved profiles fail safely to semantic presentation;
- changing manufacturer/profile must not change circuit topology.

For an approved Seymour Duncan standard four-conductor humbucker, Forge should be able to communicate:

- Hot: Black;
- Series join: Red + White;
- Ground: Green;
- Shield: Bare;
- Black terminates at the appropriate volume input lug in the supported reference circuit;
- Red + White are joined locally and insulated;
- Green + Bare terminate at the intended local pot-casing solder point.

Inspector copy should derive destinations from the actual circuit/termination model rather than hard-coding a Les Paul sentence into the manufacturer profile.

## Shared Generator inheritance

Any new physical-termination semantics introduced for this work must be reusable by the Wiring Diagram Generator.

The Generator remains primarily build/instruction oriented and should benefit automatically from improvements to shared physical wiring composition where applicable.

Do not regress its existing manufacturer selector or its 54 supported configuration regression boundary.

## Routing relationship

Routing V2 and V3 remain valid foundations. This work is not another generic route-cost pass.

The shared router should receive a better description of the physical wires it is being asked to route. Once local terminations, bus membership and real convergence points are explicit, use the existing routing machinery and only make bounded shared routing changes necessary to present those physical wires cleanly.

Avoid family-specific coordinate patches.

## Desktop visual acceptance goals

Luke's current priority remains professional desktop visual design and intuitive use. For the diagram specifically, this pass should materially reduce:

- unnecessary long ground runs;
- multiple conductors redundantly tracing the same equipotential network;
- premature same-net merges;
- unnecessary bends and doglegs around volume controls;
- congestion below/around pot lugs;
- visually confusing selector/output approaches;
- ambiguity about where the user actually solders a conductor.

The intended result should look like a deliberate physical harness a competent guitar technician would recognise, while retaining interactive electrical intelligence underneath.

Mobile optimisation remains deferred to V1 close-out.

## Required invariants

The implementation must preserve:

- authoritative circuit topology;
- semantic terminal identity;
- conductive net identity;
- selector/contact truth;
- junction versus crossing truth;
- existing path/trace correctness;
- Routing V2 net separation;
- Routing V3 terminal fan-out/local lanes where still applicable;
- shared Forge/Generator router and renderer;
- manufacturer-profile electrical invariance;
- no production business-data mutation.

Physical composition must not silently change the circuit to obtain a prettier drawing.

## Suggested acceptance cases

At minimum, cover focused deterministic cases for:

- pickup hot terminates at the intended pot lug rather than prematurely merging with another same-net route;
- pickup coil-ground + shield remain distinct conductors but share the authorised local casing solder point;
- grounded pot lug uses an explicit local casing bond rather than a long independent ground branch;
- local casing terminations still trace correctly through the full ground net;
- true solder/junction nodes remain graph/termination backed;
- non-conductive crossings remain non-conductive;
- manufacturer profile changes alter physical presentation only;
- Seymour Duncan neck + DiMarzio bridge can coexist at the shared-data/API level without topology change;
- Generator supported configurations remain valid;
- identical state produces deterministic physical composition and routing.

## Scope for the first substantial V4 implementation pass

The preferred coherent pass is:

1. introduce the minimum shared physical-termination/composition model required by these rules;
2. implement terminal-first pickup hot routing;
3. implement local series-link presentation where supported;
4. implement pickup ground + shield local casing termination;
5. implement compact grounded-pot-lug-to-casing representation;
6. compose a deliberate shared ground bus/harness from authorised physical termination points;
7. expose the existing shared manufacturer conductor profiles in Circuit Forge without duplicating Generator logic;
8. integrate inspection metadata/copy where the shared model makes it deterministic;
9. preserve and reuse the shared router/renderer;
10. add focused physical-composition tests and run relevant Forge/Generator regressions;
11. deploy and verify changed live assets programmatically;
12. leave subjective rendered acceptance to Luke and perform no routine manual browser QA.

If the complete ground-bus composition requires a larger graph-layout rewrite than expected, implement the safest coherent physical-termination foundation first and report the next bounded step. Do not allow scope to explode or fall back to Les Paul coordinate hacks.

## Explicit exclusions

Do not broaden this pass into:

- V2 Guided Build, Circuit Passport, Fault Finder or account work;
- complete multi-pickup analogue response modelling;
- new guitar families;
- mobile final polish;
- homepage/marketing work;
- commerce, payment, order, refund, email, Auth, Contact or inventory changes;
- production business-data mutation;
- manufacturer re-research already settled in `WIRING_SEMANTICS.md`.

## HQ acceptance

Luke owns rendered visual acceptance. Automated tests can establish electrical and geometry invariants but cannot declare the final diagram visually accepted.

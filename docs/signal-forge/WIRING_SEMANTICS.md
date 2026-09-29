# Signal Forge Wiring Semantics

Status: canonical HQ specification. Implementation must preserve the shared-core rules in `ARCHITECTURE.md` and the current V1 contract.

## Purpose

This document defines how Apparition presents electrical wiring semantics across Circuit Forge and the Wiring Diagram Generator. Electrical meaning comes from the shared circuit/component/terminal graph. Presentation may expose that meaning, but must never create or override electrical truth.

## Shared semantic roles

Where the graph can determine the role reliably, rendered connections may expose:

- `signal` — primary audio/hot path;
- `ground` — circuit reference/ground network;
- `tone` — tone-control network;
- `auxiliary` — auxiliary networks such as treble bleed;
- `switch` — selector/switch/contact wiring.

Correctness outranks classification completeness. Unknown or ambiguous connections must not be guessed from colour, coordinates, CSS, SVG position, component placement, or tool-specific UI state.

## Semantic role is not conductive net identity

A connection's semantic role and conductive net identity are separate concepts.

Two routes may both have `role: signal` while belonging to different conductive nets, for example neck-pickup hot and bridge-pickup hot. Shared rendering and future interaction must preserve this distinction.

This permits restrained role-based presentation while still allowing a particular conductive net to be traced or emphasised independently.

## Presentation precedence

The intended presentation hierarchy is:

1. base semantic role;
2. active role/view filter;
3. explicit user trace/highlight;
4. direct selection/focus.

Higher-priority interaction must remain obvious without changing circuit state. Circuit Forge view modes are presentation filters over the same authoritative circuit.

## Visual-language principles

Spatial legibility comes before colour. Routing, spacing, junctions and crossings must remain understandable without relying on colour.

Colour is supplementary and is never electrical authority. Semantic styling must retain usable non-colour cues through junction/crossing treatment, labels, focus/highlight, line treatment and textual inspection where applicable.

The final production palette is an HQ product/design decision. The intended restrained direction is:

- signal/hot — neutral dark/charcoal family;
- ground — cool neutral grey family;
- tone — Apparition red family;
- auxiliary/treble bleed — restrained blue family;
- switch/contact — muted gold family;
- inactive/open — de-emphasised/desaturated treatment;
- explicit trace/selection — strong high-contrast treatment overriding base semantic styling.

Exact production colour values are intentionally not fixed here yet. Do not invent a final palette during an unrelated engineering pass.

## Role views

Circuit Forge may expose role views such as All, Signal, Ground, Tone and Treble Bleed/Auxiliary. A role view should emphasise matching wiring and de-emphasise unrelated wiring rather than generating a different circuit.

An explicit user trace takes precedence over the current role view.

The Wiring Diagram Generator may use the same shared semantic presentation without duplicating Circuit Forge's richer interaction controls.

## Ground semantics and future subtypes

The current shared role is `ground`. The architecture should not block later trustworthy subtypes such as:

- signal ground;
- pickup ground;
- shield/drain;
- bridge/string ground;
- cavity shield;
- casing/chassis bond.

These subtypes must only be introduced when they can be derived from authoritative circuit/component semantics. They must not be inferred from drawing position or colour.

## Pickup conductor semantic model

Manufacturer wiring conventions are a physical presentation mapping over semantic pickup terminals. They must not create manufacturer-specific circuit topology.

For multi-conductor humbuckers, the shared model should be capable of representing semantic coil terminals such as:

- coil A start;
- coil A finish;
- coil B start;
- coil B finish;
- shield/drain where present.

Higher-level circuit concepts such as hot, series link and ground are derived from how those terminals are connected in the selected circuit, not permanently encoded as a manufacturer's wire colour.

Single-coil, two-conductor, braided-shield and other pickup constructions may expose only the semantic terminals they physically support.

## Manufacturer profiles

Manufacturer profiles map physical conductor presentation onto semantic pickup terminals. They do not change electrical behaviour by themselves.

Initial intended profiles:

- Generic / Semantic;
- Seymour Duncan;
- DiMarzio;
- Gibson;
- Fender;
- Tonerider;
- Warman.

The manufacturer/profile selection belongs to each pickup instance, not globally to the guitar. Mixed-brand circuits must therefore be supported naturally, for example a Seymour Duncan neck pickup with a DiMarzio bridge pickup.

`Generic / Semantic` remains a first-class profile and must not be treated as a fallback error state.

## Shared manufacturer authority

Circuit Forge and the Wiring Diagram Generator must consume one shared manufacturer/conductor mapping source. Do not create separate Forge and Generator mapping tables.

Manufacturer-specific circuit engines or duplicated manufacturer topology are prohibited. A correction to a verified conductor mapping should propagate to every applicable consumer of the shared mapping authority.

## Model-specific pickup profiles

The architecture may later support model-level profiles such as manufacturer + model, for example a specific four-conductor humbucker. Such profiles may describe supported physical conductor systems and capabilities, but must continue to map onto the same shared semantic terminal model.

This is an extension point, not a V1 requirement.

## Provenance and verification rule

Actual manufacturer conductor colours must not be populated from model memory, forum convention, retailer copy or assumption.

Use first-party manufacturer documentation wherever reasonably available. Each mapping should record enough provenance to distinguish:

- verified first-party mapping;
- verified product/family-specific exception;
- unresolved/ambiguous mapping;
- unsupported construction.

If first-party documentation is unavailable or ambiguous, leave the mapping unresolved until HQ explicitly approves another source. Do not silently guess.

Manufacturer conventions can vary by pickup family, construction or era. A brand-level default must not override a documented model-specific exception.

## Verified manufacturer conductor mappings

HQ research is pending. The entries below are deliberately not populated from memory.

### Generic / Semantic

Canonical semantic representation. No physical manufacturer colours are required.

### Seymour Duncan

PENDING FIRST-PARTY VERIFICATION.

### DiMarzio

PENDING FIRST-PARTY VERIFICATION.

### Gibson

PENDING FIRST-PARTY VERIFICATION. Treat construction-specific and model-specific wiring as potentially significant.

### Fender

PENDING FIRST-PARTY VERIFICATION. Do not assume a universal multi-conductor convention across Fender pickup families.

### Tonerider

PENDING FIRST-PARTY VERIFICATION.

### Warman

PENDING FIRST-PARTY VERIFICATION.

## Implementation boundary

When this specification is handed to an implementation pass:

- consume the existing shared graph and renderer;
- preserve role/net separation;
- preserve one shared mapping authority;
- do not independently research or reinterpret manufacturer mappings already approved here;
- do not populate pending mappings from memory;
- keep tool-specific UX local while shared electrical and physical-conductor truth remains in the lowest appropriate shared layer.

## HQ ownership

Luke + ChatGPT HQ owns final palette approval, manufacturer-source verification, mapping approval, subjective visual acceptance and product-level UX decisions. Astra/implementation sessions should hand unresolved subjective or research questions back through `HQ HANDOFF` rather than spending engineering allowance on them.

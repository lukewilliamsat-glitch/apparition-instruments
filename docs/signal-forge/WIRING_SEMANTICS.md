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

The mappings below are approved only for the construction/family described. Coil labels must be normalised carefully during implementation because manufacturers do not all use the same north/south, slug/screw or start/finish terminology.

### Generic / Semantic

Canonical semantic representation. No physical manufacturer colours are required.

### Seymour Duncan — standard four-conductor humbucker

Status: VERIFIED FIRST-PARTY.

- fixed/slug (north in Seymour Duncan documentation) coil pair: black + white;
- adjustable/screw (south) coil pair: red + green;
- normal series humbucking: black is hot/output; red + white form the series link; green + bare go to ground;
- bare is shield/ground and must remain distinct from the coil conductor in the semantic model even when both terminate at ground.

Source authority: Seymour Duncan technical documentation/blog describing four-conductor pickup resistance testing and normal series connection.

Caution: do not apply this profile automatically to Seymour Duncan stacks or other constructions with different conductor systems. Those require model/family profiles.

### DiMarzio — standard four-conductor humbucker

Status: VERIFIED FIRST-PARTY.

- normal series humbucking: red is hot/output;
- black + white form the series link;
- green + bare go to ground;
- DiMarzio documents phase reversal with other pickups as a wiring variation, not a different default conductor profile.

Source authority: DiMarzio official FAQ, “How do I connect a 4-conductor pickup?”.

Caution: model-specific constructions may differ and require their own profile.

### Gibson — listed four-conductor models

Status: VERIFIED FIRST-PARTY FOR THE MODELS COVERED BY GIBSON'S PUBLISHED FOUR-CONDUCTOR DIAGRAM.

Gibson's published diagram covers 490R/490T, 498T, 496R, 500T and Tony Iommi Signature four-conductor models:

- red to controls/hot;
- green + white form the normal series link;
- black + shield go to ground.

Source authority: Gibson Pickup Wiring Diagram for four-conductor models.

Do not treat this as a universal rule for every Gibson pickup. Gibson also sells braided/two-conductor and Quick Connect constructions. Quick Connect and other construction-specific pinouts require their own verified profile before support.

### Fender

Status: FAMILY/MODEL-SPECIFIC — NO UNIVERSAL BRAND DEFAULT APPROVED.

Fender first-party documentation confirms multiple multi-conductor humbucker constructions, including Shawbucker, Twin-Head and Kingfish families, but the reviewed documentation does not justify one universal Fender conductor-colour profile across all Fender humbuckers.

Implementation must therefore require a verified Fender family/model profile rather than applying a generic `Fender` colour mapping.

The architecture may retain Fender as a manufacturer choice only when the selected pickup profile identifies a supported conductor family. Do not infer a universal mapping from third-party comparison charts.

### Tonerider — standard four-conductor humbucker

Status: VERIFIED FIRST-PARTY.

Tonerider's official colour-code table identifies its standard humbucker conductors by physical coil:

- slug coil start: red;
- slug coil finish: black;
- screw coil finish: white;
- screw coil start: green.

Tonerider states its humbuckers use four-conductor hookup cable. Individual product diagrams remain authoritative for product-specific exceptions.

Source authority: Tonerider official “Pickup Wiring Colour Codes”.

### Warman — documented standard humbucker convention

Status: VERIFIED FIRST-PARTY.

Warman's official wiring guidance identifies:

- black: negative/start of the South coil;
- white: positive/finish of the South coil;
- red: negative/finish of the North coil;
- green: positive/start of the North coil;
- bare: chassis/shield earth.

For Warman's documented standard series connection, black + bare go to ground, red + white form the series link, and green is hot/output.

Source authority: Warman Guitars official “Humbucker Wire Colours” / “Working out humbucker wire colours” guidance.

Caution: preserve the manufacturer's documented polarity/coil terminology in provenance and normalise to Apparition semantic terminals explicitly rather than assuming another manufacturer's north/south naming convention is equivalent.

## Manufacturer profile implementation contract

This section is the implementation-ready HQ contract for the next shared manufacturer-profile pass. Implementation should consume these decisions rather than redesigning them.

### Canonical profile shape

The shared manufacturer authority should expose the smallest stable representation compatible with the existing codebase. Exact JavaScript naming may follow repository conventions, but each supported profile must be able to express:

- stable profile ID;
- manufacturer display name;
- construction/family applicability;
- support status;
- semantic-terminal to physical-conductor mapping;
- shield/drain as a distinct physical conductor where present;
- human-readable normal-series instructions derived from the mapping;
- provenance/status metadata sufficient to preserve the verification rules above;
- optional model/family exception capability without changing circuit topology.

Do not duplicate derived `hot`, `series link` and `ground` truth if the shared circuit can derive those concepts from semantic terminals. Presentation helpers may expose those derived instructions for consumers.

### Required support states

Profiles must distinguish at least these conditions:

1. `generic` — canonical semantic presentation, deliberately selected and fully supported;
2. `verified` — approved physical mapping exists for the selected construction/family;
3. `requires-model` — manufacturer exists but no universal brand mapping is approved, currently Fender;
4. `unsupported` or `unresolved` — no approved mapping for the requested construction/profile.

Unsupported or unresolved input must fail safely to semantic presentation with a clear consumer-visible explanation where relevant. It must never guess physical colours.

### Per-pickup selection

Profile state belongs to each pickup instance. The shared API must therefore permit neck and bridge pickups to use different profiles in the same circuit.

A consumer may choose to offer a convenience action that applies one profile to both pickups, but this is UI sugar only. The shared authority must not model manufacturer as one guitar-wide electrical setting.

### Electrical invariance rule

Changing manufacturer/profile is presentation and physical-wiring metadata only.

For a fixed circuit configuration, changing `Generic / Semantic` to Seymour Duncan, DiMarzio, Gibson, Tonerider or Warman must not alter:

- components;
- semantic terminals;
- connections;
- selector/contact state;
- conductive net identity;
- conductive paths;
- routing topology except presentation geometry that is strictly necessary to depict physical conductors;
- kit/product selection logic unless a later explicit product-matching feature intentionally consumes pickup metadata.

This invariance is a required automated regression boundary.

### Mixed-brand acceptance case

The implementation must support, at minimum at the shared-data/API level, a circuit such as:

- neck pickup: Seymour Duncan standard four-conductor;
- bridge pickup: DiMarzio standard four-conductor.

Each pickup receives its own physical conductor presentation while the underlying graph remains unchanged.

### Generator consumer contract

The Wiring Diagram Generator is the first implementation consumer because it already exposes pickup wire-colour selection.

Its existing control should consume the shared manufacturer authority rather than a Generator-local mapping table. Preserve the Generator's current workflow unless a very small change is required to represent per-pickup profiles safely.

For this first pass:

- `Generic / Semantic` preserves the current semantic/default behaviour;
- verified profiles display the approved physical conductor mapping;
- `requires-model`, unsupported and unresolved profiles must not display invented colours;
- manufacturer selection must not change circuit topology;
- the existing 54 Generator configurations remain a regression gate;
- if the current Generator control is guitar-wide, implementation may preserve that UX temporarily only if the underlying shared API is per-pickup and therefore does not block mixed-brand Forge support. Do not perform a broad Generator UI redesign merely to expose mixed-brand selection in this pass.

### Future Circuit Forge consumer contract

Circuit Forge is intentionally not required to receive the full manufacturer UI in the first shared-foundation pass. However, the shared authority created now must support a later Forge UX without redesign.

The intended Forge presentation is per pickup and inspection-led. A future inspector should be able to present, for example:

- `Neck pickup — Seymour Duncan`;
- `Black → hot → [derived destination]`;
- `Red + White → series link / join and insulate`;
- `Green + Bare → ground`, while retaining bare/shield as semantically distinct metadata.

A different profile may be selected independently for the bridge pickup. Clicking/highlighting a physical conductor may later trace the corresponding semantic terminal/path, but that interaction is not required in the first shared-foundation pass.

### Manufacturer acceptance matrix

The first implementation pass should test these representative behaviours rather than exhaustively multiplying every circuit configuration by every manufacturer:

| Case | Expected result |
| --- | --- |
| Generic / Semantic | Existing semantic/default presentation; topology unchanged |
| Seymour Duncan standard 4-conductor | Black hot; red + white series link; green + bare ground; topology unchanged |
| DiMarzio standard 4-conductor | Red hot; black + white series link; green + bare ground; topology unchanged |
| Gibson approved 4-conductor family | Red hot; green + white series link; black + shield ground; topology unchanged |
| Tonerider standard 4-conductor | Mapping derives from approved semantic coil-terminal mapping; topology unchanged |
| Warman documented standard | Green hot; red + white series link; black + bare ground; topology unchanged |
| Fender without supported family/model | No universal physical mapping; safe semantic presentation / requires-model state |
| Mixed SD neck + DiMarzio bridge | Independent physical mappings; one unchanged circuit graph |
| Unknown/unsupported profile | No guessed colours; safe semantic fallback or explicit unsupported state |

### Research boundary

The next implementation pass must not spend engineering allowance re-researching the approved manufacturer mappings in this document. If implementation discovers an ambiguity in semantic normalisation, model applicability or a missing mapping, hand that exact question back to HQ rather than searching broadly or guessing.

## Crossing/junction renderer polish acceptance

Routing V3 is accepted. The next implementation pass may include one bounded shared-renderer presentation correction before manufacturer-profile work.

The issue is not route planning: Circuit Forge currently leaves a visibly larger interruption around non-conductive crossing hops than the Wiring Diagram Generator reference presentation.

Acceptance:

- reduce the excessive interruption around the hop so the passing conductor reads as one continuous wire;
- retain an unmistakable non-conductive crossing cue;
- preserve explicit true-junction treatment;
- do not change conductive truth or create a junction at a visual crossing;
- prefer one shared crossing/junction presentation authority for Forge and Generator if the existing architecture permits this cleanly;
- use the Generator's current compact crossing treatment as the visual reference rather than inventing a new broad style;
- do not modify the shared router, routing costs, lane allocation or family coordinates solely for this presentation issue;
- do not call this Routing V4;
- verify with focused renderer/semantic tests and the existing Forge/Generator regressions; Luke owns rendered visual acceptance.

## Implementation boundary

When this specification is handed to an implementation pass:

- consume the existing shared graph and renderer;
- preserve role/net separation;
- preserve one shared mapping authority;
- do not independently research or reinterpret manufacturer mappings already approved here;
- do not populate unresolved mappings from memory;
- treat manufacturer family/model exceptions as more specific than brand defaults;
- keep tool-specific UX local while shared electrical and physical-conductor truth remains in the lowest appropriate shared layer.

## HQ ownership

Luke + ChatGPT HQ owns final palette approval, manufacturer-source verification, mapping approval, subjective visual acceptance and product-level UX decisions. Astra/implementation sessions should hand unresolved subjective or research questions back through `HQ HANDOFF` rather than spending engineering allowance on them.

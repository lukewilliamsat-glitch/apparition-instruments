# Apparition Instruments — latest handover state

**Created:** 28 September 2026

Read this file **before** `APPARITION_CURRENT_HANDOVER.md` because it records repository activity that occurred concurrently while the master handover was being written.

## Current observed sequence

1. P11E/F application checkpoint: `9fb4f2c68e94562c5a06b6f0ab24117f48e5a626`.
2. Signal Forge planning-only commits:
   - `91c6ff9471f628c2f541bcb89d6fa88827a055c3`
   - `8e6dfbe9509ee0f1f5d097c05174ea88f023bebe`
   - `bf683434ffd85b6f5d000e642cc46e7da5ed2211`
   - `0b0681acdce0a94bc6cb1e7272f8bb238b2bd144`
3. A concurrent narrow P11 cleanup correction then appeared at `ac469fbbc507d626ad5c00d3959cb579c6e38522`, message **Clarify catalogue manufacturer dependency counts**.
4. Master chat continuity handover was then added at `6024f62279ca65b4dfe66bff38f00d569b44e1b1`.
5. This latest-state file is a subsequent documentation-only commit. Always verify `main` again in the new session.

## What `ac469...` changed

The correction was deliberately small and directly related to P11E/F guarded catalogue deletion:

- Admin Catalogue Settings changed the ambiguous column heading `In use` to `Components using`.
- Manufacturer sections now explicitly explain that the displayed Component count does **not** include Kit Definition dependencies and that permanent deletion checks both.
- `tests/p11-option-delete.mjs` gained assertions for that clarification.

This addresses a real UI ambiguity: the visible count represented Component usage only, while the guarded database deletion also checks Kit Definitions.

## P11 final closure

**P11: COMPLETE.** P11A–D, P11E/F and the economical cleanup are complete. The cleanup correction at `ac469fbbc507d626ad5c00d3959cb579c6e38522` passed its focused test and was verified in the deployed Admin asset.

P11G was investigated and has no canonical requirements or acceptance criteria. The placeholder is retired. Define future work from actual requirements rather than continuing P11 lettering.

The single final live Order acceptance journey remains deferred **P09** scope and is not part of P11.

## P12 start

Luke approved **P12 — Signal Forge V1**, with **Circuit Forge** as the customer-facing experience. P12A establishes a limited public Les Paul circuit workbench and the canonical `docs/signal-forge/V1_CONTRACT.md`. P11 remains complete; the deferred single live Order acceptance remains P09 scope. Broader V1 family support and response integration remain subject to the V1 contract gates.

## P12B interactive Les Paul

Circuit Forge advances the existing Les Paul terminal graph with model-derived component inventory, connection-change explanation, active selector contacts, conductive-path highlighting and explicit separated-crossing markers. P12B does not add guitar families, full-circuit response claims, persistence or commerce authority. The P12 V1 contract records the slice.

## Circuit Forge Les Paul workbench V1 checkpoint

The public Les Paul workbench now places the shared model-driven diagram at the centre of configuration, inspection and explanation. The controls, component inventory, selected terminal/wire trace, selector-output report and topology/value change summary all derive from the same circuit state. The diagram still uses the shared Generator graph and renderer. Open contacts, passive internals and crossing geometry remain distinct from conductive edges. Selection persists across supported configuration edits when its graph identity survives, otherwise it clears. The page reorganises controls, diagram and inspector responsively; Luke's rendered desktop/mobile visual acceptance remains separate.

Focused workbench state/interaction tests cover all supported Les Paul control combinations, selector continuity, change explanation, terminal/wire/component inspection and graph limits. P12A/P12B regressions and all 54 Generator configurations passed. The publication HEAD and live asset checks are recorded in the completion report for this checkpoint. No migration, Edge Function, catalogue, Kit Definition, commerce or production business-data changes. Full Les Paul response modelling and saved circuits remain deferred. P12C Classic Telecaster is the next additional-family validation after workbench acceptance.

## Shared electronics core and deployment resilience

The shared-core rule and current tool boundaries are recorded in `docs/signal-forge/ARCHITECTURE.md`. Generic path inspection and connection diffs move to the Generator's shared circuit layer; route cache identity now includes route hints. Larger lane planning/label clearance and a validated multi-pickup response model remain separate follow-ups. The Pages build stamps first-party asset and transitive module URLs per deployment, and Forge displays reload/hard-refresh guidance only if initialization remains stuck. Focused shared-core and Forge/Generator regressions passed; no Designer engine, commerce, schema, Edge Function or production business data changed. Final GitHub HEAD and deployment verification are in the completion report. Luke owns rendered visual acceptance and HQ owns subjective visual/copy decisions.

## Shared diagram routing V2 checkpoint

The single Forge/Generator router now uses conductive-net-aware grid occupancy with costs for reused lanes, close parallel wires and avoidable crossings. Shared SVG wires expose graph-derived signal, ground, tone, auxiliary and switch metadata for later visual styling; the palette is unchanged. The existing Les Paul and other Generator layouts retain their electrical connections, and no family-specific routing engine was added. Spacing is a routing preference rather than an absolute guarantee in tight layouts. Label clearance, more systematic channel planning and remaining crossing congestion are deferred to a focused shared-renderer pass. Luke will perform rendered visual acceptance; HQ owns semantic-colour design and manufacturer conductor mapping specification. This checkpoint's GitHub commit is its final HEAD; focused tests and deployed asset hashes are reported at publication. No migration, Edge Function or production business-data change.

## Shared visual semantics checkpoint

P12 Signal Forge V1 now has a shared SVG role/net/view-state contract over the Routing V2 graph. Forge offers All, Signal, Ground, Tone and Treble bleed views; explicit trace/inspection takes precedence. The Generator inherits the same renderer while retaining its simpler workflow and existing filters. No circuit topology, routing costs, final palette, manufacturer conductor mapping, catalogue, commerce or production data changed. Focused semantic/Forge/Generator tests and deployed asset verification are reported with this checkpoint's final GitHub commit. Luke's rendered acceptance remains pending. HQ owns palette, manufacturer-code research/specification and subjective polish. Deferred engineering: constrained-layout routing/label clearance, accepted shared crossing presentation, and validated full-circuit response. The next Signal Forge implementation boundary is to be selected after Luke's visual acceptance; do not infer a new guitar family from this checkpoint.

## Shared diagram routing V3 checkpoint

Luke accepted Routing V2 and the shared Visual Semantics pass, then identified local congestion around volume terminal departures. Routing V3 extends deterministic pot/pickup terminal fan-out, reserves short local lanes, prevents immediate backtracking, discourages small bends and forbids unrelated conductive nets from reusing the same grid edge. Circuit Forge and Generator retain one shared router and unchanged electrical semantics. Focused geometry tests compare equivalent neck/bridge departures, route length, short jogs and unrelated-net overlap; the existing 54 Generator configurations and Forge tests remain the regression gate. The deployed Routing V3 application checkpoint is `85ad557d491f0c19a19053d4ebeec60161a33e9c`. No schema, Edge Function or production business-data changes.

### HQ rendered acceptance after Routing V3

Luke visually accepted the substantive Routing V3 improvement after comparing Circuit Forge and the Wiring Diagram Generator. The previous volume-control spaghetti is substantially improved and the shared router should now be treated as accepted rather than reopened for another broad routing rewrite.

One bounded presentation issue remains: Circuit Forge's non-conductive crossing/jump treatment leaves a visibly larger interruption around the hop than the Wiring Diagram Generator presentation. The next renderer-polish implementation should reduce that interruption and, if the existing architecture permits it cleanly, consolidate the accepted non-conductive crossing presentation into the shared renderer so Forge and Generator use one crossing/junction visual authority. Electrical semantics must not change: crossings remain non-conductive unless explicitly joined, and true junctions remain explicit.

Do not call this Routing V4 and do not reopen general route planning merely for this issue. Treat it as small shared crossing-renderer polish. Deferred broader routing work remains label clearance, wider channel planning and constrained-layout spacing, to be revisited only when a real circuit demonstrates a need.

After crossing polish, the next substantial Signal Forge V1 feature candidate is shared manufacturer pickup-conductor profiles using the canonical `docs/signal-forge/WIRING_SEMANTICS.md`. HQ has already defined the shared mapping architecture and verified the currently approved manufacturer material there; an implementation pass must consume that specification rather than independently researching or inventing mappings. Classic Telecaster remains the next additional-family validation after the improved workbench/shared capabilities are accepted.

### Shared diagram composition checkpoint

The current bounded checkpoint removes selector-port micro-doglegs and moves compact non-conductive crossing hops into the shared Generator/Forge renderer. Filled branch nodes now come from graph terminals with at least three incident wires; ordinary two-wire continuations and visual intersections receive no junction node. Junction metadata retains the terminal and incident wire IDs. Routing V2 net separation and V3 pot/pickup fan-out remain unchanged. Wider same-net/ground route convergence, off-terminal branch modelling and systematic label/channel planning remain deferred; Luke owns rendered visual acceptance. No circuit topology, migrations, Edge Functions or production business data changed.

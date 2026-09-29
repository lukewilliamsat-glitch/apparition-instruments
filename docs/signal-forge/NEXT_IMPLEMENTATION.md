# Signal Forge — next implementation checkpoint

Status: HQ implementation brief.

Canonical predecessor: manufacturer and physical-conductor behaviour is defined in `WIRING_SEMANTICS.md`. Routing V3 is visually accepted. P12C Classic Telecaster remains defined in `V1_CONTRACT.md` but is intentionally postponed until the Les Paul reference workbench receives the bounded work below.

## Purpose

Turn the accepted Les Paul Circuit Forge workbench from a strong shared-core demonstration into a more polished V1 reference implementation without reopening solved architecture.

This checkpoint is deliberately staged so an implementation session can stop at a clean boundary if allowance or unexpected complexity becomes material.

## Priority order

### Priority A — shared manufacturer profile foundation

Implement the canonical manufacturer-profile contract in `WIRING_SEMANTICS.md` at the lowest appropriate shared layer.

Requirements:

- one shared mapping authority for Generator and Forge;
- per-pickup profile capability in the shared API even if the first Generator UI remains guitar-wide;
- Generic/Semantic, verified, requires-model and unresolved/unsupported states;
- approved mappings only; do not re-research them during implementation;
- no manufacturer-specific circuit topology;
- no guessed Fender universal mapping;
- preserve shield/drain as semantically distinct metadata where applicable;
- changing manufacturer profile must leave electrical graph/topology invariant.

The Wiring Diagram Generator is the first consumer because it already exposes pickup wire-colour selection. Replace or adapt any Generator-local mapping authority rather than creating a second source of truth.

Representative automated acceptance must include Generic, Seymour Duncan, DiMarzio, at least one other approved verified profile, Fender requires-model behaviour, unknown-profile safety, and a mixed Seymour Duncan neck + DiMarzio bridge shared-API case. Electrical invariance is mandatory.

### Priority B — bounded shared crossing-hop polish

Apply the already-defined renderer-only crossing-hop correction in `WIRING_SEMANTICS.md`.

Routing V3 is accepted. Do not call this Routing V4 and do not reopen route costs, lane planning, family coordinates or the routing algorithm merely to change the size of the non-conductive crossing interruption.

Use the Generator's compact existing crossing treatment as the visual reference. Preserve true-junction truth and non-conductive crossing truth. Prefer one shared presentation authority if this is a small clean consolidation.

If Priority A consumes materially more implementation effort than expected, this item may be deferred rather than risking an incomplete checkpoint.

### Priority C — small Les Paul workbench polish only where objective

After A and B are stable, make only low-risk objective improvements that are directly evident from the current workbench and do not require subjective redesign.

Allowed examples:

- improve control/panel spacing consistency;
- prevent avoidable text/control overflow;
- improve inspector/component-list readability;
- keep diagram viewport/panning usable at narrow widths;
- preserve clear keyboard focus and selected-state treatment;
- reduce obviously redundant instructional copy if the same fact is already visible nearby;
- preserve the existing three-stage Configure / Explore / Understand workbench structure unless a concrete defect requires otherwise.

Do not spend implementation allowance performing aesthetic exploration. Luke owns rendered visual acceptance and HQ owns subjective design decisions.

## Explicitly deferred from this checkpoint

Do not implement in this checkpoint unless a tiny prerequisite is unavoidable:

- P12C Classic Telecaster;
- Strat or PRS families;
- full Circuit Forge manufacturer-selection UX;
- physical-conductor click/trace interaction in Forge;
- full-circuit Les Paul frequency-response simulation;
- exact product matching beyond existing validated boundaries;
- account saving / saved circuits;
- Build Mode / measured component instances / QR workflows;
- homepage marketing changes;
- broad palette redesign;
- broad router rewrite;
- commerce, Order, inventory, migration or Edge Function changes.

## Future Forge compatibility gate

Although full Forge manufacturer UI is deferred, the shared API implemented now must make the later UX cheap rather than requiring redesign.

The intended later Forge behaviour is independent profile selection for each pickup, including mixed-brand builds. Inspection can then translate physical conductors into semantic meaning and graph-derived destinations. Manufacturer choice remains presentation/physical-wiring metadata and never changes circuit topology.

## Regression boundary

Run only tests relevant to changed boundaries:

- new shared manufacturer-profile tests;
- electrical-invariance tests;
- shared renderer/crossing tests if Priority B changes renderer code;
- Circuit Forge focused regression where shared renderer/core changes affect it;
- all 54 Wiring Diagram Generator configurations;
- Designer tests only if its consumed shared boundary unexpectedly changes.

Do not run unrelated commerce tests.

No routine manual browser QA. Luke owns rendered acceptance. Browser interaction is permitted only to diagnose a specific automated/runtime failure.

## Publication boundary

If the implemented subset passes its relevant tests:

- commit one coherent checkpoint;
- push to canonical `main`;
- deploy only if application assets changed;
- verify changed live assets programmatically;
- update handover/current-state documentation concisely;
- stop and return the exact implemented/deferred boundary to HQ.

No production business data may be mutated.

## Completion report

Return:

- STARTING HEAD
- FINAL HEAD
- MANUFACTURER SHARED AUTHORITY
- GENERATOR INTEGRATION
- PER-PICKUP API / MIXED-BRAND SUPPORT
- ELECTRICAL INVARIANCE
- FENDER / UNSUPPORTED SAFETY
- CROSSING-HOP POLISH
- OBJECTIVE WORKBENCH POLISH
- FORGE / GENERATOR SHARED-CORE STATUS
- FILES CHANGED
- FOCUSED TESTS
- GENERATOR 54-CONFIG REGRESSION
- CIRCUIT FORGE REGRESSION
- DESIGNER REGRESSION
- DEPLOYMENT
- PROGRAMMATIC DEPLOYMENT VERIFICATION
- MANUAL BROWSER QA (normally NO)
- PRODUCTION BUSINESS DATA MUTATED
- HQ HANDOFF
- READY FOR LUKE VISUAL ACCEPTANCE
- READY FOR NEXT SIGNAL FORGE PASS

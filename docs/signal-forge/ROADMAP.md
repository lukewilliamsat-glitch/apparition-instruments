# Signal Forge roadmap

Status: planning. Milestone labels here are Signal Forge-specific and are not current Apparition P10/P11 pass numbers.

## Foundation already emerging

Existing Apparition work that can support Signal Forge includes:

- stable Component identities;
- structured potentiometer, capacitor and treble-bleed electrical data;
- structured physical product fields;
- catalogue dictionaries;
- Kit Definitions and quantity-aware kit resolution;
- Wiring Diagram Generator;
- Treble Bleed Designer and Frozen Reference;
- exact structured Designer-to-product matching;
- supported Wiring Generator-to-Builder handoff;
- customer Auth, Order ownership and Order Detail;
- product pages, basket and checkout.

These systems should be reused rather than rebuilt under Signal Forge names.

## V1 — Circuit Forge

Goal: establish the unified free circuit-design experience and prove the composable circuit model.

Priority launch families:

1. Les Paul HH / 2V2T / 3-way: Modern, 50s and 60s.
2. Telecaster classic SS / 1V1T / 3-way, with architecture ready for common variants.
3. Stratocaster: SSS, HSS/SSH, HSH and HH priority configurations with configurable control/switch layouts.
4. PRS Custom 24 HH / 1V1T with supported 3-way and 5-way families and split behaviour as validated.

V1 targets:

- template-driven but composable circuit state;
- dynamic, unambiguous wiring diagram;
- connected-junction versus crossing semantics;
- component/terminal/path inspection;
- core electrical controls and response graph where the model supports them;
- comparison/reference behaviour;
- structured product matching;
- supported design-to-kit handoff;
- responsive beginner-friendly interface with advanced controls progressively disclosed.

## V2 — Build and ownership

Goal: connect the digital design to the physical Apparition kit and customer account.

Targets:

- Build Mode step generation from a supported circuit;
- connection-by-connection highlighting;
- full-circuit escape/view at any point;
- saved customer circuits;
- Order-to-circuit association;
- physical component instance model;
- measured value capture during Apparition QC;
- `Your Circuit` account experience;
- nominal-versus-actual values;
- nominal-versus-actual simulation where electrically meaningful;
- secure QR/deep-link flow from supplied kit/QC material into the owned circuit.

## V3 — Advanced circuit platform

Goal: expand beyond the initial guitar families and make Signal Forge useful for more unusual/custom work.

Candidate targets:

- richer arbitrary pickup/control layouts;
- broader switching primitives;
- series/parallel pickup switching;
- phase switching;
- coil splits and partial splits;
- additional loading networks;
- advanced selector modelling;
- broader pickup electrical presets where data quality is sufficient;
- reusable user-defined circuit templates;
- deeper integration between simulation and generated wiring topology.

## Pro / professional workflows

Do not lock the basic Apparition purchase/build journey behind Pro.

Candidate paid capabilities once the free platform is mature:

- advanced multi-circuit A/B comparison;
- tolerance / Monte Carlo style component analysis;
- large persistent guitar/project libraries;
- professional luthier workspaces;
- customer/project records;
- advanced exports and documentation packs;
- reusable organisation presets;
- deeper analysis tools requiring protected/server-side computation.

Entitlements and subscription architecture should be designed only when the paid feature boundary is sufficiently stable.

## Commercial loop

The intended free customer loop is:

technical question/search → Apparition education/tool → configure circuit → understand effect → see wiring → match suitable products/kit → purchase → receive measured/QC parts → guided installation → retain `Your Circuit`.

The platform should optimise successful outcomes and customer confidence, not merely clicks into checkout.

## Milestone gates

Before a Signal Forge milestone moves into implementation, define:

- supported circuit primitives;
- explicit electrical assumptions;
- supported versus unsupported configurations;
- authoritative source of product/component data;
- diagram semantics;
- commerce handoff rules;
- regression boundary with existing Designer, Generator, Builder, Basket and checkout;
- whether the feature is free, included with an Apparition purchase, or a candidate Pro capability.

Avoid silently expanding supported topology during implementation.
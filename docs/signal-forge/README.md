# Apparition Signal Forge

Status: planning / pre-implementation

Signal Forge is the planned Apparition Instruments circuit-design, simulation, commerce and guided-build platform. This folder is the canonical product-planning record for Signal Forge so architectural decisions and milestones do not live only in chat history.

## Product vision

Signal Forge should connect the full customer journey:

**Design it → understand it → order it → receive measured components → build it → verify it.**

The platform should make guitar electronics approachable to a first-time modifier while remaining useful to experienced builders and luthiers.

## Core principles

1. **Templates are starting configurations, not hard-coded diagrams.** Familiar guitar types should initialise a composable circuit model.
2. **Electrical meaning is authoritative.** Components and product matching should use structured electrical data and stable identities rather than product-name matching.
3. **Visual wiring must be unambiguous.** Connected junctions and non-connected crossings must have distinct visual semantics.
4. **Progressive complexity.** Beginners should be able to use presets and guided controls; advanced users should be able to expose deeper circuit options.
5. **Tools should support commerce without becoming adverts.** Design, understanding, core simulation, wiring guidance, product matching and Apparition-kit build assistance should remain useful in their own right.
6. **Measured hardware can become part of the digital circuit.** A catalogue component is not the same thing as a physical component instance supplied to a customer.
7. **Existing Apparition systems are foundations.** Stable Component IDs, structured electrical values, Kit Definitions, customer ownership, Orders, the Wiring Diagram Generator, Treble Bleed Designer and exact product matching should be reused rather than duplicated.
8. **Free first, Pro above it.** Features that help a customer understand, configure, purchase or successfully install Apparition products should generally remain free. Paid tiers should target advanced depth, persistence, scale and professional workflows.

## Planned documents

- `ARCHITECTURE.md` — circuit model, visual semantics, build mode and physical component instances.
- `ROADMAP.md` — V1, V2 and later platform milestones.
- `DECISIONS.md` — durable product and architecture decisions with IDs for future reference.

## Initial launch families

Signal Forge should initially cover the most common practical wiring families while keeping the engine extensible:

- Les Paul: HH, 2 Volume, 2 Tone, 3-way toggle; Modern, 50s and 60s wiring.
- Stratocaster: SSS, HSS/SSH, HSH and HH as priority configurations, with flexible control and selector layouts.
- Telecaster: classic SS / 1V1T / 3-way first, then common variants.
- PRS Custom 24: HH / 1V1T with relevant 3-way and 5-way switching, coil-split and partial-split variants as the model matures.

## Planning discipline

When a Signal Forge decision is made during development, record it in this folder. Prefer stable decision IDs in `DECISIONS.md` so implementation passes, issues and future conversations can refer to the same requirement without reinterpreting it.

Do not treat speculative roadmap ideas as production requirements until they are promoted into an implementation milestone.
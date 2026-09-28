# Signal Forge decision log

Use these IDs in future implementation briefs, issues and planning discussions. Amend a decision explicitly rather than silently changing its meaning.

## SF-DEC-001 — Composable circuit model

**Status:** Accepted planning direction

Signal Forge will be designed around components, terminals and connections. Named guitar/wiring templates initialise that model but do not become separate monolithic engines.

## SF-DEC-002 — Initial guitar families

**Status:** Accepted planning direction

Initial coverage should prioritise Les Paul Modern/50s/60s, common Telecaster wiring, common Stratocaster pickup/control variants, and PRS Custom 24 configurations.

## SF-DEC-003 — Strat topology is variable

**Status:** Accepted planning direction

The architecture must not assume a Strat is always SSS / 1V2T / 5-way. Pickup arrangement, controls, switch type and supported switching features need independent representation.

## SF-DEC-004 — Explicit loading networks

**Status:** Accepted planning direction

Loading resistors and similar networks should be represented as electrical elements, enabling configurations such as 500 kΩ controls with an additional resistor applied to a single-coil path to alter its effective load.

## SF-DEC-005 — Unambiguous wire crossings

**Status:** Accepted planning direction

Connected junctions and wires crossing without electrical connection must use different visual semantics. A crossing must never appear accidentally merged.

## SF-DEC-006 — Interactive path inspection

**Status:** Target behaviour

Users should be able to inspect components, terminals and connections and highlight relevant electrical paths while unrelated wiring is visually de-emphasised.

## SF-DEC-007 — Separate Design and Build modes

**Status:** Accepted planning direction

Design Mode is exploratory/configurational. Build Mode converts a supported valid circuit into guided physical installation steps while retaining access to the full diagram.

## SF-DEC-008 — Catalogue definitions and physical instances are different entities

**Status:** Accepted planning direction

Nominal catalogue component data must remain distinct from measured values belonging to an individual physical component supplied to a customer.

## SF-DEC-009 — Your Circuit

**Status:** Target product concept

A future owned customer circuit may retain the selected topology, supplied physical component instances, measured values, wiring diagram and build assistance.

## SF-DEC-010 — Nominal versus actual comparison

**Status:** Target capability

Where supported by the electrical model, a customer should eventually be able to compare a designed/nominal circuit with the measured values of the components actually supplied.

## SF-DEC-011 — Structured matching over names

**Status:** Accepted and partially proven by existing Designer matching

Product and kit matching should use stable identities and structured electrical/compatibility data. Product-name heuristics must not be the authoritative matching mechanism.

## SF-DEC-012 — Core commerce-supporting tools remain free

**Status:** Product principle

Capabilities that materially help users understand a circuit, choose compatible Apparition products, wire an Apparition kit or successfully complete an installation should generally remain free/included.

## SF-DEC-013 — Pro targets depth and professional workflow

**Status:** Product principle

Potential paid functionality should focus on advanced analysis, scale, persistence, professional/client workflows and premium exports rather than crippling the core design-to-purchase journey.

## SF-DEC-014 — Delay hard paywall architecture

**Status:** Accepted planning direction

Do not prematurely design the platform around a fixed subscription boundary. Establish useful V1/V2 workflows and usage evidence first. If premium computation or proprietary data later requires stronger protection, evaluate authenticated server-side boundaries then.

## SF-DEC-015 — Existing Apparition foundations are reused

**Status:** Accepted planning direction

Signal Forge should build upon the existing structured catalogue, stable Component IDs, Kit Definitions, Wiring Diagram Generator, Treble Bleed Designer, customer ownership and commerce systems rather than duplicating their sources of truth.
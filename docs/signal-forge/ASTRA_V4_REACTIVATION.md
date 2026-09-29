# Astra V4 — Circuit Forge reactivation

Status: canonical V3 close-out for a fresh implementation chat. Repository: `lukewilliamsat-glitch/apparition-instruments`, branch `main`. The predecessor checkpoint is `c2a86795b440b39f846d5c77377806a2b600fa1a`. The close-out commit containing this document is the V4 starting point; obtain and verify the **current `main` HEAD** before any implementation. A commit cannot embed its own final SHA. The V3 completion report records that SHA, and a later `main` requires intervening-commit reconciliation rather than reset or overwrite. Production is `https://apparitioninstruments.co.uk/`; production Supabase remains authoritative for business data.

## Product direction and shared core

**Circuit Forge is no longer being designed as an enhanced Wiring Diagram Generator. It is being designed as an interactive guitar-electronics workbench.** The Generator primarily answers **“How do I wire this?”** Forge should increasingly answer **“What is my circuit, how does it work, what happens if I change it, and how do I build it?”** The V1 journey is **Configure → See → Understand → Analyse where validated → Build**.

Electrical truth, component truth, circuit topology, switch/contact behaviour, conductive paths, reusable routing/rendering behaviour and validated reusable electrical models belong at the lowest appropriate shared layer. Forge and Generator must not fork the circuit, router or renderer. Extract validated Treble Bleed Designer calculations at their real shared calculation boundary when Forge consumes them; do not copy an engine. Tool-specific UI and workflow remain local.

Established foundations should not be reopened without regression evidence: the shared Generator/Forge terminal graph, path inspection, router and SVG renderer; Routing V2 net-aware separation; Routing V3 terminal fan-out/local lanes; semantic wire/net roles and Forge Signal/Ground/Tone/Treble Bleed views; graph-derived path explanations; compact shared non-conductive crossing markers and graph-derived true terminal junction nodes; the Les Paul HH / 2V2T / three-way reference workbench and existing Kit Builder handoff. No Les Paul-only routing engine exists. The V1 experience contract and manufacturer wiring specification are canonical. The Designer's current validated response boundary is a supported single-pickup/volume/network model, not a validated complete Les Paul response.

## Current visual acceptance and debt

Luke considers the shared diagram substantially improved, **not visually finished**. The immediate V4 priority is **desktop workbench visual design and user experience**. Develop intuitive interaction and professional desktop presentation first. Mobile, responsive and accessibility final polish remains necessary at V1 close-out; do not prioritise it over the desktop workbench now. Luke owns rendered visual acceptance; do not claim it from tests or perform routine browser QA.

**Diagram debt:** remaining volume-control bends and short doglegs; broader channel planning; deliberate ground trunks and same-net convergence; graph-backed off-terminal junctions; clean approaches around pots, pickups, selector/output and component satellites such as tone capacitors and treble bleeds; final junction/crossing visual grammar; practical label clearance. Avoid family-specific coordinate patches and keep conductive truth separate from drawing geometry.

**Workbench debt:** stronger professional hierarchy; less generic form-panel appearance; consolidated diagram controls; contextual actions for the selected object; clearer Configure / Explore / Understand relationship without rows of unrelated buttons; consider progressive Circuit / Response / Compare modes; useful circuit summary/specification, component intelligence, inspection-panel polish and print/export presentation. These are design directions, not an instruction to redesign in one pass.

## Remaining V1 direction

Professional desktop workbench visual system and contextual inspection; final diagram composition; manufacturer conductor profiles and later Forge conductor UX; shared selected-network response analysis; circuit comparison; summary/component intelligence; exact supported product and kit handoff refinement; SVG/print polish; then additional supported families after the Les Paul architecture is accepted. Classic Telecaster is the next generalisation proof, followed by bounded Strat and validated PRS work. Finish mobile/accessibility and V1 release polish toward close-out. Build Mode, saved circuits, measured physical instances, Your Circuit, QR access and nominal-versus-actual comparison remain later scope.

Manufacturer profiles are specified in `WIRING_SEMANTICS.md`: Generic, Seymour Duncan, DiMarzio, Gibson, Fender, Tonerider and Warman have different approved/support states and applicability. In particular, do not infer a universal Fender mapping. Physical conductors map to semantic pickup terminals and never create separate electrical topology. The shared API should allow independent neck/bridge profiles and mixed brands. Consume the canonical provenance and mapping details; do not re-research or guess them.

Response analysis belongs in V1. Reuse the Designer's validated calculation architecture through a shared boundary. Initial Forge analysis should be described as a **selected supported pickup/volume/network response** or equivalent. Never claim a complete Les Paul 2V2T frequency response until a multi-pickup, selector and loading model is independently validated.

## Recommended early V4 sequence

This is a recommendation, not an immutable phase contract:

1. Desktop Workbench Visual System and UX refinement.
2. Diagram Composition V4 within that accepted visual language.
3. Shared Manufacturer Wiring Intelligence.
4. Forge manufacturer/conductor UX.
5. Shared Designer response-engine extraction.
6. Forge selected-network Response experience.
7. Comparison, circuit summary, product/kit and export/print polish.
8. Classic Telecaster as the next shared-architecture proof.
9. Strat and validated PRS expansion.
10. Mobile, accessibility and final V1 release close-out.

## Fresh-chat instruction

“Continue Apparition Instruments development from canonical GitHub `main`. Read `docs/signal-forge/ASTRA_V4_REACTIVATION.md`, verify current `main` and reconcile any commits after the V3 close-out, then execute only the next explicitly requested bounded pass. Do not repeat historical architecture discovery.”

Read `V1_EXPERIENCE_CONTRACT.md`, `V1_CONTRACT.md`, `WIRING_SEMANTICS.md`, `ARCHITECTURE.md` and immediately relevant source sections only as required by that specific pass. `NEXT_IMPLEMENTATION.md` records an older proposed order: its crossing-polish item is complete and its manufacturer-first ordering is superseded by Luke's desktop-first V4 priority. Do not implement from that older checklist without a current brief. No production Order, payment, refund, email, Auth, Contact, inventory or business-data mutation is authorised by this reactivation document.

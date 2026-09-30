**SIGNAL FORGE V1 DESKTOP / HOMEPAGE: LOCKED. SIGNAL FORGE V1 MOBILE: COMPLETE. SIGNAL FORGE V1: COMPLETE** at the implementation and focused-verification checkpoint; Luke’s mobile rendered acceptance remains the next gate. Public hierarchy: APPARITION SIGNAL FORGE → CIRCUIT LAB → SIGNAL LAB. The desktop/homepage baseline is accepted and must not be reopened by later mobile or V2 work.

Mobile uses one circuit-centred workspace at ≤850px. Existing Configure controls move into a native modal sheet; the existing Inspector is a nonmodal compact/expandable sheet so the selected circuit remains accessible. View and Trace Path remain distinct. The authoritative SVG gets a presentation-only artwork fit, bounded 1–4× zoom, touch pan/pinch and labelled disambiguation for nearby terminals. Signal Lab uses the same response samples with a compact graph projection. Circuit choices, manufacturer profiles, selection, per-channel Volume/Tone and lab mode remain shared across sheets and breakpoints. Hidden diagrams are measured only after becoming visible. Desktop default pixels matched the accepted baseline at 1440px and 1024px.

Entry timing/readiness/reduced-motion/failure paths are unchanged; every new document load receives the veil. Narrow homepage presentation remains static with safe space for its electrical-response annotation and both tool routes. Focus/close/Escape and touch interactions passed focused browser checks at 390×844, 430×932, 844×390, 768×1024 and desktop transitions. No material accessibility/performance defect remains from this pass; real-device feel and Luke’s final mobile aesthetics remain acceptance checks. No heavy runtime dependency was added. Explore Mods, Fault Finder, Build With Me, QR/order-linked builds, new circuit families, dual-pickup and 50s/60s response modelling, advanced comparisons, new component simulation and accounts/build passports remain deferred. Earlier checkpoints below are historical and do not reopen the locked baseline.

# Astra V4 — Circuit Forge reactivation

Status: canonical V3 close-out for a fresh implementation chat. Repository: `lukewilliamsat-glitch/apparition-instruments`, branch `main`. The predecessor checkpoint is `c2a86795b440b39f846d5c77377806a2b600fa1a`. The close-out commit containing this document was the original V4 starting point; obtain and verify the **current `main` HEAD** before any implementation and reconcile later HQ documentation commits rather than resetting or overwriting them. Production is `https://apparitioninstruments.co.uk/`; production Supabase remains authoritative for business data.

V4 physical composition implementation checkpoint: the shared physical projection, local pickup and pot-casing terminations, per-pickup manufacturer profiles and Forge conductor inspection are recorded in `ARCHITECTURE.md`. The graph remains electrical authority. Luke's rendered acceptance is pending. The next bounded step after review should address specific observed physical bus/lane or workbench visual issues; do not treat automated geometry checks as aesthetic acceptance.

V1 physical composition V2 and Precision Workbench checkpoint: independent pickup profile presentation, shorter pickup-hot termination, deliberate casing-ground bus presentation, desktop Forge controls/inspector styling, and the graph-derived homepage reveal are recorded in `ARCHITECTURE.md`. The Generator remains available. Luke owns the next rendered acceptance; after that, address specific remaining wiring/desktop issues before selected-network response work. No production business data or Supabase changes belong to this checkpoint.

V1 Precision Polish + Leica checkpoint: graph-backed casing solder markers, a direct vertical casing bus lane, explicit VIEW / TRACE PATH grouping, structured manufacturer/physical Inspector data, and restrained desktop control/drawing refinements are recorded in `ARCHITECTURE.md`. Routing and manufacturer presentation remain shared with Generator; the electrical graph and homepage composition are unchanged. Luke's deployed visual acceptance remains the next gate. If accepted, lock this desktop baseline and resume the subsequent V1 workstream; mobile is deferred. The published GitHub commit/tree and Pages verification are recorded in the completion report.

Luke accepted the V1 Precision Workbench visual baseline. The next V1 Response Lab checkpoint is documented in `ARCHITECTURE.md`: Designer and Forge share the single-pickup electrical response authority; Forge exposes a bounded analysis disclosure for one selected pickup with Modern wiring, live volume/tone positions and an optional no-bleed reference. Combined selector and 50s/60s response remain unsupported until validated. Subjective Response Lab acceptance belongs to Luke. Do not reopen the locked workbench visual direction or treat this as a full Les Paul response model.

Signal Lab promotion checkpoint: Luke technically accepted Response Lab V1 and requested it as a first-class central-workspace mode. Forge now switches between default Physical Circuit and Signal Lab without duplicating response math or resetting circuit/control state. The graph, controls, reference and assumptions use the existing implementation; Configure and Understand remain shared. The below-diagram disclosure is retired. Both-selector and 50s/60s analysis remain explicitly unsupported. Luke owns the promoted mode's visual acceptance; preserve the locked Precision Workbench direction.

**V1 core workspace lock point:** Signal Forge contains Physical Circuit (“Where does everything go?”) and Signal Lab (“What does this circuit do?”), both consuming one Forge circuit state. Signal Lab's unsupported Modern + Both state offers Analyse Neck/Bridge through the existing selector controls; 50s/60s remain explanatory only. The shared response core and accepted Precision Workbench architecture are the current baseline pending Luke's final rendered acceptance. Defer wider 50s/60s response, combined Both loading, Compare, Frozen Reference, component-value experimentation, Explore Mods, Fault Finder and Measure.

## Product direction and shared core

**Circuit Forge is no longer being designed as an enhanced Wiring Diagram Generator. It is being designed as an interactive guitar-electronics workbench.** The Generator primarily answers **“How do I wire this?”** Forge should increasingly answer **“What is my circuit, how does it work, what happens if I change it, and how do I build it?”** The V1 journey is **Configure → See → Understand → Analyse where validated → Build**.

Electrical truth, component truth, circuit topology, switch/contact behaviour, conductive paths, reusable routing/rendering behaviour and validated reusable electrical models belong at the lowest appropriate shared layer. Forge and Generator must not fork the circuit, router or renderer. Extract validated Treble Bleed Designer calculations at their real shared calculation boundary when Forge consumes them; do not copy an engine. Tool-specific UI and workflow remain local.

Established foundations should not be reopened without regression evidence: the shared Generator/Forge terminal graph, path inspection, router and SVG renderer; Routing V2 net-aware separation; Routing V3 terminal fan-out/local lanes; semantic wire/net roles and Forge Signal/Ground/Tone/Treble Bleed views; graph-derived path explanations; compact shared non-conductive crossing markers and graph-derived true terminal junction nodes; the Les Paul HH / 2V2T / three-way reference workbench and existing Kit Builder handoff. No Les Paul-only routing engine exists. The V1 experience contract and manufacturer wiring specification are canonical. The Designer's current validated response boundary is a supported single-pickup/volume/network model, not a validated complete Les Paul response.

## Current visual acceptance and debt

Luke considers the shared diagram substantially improved, **not visually finished**. The immediate V4 priority is **desktop workbench visual design and user experience**, with physical wiring composition now identified as the highest-value diagram correction. Mobile, responsive and accessibility final polish remains necessary at V1 close-out; do not prioritise it over the desktop workbench now. Luke owns rendered visual acceptance; do not claim it from tests or perform routine browser QA.

**Diagram debt:** remaining volume-control bends and short doglegs; broader channel planning; deliberate ground trunks and same-net convergence; graph-backed off-terminal junctions; clean approaches around pots, pickups, selector/output and component satellites such as tone capacitors and treble bleeds; final junction/crossing visual grammar; practical label clearance. Avoid family-specific coordinate patches and keep conductive truth separate from drawing geometry.

A key cause of the remaining spaghetti is now explicit: the physical diagram sometimes visualises conductive-net equivalence rather than the real conductor and solder termination a builder should make. The canonical correction is defined in `PHYSICAL_WIRING_COMPOSITION.md`. **Electrical net truth, physical conductor identity and physical termination are distinct concepts.** The router should receive intentional physical wires/terminations rather than being expected to infer assembly practice from the conductive graph alone.

**Workbench debt:** stronger professional hierarchy; less generic form-panel appearance; consolidated diagram controls; contextual actions for the selected object; clearer Configure / Explore / Understand relationship without rows of unrelated buttons; consider progressive Circuit / Response / Compare modes; useful circuit summary/specification, component intelligence, inspection-panel polish and print/export presentation. These are design directions, not an instruction to redesign in one pass.

## Physical Wiring Composition — next substantial V4 implementation

`docs/signal-forge/PHYSICAL_WIRING_COMPOSITION.md` is the canonical implementation specification for the next substantial V4 diagram pass. Read it before implementation. Do not redesign its product decisions during the engineering pass.

The central rules are:

- physical pickup conductors terminate at their real component terminals rather than prematurely merging into another same-net route;
- normal pickup series links are shown as short local joins where supported;
- pickup coil-ground and shield/drain remain distinct conductors but may share an authorised local pot-casing solder point;
- a pot lug intentionally grounded to its own casing should use a compact bent-lug or short-jumper representation rather than a long independent ground branch;
- pot casings may act as intentional local ground hubs only where physical termination semantics authorise that behaviour;
- the remaining common ground should be composed as a deliberate physical bus/harness, not as one sprawling route per grounded object;
- physical-wire selection and electrical path tracing remain distinct interaction concepts;
- circuit topology and conductive truth must not be changed merely to obtain a cleaner drawing.

For the approved Seymour Duncan standard four-conductor reference behaviour: Black is hot and should terminate at the appropriate volume input lug; Red + White form the local series join; Green + Bare terminate locally at the intended volume-pot casing solder point, while Green and Bare remain semantically distinct.

This work should materially simplify the current Les Paul reference without introducing Les-Paul-only coordinates or a separate routing engine.

## Shared manufacturer conductor UX

Circuit Forge V1 should now consume the same shared manufacturer/conductor mapping authority already specified in `WIRING_SEMANTICS.md` and used by the Wiring Diagram Generator. Do not build a Forge-local manufacturer table.

Forge should expose verified conductor profiles as physical presentation/inspection metadata while preserving topology invariance. The shared architecture remains per-pickup and must not block mixed-brand neck/bridge configurations. Generic / Semantic remains first-class. Fender still requires a verified family/model rather than a guessed universal brand mapping. Do not re-research the approved mappings during this pass.

Manufacturer colours and physical composition reinforce one another: conductor colours identify the real pickup wires; the physical-termination model determines where those conductors are actually soldered.

## Remaining V1 direction

After the physical wiring/composition and manufacturer-conductor work reaches Luke's rendered acceptance, continue the professional desktop workbench visual system and contextual inspection, then shared selected-network response analysis, circuit comparison, summary/component intelligence, exact supported product and kit handoff refinement, SVG/print polish, and additional supported families after the Les Paul architecture is accepted. Classic Telecaster remains the next generalisation proof, followed by bounded Strat and validated PRS work. Finish mobile/accessibility and V1 release polish toward close-out.

V2 Guided Build, saved circuits/guitars, measured physical instances, Circuit Passport, Fault Finder and QR access are recorded separately in `V2_PRODUCT_VISION.md` and must not displace V1 work.

Manufacturer profiles are specified in `WIRING_SEMANTICS.md`: Generic, Seymour Duncan, DiMarzio, Gibson, Fender, Tonerider and Warman have different approved/support states and applicability. In particular, do not infer a universal Fender mapping. Physical conductors map to semantic pickup terminals and never create separate electrical topology. The shared API should allow independent neck/bridge profiles and mixed brands. Consume the canonical provenance and mapping details; do not re-research or guess them.

Response analysis belongs in V1. Reuse the Designer's validated calculation architecture through a shared boundary. Initial Forge analysis should be described as a **selected supported pickup/volume/network response** or equivalent. Never claim a complete Les Paul 2V2T frequency response until a multi-pickup, selector and loading model is independently validated.

## Recommended V4 sequence

This is a recommendation, not an immutable phase contract:

1. Physical Wiring Composition and shared manufacturer conductor UX, while preserving the accepted shared router/renderer architecture.
2. Desktop Workbench Visual System and contextual UX refinement around the improved physical diagram.
3. Shared Designer response-engine extraction.
4. Forge selected-network Response experience.
5. Comparison, circuit summary, product/kit and export/print polish.
6. Classic Telecaster as the next shared-architecture proof.
7. Strat and validated PRS expansion.
8. Mobile, accessibility and final V1 release close-out.

If physical ground-bus composition proves to require an unexpectedly large graph-layout rewrite, implement the safest coherent shared physical-termination foundation first and report the next bounded step. Do not allow scope to explode and do not fall back to family-specific coordinate patches.

## Fresh-chat instruction

“Continue Apparition Instruments development from canonical GitHub `main`. Read `docs/signal-forge/ASTRA_V4_REACTIVATION.md`, verify current `main` and reconcile any later HQ documentation commits, then execute only the next explicitly requested bounded pass. For the next substantial diagram pass, read `docs/signal-forge/PHYSICAL_WIRING_COMPOSITION.md` and the relevant portions of `WIRING_SEMANTICS.md`. Do not repeat historical architecture discovery.”

Read `V1_EXPERIENCE_CONTRACT.md`, `V1_CONTRACT.md`, `WIRING_SEMANTICS.md`, `ARCHITECTURE.md` and immediately relevant source sections only as required by that specific pass. `NEXT_IMPLEMENTATION.md` records an older proposed order and must not override this current V4 direction. No production Order, payment, refund, email, Auth, Contact, inventory or business-data mutation is authorised by this reactivation document.

# Workbench Experience, Visual System and Configuration Completion V1

Starting canonical HEAD: `42baf99ef4138d65ff26268ebc871da779295a4b`. Starting tree: `9995ea64269a78bef48a6bc56a4ef99769096e6f`. `workbench-v1-recovery` preserves that exact checkpoint. Publication is static-only, non-force and restricted to the tested tree.

## Completed priorities and boundaries

P0 Guided Build V3 is implemented. P1 shared visual vocabulary and editorial signal-path/study refinement is implemented structurally. P2 delivers HSH full humbuckers, generic HH master controls and Strat master tone; flexible HH 2V2T reuses the existing factory. P3 adds independent manual HSH neck/bridge splits on 1V2T. P2/P3 are bounded expansions, not universal layout/switch support. P4 QC is deferred; no Admin, backend, migration or historical measurements are introduced.

Signal Forge owns design and inspection. Wiring Generator owns the only Guided Build engine. Component Passport remains future work.

## Guided Build

`build-guide.mjs` continues to derive human-readable physical endpoints, conductor mappings and practical instructions from the actual circuit/physical intent. `guided-build.mjs` orders those existing rows by component identity and electrical purpose: preparation, volume, tone, selector, optional modifiers, output, grounding and final inspection. Empty connection stages are omitted. Preparation/final inspection are contextual checkpoints, not extra electrical edges. Every external connection occurs exactly once.

`guided-build-ui.mjs` is Generator-owned presentation. Default entry shows Ready to build, stage/connection/switch counts and Start Guided Build. Starting offers scratch assembly or checking/modifying existing wiring. Both use the same stages and connection identities, with appropriate instruction wording. One current checkpoint shows From/To destinations, stage/overall progress and Previous, Done/Checked, Skip controls. A native stage selector permits revisiting work. The full checklist and contact/reference table are secondary views. Checkbox status is synchronised with checkpoints.

Skipped/uncompleted connections prevent Build Complete. Final inspection prompts physical checks, including selector operation, ground continuity, exposed conductor, jack tip/sleeve and push/pulls when present. Completion records the user's notes, never fabricated physical test results. Existing SVG export, print, diagram inspection and return-to-Forge remain available.

Highlighting sets presentation attributes on the existing SVG: the active wire/crossing, its two terminal destinations and the associated components are emphasised; surrounding context stays visible. It creates no second diagram, adds no graph traversal and does not redraw the SVG as checkpoints advance. Existing zoom/Fit remains user-controlled. A diagram anchor supports moving from the instruction to the canvas without automatic pan or animation.

Progress is saved locally under a deterministic wiring/component/profile identity. Records contain route, completed/skipped connection IDs, current checkpoint and completion note. Restoration validates the full identity and known IDs; selector operation is not a new soldering specification. Different parts/values/wiring/shielding/colours do not inherit progress. Storage failures fall back to in-session state with truthful copy. No Supabase storage or private project labels are included.

Forge's Start Guided Build action uses the existing exact circuit/project handoff plus `build=guided`. Values, bleeds, shielding, conductor profiles, selector and supported modifiers survive; there is no Forge build engine.

## Shared visual system

The shared artwork module supplies one scoped V2 material/line style, emitted into the existing editorial stylesheets at build time, for Forge/Generator diagrams and generated editorial studies. Metal, bobbins, screws, leads, capacitors and resistor bodies use a consistent restrained vocabulary. The output jack has formed tabs/apertures at its actual tip/sleeve anchor coordinates. Existing strong physical silhouettes are retained.

Blade V3 remains horizontal, exactly 200 × 40 body (5:1), with two wafers, eight stationary terminals and identifiable commons. Fixed contact fingers and wiper overlays have reduced line weight to improve mechanism hierarchy. No crowns, rosettes or decorative halos are introduced. Shared contact projection still owns the five distinct angles and P2/P4 midpoints; Build stays fixed hardware. No terminal or selector graph coordinate changes.

Hub's accepted study hierarchy remains intact. Pickup/jack view boxes are tightened; capacitor/jack/selector sizing is intentional rather than tiny objects in unused space. Five snapshots regenerate from shared artwork, with exact regeneration tests. Homepage's existing full Forge demonstration snapshots are also regenerated from the current renderer.

The homepage adds a simple shared-glyph signal-path study: pickup → selector → volume → output, with tone explicitly a loading branch. The main conductor ends at the shared jack tip anchor `(1015,116)`. Sleeve is separately identified. Structural assertions compare the final path coordinates with the tip circle and distinguish sleeve; this is a conceptual map, not a second circuit or pinout.

## Conventional configuration and switching

HSH has explicit passive neck and bridge humbucker windings plus a middle single coil. Its conventional two-pole five-way retains full humbuckers in the baseline. 1V1T is master volume/tone; 1V2T uses neck tone and middle/bridge tone with a shared cap. All five selections, values, shielding, bleeds and verified conductor presentation compose. Independent tone-hosted splits on 1V2T use the existing actual DPDT contacts: Neck Tone hosts neck split; Middle/Bridge Tone hosts bridge split. DOWN keeps both coils in series; UP shunts Coil B, retaining neutral Coil A. Both devices/positions remain independent.

Generic HH 1V1T uses a conventional three-way blade and master controls, separately named from PRS. Generic HH 2V2T/three-way toggle reuses the existing channel factory and Modern/50s/60s relationships. It does not advertise LP-specific push/pull hosts for a custom arrangement. Flexible 2V1T/1V2T remain descriptive pending validated tone/selector assignment contracts.

Strat SSS adds master-tone 1V1T; classic 1V2T remains unchanged, including bridge-without-tone. HSS, Tele, LP/SG and dedicated PRS SE three-way capabilities remain preserved. The aggregate single-pickup model can serve validated full/single pickups and master-tone relationships; coupled/split response remains unavailable. No new equations.

Wiring/Response/Kit remain separate. New families need no invented commercial kit definition. Manufacturer profiles remain presentation only; existing verified mappings are reused. Fender/generic PRS/other unverified mappings are not guessed.

Deferred: HSS auto-split (ordinary blade tone pole already occupied), series/parallel, phase reversal, selectable retained coil, proprietary PRS five-way/rotary/partial split, Tele four-way, superswitch/S-1/custom matrices. These need separately validated contacts/hosts. No QC schema or Admin entry is implemented; unrecorded historical measurements remain unknown.

## Validation and performance

New focused suites exercise Guided Build ordering, both routes, skip/final blockers, exact identity restoration, malicious/foreign IDs, same SVG highlighting, checklist synchronisation, source handoff and eight responsive widths. Conventional/split generation adds 648 cases to the protected 2,968 cases: 3,616 generated configurations total. New checks include 504 response comparisons and 81 rendered-as-SVG structural diagrams, in addition to the previous 49/147. Assertions cover selected/inactive pickups, output/ground isolation, explicit coil participation, DPDT pairs, passive network separation, exact handoff/project round trips and route endpoints.

The protected baseline suite passes all 185 exact pre-existing graph/conductor classifications. The final gate includes the previous 54 suites plus four new suites. Final resolved result: 58/58 PASS. One comprehensive gate was followed by focused rechecks of failures and directly affected suites. Inline SVG styles were moved to generated existing stylesheets after the HTML DOM fixture exposed truncation; the accidental expansion of classic Strat middle-response availability was reverted. HSH availability/checklist assertions were updated to the deliberate new behavior, retaining negative HH, privacy, progress, mode, print and electrical checks. Large failing-DOM assertion diagnostics exhausted memory until the obsolete HSH negative expectation was corrected; the corrected suite passes. Existing checklist regression is intentionally updated to open the secondary checklist; its progress/mode/keyboard/print assertions remain. No baseline failure is accepted as green.

Responsive structure covers 320/360/390/412/768/1024/1400/1920. Instructions remain in normal flow beside the reachable existing viewport, with no checklist scroll trap. Native labelled buttons/selects, live progress, 44px minimum controls, focused checkpoint heading, visible focus and retained reduced motion are tested. No new dependencies, per-frame work, duplicated graphs, public catalogue caching or new runtime requests.

No browser, screenshot or rendered inspection is performed in this pass, by Luke's explicit override. Rendered desktop, mobile, Guided Build, shared visual and blade acceptance are all PENDING LUKE; these are expected acceptance states, not failed automated gates.

Electrical equations and existing baseline topologies are unchanged. New validated capabilities reuse shared primitives. Schema version is unchanged; no migration. Supabase is neither accessed nor mutated. Production business data and commerce/Admin implementation remain untouched. Tests use isolated offline fixtures. Pages must skip Supabase generation for this static-only commit.

Final regression and publication evidence (commit/tree equality, deployment, live assets and clean worktree) is recorded in the completion report.

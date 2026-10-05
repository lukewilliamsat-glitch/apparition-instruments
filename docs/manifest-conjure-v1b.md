# Manifest / Conjure V1B

Private Admin-only hardening, starting from `a5e6190bfcbf1c35ea2e2682ffb752c8e28102ec`. Public composition rendering remains deferred. The three supplied behavioural, technical and handoff references were consumed; no source, selectors, bundles or proprietary implementation were transplanted.

## Checkpoints

- P1/P2: `3ad66830258ff2e42c263d89f53e64968f91eea5` — frozen gesture baseline, separate preview, direct overlap with stable peers/z, anchored type minima and retained lower extent.
- P3/P4/P5: `ba76db2a79a47a4977af4513bd38348e5ef7e7e3` — intrinsic measurement, conservative content flow, bounded settling, complete atomic semantic/layout history and extent policies.
- P6/P7/P8: `a9554b63d1cbcb42d4c8b9b5b6c1dc5f2f536b9b` — block-local mobile overrides, deterministic defaults, private breakpoint/covered-block/section controls, and reference/quality regression coverage.
- P9: final integration gate and this handoff. The publication report records its canonical commit/tree.

## Geometry and text contracts

Pointer samples derive from a recursively frozen captured document and origin. Quantisation uses deterministic nearest grid lines, with ties towards the later line. Optional measured nonuniform lines are supported; the current private canvas renders explicit fixed grid tracks. Direct moves/resizes use the overlap policy, independently of the existing explicit push/reject helpers. Preview does not mutate committed state. Cancel and stale rejection create no history.

The host measures a hidden, natural-height clone at the candidate's rendered width with the actual private typography and padding. Allocated block height is excluded from intrinsic measurement. Initial font readiness precedes measurement. Width changes settle before commit. Four reconciliation passes are the maximum; failure restores the complete prior content/document/history and reports a controlled error.

Placement rows and provenance provide the retained-height policy without changing the persisted schema: manual geometry conservatively retains its recorded height during content edits, including after movement; explicit vertical resize can lower that floor to the intrinsic minimum. Generated text can shrink to its intrinsic requirement. A top-edge expansion preserves the bottom anchor, or rejects safely if the required size cannot fit above that anchor. Direct manipulation never displaces neighbours.

Content reconciliation moves only movable, initially non-overlapping followers below the edited block with exactly matching column/span. Existing intentional intersections, protected blocks and unrelated columns are not follower dependencies. Text, followers and section extent settle inside the same semantic/layout transaction. ProseMirror remains the sole rich-text authority; the inspector's explicit Apply groups the entered text into one transaction without an invented typing timeout.

## Extent, history and responsive state

Occupancy, stored rows, visual minimum and rendered height are separate calculations. Direct contraction/upward movement retains stored rows. Explicit section sizing clamps to occupancy and grid minimum. Content shrink reclaims only an initially compact lower extent; spare rows beyond that compact envelope remain. Internal gaps remain. The canvas accepts a host visual-minimum policy; its default is zero and no Fill Screen redesign was added.

Undo/redo restores exact recorded content and document snapshots without measurement or follower reconciliation. The former post-commit fit/ResizeObserver feedback loop is removed. Breakpoint placements, z and provenance are included in those snapshots.

Mobile is lazily initialised from desktop using proportional columns, stable semantic order and independent rows. Every manual block override is preserved independently. Desktop gestures regenerate only generated mobile placements and measure their text separately. Content edits measure the shared text at each existing breakpoint. Existing protected breakpoint geometry is immutable. The unchanged database validator accepts these layouts; isolated persistence tests cover save/reload and revision association.

## Interaction and reference limits

Move and corner resize have distinct controls, including usable compact hit areas. Covered blocks are selectable through Select any block. Bring to front means maximum current breakpoint z plus one; it does not imitate ambiguous reference ordering/renormalisation. Section controls live outside the canvas and cannot invoke section removal. Pointer cancellation is scoped to the active pointer, and the next gesture captures settled geometry.

Reference tests: T03/04 overlap, T05 CSS/DOM target plus alternate selection, T06/08 ordering/history through integration, T09–13 resize, T14/15 calibrated same-column flow, T16–18 intrinsic sizing, T19–22 extent, T23 bounds, T24 independent nonuniform line fixture, T25/26 history, T28–31 responsive state. Original quality tests cover T32–36 cancellation, drift, control separation, sequential gestures and bounded convergence. Native browser pixel hit testing and actual text wrapping remain Luke acceptance.

T01/T02 duplication/insertion parity is outside the existing block catalogue. T07's reference z-renormalisation is deliberately replaced by explicit Bring to front. T27 is covered by explicit inspector Apply and preserved structured-editor grouping, not a claimed recovered timeout. Reference gutter placements, right-limit specifics, cross-section transfer, snap assistance and activation thresholds were not established; Manifest uses content-only columns, deterministic snapping and no transfer.

## Verification surface

Targeted suites: visual-editor-kernel; manifest-v1b-geometry; manifest-v1b-layout; manifest-v1b-interaction; manifest-canvas; manifest-persistence; conjure-integration; hub-cms-admin; hub-cms-ux; hub-cms-docx; content-platform-p2; manifest-final-gate. Production fixtures, migrations and business mutations are excluded. Public source, auth, commerce, electrical authorities, DOCX implementation and protected semantics are unchanged.

## Luke acceptance

Open `/admin/hub-cms/`, select an existing saved article, then **Edit in Conjure**. Test overlap and covered selection; resize then immediately drag; narrow/widen text and shorten below its intrinsic height; apply longer/shorter text to initially non-overlapping same-column blocks; move down/up and explicitly shrink section rows; undo/redo every operation; customise one Mobile block then move Desktop blocks; Save Draft, reopen and confirm both layouts. Return to structured CMS for complex rich text. Confirm fonts, compact handles, frontmost pixel hits and dirty/save states in the rendered editor.

Deferred: shell/site editing, richer block catalogue, duplication/insertion browser, complex direct rich-text editing, arbitrary uploads/crop, cross-section transfer, section templates, public Manifest rendering and tenant infrastructure. Do not begin V1C from this handoff.

Final integrated cycle: all 12 targeted suites PASS. `git diff --check` PASS. No browser inspection, production fixtures, Supabase integration access, schema mutation or public renderer changes were performed.

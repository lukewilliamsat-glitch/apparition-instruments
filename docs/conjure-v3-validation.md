# V3 targeted validation

All 19 focused suites passed: visual-editor-kernel; manifest-v1b-geometry; manifest-v1b-layout; manifest-v1b-interaction; manifest-canvas; conjure-integration; conjure-v3-fluid; conjure-v3-sections; conjure-v2-product (extended V3 runtime contracts); conjure-v2-shell; conjure-v2-navigation; admin-gate; hub-cms-admin; hub-cms-ux; hub-cms-docx; hub-cms-data; manifest-persistence; conjure-v3-final-gate; conjure-v3-parity.

The V3 runtime extends article checks with contextual Line search/Enter insertion, eight handles, on-page ProseMirror heading/reference reconciliation, safe links through the outer shell, shared blank sections, removable text duplication/deletion, Layers, exact semantic/geometry Undo, staged settings, save conflicts, save locking and draft reload.

The parity harness records 42 classified cases: 17 PASS, zero FAIL, 18 CONDITION_MISMATCH, seven REFERENCE_UNKNOWN. Conditions and scope are reported per case, rather than claiming 42 exact reference matches. Reference numerical fixtures come from all four supplied artifacts' provenance and the machine-readable measured resize records. Existing geometry tests cover the preserved T-series logical invariants.

Corrections: moved the Advanced DOM binding into boot; guarded toolbar refresh when Undo removes generated Mobile state; removed old-reference preview cleanup after structural edits; kept ProseMirror's changed heading reference; scoped the dragging selector; corrected a test's intrinsic-height arithmetic. Checkpoint C was published before the late product failure was read; D corrects that sequencing error's source issue and passed the affected runtime test. The final state passes the complete focused gate.

Database verification used isolated PGlite fixtures only for content writes. Production received one additive validator-only migration, no row mutations. Validator source MD5 b1d926c3d85516193539bf6a44cd4ba7 matches local source; security_definer=false; direct anon/authenticated execution=false. The migration file is aligned with the production-assigned 20261006082019 version. Existing schema/RPC/RLS authority is preserved.

No broad electrical/commerce regression, browser inspection, screenshots, image generation, production fixture records or draft publication. Existing public/homepage/Hub/commerce/auth/Operations/News sources are byte-preserved by the scoped final gate.

Incremental canonical publications:
- A: 725f6f92a45301203c8563e4e0c64378f78040f7 — shell/grid/selection/fluid drag/eight resize handles.
- B: 9d71666d4537d9ab897b62535bf78bbd709038e2 — rich direct Write/contextual toolbar/picker/Line/insertion.
- C: f4246d85c4a2912d815f5dcee1387c2b03f1acba — sections/blank sections/Layers/order.
- D: 535f6811f24050fd78ef2c64fd8cdd202afbcff7 — responsive refresh/content restoration/keyboard/focus.
- E: final validation and reference harness; canonical commit/tree and deployment receipts are supplied in the completion report.

Rendered acceptance remains Luke's responsibility. Verify desktop/mobile pointer feel, selection/overlap/obscured Layers, rich Write controls, picker focus, section boundaries/gaps/reordering, complete Undo/Redo and private save/reload with an existing authorised draft. Public composition publication and V4 are not enabled.

# Conjure V3

Starting canonical commit: 7408adb38bda22a1662838dc518773d9cd45787d.

The four supplied clean-room artifacts inform the private editor. Their SHA-256 provenance and reduced numerical resize fixtures are recorded in tests/fixtures/conjure-v3-reference.json; proprietary application code, class names and account data are not transplanted.

## Authority and presentation

Conjure keeps the actual shared article renderer, inert website preview, existing Admin gate, semantic ProseMirror schema, Manifest kernel/coordinator, responsive provenance and versioned atomic DRAFT RPC. No public Manifest publication is enabled. Static pages remain navigable read-only: they lack a durable editable authority, and no new persistence layer is invented.

The default shell is full-width canvas with an optional Advanced inspector. Direct block selection exposes type-capability actions. A contextual section toolbar exposes picker, settings, Layers, blank section insertion and order changes. Settings reuse the existing staged controls and guards. The picker is generated from registered supported Text/Image/Button/Line adapters, with search and keyboard focus. Images require existing approved Article Media associations.

Fluid mode is opt-in to the generic canvas; legacy hosts retain existing defaults. It exposes eight 34px hit targets around 10px handles. A configurable 5px pointer activation distance precedes transient baseline-based gestures. Resolved CSS tracks, when available, supply measured grid lines; logical geometry, history and semantic authority are independent of pixels. Mobile uses intrinsic minmax tracks and breakpoint-specific text measurement, not fixed 24px physical text rows. Fonts are ready before initial article measurement.

Direct Write mounts the existing ProseMirror editor on the actual block. Paragraph/H2/H3, marks, links, lists and other existing safe schema controls remain semantic operations. Apply commits one coordinated semantic/composition snapshot; Cancel discards staging. Link input uses the authenticated outer shell prompt while the iframe retains its scripts/modals-disabled sandbox; only safe semantic link marks are dispatched. Style changes retain ProseMirror's resulting reference rather than imposing an obsolete presentation capsule.

Private blank sections persist in the existing sections array with shared identity and per-view layouts. Host nodes are reordered only within the private canvas when canonical order requires it. The public source template is unchanged. Existing preserved blocks cannot be deleted; new removable text references are deleted and sibling paths adjusted atomically. Duplicate is available for supported supplements and new unreferenced removable text. Whole-section duplication and Fill Screen are deferred, rather than exposing unbacked controls. Height and per-view gaps are durable. Stack changes do not change placement geometry; protected stacks expose Bring to Front without changing locked peer z values.

## Persistence and security

The sole production change is CREATE OR REPLACE of the existing invoker validator, admitting version-1 Line with empty content/presentation and no edit capability. Unknown/protected adapters remain locked. Existing function identity, ACLs, RLS and save RPC are unchanged. No production rows, drafts, orders, stock or catalogue data are changed. The CLI-created migration filename is aligned with the version actually assigned by the authenticated migration integration: 20261006082019.

Production validator source MD5 matches repository source: b1d926c3d85516193539bf6a44cd4ba7. Direct anon/authenticated execution remains denied; security_definer remains false. Isolated PGlite tests verify Admin-only atomic save, stale versions, invalid adapter rejection, Line round trip, immutable revisions, legacy/unknown state and unchanged public projection.

## Reference differences and acceptance

This is independent Apparition code and branding. Universal insertion/snapping thresholds are reference UNKNOWN. Conjure uses a modular viewport-biased nearest available band and measured-line quantisation; manual overlap remains allowed. No automatic global packing is introduced. Complete history restoration is an intentional quality guarantee rather than reproducing reference peer drift.

Only supported adapters are exposed, not the reference's full 37-block catalogue. Shape, Button Fit/alignment, full theme controls, saved sections, global/header/footer editing, static-page persistence, public composition publication, tenancy/domains/billing, broad touch/IME testing and V4 remain deferred.

The executable 42-case parity report has 17 PASS, zero FAIL, 18 CONDITION_MISMATCH and seven REFERENCE_UNKNOWN. PASS is scoped to recorded measured resize/logical or explicit structural contracts. UI, typography, asset and catalogue mismatches are not disguised as exact parity; six exploratory cases remain unknown. Existing T-series geometry/layout tests and runtime article/UI tests provide additional checks without claiming full browser equivalence.

Luke must accept rendered shell dominance, actual pointer feel/handle targeting, contextual popovers, overlap/Layers, direct rich text, section ordering, Mobile overrides, Undo/Redo and private save/reload. No browser, screenshots or image generation were used for this pass.

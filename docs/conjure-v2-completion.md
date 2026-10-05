# Conjure V2 website-editor foundation

Primary entry: `/admin/conjure/`, through the existing Admin membership gate.
Discovery: Admin workspaces → Conjure → Website editor. The article CMS also
offers a deep link to the selected article. Its original Conjure, structured
editor, DOCX, revisions and media tools remain available.

The website page is the presentation surface: static pages use their actual
HTML/styles in an inert, scripts-disabled private preview; supported CMS pages
use the shared article renderer and accepted presentation templates. Private
body-slot overlays reuse the V1B canvas, geometry, layout and atomic coordinator.
There is no second drag/resize engine and no public overlay execution path.

## Bounded editable scope

- The 22 existing seeded article presentations are supported, including multiple
  semantic slots. Safe body H2/H3 headings and single-run paragraphs edit directly
  on the page, preserving their existing marks through ProseMirror.
- Protected and complex semantic content remains read only in Conjure; use the
  retained specialist CMS for complex formatting and metadata.
- Text can be appended safely. Approved associated images and validated buttons
  can be added/configured. New supplemental Image/Button blocks can be deleted;
  semantic Text and previously non-removable blocks remain protected from deletion.
- Move, resize, overlap, stacking, section selection/height and Desktop/Mobile
  placements use the existing Manifest contracts. Manual mobile overrides remain
  isolated from desktop. Section backgrounds/site themes are not editable.
- Homepage, Hub landing, catalogue, tools, News and other static routes are
  navigable read-only previews. Dynamic scripts, forms and commerce actions do
  not run. Account, basket, checkout and Admin destinations are excluded.

## Save and history boundary

Applied content/layout drafts and exact session history survive page navigation
inside Conjure. Unapplied text/settings block navigation until Apply or Cancel.
Exiting/reloading with unsaved drafts is guarded. Saving locks mutations and
navigation; errors/version conflicts preserve the draft and allow retry.

One existing authenticated, version-checked `save_hub_article_manifest` DRAFT RPC
persists semantic body plus composition atomically. No automatic publication is
performed. A fresh session restores the saved composition and body; session undo
history does not survive a browser reload. Undoing initial Mobile creation safely
returns the shell to Desktop; Mobile selection survives navigation and return.

**Public Manifest layout publication remains deferred.** Existing CMS publication
and revision semantics remain available, but public article rendering still uses
the accepted presentation model. Conjure explicitly labels saved layouts private
and unpublished. No schema, migration, Edge Function or production data changes
were required for V2.

## Validation and acceptance

Focused coverage includes shell/navigation, product editing/save/reload/conflict,
Admin authorization, all 22 shared presentations, V1B geometry/layout/interaction,
legacy Conjure/CMS, DOCX, revisions, approved media and isolated database security.
The V2 preservation gate checks unchanged public/commerce/electrical/backend
authorities, scoped private CSS, unchanged auth behavior and exact PM/DOCX bundle
parity. The historical phase-specific writable-path gates are superseded by this
V2 gate; their engine/persistence invariants remain covered by existing tests.

Luke should confirm rendered selection/hit testing, native text editing, drag and
resize, section controls, Desktop/Mobile, and Save/reload with safe draft content.
Do not use live commercial records or publish test content for acceptance.

Full block parity, arbitrary/static-page authoring, header/footer/global themes,
advanced rich text, image cropping, galleries/forms, section templates, page
creation/deletion and cross-section dragging remain later work.

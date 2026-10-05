# Conjure V2 architecture decision

Starting canonical commit: 5d14e0a9920890f70f6f2a26552b7b1630dd0832.

Previous surfaces: structured Hub CMS, private safe-text preview, and article-level V1B grid harness. All remain compatibility/power-user surfaces. They are not the primary product.

Canonical surface: /admin/conjure/, a persistent authenticated website editing shell. The page is the canvas. Page selection/navigation uses public routes and page titles, not database IDs or CMS terminology.

Presentation: exact existing public static HTML for read-only pages; existing renderArticle/renderBody plus existing website styles for CMS-backed pages. Script-disabled private preview and additive private overlay styles. No public source rewrite or public composition renderer.

Authorities: Git-owned static presentation remains read-only; commercial/auth/electrical pages are limited previews; Hub CMS + existing ProseMirror schema remain semantic authority; approved Article Media remains image authority; Manifest V1B remains geometry/composition/history authority. Adapters mediate those sources rather than collecting them into a new database.

Initial editable coverage: existing CMS-backed website pages. Homepage, Hub landing/categories, components, wiring kits, tools and News can be previewed/navigated without leaving the shell. Account/basket/checkout/Admin routes are excluded from the preview. No arbitrary static-page writes, product mutations or new schema.

Save: one page's semantic content and Manifest save through the existing optimistic, Admin-authorised atomic RPC. No silent publish. Unsaved page sessions survive internal navigation in memory; reload/exit guards warn before losing unsaved work. Saved drafts reload from the existing authority. Explicit public layout publication remains deferred; saved composition is labelled unpublished. Existing CMS publication/revision tools remain available.

Editor: reusable existing mountCanvas/coordinator/kernel/layout through opt-in section hosts. Full site header/hero/footer and styles remain; Manifest sections mount only into annotated private body slots. Safe direct text uses the existing ProseMirror document buffer and preserves marks/protected capsules; the visible text is the input surface. Images/buttons use bounded inspectors and approved sources. Background, template and global design features remain website-owned/deferred.

Navigation: first-class shell stays mounted; internal public links resolve through a constrained same-origin route registry. Pending direct input must be applied/cancelled before leaving; applied dirty drafts remain cached. Unsupported pages are explicitly read-only, and script/form execution is disabled in previews.

Retained specialist Admin: content/DOCX/SEO/revisions/media, commerce, operations and electrical/tool authorities. Add Conjure navigation/deep-links without deleting or replacing them. Later de-emphasis concerns article-level visual harnesses, not power-user functionality.

Checkpoint plan: P1–P3 shell/presentation/navigation; P4–P9 V1B overlay/adapters/direct editing/blocks/sections/responsive; P10–P12 atomic save/history/Admin compatibility; P13 integrated preservation and deployment verification. No new Squarespace research or public presentation migration.

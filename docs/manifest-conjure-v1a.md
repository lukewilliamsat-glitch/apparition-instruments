# Manifest Engine / Conjure V1A

Manifest owns numeric composition; ProseMirror owns semantic content. Text blocks contain slot/path/kind/source-reference bindings, never authoritative article text. Known source references remain stable; unreferenced nodes use deterministic paths. Structured/DOCX body saves without a coordinated composition clear the draft layout rather than reuse stale bindings.

Persistence extends the existing private CMS with nullable `hub_articles.manifest` and `hub_article_revisions.manifest`. No legacy backfill is performed. The existing library view adds its private draft composition at the end. The existing save signature remains available; a Manifest-aware RPC delegates to the same locked, Admin-authorised implementation. Both content and composition are validated before one atomic write and one edit-version increment. Publish snapshots both documents; restore copies the matching historical composition, including null for a legacy revision. Existing immutable-revision triggers and RLS apply to the new columns. Public projection/rendering deliberately do not consume Manifest.

Image blocks reference approved asset and article-media identities. Button blocks use bounded labels and validated links. Unknown block data is preserved but never executed or manipulated. Technical/protected bindings are locked and visible; coordinated saves cannot change already-persisted protected bindings/geometry.

No per-pointer database writes. Durable saves occur only through the existing draft/publish lifecycle. Responsive placements share content identity but have independent geometry.

P1R is covered by isolated PGlite database fixtures, including Admin/anonymous/non-Admin access, optimistic concurrency, atomic invalid-write rejection, save/reload, immutable publication snapshots, historical/legacy restore, unknown preservation and unchanged public projection. No production test articles are created.

## Private Conjure consumer

Entry: `/admin/hub-cms/` → Edit an existing article → **Edit in Conjure**. A new article must be saved as a draft first. Conjure uses a scripts-disabled, same-origin sandboxed iframe; overlay interactions are parent-owned and never added to public HTML. Text, approved referenced images and validated buttons use the registry. Protected technical content is shown with a locked badge. Rich/multi-run text stays read-only in the contextual inspector; use the existing structured editor for complex formatting. Simple text updates retain their existing inline marks.

History boundary: a Conjure session has one combined semantic/composition undo timeline. Contextual ProseMirror patches are excluded from its independent history. Text measurement can grow the last transaction's geometry without adding another undo step. Escape cancels a gesture. Closing preserves applied draft changes, clears session history and resets structured-editor history at the explicit boundary. Reopening starts a fresh session. Unapplied inspector changes must be applied before saving or explicitly discarded on exit.

Save Draft writes the semantic draft and Manifest together. Reload restores composition. Publish remains the existing explicit CMS action; Conjure has no publication action. Images require an existing approved Article Media association; no upload or media-record mutation occurs in Conjure. Image references use existing media alt/decorative metadata. Independent responsive placements are persisted; no mobile editing/generation UI is included.

If text expansion is blocked by protected geometry, the canvas keeps the technical block fixed, reports the obstruction and permits scrolling the content. Move/widen the supported text block to make room. Existing geometry is not silently rearranged through protected content.

Deferred: advanced rich-text editing directly on canvas, full mobile UI, automatic responsive generation/reset, cropping/focal controls, deletion/structural insertion UI, public Manifest rendering and site-wide editing.

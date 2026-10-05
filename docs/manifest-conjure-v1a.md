# Manifest Engine / Conjure V1A

Manifest owns numeric composition; ProseMirror owns semantic content. Text blocks contain slot/path/kind/source-reference bindings, never authoritative article text. Known source references remain stable; unreferenced nodes use deterministic paths. Structured/DOCX body saves without a coordinated composition clear the draft layout rather than reuse stale bindings.

Persistence extends the existing private CMS with nullable `hub_articles.manifest` and `hub_article_revisions.manifest`. No legacy backfill is performed. The existing library view adds its private draft composition at the end. The existing save signature remains available; a Manifest-aware RPC delegates to the same locked, Admin-authorised implementation. Both content and composition are validated before one atomic write and one edit-version increment. Publish snapshots both documents; restore copies the matching historical composition, including null for a legacy revision. Existing immutable-revision triggers and RLS apply to the new columns. Public projection/rendering deliberately do not consume Manifest.

Image blocks reference approved asset and article-media identities. Button blocks use bounded labels and validated links. Unknown block data is preserved but never executed or manipulated. Technical/protected bindings are locked and visible; coordinated saves cannot change already-persisted protected bindings/geometry.

No per-pointer database writes. Durable saves occur only through the existing draft/publish lifecycle. Responsive placements share content identity but have independent geometry.

P1R is covered by isolated PGlite database fixtures, including Admin/anonymous/non-Admin access, optimistic concurrency, atomic invalid-write rejection, save/reload, immutable publication snapshots, historical/legacy restore, unknown preservation and unchanged public projection. No production test articles are created.

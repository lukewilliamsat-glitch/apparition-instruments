# Conjure V4 private website authoring

Starting canonical commit: b590063ac4f984fdf6aad897e9ed37d8b928456c.

The route registry separates page resolution from semantic authority, composition, global regions and capabilities. Hub articles retain their CMS records/RPC and original presentation adapter. Homepage, Components, Contact and the Hub landing use explicit canonical-source mappings and private versioned Manifest documents. Products, dynamic categories, News and tools remain protected previews. Header/footer have stable shared identities and are never copied into a page document.

One shared session owns ProseMirror content, canvas gestures, coordinator history, responsive geometry, Layers, insertion, contextual controls and saving. Native page projection is a host renderer, not another interaction engine. Original bound HTML is an in-memory presentation capsule, not persisted arbitrary HTML. Unchanged native geometry stays in the original CSS/DOM; layout changes project relative to the source geometry. Source-derived Desktop/Mobile geometry is independently accepted; manual changes retain shared IDs. Existing global styles remain authoritative.

Bootstrap performs no write. The first explicit Admin Save Draft creates a document and immutable revision; subsequent saves require the expected version. Semantic content and Manifest geometry save atomically. A changed canonical-source fingerprint blocks saving/loading rather than discarding a private draft. RLS denies public/non-Admin access, direct mutations are revoked and the save RPC checks membership. There is no publication pointer, public document RPC, public renderer integration, or automatic page backfill.

Production migration: 20261006091313_manifest_universal_private_documents. Production verification found RLS enabled, anonymous read denied, direct authenticated mutation denied, and zero documents/revisions after migration. Tests write only isolated database fixtures. No production draft/business writes were performed.

Public authoring publication, Site Styles, full header/footer designers, page creation/deletion, templates, video/forms/commerce blocks, full product editing and tenancy are deferred. Luke performs rendered/manual acceptance; no browser inspection was used.

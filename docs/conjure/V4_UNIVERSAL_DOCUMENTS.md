# Conjure V4 private website authoring

Starting canonical commit: b590063ac4f984fdf6aad897e9ed37d8b928456c.

The route registry separates page resolution from semantic authority, composition, global regions and capabilities. Hub articles retain their CMS records/RPC and original presentation adapter. Homepage, Components, Contact and the Hub landing use explicit canonical-source mappings and private versioned Manifest documents. Products, dynamic categories, News and tools remain protected previews. Header/footer have stable shared identities and are never copied into a page document.

One shared session owns ProseMirror content, canvas gestures, coordinator history, responsive geometry, Layers, insertion, contextual controls and saving. Native page projection is a host renderer, not another interaction engine. Original bound HTML is an in-memory presentation capsule, not persisted arbitrary HTML. Unchanged native geometry stays in the original CSS/DOM; layout changes project relative to the source geometry. Source-derived Desktop/Mobile geometry is independently accepted; manual changes retain shared IDs. Existing global styles remain authoritative.

Bootstrap performs no write. The first explicit Admin Save Draft creates a document and immutable revision; subsequent saves require the expected version. Semantic content and Manifest geometry save atomically. A changed canonical-source fingerprint blocks saving/loading rather than discarding a private draft. RLS denies public/non-Admin access, direct mutations are revoked and the save RPC checks membership. There is no publication pointer, public document RPC, public renderer integration, or automatic page backfill.

Production migration: 20261006091313_manifest_universal_private_documents. Production verification found RLS enabled, anonymous read denied, direct authenticated mutation denied, and zero documents/revisions after migration. Tests write only isolated database fixtures. No production draft/business writes were performed.

Public authoring publication, Site Styles, full header/footer designers, page creation/deletion, templates, video/forms/commerce blocks, full product editing and tenancy are deferred. Luke performs rendered/manual acceptance; no browser inspection was used.

## Validation and checkpoints

- A 44244c51f8514a3aa4c4b41e23a9f5a21ef64989: universal registry/shared session, explicit native homepage bootstrap, private draft firewall and one additive migration.
- B 268e134d446879c88b58cad12bdd41b4a79e9753: retained website navigation, safe external/account destinations, route/viewport/edit-mode state and unsaved-document notices.
- C 448fac151547f2df97a4775dc38dce22e000d14f: information/landing adapters and explicit application/dynamic/product read-only aggregate identities.
- D c75b32e3ae634e5f0645c13b1a7993ebc9ef181b: shared native geometry, preserved field roles/inline markup, exact-width movement, independent mobile resizing and Undo.
- E: final private-scope/public-preservation gate, existing authoring regressions and live deployment verification.

Twenty focused scripts passed: V4 website/navigation/protection/native geometry/private persistence/final gate; V3 fluid/parity logical contracts/sections; V2 shell/product; Manifest canvas/geometry/layout/interaction/persistence; CMS data/Admin/DOCX/database. A pair of source-path assertions in V3 parity was updated to follow the extracted shared document session; behavioral contracts stayed unchanged. V3 parity reports 17 PASS, zero FAIL, 18 CONDITION_MISMATCH and seven REFERENCE_UNKNOWN. This is not a rendered Squarespace equivalence claim.

The final gate verifies byte-preserved public site sources, business/auth/electrical authorities, Admin gate, existing CMS/Media and public generators. It rebuilds the existing ProseMirror/DOCX bundles deterministically and checks they match. A missing article library now produces an explicit warning rather than blocking private homepage authoring. No production test content was created.

Manual acceptance: open `/admin/conjure/?page=/`, edit a safe native homepage field, Save Draft, reload and confirm the private draft returns while `/` remains unchanged. Check actual header/footer navigation, retained viewport/mode, Layers, drag/resize, section insertion and responsive presentation. Fonts, hit targets, overlay placement and rendering are Luke's acceptance responsibility. V5 is not started.

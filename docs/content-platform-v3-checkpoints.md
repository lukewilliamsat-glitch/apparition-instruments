# Content Platform V3 checkpoints

Starting canonical main: `a2bc3df541a8a2e825150186f83c69d981eb7604`.

| Phase | Published HEAD | Pages | Result |
| --- | --- | --- | --- |
| P1 | `76338322bb7f57eca5a32bd3515eba2e7b8aa93c` | Success | Document UX, state/shortcut safety, protected-block ergonomics |
| P2 | `586aef5310a1d33e891eae08380ff541b65d2bfe` | Success | Generic authoring and private plain-text canvas adapter |
| P3 | `d5c27b768ff5e46a5e542e23190a1745cae2f7a6` | Success | Eight supporting guides, 22 → 30 publications |
| P4 | `3270e1e5e5252525e85c64881ed2035abd350350` | Success | Additive Hub/category/tool journeys; 14 nominations retained |
| P5 | `22cce0c218957890565746093325e82e78d534b4` | Success | Private approved-media metadata and Admin workspace navigation |

The P6 commit adds the integrated tests and this checkpoint record. Its Git commit identity records the final publication; source/tree identity and live build-stamp verification are reported at completion.

## Validation

Each phase passed its targeted contract tests before its independently recoverable non-force publication. One final integrated cycle passed all 11 affected-contract checks: accepted editor controls/library; source-body/metadata/schema roundtrip and atomic generation; CMS UX; DOCX safety/roundtrip; P1 state/protection; P2 private visual bindings; P3 content graph; P4 additive interactivity/preservation; P5 media/Admin boundaries; composed current migrations and draft/publish/restore/media isolation; strict writable boundary, protected source parity, bundle/source parity and deterministic 30-guide generation.

One seed-order correction was needed in P3: cross-links between new publications require all new immutable pointers to exist before validation, inside the same atomic migration. Isolated tests then proved repeat application and exact original-row preservation. A P5 boundary-test assertion initially matched an explanatory comment; it was narrowed to source code. Final live verification exposed input-order dependence in added navigation: the local seed and public RPC order differ. Discovery now explicitly orders original guide identities followed by stable new guide keys; a reversed-input regression check proves identical static output. Only the affected discovery/preservation checks were rerun. No broad platform/electrical test suites were run. Database fixtures were isolated with PGlite; no production test business records were created.

## Production changes

Two new additive migrations: `hub_content_expansion_v3` seeds eight CMS articles and eight immutable import revisions; `hub_media_foundation_v3` creates private RLS-protected media metadata/usage tables and a membership-checked RPC, with one approved existing logo metadata record. Original 22 published pointers remain preserved by construction and isolated tests. Production verification: 30 articles, 30 revisions, zero DOCX imports, one approved asset, zero media references; new tables have RLS, RPC has empty search path, anon cannot execute mutation. No orders, customers, stock, sales, Operations state, News posts or commercial destinations changed. No Edge Function deployed.

## Preserved and deferred

Homepage/Signal Path, shared electrical models/topology, commerce/checkout/basket, OPEN/PAUSED/HOLIDAY behaviour, authentication, inventory/order logic, Operations/News behaviour and original article presentation are unchanged. Hub/tool/Admin integrations are marker-delimited additions checked against starting source. No browser inspection, screenshot or image generation occurred. Rendered acceptance remains with Luke.

Deferred deliberately: direct visual editing of lists/tables/mixed rich text and page layouts; arbitrary uploads, public image insertion and immutable revision-bound media projection; multi-site hosting/billing/domain/tenant infrastructure. Structured editing and existing DOCX workflows remain available. No entire phase was deferred.

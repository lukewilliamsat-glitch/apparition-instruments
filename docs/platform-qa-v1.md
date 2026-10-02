# Platform QA V1 — engineering record

Starting main: `af13a3b6a27198f1dddf6d02b2389eb234016274`.
Starting tree: `5a706f25a8ae63e248ae0bd5db318ac444d4bade`.
Recovery branch: `platform-qa-v1-recovery`, at the starting commit, published before changes.

## Authority and architecture

The customer-facing hub is `dist/customer-ui.css` (tokens, type, spacing, commercial/editorial/service/technical primitives), projected idempotently by `scripts/sync-customer-ui.py`. Shared navigation belongs to `dist/brand.css` and `dist/site.mjs`. Fifty public shells consume the hub; Admin remains a separate operational shell. Components uses the common commercial primitives and shared product model. No evidence justified a new storefront, Hub or Account redesign.

Product authority is the public Supabase catalogue → `dist/backend/component-data.mjs` → `dist/products/model.mjs` → `scripts/generate-product-pages.mjs`, using `dist/products/index.html` as the template and shared presentation helpers. Runtime product pages use the same data/presentation contracts. Copy, image, SKU, price, stock, specifications, basket behaviour and Product/Offer data are preserved. Nine published product snapshots were compared with current public catalogue identity, price and stock and agree.

Luthier Hub retains `knowledge.css` editorial layout while consuming the common shell and customer UI. Its generator owns the eight rebuilt route heads. Account consumes the common service controls; its authentication implementation remains unchanged. Wiring Kits and Basket likewise retain their established business/data authorities.

Electronics authority is the shared electronics state/graph and Generator model. Composition owns physical component geometry and label reservations; the shared renderer projects it for Generator and Forge. Homepage previews are generated through that renderer from the educational circuit. Response calculations remain in their existing validated engine. Build/Trace/Explain, Guided Build, contacts and terminals retain the same graph and configuration contracts.

## Confirmed defects and repairs

| Defect | Cause | Authoritative repair |
| --- | --- | --- |
| Homepage Forge appeared pale, faded and low contrast | Dark section override changed only its outer background; SVG retained paper and dark labels; whole-diagram stage opacity dimmed it | Explicit dark SVG surface adapter, responsible homepage palette/foreground tokens, clear paper, readable response/support text; remove whole-diagram fade in stages 0/3 |
| Components dropdown collapsed on some routes | Its layout lived in education-only CSS, absent on twelve shared-shell routes including product templates | Move disclosure layout into common `brand.css`; consolidate duplicate rules; preserve native details, wrapping, spacing and targets |
| Desktop/mobile dropdown mismatch | Site listeners used 1101px while shell CSS used 1180px | Match listener transition to 1181px |
| Pot title/value appeared overprinted | Baselines were four pixels apart (-12/-8), rather than duplicate component generation | Move title through composition authority to -36; reserve its geometry; retain one value and three labelled lugs |
| Diagram styles could repaint unrelated inline SVG/text | Renderer CSS was unscoped | Scope renderer-owned selectors to circuit SVG roots; preserve root presentation selectors and shared artwork adapters |
| Muted crossing clearance faded / ignored dark surface | Opacity applied to the whole marker; disc used hard-coded paper | Keep gap opaque, dim only hop; use shared surface with paper fallback |
| Admin catalogue-option delete was rejected | Supported guarded RPC omitted from authenticated repository transport allowlist | Add only `rpc/delete_unused_catalogue_option`; retain server membership/dependency guard |
| Eight Hub pages lacked sharing/WebPage metadata; Terms had duplicate description | Regenerated heads omitted metadata; legacy SEO cleanup depended on a broad range expression | Repair generator head, refresh only scoped heads, use node-specific cleanup, preserve all 42 canonical sitemap routes and shared stylesheet ordering |
| Fresh migration replay stopped on already-repaired function bodies | Two historical guard migrations required only the original text despite earlier source already containing repair | Recognise the exact repaired form as a no-op; original repair and unknown-body rejection remain; no historic production migration replay |
| Public catalogue views had unused client write grants | Supabase default grants survive a subsequent `GRANT SELECT` | New guarded migration revokes client grants on exactly two invoker views, then restores SELECT; base/Admin/service permissions and data unchanged |

The electrical volume contract remains lug 1 ground, lug 2 wiper/output, lug 3 signal input. The educational main path reaches jack TIP; the tone network is a branch toward ground, and sleeve remains ground. No electrical equations, graph connectivity, contact model or electrical configuration was changed.

## Production and security audit

Verified project: `acdxpxvksvdwfajntzfx`, Apparition Instruments Webstore, healthy eu-west-1 PostgreSQL 17.6.1.166, matching repository public config. Only metadata/function source, public catalogue records and aggregate consistency were read; no credentials or customer details were exported into this record.

Reviewed 21 public relations (19 RLS tables, two invoker views), 27 public policies, 26 functions, 173 columns, 108 constraints, 39 indexes and three triggers. All base-table RLS is enabled. The five authenticated SECURITY DEFINER Admin RPCs require current `auth.uid()` membership in `admin_members` and fixed search paths; anon cannot execute them. Service commerce/email functions remain service-only. Admin UI also verifies fresh Auth identity and membership; hidden navigation is not treated as an access boundary. User metadata and Google/customer identity do not grant membership. The single production Admin membership was preserved.

All nine deployed Edge Functions and 26 packaged files were reviewed. Twenty-five files match current source. The remaining difference is in the historical, tightly constrained legacy-confirmation bundle; its one-time canary is already handled. Current checkout/payment/transactional email bundles agree with source. No deployment was repeated merely to erase historical packaging evidence.

All 27 historical applied migration names agree with source, but several old timestamp prefixes differ. Those historical ledger entries were not renamed or replayed. Full offline replay now matches effective production tables, columns, constraints, policies, indexes, triggers, function bodies, execution privileges and client grants. New migration `20261002163408_platform_qa_catalogue_read_grants.sql` matches its actual applied ledger version.

Exact production mutation: guarded permission-only DDL on `public.catalogue_components` and `public.catalogue_wiring_kits`: revoke PUBLIC/anon/authenticated grants; grant anon/authenticated SELECT. Created through Supabase CLI `migration new`, tested locally, applied through supported migration tooling, and read back. No tables, columns, function bodies, RLS policies, business rows, inventory, orders, payments or email deliveries changed. Service grants are preserved. Post-apply public catalogue views still return 14 component rows and one kit; client SELECT works in role fixtures. Post-apply aggregate checks: negative stock 0, paid without fulfilment boundary 0, external lifecycle deliveries 0, external Stripe identities 0; one Admin member remains.

Unresolved findings and reasons:

- Leaked-password protection is disabled. Exposed tooling has no supported Auth-configuration update; no unsupported credential/plan/configuration workaround was attempted. Enable/review in Supabase Auth dashboard. This does not alter the membership authorization result.
- Historical migration version drift and the constrained legacy confirmation package difference are preserved as operational history; effective schema and active lifecycle match. No replay/redeployment without a demonstrated runtime defect.
- Advisor flags for public `pg_net`, deny-default service tables and authenticated definers are intentional dependencies/boundaries. Seven FK-index and five permissive-policy advisories have no demonstrated costly execution plan here; some keys already have leading composite coverage. No speculative index or policy rewrite. Existing duplicate SKU constraints support compatibility/upsert contracts.

## Cleanup and efficiency

Deleted `dist/assets/signal-forge-circuit.svg`: repository-wide reference search found no runtime, HTML, CSS, import, test or documentation consumer; only its obsolete generator writer. The current complete preview is `signal-forge-full.svg`. Removed that writer and its no-op label replacement. Historical bytes remain in Git/recovery. No required source, historical migration, operational record or live referenced asset was deleted.

Removed education-only duplicate dropdown declarations and the contradictory outer-only homepage palette override. Generated previews now use one responsible surface/renderer. Homepage SVG fetch inherits the stamped module build revision for cache consistency. Scoping adds a small amount of CSS to current previews; removing the unused ~53 KB preview reduces shipped Pages asset payload overall. No new application dependency, listener system, speculative caching layer or production fetch was introduced.

## Verification

One comprehensive offline gate, then only failed/affected checks after fixture or implementation repairs: **130 eligible automated test entrypoints PASS**. Network-blocking preload prevents native HTTP/TLS/socket egress in Node fixture processes and inherited subprocesses. Database replay uses ephemeral PGlite, with local managed Auth/Storage/Vault/Cron stubs and no outbound jobs or real secrets.

Coverage includes public shared shell, navigation, Components/products/template propagation, kits, tool handoffs, Forge, Generator, Guided Build, Treble Bleed Designer, Signal Lab, Hub, Account/Auth/ownership, Admin UI and direct RPC authorization, orders/checkout, inventory/idempotency, External Orders email isolation, refunds and transactional lifecycle, SEO/schema/sitemap, response comparisons, electrical switching/configuration matrices and presentation fixtures.

New source/behavioural protection: 108 disclosure instances; real shared keyboard/hover/Escape listeners; single pot labels and terminal counts across architectures and all three modes; inline SVG isolation; resolved dark text contrast ≥4.5; actual crossing clearance on paper/dark surfaces; no whole-diagram fade; real transport allowlist/session/unknown-resource behaviour; byte-preserved electrical/commerce/auth authority. Shared customer UI coverage includes 50 shells, 219 native controls and 72 computed responsive/contrast cases. Static audit covers 60 pages, links/fragments/IDs and module syntax/imports. SEO covers 42 public canonical routes, utility noindex, generated metadata safety and idempotence.

Post-apply security replay: all 28 migrations PASS; exact current production schema/security comparison PASS; anonymous/customer/forged metadata/stale revoked membership denied; authorized Admin operations and public SELECT retained. Historical test fixtures were maintained against current supported architectures, handoffs, catalogue identities and injected repositories instead of stale UI strings, hard hashes or blocked network imports. Meaningful frozen-state, route, topology, commercial and terminal assertions remain.

Execution correction: the initial test enumeration accidentally included `forge-mobile` and `home-card-wrap`. Their legacy browser launch calls failed immediately because no browser binary was present. No browser opened, no page was inspected and no screenshot was produced. Both were excluded, never rerun, and no browser infrastructure was installed. The gate runner now explicitly filters browser-dependent entrypoints. They are not counted among the 130 passes.

Rendered desktop/mobile, homepage, Components, product, Signal Forge, Luthier Hub, Account, Guided Build, shared visual system and blade-switch acceptance: **PENDING LUKE**. Structural test success is not a rendered visual-quality claim.

## Change manifest

The final commit contains this record; shared palette/artwork/render/composition, homepage fetch/CSS/HTML, shell CSS/listeners, Admin transport allowlist, SEO/generator scripts and scoped generated heads/sitemap/previews; two reproducibility guard repairs; one permission migration; two new regression entrypoints; maintained affected historical tests. The removed file is only the unused filtered preview. Exact paths and bytes are available in the commit diff.

- `dist/assets/interactive-wiring-preview.svg`
- `dist/assets/signal-forge-circuit.svg`
- `dist/assets/signal-forge-full.svg`
- `dist/backend/providers.mjs`
- `dist/brand.css`
- `dist/customer-ui.css`
- `dist/electronics/presentation/component-artwork.mjs`
- `dist/forge-reveal.mjs`
- `dist/homepage.css`
- `dist/index.html`
- `dist/knowledge.css`
- `dist/luthier-hub/glossary/index.html`
- `dist/luthier-hub/grounding-output/index.html`
- `dist/luthier-hub/index.html`
- `dist/luthier-hub/pickup-conductors/index.html`
- `dist/luthier-hub/selectors/index.html`
- `dist/luthier-hub/tools/index.html`
- `dist/luthier-hub/treble-bleeds/index.html`
- `dist/luthier-hub/troubleshooting/index.html`
- `dist/site.mjs`
- `dist/sitemap.xml`
- `dist/terms/index.html`
- `dist/wiring-generator/composition.mjs`
- `dist/wiring-generator/render.mjs`
- `docs/platform-qa-v1.md`
- `scripts/generate-knowledge-pages.mjs`
- `scripts/generate-seo.py`
- `scripts/generate-signal-forge-preview.mjs`
- `supabase/migrations/20260925104500_p07b_qualify_delivery_country.sql`
- `supabase/migrations/20260925151500_p07b2a_qualify_inventory_update.sql`
- `supabase/migrations/20261002163408_platform_qa_catalogue_read_grants.sql`
- `tests/customer-ui-v2.mjs`
- `tests/diagram-composition.mjs`
- `tests/home-forge-reveal.mjs`
- `tests/p06a1-admin-discovery.mjs`
- `tests/p07b6-invoice-confirmation.mjs`
- `tests/p09a1-seo.py`
- `tests/p10a-frozen-reference.mjs`
- `tests/p12-workbench-v1.mjs`
- `tests/p12a-circuit-forge.mjs`
- `tests/p12b-interactive-les-paul.mjs`
- `tests/pass02.mjs`
- `tests/platform-qa-security.mjs`
- `tests/platform-qa-v1.mjs`
- `tests/product-content.mjs`
- `tests/refinement.mjs`
- `tests/signal-forge-v1-presentation.mjs`
- `tests/site-audit.py`
- `tests/switch-visual-v4.mjs`
- `tests/visual-semantics.mjs` No unrelated worktree artifacts, runtime dependencies, CLI cache or test logs are included.

Publication uses one non-force canonical-main update, requiring created GitHub tree equality with the tested local tree before updating the ref. `[static-only]` preserves the independently checked committed public product snapshots and skips Supabase generation on this deployment. GitHub Pages stamps first-party asset URLs. Deployment success and lightweight HTTP/static byte verification are recorded in the completion report; no rendered inspection is required.

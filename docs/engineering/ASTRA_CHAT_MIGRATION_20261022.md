# Astra chat migration — 22 October 2026

## START HERE

Repository: **lukewilliamsat-glitch/apparition-instruments** (public). GitHub is the canonical engineering history; Supabase is the business-data authority. This source-verified checkpoint supersedes historical *next-action* advice, not its frozen evidence. Continue from GitHub; no owner software setup or routine ZIP download is required.

**COMMAND 04 outcome: PASS within isolated engineering scope. Production integration is not authorised or verified.** Main remains `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`, tree `eb2c9f1824602d19ed27f010cf080190a06c713e`. The live storefront, Supabase, Stripe, customer data, payments and emails were not accessed. No deployment or production change occurred.

COMMAND 04 branch: `engineering/command04-ironclad`. Exact tested application/SQL/harness commit **`24d7232b13de2cea3c43a892ec433a8ae5322a7e`**, tree **`9e0f17f45fe17399cc102dd1b8f656c9430c2fb1`**. [CI 39788439046](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39788439046). The commit containing this migration document is a later **documentation-only** checkpoint on that branch; resolve and record its actual SHA from GitHub rather than confusing it with the tested source. See [COMMAND 04 acceptance](../command/command04/ACCEPTANCE.md), [machine-readable results](../command/command04/TEST_RESULTS.json) and [architecture/security/limits](../command/command04/README.md).

## Verified source references

Branch snapshot below was independently read from GitHub before Authorisation 40. All these heads remain protected/unchanged by this mission. The one newly created branch is COMMAND 04 above. These are repository references, not current deployment or database certifications.

| Branch | Verified head |
| --- | --- |
| `atlas/phase2a-deployment-safety` | `df66b1428d709ccd4043cbe1117d70cd4a71ad83` |
| `atlas/phase2b-production-recovery` | `9026ad4d0a12e532f6878ef5ae6221d8865bf3e4` |
| `atlas/phase2c-workflow-recovery` | `b2963bae6a3c587e8491cd41f7f2b457bad01eca` |
| `atlas/phase2d-certification-release` | `d6e83af61d919f4fa6a01352ac414fc73254679a` |
| `atlas/phase2e-release-readiness` | `33183afaa51a16e7d35b711fd39d2eac37045eaf` |
| `atlas/phase2f-independent-attestation` | `397b16451dd8cc36305aaaf088729a9ad490e573` |
| `atlas/phase2g-certification-closure` | `fe16cc5752460dcc2a26968d4ee144b7bc940893` |
| `customer-ui-v2-recovery` | `0a50dedbd2a70a7d5773576c76caef77d298af98` |
| `docs/apparition-reset-checkpoint-20261020` | `c0c8a8f4ee65fbcfc3f800685ae1a219d992fda7` |
| `docs/atlas-freeze-command-handover` | `4e2bf850cf2705447f051c8a75d84c0bb5ace678` |
| `docs/conversation-continuity-20261020` | `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f` |
| `docs/conversation-roadmap-handover-20261020` | `64383164a5e8ece12e7245c8b50e9dfa50f83c18` |
| `engineering/blackbox31-static-image-rc` | `baf899a62863998b749bca8387793a6b1ed5db61` |
| `engineering/blackbox32-browser-acceptance` | `870a99c8ed99f981728f26b1eedb415af218b424` |
| `engineering/blackbox33-browser-verification` | `4f8138d079f5e5598420e74f0baadb161d51ed1c` |
| `engineering/blackbox34-nightfall` | `c3003c6a56075964f5036ea57507aed8f431b64e` |
| `engineering/command01-catalogue-workbench` | `3b84871ccb338296b52b4fe3fe350be17284d235` |
| `engineering/command02-forge-editor` | `048824545c1fc3655778bc7cca22bc6f2e1bc447` |
| `engineering/command03-the-bridge` | `2c2d629a6194506d34c2fbbcce4742fceee94488` |
| `engineering/spectre-hero-responsive-fix` | `4f09bd5b4d5109df6028a8dc0d00468512d9af1c` |
| `main` | `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f` |
| `operations-v1-recovery` | `2d8cf37f7dd082d5f4e6419738ea02201cf33b5d` |
| `p07b2-live-cutover-prepared` | `a6847dae2ee136f22e47934438f6fc0473cafb95` |
| `platform-qa-v1-recovery` | `af13a3b6a27198f1dddf6d02b2389eb234016274` |
| `premium-storefront-v1-recovery` | `f4e9c265a66c3baf52d2ca931fd990afb198fdef` |
| `release/spectre35-homecoming` | `f89657ec28c73a153f65c1f346fc974747bd5994` |
| `research/blackbox-supabase-egress-forensics` | `64383164a5e8ece12e7245c8b50e9dfa50f83c18` |
| `visual-correction-recovery` | `c7d9b7c5576c6eafec93e9fbaa8b302680888cd1` |
| `workbench-consolidation-v2-recovery` | `bd1d30772e3cdfff3cf1d262701c7ddafaec8bee` |

Key tree identities: COMMAND 01 final `be3867b1d1adfcf64c0783dce2e9c1e1c7eee7d3`; COMMAND 02 final `720ff196024f27a4ce56cd72c857e31767bb70f5`; COMMAND 03 final `e85d7e8c181f1f8cfd576cedbe53c64a8958f7cf`; NIGHTFALL final `e724bd72db397eccd6d3a2277d7e7ad373c5b775`; HOMECOMING final `d8c10ac044597e75840d1c166da65123cd2bafe3`. Current main and COMMAND 03 commit/tree were fetched independently before implementation. The source-integrity gate verifies **all 977 inherited blobs** before and after CI; the original workflows and application assets remain byte-identical.

Historical checkpoints remain preserved instructions, not newly recovered branches: Spectre V02 `2c85049b8583fc225d79406ba36e56b01bec9ad4`, Phoenix `0b2831040213df9b257fb8db0edafe59b9188f42`, FORGE V4 RC03 `07f07f4faff874ccbe7e2e46982ddf4a7008a3d5`, GIGA V2 RC07 `55e5fba390f7cf648490f7e7b5e0114a4d0d510c`. Authorisation 28 documented remote-recoverability gaps for some of these. This mission does not claim those gaps closed, reconstruct them, import them or alter their frozen identities.

## Workstreams and accepted scope

| Workstream | Source-verified status | Next boundary |
| --- | --- | --- |
| BLACKBOX research | `64383164a5e8ece12e7245c8b50e9dfa50f83c18`: GitHub-only attribution hypotheses and synthetic models. Request counts/body comparisons are not billed egress. | Separate read-only traffic/billing measurement approval; no inferred production totals. |
| BLACKBOX31–33 | Independently preserved branches culminate in browser-verified static-delivery preparation; do not rebuild them. | Remain unmerged/inactive; use NIGHTFALL as latest engineering reference. |
| NIGHTFALL / BLACKBOX34 | Tested source `135d2c8c6b177631c5c06358030aa610e44e322d`, tree `010714baf1181cf146aaaab19cbde7d0b9b2ad93`; CI `39577122377`. Source-grounded reports record 13/13 offline suites, real Chrome, demand-based verified image resolution, portable deterministic bundles and durable Git asset-history recovery. | No real images extracted/published, archive-write infrastructure installed, adapter activated or production pipeline integrated. Backend/hosting/publisher/complete-payload gates remain. |
| SPECTRE / responsive correction | Tested CSS source `232017a80fd6c5f2a3083d99cd9f647d8f4db27e`; CI `39583250290`, preserved branch `4f09bd5b4d5109df6028a8dc0d00468512d9af1c`. | Isolated browser acceptance is not proof the live site contains it. No visual redesign or V02 publication now. |
| HOMECOMING | Tested `8aa4d3e386ba81ce6bf4c0833d43ced6b2bff998`, tree `4353d0a6aaa8a0be2a9c31162e4412c6f03b0696`; CI `39612316997`: 27/27 safety tests. CSS-only candidate `ee2ca60616c61304d26b7a2f7b9ff04555337cd0`, tree `f895a3173959b7e243566902be3552e44ecbc2b9`, is **not deployable/certified**. | Publication and rollback input, current deployment association and genuinely backend-free release route are unresolved. |
| COMMAND 01 | Fixture-backed read-only catalogue workbench; tested `5f82f7403e188605895cf53427c03d8b157681cd`, tree `c3699c2b1ff75235e7f19f4673296a3bcde4daf5`; CI `39618086032`, 42 Node / 32 Chrome groups. | No production Admin V2 installation or live authentication. |
| COMMAND 02 | Fixture product editor, dirty/review/save/conflict recovery; tested `04bd1adfd8b6b1e21180b4f78622a404b9eb5701`, tree `b59e0039dae486477907fd541eb965d9df451564`; CI `39630582702`, 54 Node / 39 Chrome groups. | Its dated README/TEST_RESULTS still describe the earlier PNG rejection. Current final tree **does contain all ten PNG paths** under SCREENSHOTS following Authorisation 38A. Preserve these originals; that exact approval does not authorise other public screenshots. |
| COMMAND 03 | Adapter/session/permission/read-safety prototype; frozen tested `53c4063cccc6be097bc53a0c04f1c9ef2c75bf7c`, tree `c3124dac437bb9e72e7a2d7632b1cc6f2f452b1e`; CI `39766989517`, 59 Node / 35 Chrome groups. | Original PNGs were lost; Authorisation 39A freshly recaptured and retained all eight, not reconstructed. Owner visual review remains separate from functional acceptance. |
| COMMAND 04 IRONCLAD | PASS: functioning synthetic authoritative mutation contracts, atomic product/inventory/cost staging, shared revision, actor-scoped idempotency/status and audit; disposable PostgreSQL + Node + genuine isolated Chrome. | Not a live RPC/migration; all production mapping, permissions, all-writer version enforcement, deployment/rollback and owner approval gates remain. |
| Atlas / Phoenix / FORGE | Frozen historical/recovery workstreams. Atlas is paused, **not technically certified**; historical reconstruction is not current production certification. Existing Forge/Studio/email/commerce assets are preserved. | No reopening, reconstruction, merge, deployment or new feature mission without separate approval. |

## COMMAND 04 exact verification and evidence

Runtime: Node **v22.20.0**, Chrome **155.0.8059.84**, PostgreSQL **16.15 (disposable Ubuntu x64)**. COMMAND 04 Node **64/64**, Chrome **13/13**, PostgreSQL **61/61**. Combined COMMAND 01–04 Node **219/219** and Chrome **119/119**; isolation **10/10** pre-application controls. Zero production requests; all inherited source verified before/after. New COMMAND 04 screenshots: **zero**. Unchanged inherited harnesses may generate ephemeral captures as part of their functional checks; none is uploaded here. The separately retained Afterimage artifact remains the COMMAND 03 visual-review source.

Evidence: [artifact 12429383684](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39788439046/artifacts/12429383684), exact text-only allowlist, independently retrieved ZIP verified against GitHub's digest, SHA-256 **`e33369aba019900677677a58302da6ac0d2e9836fdf4ed07e88e87b986e8b13d`**, actual expiry **2026-11-21T13:39:13Z**. Detailed results and source fingerprints are preserved as Git text in COMMAND 04/TEST_RESULTS.json, not dependent on runner files. Artifacts are temporary, not permanent/private storage or a database backup.

COMMAND 03 owner-review images: [artifact 12422172177](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39770441983/artifacts/12422172177), eight originals from fresh run `39770441983`, execution `598b8d230514034f3a5a02784da229f22cea1111`, application still `53c4063...`; ZIP SHA-256 `1762971e40e69b6cc25c7cb12ac91ee87c4b40a6a7e61cfccb1f71edb46c0579`; expires **21 November 2026 11:26:58 UTC**. This is the approved temporary image-review destination. Do not add COMMAND 03/04 PNGs or encoded images to public Git without separate exact approval.

## Security and production integration limitations

IRONCLAD's PostgreSQL file is **tests/command04/postgres-fixture.sql**, not a production migration. It creates a fresh throwaway schema, six forced-RLS tables, three callable owner-scoped functions, private helpers, restricted grants, five non-cascading FKs, immutable receipts/audit and row/advisory transaction locks. Every supported data mutation shares a revision and transactional receipt/audit. Prices/costs are integer pence; stock uses safe-integer quantities with expected-value predicates. Missing image data stays unloaded/preserved; generic patches cannot change identity, raw images, stock, revisions or private fields.

The in-browser/in-process authority is a **synthetic reference model**, not an enforceable browser security boundary. PostgreSQL genuinely tests DB roles, grants, concurrency, rollback and immutable history, but its JSON-bodied product/principal schema is not the current Supabase schema. Session identity is an actual fixture database login role, not caller claims/GUCs. Production requires separately reviewed auth.uid()/admin_members/session/capability integration and secure definer ownership. Fixture local socket trust auth is not a production recommendation. No production SQL was applied; all executed SQL was confined to the disposable fixture.

All existing production write paths must participate in version/stock/audit rules before any safe integration. The legacy sequential save cannot inherit atomicity merely by changing the UI adapter. PostgreSQL crash/statement rollback in a fixture is not a production load, failover, RLS, JWT/session revocation or deployment guarantee. Production operation IDs must be collision-resistant per intent and reused across uncertain retries; inherited editor counters remain fixture-only.

## Supabase egress recovery and Pages publication

Target project (identifier only, not accessed): `acdxpxvksvdwfajntzfx`. Historical usage: approximately 13.44 GB versus 5 GB included in 24 Sep–24 Oct cycle. Historical controlled HTTP compressed body comparison:9,007,039 versus1,875 bytes; later lightweight view report2,170 bytes/14 rows. These are dated records, not current billing, response or database measurements.

Expected reset is **24 October 2026**, not 23 October. The date is neither evidence that restrictions cleared nor approval to test them. No current backend, Auth, RLS, migration ledger, Edge Function, Stripe or storefront health was verified during this mission.

The source workflow `.github/workflows/static.yml` remains unchanged: pushes to main, manual dispatch and cron **`0 3 * * *`**, Pages concurrency, cancel-in-progress false, contents: read/pages:write/id-token:write. Its old 15-minute comment is stale. Schedule times are nominal, not a guarantee: today's run began08:14UTC. Build steps can still contact Supabase; even existing static-only conditions do not prove the whole workflow backend-free.

GitHub record: latest scheduled Pages run [39746257791](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39746257791),22 Oct, failed. Its actual logged error was **Public catalogue_options is unavailable (402)**. Historical20 Oct run39391123342 failed on catalogue_components (402). These establish failing request boundaries, not precise billing cause or current published-site health. No schedule/workflow setting was changed here and no production run was dispatched.

Latest visible successful Pages run remains [38167017686](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/38167017686), source `bb4ba2a932239a3ef397272b27143f0cd3adcccf`,11 Oct. HOMECOMING's source report found its one-day artifact expired/missing; source inventory is not an attested deployed payload. Current active deployment association, complete publication inventory, historical/static image set, exact payload/rollback hashes and backend-free assembly remain unresolved. Do not push main merely to change docs/schedules: that can trigger deployment.

NIGHTFALL's proposed image-free compatibility preflight remains **unexecuted and separately gated**: exactly 3 sequential GETs(metadata, identities, options), maximum 65,536 bytes/response and 131,072 aggregate,20/20/100 row limits, identity encoding,8 seconds/request, no retries/pagination/redirects/embedded images. Plan SHA-256`bd9aca0efc68e8921150fbd0aefbce97059919f34d066d6b59c2cec9191e4f44`. See its exact source document before asking approval. A passing response cannot prove database policy completeness or billed egress. Never launch that plan merely because this handover mentions it.

## Required next decisions and approval gates

1. Owner reviews the existing COMMAND 03 artifact and this COMMAND 04 architecture/evidence, including private-cost/inventory permission boundaries and audit/receipt retention expectations.
2. New chat begins with GitHub-only checkpoint verification, reads this document and reports changed refs without overwriting anything. Do not repeat completed test programmes or reconstruction by default.
3. After owner-confirmed backend restoration on/after the expected reset, request a **separate bounded read-only** backend compatibility/security assessment: actual schema/grants/RLS/session rules, existing writers, migration ledger and image-free public projection compatibility. Scope service roles/endpoints/requests/bytes and sensitive output handling before execution. No live SQL writes or customer records as fixtures.
4. Only after evidence justifies it, separately propose exact production SQL/hash, all-writer revision strategy, idempotency/authorization adapter, backup/rollback and deployment ordering for owner review. This handover and successful tests grant none of those actions.
5. Static image capture, archive writes/credentials, asset publication, adapter activation, HOMECOMING, Pages changes, billing, DNS/hosting changes and COMMAND 05 each retain their own approval boundaries. GitHub Pages commercial-use suitability remains a documented unresolved risk; no hosting migration is authorised.

Prohibited without new scope: production access/writes, Supabase or Stripe operations, customer data/orders/emails/payments, main merge/push, deployment, SQL/RLS changes, workflow installation into production, public screenshot publication, archive deletion/GC, force pushes/resets/cleanup, frozen checkpoint changes or reopening Atlas/Phoenix/FORGE. Git history is not a full database/deployment backup. Do not request owner credentials in chat.

## Opening prompt for a fresh Astra conversation

```text
Continue Apparition Instruments from its verified GitHub checkpoint.

Repository: lukewilliamsat-glitch/apparition-instruments (public).
Branch: engineering/command04-ironclad.
First read docs/engineering/ASTRA_CHAT_MIGRATION_20261022.md and docs/command/command04/ACCEPTANCE.md on that branch. Verify its actual remote tip and the documentation-only changes after tested commit 24d7232b13de2cea3c43a892ec433a8ae5322a7e, tree 9e0f17f45fe17399cc102dd1b8f656c9430c2fb1, successful CI 39788439046.

Expected main: 2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f.
Preserve COMMAND 03 base 2c2d629a6194506d34c2fbbcce4742fceee94488 and all frozen branches. Report unexpected movement before editing anything.

COMMAND 04 IRONCLAD passed isolated acceptance: 61/61 disposable PostgreSQL tests, 219/219 combined Node tests, 119/119 Chrome groups and 10/10 isolation controls. This is not production Supabase schema, JWT/session, RLS or deployment certification. No production SQL was executed. Read the actual limitations and all-writer revision/permission requirements.

COMMAND 03 owner-review images are in artifact 12422172177, expiring 21 November 2026 at 11:26:58 UTC. Do not publish them to public Git. COMMAND 04 text evidence is artifact 12429383684, expiring 21 November 2026 at 13:39:13 UTC; durable summaries and source fingerprints are in Git.

BLACKBOX/NIGHTFALL and SPECTRE/HOMECOMING remain preserved, unmerged and inactive. Atlas remains frozen, not certified. No complete current production payload, rollback input or active-deployment association is established. Scheduled Pages run 39746257791 failed on catalogue_options HTTP 402. Main still has a daily 03:00 UTC backend-dependent workflow. The expected Supabase reset is 24 October 2026; that date proves neither recovery nor permission to access it.

This prompt authorises only GitHub context verification and a concise gate summary. Do not restart completed research/tests, reconstruct frozen work, contact Supabase/Stripe/live storefront, run production SQL, modify main/workflows, deploy, publish assets or begin COMMAND 05. No owner-side software installation or ZIP transfer is required.

Await my next separately scoped approval. The recommended next mission is bounded read-only backend restoration/schema/security/legacy-writer compatibility review after confirmed recovery, not production mutation or deployment.
```

## Source map and historical reconciliation

- [Cloud-first policy](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/4e2bf850cf2705447f051c8a75d84c0bb5ace678/docs/engineering/CLOUD_FIRST_POLICY.md), [Atlas freeze](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/4e2bf850cf2705447f051c8a75d84c0bb5ace678/docs/atlas/ATLAS_FREEZE_HANDOVER.md), [20 Oct reset checkpoint](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c0c8a8f4ee65fbcfc3f800685ae1a219d992fda7/docs/handover/APPARITION_RESET_CHECKPOINT_2026-10-20.md).
- [BLACKBOX executive report](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/64383164a5e8ece12e7245c8b50e9dfa50f83c18/docs/performance/BLACKBOX_EXECUTIVE_REPORT.md), [NIGHTFALL results](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c3003c6a56075964f5036ea57507aed8f431b64e/docs/performance/blackbox34/TEST_RESULTS.json), [preflight](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c3003c6a56075964f5036ea57507aed8f431b64e/docs/performance/blackbox34/BACKEND_PREFLIGHT.md), [release gates](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c3003c6a56075964f5036ea57507aed8f431b64e/docs/performance/blackbox34/RELEASE_GATES.md).
- [HOMECOMING manifest](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/f89657ec28c73a153f65c1f346fc974747bd5994/docs/releases/spectre35-homecoming/RELEASE_MANIFEST.json), [results](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/f89657ec28c73a153f65c1f346fc974747bd5994/docs/releases/spectre35-homecoming/TEST_RESULTS.json), [live acceptance NOT EXECUTED](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/f89657ec28c73a153f65c1f346fc974747bd5994/docs/releases/spectre35-homecoming/LIVE_ACCEPTANCE.md).
- [COMMAND 01 results](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/3b84871ccb338296b52b4fe3fe350be17284d235/docs/command/command01/TEST_RESULTS.json), [COMMAND 02 results](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/048824545c1fc3655778bc7cca22bc6f2e1bc447/docs/command/command02/TEST_RESULTS.json), [COMMAND 03 source/security](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2c2d629a6194506d34c2fbbcce4742fceee94488/docs/command/command03/SOURCE_AUTHORITY.md), [Afterimage verified retention](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2c2d629a6194506d34c2fbbcce4742fceee94488/docs/command/command03/VISUAL_EVIDENCE_RECOVERY.md).

Older master handovers predate these missions. Their old next-task suggestions, source SHAs and 5/15-minute schedule descriptions are historical. COMMAND 02's earlier zero-PNG text predates its authorised preservation commit. COMMAND 03's original PARTIAL text predates Afterimage's fresh retention verification. Preserve these dated originals and apply the specific successor evidence; do not silently rewrite history or infer production acceptance from any of them.

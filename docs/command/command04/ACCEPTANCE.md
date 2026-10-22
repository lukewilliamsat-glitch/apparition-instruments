# COMMAND 04 IRONCLAD — acceptance and chat-migration checkpoint

**PASS within Authorisation 40's isolated engineering scope.** No production integration, backend access or deployment.

## Exact source and retained evidence

- Branch: `engineering/command04-ironclad`.
- Tested commit: `24d7232b13de2cea3c43a892ec433a8ae5322a7e`; tree `9e0f17f45fe17399cc102dd1b8f656c9430c2fb1`.
- Preserved COMMAND 03 base: `2c2d629a6194506d34c2fbbcce4742fceee94488`; all 977 inherited Git blobs unchanged before and after testing.
- [Successful CI run39788439046](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39788439046), job `119857702389`, attempt1.
- Node`v22.20.0`, Chrome`155.0.8059.84`, PostgreSQL 16.15(Ubuntu x64). Existing hosted binaries, no system PostgreSQL service or production connection.
- [Artifact12429383684](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39788439046/artifacts/12429383684), `29365`bytes; actual expiry **2026-11-21T13:39:13Z**; requested retention 30 days.
- Complete archive SHA-256: `e33369aba019900677677a58302da6ac0d2e9836fdf4ed07e88e87b986e8b13d`.

The actual artifact was independently downloaded through the supported integration. ZIP CRCs, digest equality with GitHub, exact 19-file text allowlist, safe/unique paths and source manifests passed. No PNGs, browser profiles, raw database files, seeds, credentials, customer payloads or unexpected files are included. All source fingerprints and individual assertions are retained in [TEST_RESULTS.json](TEST_RESULTS.json) as public-safe text, so this evidence summary survives artifact expiry. Temporary Actions retention is not permanent/private storage or a business-data backup.

## Exact results

| Scope | Node tests | Chrome groups |
| --- | ---: | ---: |
| COMMAND 01 | 42/42 | 32/32 |
| COMMAND 02 | 54/54 | 39/39 |
| COMMAND 03 | 59/59 | 35/35 |
| COMMAND 04 | 64/64 | 13/13 |
| Combined | **219/219** | **119/119** |

**PostgreSQL: 61/61**, failures 0. **Process/browser isolation:10/10**, failures 0. Final execution has no failed/skipped reported cases. Local Node 24 preflight also passed64/64; Node 22 CI is the compatibility evidence, not that local run.

PostgreSQL exercises atomic product/inventory/private-cost writes; shared revision CAS; concurrent duplicate requests; racing different operations/SKUs; actor-bound replay and status; actual ordinary login-role privileges; membership/capability/expiry denial; caller-GUC/role-spoof rejection; owner/anonymous/helper/table restrictions; forced RLS; private cost/image response exclusion; five rollback failure points; outer-transaction rollback; backend termination before commit; in-flight unknown status; expiry while waiting for an advisory lock; immutable receipt/audit UPDATE/DELETE/TRUNCATE; and restrictive foreign keys.

Chrome uses the real inherited catalogue/editor and new IRONCLAD synthetic authority, not static mock screenshots. It verifies product saves/receipts, draft/focus selection preservation, stale revisions, denied writes, failed-save retry, uncertain-save reconciliation, external session loss plus wrong-identity concealment/original-identity recovery, protected image/inventory fields,390/768/1440px editing, keyboard fields and teardown. COMMAND 01–03 additionally rerun all their existing browser and functional cases. No comprehensive accessibility, other-browser, owner preference or live-backend acceptance is claimed.

## Corrections and negative results preserved

1. Before first publication, local fixtures exposed optional prices/stock needing the same explicit fixture normalization already used by COMMAND 03. The adapter/server seed now does so; this is not a live-data substitution or missing-inventory fallback.
2. CI `39787148386`, source `344bd2a636058debfc838d45c985350cfbc36285`: isolation and218 Node tests passed, then fixture-function creation failed on a PL/pgSQL CASE expression. PostgreSQL scenarios and Chrome were not reached. Parenthesized expressions corrected the actual SQL parser issue.
3. CI `39787484452`, source `9d9eb8cac5a15fc614fe73b8cfc2e70e1de28a18`:58/59 PostgreSQL and12/13 COMMAND 04 Chrome groups; inherited suites passed. The database impersonation test inherited the cluster administrator's original authenticated session, making SET SESSION AUTHORIZATION an invalid ordinary-caller test. It now opens actual non-superuser login connections. The browser test tried to click behind a modal; it now injects external session loss as the unchanged COMMAND 03 suite does, and explicitly checks wrong-identity concealment before original-owner reconciliation.
4. Final hardening added authority-expiry checks after lock waits/before mutation, a real PostgreSQL held-lock expiry case and a matching staged-expiry Node regression. New source only; no frozen application changed.

No failed run was relabelled as passing. Each correction used a new non-force commit/run on the same engineering branch. Full historical logs remain attached to those runs.

## Isolation and non-interference

Before any application or SQL fixture, the unchanged COMMAND 01 StageA proves IPv4/IPv6, DNS, redirect, image/script/worker, WebSocket, frame and navigation denial using harmless synthetic targets. A new kernel namespace has only loopback and local routes; raw process probes return ENETUNREACH and children share that namespace. Browser/test processes are unprivileged, with clean synthetic environments, disposable profiles, sandbox, disabled extensions/background networking and blocked service workers. Interception is an extra guard, not the sole proof.

The disposable PostgreSQL cluster listens on no TCP interface and uses a 0700 Unix-socket directory in the isolated namespace. Its local trust authentication is a throwaway harness mechanism, not a production recommendation. All DB state is synthetic and separate from existing services. The trap stops only that cluster.

All application browser resources remain on each explicit loopback origin; zero fetch/XHR/image/WebSocket API requests, production requests, console errors or page errors. Existing test harnesses can generate ephemeral internal screenshots, but **no new screenshot bytes are uploaded**; COMMAND 04 itself captures none. Previously approved COMMAND 02 Git screenshots and COMMAND 03 Afterimage artifact remain untouched.

Only new COMMAND 04 code/tests/workflow and new text documentation were committed. Source and existing workflow files remain unchanged. Main remains`2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`; all frozen branches remain unchanged. The branch-only CI has contents: read, no secret references, production environment, schedule, Pages/OIDC write permissions or deployment steps. No production workflow was dispatched by this mission.

## Guarantees, limits and next decision

The reference model and real disposable PostgreSQL tests establish the isolated contract: supported writes commit together, conflicting revisions fail, exact operation replays do not double-apply, current authority is checked, uncertain outcomes are reconciled conservatively, protected fields stay protected and audit/receipt histories are immutable through the supported boundary.

They do **not** establish current Supabase schema/grants/RLS/session configuration, migration readiness, actual JWT verification, production crash/failover/load guarantees or that legacy writers participate in revision checks. The fixture SQL is not a reviewed production migration. Owner review, real schema/authority/all-writer reconciliation, exact future SQL/hash approval, backup/rollback, deployment ordering and bounded live acceptance remain separate gates. Production operation IDs need collision-resistant persistent intent IDs; inherited editor counters remain fixture-only.

Read [architecture/limitations](README.md) and the [self-contained chat migration](../../engineering/ASTRA_CHAT_MIGRATION_20261022.md). Recommended next separately authorised mission: after owner-confirmed restoration, a bounded read-only backend schema/security/legacy-writer compatibility assessment. No COMMAND 05, production recovery, service requests, SQL application or deployment begins automatically.

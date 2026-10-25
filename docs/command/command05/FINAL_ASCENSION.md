# Authorisation 54 — implementation and release receipt

## Checkpoint 1: production read integration

Implemented the real HTTP read adapter and the missing existing-Auth identity proof. The default Admin entry now constructs that adapter. `read-activation.mjs` deliberately keeps it disabled until owner-operated metadata and separately bounded live acceptance are available. This is an implemented connection with an explicit release gate, not synthetic data substituted for a real service. No provider request has been made.

The proof verifies the token with Auth and checks the current user's exact self-membership projection. It decodes only the server-accepted token's subject/expiry, never client role claims. Tokens stay out of workbench snapshots. Existing login, restore, refresh and sign-out return contracts remain unchanged. Sign-out and cross-tab session changes invalidate the read cache and abort pending work. Each uncached operation rechecks membership; an already authorised detail is cached for at most 15 seconds, with immediate expiry/sign-out invalidation. Rotation of a verified token conservatively requires a recheck rather than accepting an old session binding.

The adapter issues GET-only component/inventory reads with explicit fields, no original image or private cost data, exact count/range validation and at most 500 products. A request for the 501st row detects overflow; a partial server response is rejected. List JSON is capped at 512 KiB, optional inventory at 96 KiB, detail at 48 KiB and individual inventory detail at 2 KiB. Decoded bytes are measured; limits do not rely on compressed Content-Length. Auth user/refresh JSON is capped at 16 KiB and self membership at 2 KiB on the stricter read path. Each boundary authorization and data operation has a five-second deadline. No polling, automatic catalogue retry, keystroke request or image fallback exists. Search/filter/selection reuse the accepted controller. Known technical JSON keys use PostgREST aliases; full public specifications are read on demand only.

Production grants have no draft-preview or write capability. Editor code/design remains preserved, but production editor entry and all save/status/stock/image methods are blocked. Injecting synthetic-save flags alongside the production adapter cannot enable a save. Inventory activation remains pending the actual permission contract. Unsupported IDs over the inherited 96-character UI contract, malformed or oversized records and unknown exact counts fail closed; they are not silently trimmed.

Local targeted acceptance: 32 production-shaped read cases and four production-shaped DOM journeys pass, plus changed-boundary 28 cases, existing Auth regression, shell, DOM/editor integration and preservation. Fixture workloads for loading plus one inspection measured 7,267 / 48,011 / 238,652 decoded bytes for 14 / 100 / 500 products, including strict read-proof responses. These are synthetic measurements, not actual provider latency/egress claims. Search/filter/repeated inspection caused no additional requests. 896 inherited blobs remain identical to main; the only additional inherited change is the reviewed Auth read-proof seam, alongside the two previously accepted shared Admin files.

## Evidence reuse and native acceptance

`tests/command05/reuse.mjs` byte-compares unchanged model/editor implementation and fixture/test sources with accepted application `31b469707066a89b0ea3fc83ad81e79149523192` / run `40227070614`. Reuse 96 pure logic cases and six dialog lifecycle cases without rerunning them. The changed read boundary is retested. The 19 original PNGs remain the accepted visual baseline and are not downloaded again.

The default entry composition, Auth dependency and production adapter changed, so one composed native regression is necessary: preserve the original 47 assertions and add seven real-adapter/Auth journeys over fictional loopback HTTP, with three genuine additional screenshots. The existing process namespace, ten negative controls and Chrome sandbox remain. The source-preservation count changes from 897 to 896 solely because `admin-auth.mjs` is now an explicitly reviewed integration file; all other inherited blobs still compare with main. Hosted result and tested source will be recorded after publication; local DOM checks are not native acceptance.

## Checkpoint 2: owner-operated metadata — PENDING

The two SQL files are exact byte copies of `PROVIDER_READ_GATE_53.json` at `208d6e9e9dc176de72e1d9b36c935e94c7d13792`, not new queries or a transport change:

| File | Immutable SHA-256 |
| --- | --- |
| `PROVIDER_QUERY_53_1.sql` | `3f3829e7e3533d321f3df47eadb5c071901a070355b9cf9accf15777ab6e5946` |
| `PROVIDER_QUERY_53_2.sql` | `54f4574c55d311c511e9dde55e1dcfcf09e0ab19eca45c070ec0c95a58e76e51` |

Owner SQL Editor only. Confirm the selected project matches the existing deployed Admin backend before execution. Source `public-config.mjs` SHA-256 remains `725ad31203309532397adef75cf67abe182420cefb0de99bc8a45aa4277bb019`; source association is not an independent confirmation of the selected dashboard project. Run each file once, no retry: five-second statement timeout, one-second lock timeout, 50-row rejection threshold, 8,192 bytes each / 16,384 aggregate. Keep unredacted policy expressions private. Supply the dated report, project-match confirmation and both outputs; limit/error/mismatch is HOLD. No assistant Supabase connector is permitted for this step. SQL has not been executed or validated against the production provider.

## Production gates still open

* Metadata, actual JWT/RLS read behaviour and live byte measurements are pending. Owner-reported dashboard figures on 25 October 2026: approximately 0.66 GB period egress of 5 GB included, approximately 624.495 MB daily PostgREST, minimal Auth/Edge. These figures are owner supplied; no exact culprit endpoint or independently verified remaining allowance is claimed.
* Owner visual acceptance is pending. Existing 19-screen design evidence and the forthcoming production-shaped fixture captures are separate from actual backend acceptance.
* Current served payload, authoritative holiday state and a holiday-safe complete rollback are not established. Historical ANCHOR OPEN state must not be used as a current holiday baseline. No private archive was reopened or retrieved.
* Existing production workflow still invokes the backend CMS generator and retains its background schedule. It is unchanged and will not be used as a publication-only route. NIGHTWATCH's inert publisher is not an installed/verified mechanism. Main merge, workflow installation, exact deployment and bounded live requests still need their respective concrete approvals.

Continue independent offline release preparation; do not fabricate missing provider, holiday or payload evidence. Read-only production launch and IRONCLAD write activation remain separate. No production deployment has occurred.

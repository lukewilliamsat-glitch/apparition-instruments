# Exact NIGHTFALL public preflight review

**Recommendation: BLOCKED.** The immutable historical plan is verified and still useful as a deliberately narrow compatibility observation, but current provider health/remainder/lag, owner numeric budget/background-exposure decision, exact transport acceptance and execution authority are absent. FIRST LIGHT executes zero requests.

| Source identity | Offline verified value |
| --- | --- |
| Frozen NIGHTFALL ref | `c3003c6a56075964f5036ea57507aed8f431b64e` |
| Plan | Exact ordered JSON.stringify equivalent, 1,234 UTF-8 bytes |
| Plan SHA-256 | `bd9aca0efc68e8921150fbd0aefbce97059919f34d066d6b59c2cec9191e4f44` — matches expected |
| Committed runner SHA-256 | `fde4e39defdfce223056845aa7f6518cbf191bca9f84c0946f4bc2a2d395e508` |
| Projection comparison | Current main component/technical and option columns match those used by this frozen plan |
| Verification method | Read committed script/projections as text; reconstruct ordered JSON offline and hash exact bytes; no module import, runner, fixture or network execution |

## Frozen request contract

The origin is bound to the approved intended project in the committed plan; the public report does not reproduce private provider identifiers or keys. Exact origin/query strings remain reviewable in the immutable source. Request order:

1. GET `catalogue_delivery_v2`: technical metadata, explicit fields, ID order, limit 20.
2. GET `catalogue_delivery_v2`: `id,image_identity,image_reference`, ID order, limit 20.
3. GET `catalogue_options`: six explicit option columns, active=true, option-set/key order, limit 100.

At most three sequential requests; 8,000 ms per-request deadline; 65,536 accepted application bytes per response /131,072 aggregate; no redirect/retry/pagination/ping/image fallback. A count at or above 20/20/100 or a numeric Content-Range total at/above that limit fails. HTTP 200, exact JSON content type, identity/no content encoding, content-length agreement when present, strict UTF-8 and exact projected field sets are required. Stop on first error; failure is not permission to widen, repair, retry or query a different resource.

Public publishable/verified anonymous key only, no login, Admin session, privileged identity, service secret or cookie reuse. The runner's scope/hash/key-shape guards reduce accidental execution; they do not constitute owner consent or cryptographically prove arbitrary legacy-token claims. No default fetch/CLI/schedule is installed by this plan.

## Compatibility findings

- Main metadata columns match, but main still defaults to the disabled image adapter's image-bearing catalogue path. The candidate is not current deployment behaviour.
- `image_reference` must be null; SHA-256 identity must be canonical lowercase or null. The review-only V2 SQL also allows object references, so broader legitimate data may fail this narrower plan. The SQL is not a migration/deployment receipt.
- Product IDs are constrained to 1–80 ASCII alphanumeric/hyphen characters. Existing authoring/source contracts can be broader. Option sets normalise underscores for their check, but option keys reject underscores even though current Admin authoring explicitly permits them. A legitimate failure is a contract gap, not data corruption.
- Exact metadata/identity ID-set agreement and manufacturer-option relationships are checked. Sequential requests are not one snapshot; empty/small results do not establish full coverage or hidden-row security. The historic 14-row observation is not a current inventory guarantee.
- Original images, named sensitive fields, prototype keys, excessive nesting/string size and embedded-image URI strings are rejected. This is not a mathematical proof that arbitrary allowed text cannot encode binary data. Raw results/rejected bodies must not enter Git evidence.
- This plan cannot establish installed grants/RLS/security_invoker, current Admin claims, schema parity, image integrity, host readiness, COMMAND transactions, stock writer correctness or billed egress. A missing view or 402 stops; neither authorises repair.

## Transport and accounting gate

The reader checks size after each received chunk, so an oversized chunk/buffered bytes can exceed logical caps before rejection. It rejects non-200 before reading a body; body cancellation behaviour depends on the injected transport and abort. Headers, TLS, compression/proxy buffering, server work and provider accounting are outside accepted-body limits. An uncooperative transport can outlive the logical abort. Therefore these limits are acceptance rules, not a hard wire-byte or billed-egress guarantee.

Before requesting execution, pin the exact injected transport implementation/version and independently prove offline: one attempt; redirect:error; identity encoding handling; no cookies/privileged session; abort/cancellation and non-200 disposal; no implicit retry or proxy fallback; deadline failure stops the sequence. Combine that with fresh owner provider evidence and an approved numeric budget. No transport is implemented or run here.

If the intended acceptance must cover legitimate underscore/long IDs or non-null object references, or must guarantee a hard transfer ceiling, classify a **separately named successor design as NEEDS REVISION**. Prepare exact semantics, full plan and transport, new hash, fixture acceptance and fresh owner approval; preserve the historical plan unchanged. No successor hash or execution approval is invented here. If the owner instead approves this narrow plan and its limitations, a failure returns HOLD without automatic continuation.

Sources: [frozen runner](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c3003c6a56075964f5036ea57507aed8f431b64e/scripts/catalogue-compatibility-preflight.mjs), [frozen projections](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c3003c6a56075964f5036ea57507aed8f431b64e/dist/backend/public-read.mjs), [candidate specification](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c3003c6a56075964f5036ea57507aed8f431b64e/docs/performance/blackbox34/BACKEND_PREFLIGHT.md), [current projections](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/backend/public-read.mjs), [current option-key authority](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/admin/catalogue-options.mjs), [review-only SQL](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/docs/approval/catalogue-delivery-v2.sql), [runbook analysis](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/542cc90cf9c301b4571d246ce9ae105bddefc2d0/docs/operations/dawnbreaker/NIGHTFALL_PREFLIGHT.md).

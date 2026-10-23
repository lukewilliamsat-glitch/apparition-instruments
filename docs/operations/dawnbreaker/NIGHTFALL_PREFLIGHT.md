# Future Phase B — exact NIGHTFALL compatibility plan

**NOT EXECUTED.** Source checkpoint `c3003c6a56075964f5036ea57507aed8f431b64e`: [specification](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c3003c6a56075964f5036ea57507aed8f431b64e/docs/performance/blackbox34/BACKEND_PREFLIGHT.md), [implementation](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c3003c6a56075964f5036ea57507aed8f431b64e/scripts/catalogue-compatibility-preflight.mjs), and its imported `dist/backend/public-read.mjs` projections were read as text.

Independent offline reconstruction of the JSON plan gives **1,234 UTF-8 bytes** and SHA-256:

```text
bd9aca0efc68e8921150fbd0aefbce97059919f34d066d6b59c2cec9191e4f44
```

This hashes exact `JSON.stringify(cataloguePreflightPlan())`, including property/array order and origin, **not this document or script file**. No module import, request runner, image retrieval or full test programme was executed. The inherited 25 injected-response checks are historical isolated evidence, not live acceptance.

The earlier BLACKBOX29/29A post-reset proposal at `64383164a5e8ece12e7245c8b50e9dfa50f83c18` is a **different unexecuted plan**: generator-filtered metadata, identity-only fields, 32 KiB decoded/response, 96 KiB decoded aggregate, 64 KiB encoded aggregate and 15-second timeouts. It is not the NIGHTFALL plan requested by Authorisation42. Do not mix its projections/budgets with the later exact hash below, or treat either historical proposal as current execution consent.

## Immutable proposed requests

Target project `acdxpxvksvdwfajntzfx`. Public anonymous role only, with an existing intended publishable key or verified legacy `anon` key. No Admin identity, service-role/secret key, auth login, privileged SQL, asset request or business write. Headers: `apikey: <approved public key>`, `Accept: application/json`, `Accept-Encoding: identity`. Never put keys in chat, command arguments or evidence.

Execute **only in this order**, once, after separate approval of the exact plan hash:

```text
1 GET https://acdxpxvksvdwfajntzfx.supabase.co/rest/v1/catalogue_delivery_v2?select=id,sku,name,category,manufacturer,description,specs,product_content,individually,in_kits,sale_price,kit_price,kit_price_quantity,stock&order=id.asc&limit=20
2 GET https://acdxpxvksvdwfajntzfx.supabase.co/rest/v1/catalogue_delivery_v2?select=id,image_identity,image_reference&order=id.asc&limit=20
3 GET https://acdxpxvksvdwfajntzfx.supabase.co/rest/v1/catalogue_options?select=option_set,option_key,label,aliases,active,sort_order&active=eq.true&order=option_set.asc,option_key.asc&limit=100
```

| Constraint | Actual source rule |
|---|---|
| Requests | Maximum **3**, sequential; **0** redirects, automatic retries, pagination, preliminary pings or fallbacks |
| Time | **8,000 ms/request** deadline with abort; at most **24 seconds** of sequential request deadlines plus local validation/cancellation |
| Body | Maximum **65,536 accepted bytes/response**, **131,072 accepted bytes aggregate**; identity encoding only |
| Rows | Limits **20 / 20 / 100**; a returned count **at or above** a limit fails. Numeric Content-Range total at/above the limit also fails. |
| HTTP | Exactly 200; reject redirect flag/non-200/partial result; credentials omitted, cache no-store |
| Decode | Exact JSON content type, no nonidentity content encoding; numeric Content-Length if present must fit cap and equal bytes read; strict UTF-8 and JSON |
| Continuation | First failure stops; no retry, projection widening, schema repair or image fallback |

## What validation establishes

Metadata requires every exact projected root field and no additional root field: stable unique IDs, textual identity/descriptions, object specs/product_content, booleans, nonnegative safe-integer stock and nullable nonnegative safe-integer price/quantity. IDs are constrained by the harness to 1–80 ASCII letters/digits/hyphens. Identity rows use `id,image_identity,image_reference`: source identity must be null or canonical lowercase SHA-256, and **image_reference must be null**. Object-source references are unsupported by this plan.

Option rows must have the exact six fields, active=true, valid label/aliases/sort order and unique option-set/key pair. The existing validator permits underscores in option_set by normalising them for its ID check, but **option_key uses its letters/digits/hyphens check**. Main's authoring source permits underscore keys and up to 120-character product IDs; legitimate production data can therefore fail this narrower preflight. Such a failure is compatibility evidence, not proof of corrupt data. Do not change records or relax the validator during execution.

Recursive checks reject `data:image/` strings, strings longer than 20,000 characters, depth beyond 10 and named forbidden fields including image/internal_unit_cost/customer/email/access_token/service_role/password and prototype keys. Exact projections exclude original images. These checks are not proof that an arbitrary allowed text string cannot encode binary content; no failed/raw payload is to be retained. A stricter semantic contract would be a new candidate.

After all three responses validate, metadata and identity ID sets must match exactly; manufacturerKey relationships must resolve to returned active manufacturer options. Sequential reads are not one database snapshot; ID-set checks detect some races, not simultaneous changes to every metadata value. A successful empty set proves no complete catalogue inventory. Counts/coverage need interpretation against a separately trusted inventory; never infer hidden-row correctness from absence.

Request 1 observes sampled public metadata/stock/price readability without selecting images. Request 2 observes identity mapping without downloading assets; its elapsed time includes transport and server work and is not a database hashing-cost measurement. Request 3 observes active option semantics. None proves complete RLS/grants, security_invoker, ownership, hidden-row exclusion, current admin authority, billed usage, real image integrity, hosting suitability, or COMMAND mutation compatibility.

The reviewed `docs/approval/catalogue-delivery-v2.sql` is a **proposal**, absent from main's migration directory. Its presence on an engineering branch is not proof that the deployed view exists. A 404 is STOP, not permission to create it. Object-reference support in that SQL proposal is broader than this preflight's null-reference contract; do not silently adopt it.

## Transport limitations and proposed execution gate

The existing runner has no CLI/default fetch/schedule; it requires an injected request function. Nonfixture execution checks exact production origin and approval scope `BLACKBOX34_READ_ONLY_PREFLIGHT` with the exact plan hash. That guard does not create owner consent or cryptographically verify a legacy key's claims.

Actual code checks stream size **after each read chunk** and cancels on excess. An oversized chunk or already buffered network data can exceed a logical accepted-byte limit before cancellation. Non-200 responses are rejected before reading their bodies; cancellation semantics depend on the injected transport. Headers, TLS, provider accounting and any server-side work are outside these body caps. Eight-second abort depends on transport cancellation and is not a guaranteed wall-clock bound for an uncooperative transport. Therefore the historical limits are acceptance rules, not a hard billed-egress ceiling.

Before approval/execution, present the exact transport implementation/version and offline evidence that it honours single-attempt redirects:error, no cookies/auth reuse, identity encoding and abort/stream cancellation. Do not run with a privileged browser session. If the owner requires an absolute wire-byte ceiling, or the transport/validator needs changed semantics, prepare and hash a **new candidate** for fresh approval. Preserve the recovered plan unchanged; no new runner/transport is implemented here.

## Evidence and stop decision

Retain only plan hash, pinned script/projection identities, approval reference, transport version, timestamps, attempted count, per-step status/elapsed/body length/row count, aggregate length, validation outcome codes and limitations. Raw successful records/IDs/source hashes stay transient for comparison; do not commit catalogue rows, option labels, real images, rejected bodies, headers or keys. No source identity is an approval to retrieve its image.

On 400/401/402/403/404/429/5xx, redirect, type/encoding/body/row/deadline failure, unsupported reference, unexpected field or consistency failure: abort remaining steps, retain the redacted failure, return **HOLD**. A further attempt, larger catalogue plan, structural diagnosis or image capture requires a separate owner decision. Phase A/B remain separate; no preliminary catalogue ping is bundled into A, and no Phase C schema query is added to these three requests.

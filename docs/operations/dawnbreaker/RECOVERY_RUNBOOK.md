# DAWNBREAKER — operator recovery runbook

Prepared 23 October 2026 for the expected 24 October reset. **Every backend/recovery/release action below is unexecuted and requires fresh authority.** Authorisation 42 says: “Execution will require a fresh owner authorisation.” An expected reset does not start this procedure automatically.

Read the [evidence index](EVIDENCE_INDEX.md) and recheck current source before acting. Record an owner approval reference and redacted outcome at each gate. A HOLD ends that phase; never retry, widen access or repair production to make a gate pass. Passing one gate does not approve the next.

## First approval to request on 24 October

> Approve DAWNBREAKER Phase A only: receive one dated, redacted owner-confirmed provider report, at most 16,384 UTF-8 bytes, for project acdxpxvksvdwfajntzfx covering the actual billing cycle, allowance/usage/remaining units and reporting lag, quota-enforcement state and project service state. The assistant will make zero Supabase, Auth, SQL, Stripe or storefront requests. This does not authorise Phase B, Phase C, workflow changes, image retrieval or deployment.

This is proposed wording for a future decision, **not an approval supplied by this document**. No credentials or routine owner-side software setup are needed. If approved, ask for the specified redacted facts, not a dashboard login or record export.

## Sequential gates

| Gate | Prerequisite and exact proposed action | Evidence / limits | Stop condition and owner decision | Untouched boundary |
|---|---|---|---|---|
| **0 — Authority and baseline** | Record the new mission/phase approval, date, incident state and exact project. Read GitHub refs/latest Pages run/job metadata; compare the five pinned heads in README. Check queued/in-flight publication. | Proposed maximum 8 read-only GitHub metadata calls, no retries, 10-second deadlines each, 1 MiB accepted aggregate; no backend calls. If metadata cannot fit/be obtained, hold and define a new read plan. | Any unexpected ref/workflow movement, competing publisher, missing authority or unsupported metadata: HOLD affected operation. Owner decides whether changed source needs a new plan. | Existing refs, main, workflows, services and data; no cancellation/dispatch. |
| **1 — Provider restoration (A)** | With explicit A approval, receive the owner's one trusted, dated provider report described above. Verify actual new cycle, available allowance, project/enforcement state and source/lag. | Assistant backend/dashboard/storefront requests **0**, backend bytes **0**; one report **≤16,384 bytes**. Public catalogue status remains UNTESTED. See RESET_VERIFICATION. | No reset, restricted/paused/unknown status, stale/wrong-project data or insufficient allowance: HOLD. Owner confirms facts or separately authorises an exact alternative status method. | No login, live REST/RPC, SQL, credentials or sensitive records. |
| **2 — Egress safety** | Use the same dated report to establish baseline. Owner sets remaining reserve and maximum experiment exposure; account for existing schedule, visitors and reporting lag. Present B's exact plan plus transport limitations. | **0 additional backend requests**; one redacted budget decision **≤8,192 bytes**. B's accepted-body cap is 131,072 bytes, not a billed/wire cap. | Unknown/unsafe concurrent exposure or stale baseline: HOLD. Owner must explicitly accept bounded manual exposure and known concurrent uncertainty, or separately authorise a workflow/control change. No blanket recovery approval. | Existing daily job remains enabled. No pause, disable, alert installation or frontend change. |
| **3 — Bounded NIGHTFALL compatibility (B)** | Separate approval references exact plan SHA-256 below, reviewed transport/version and accepted limitations. Execute exactly the three sequential public GETs only in that authorised future mission. | **3 maximum**, no redirects/retries/pagination, **8 s each**, **65,536 bytes/response / 131,072 aggregate**, rows **20/20/100**; reaching a row limit fails. Retain only redacted outcome metadata. | Any HTTP/type/encoding/size/row/deadline/schema/identity/reference/relationship failure: cancel remaining requests and HOLD. Any new attempt or changed plan requires a new decision. | No Admin session, schema query, image download, write, build, publisher or SQL. |
| **4 — Evaluate compatibility / decide C** | Evaluate B offline against the exact contract and trusted coverage expectations. Classify MATCH/GAP/UNKNOWN and whether separate structural review is justified. Do not equate empty/small results with full inventory or RLS proof. | **0 new live requests** for evaluation; one redacted decision **≤16,384 bytes**. Initial C candidate is at most 8 separately reviewed privileged metadata statements, not included in B. | Missing view, unsupported legitimate IDs/keys, race or unknown grants: HOLD integration. Owner may commission exact C contracts/hashes/privileges; no automatic C execution. | No migration, grants/RLS repair, real user/member/product records or mutation acceptance. |
| **5 — Publication readiness** | Assess complete active payload association, independent full inventory, generated outputs and durable complete rollback against HOMECOMING_GATES. Review NIGHTFALL infrastructure gaps separately. | Within this readiness plan: **0 backend requests, 0 asset recovery/download/publication, 0 build/deploy**. Any actual archive retrieval/rebuild needs its own source/size/time/retention contract and authority. | Missing authentic payload/rollback or unsafe backend-dependent route: HOLD. Owner chooses separately scoped recovery/adoption/rebuild, hosting/publisher work or no release. | No CSS main push, NIGHTFALL activation, image capture, workflow edits, DNS or infrastructure credentials. |
| **6 — Separate release approval** | Present the complete concrete release package: exact source/payload/overlay/rollback hashes, tested publication-only route, concurrency state, bounded live checks and rollback triggers. Stop for a new release mission. | This runbook issues **0 deployment calls/writes**. Future approval must name exact artifact/route and request/byte/time limits. | Owner approves or declines that specific release; absent approval or incomplete package remains HOLD. No dispatch follows automatically. | Main/integration/deployment remain untouched until separately authorised. |

## Phase B approval identity

```text
scope: BLACKBOX34_READ_ONLY_PREFLIGHT
planSHA256: bd9aca0efc68e8921150fbd0aefbce97059919f34d066d6b59c2cec9191e4f44
origin: https://acdxpxvksvdwfajntzfx.supabase.co
```

The [exact requests and validator](NIGHTFALL_PREFLIGHT.md) are authoritative. Scope/hash fields are an accidental-execution guard, not consent. Transport streaming can receive an oversized chunk before rejection; headers/TLS and billed traffic are outside accepted-body budgets. Review and approve that limitation or prepare a separately hashed new candidate. Do not call a live endpoint to validate the transport.

## Decision record and escalation

For each gate retain: approval reference, pinned source/plan/transport identity, UTC timestamps, evidence classification/source and freshness, attempts/status/counts/accepted bytes if applicable, PASS/HOLD/UNKNOWN reason, remaining uncertainty and next owner decision. No keys, tokens, raw catalogue rows, member/user data, image bytes, rejected response bodies or private function definitions belong in Git evidence.

- A confirms provider facts only. Successful authentication would not prove catalogue restoration and is not an A action.
- B observes only its sampled public contracts. Failure cannot authorise SQL/view creation, larger limits or a retry; success cannot authorise C, capture, activation or publication.
- C is a distinct privileged metadata review with exact statements/hashes approved before access; it does not exercise real mutations. See [COMMAND_COMPATIBILITY.md](COMMAND_COMPATIBILITY.md).
- A fresh quota does not repair missing complete publication provenance. A full Pages build is not a safe health probe. See [HOMECOMING_GATES.md](HOMECOMING_GATES.md).

If any action would require production authentication, unrestricted discovery, customer/order/payment access, credentials, SQL execution, workflow modification, asset extraction/publication, main integration, deployment or hosting changes outside its new approval: stop the affected action, record the dependency and continue only independent authorised planning. There is no “restore everything” approval in this package.

## If a future publication fails

No publication occurs in this mission. A future release must already have its complete verified previous payload and proven restoration route. Generator failure before upload means discard failed assembly; do not publish partial output or manually continue skipped steps. Upload/deploy failure requires checking the actual active release association through the then-approved method before declaring state. After a material served regression, use the approved complete-payload rollback and verify it independently. Never infer recovery from a CSS Git inverse, reset frozen refs, delete retained immutable images or roll back business data. If rollback provenance is missing, publication must not start.

**Stop here after the documentation handover. No phase is scheduled or automatically authorised.**

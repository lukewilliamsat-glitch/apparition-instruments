# Future Phase A — provider/reset confirmation

**Prepared only. No Supabase connection or owner dashboard inspection occurred.** Expected reset: 24 October 2026, exact provider reset time unknown. A calendar date, login success, historical HTTP 402 or a GitHub build is insufficient to declare restoration.

## Smallest proposed method

Request a fresh, explicit **Phase A owner-mediated information approval**. The owner supplies a dated redacted summary from their trusted billing/usage and project-status information. The assistant does not open Supabase, authenticate, run SQL, call REST/RPC, load the storefront or ask for credentials. If provider information is unavailable, the safe result is **UNVERIFIED / HOLD**, not a diagnostic catalogue request.

| Information | Proposed trusted source / access | Expected evidence / negative result |
|---|---|---|
| Correct project | Owner's project/billing account, `acdxpxvksvdwfajntzfx` | Exact project association; mismatch stops |
| Cycle start/end and timezone | Owner's provider billing-cycle display/export | New period actually shown; expected date alone leaves HOLD |
| Current plan, included bandwidth, units and available remainder | Owner's usage/billing summary | Current figures and unit definition; historic Free/5 GB is not a substitute |
| Usage observation time and reporting delay | Same provider source | Timestamp plus known lag; unknown lag recorded, no immediate-delta attribution |
| Quota enforcement and service/project state | Owner's project status, billing notices or dated provider support response | Enforcement lifted / active, or exact unavailable/paused/restricted/unknown result |
| Whether public catalogue 402 remains | **Not tested by Phase A** | Record UNTESTED even if provider reports recovery; only separately approved Phase B observes its public endpoints |

The owner may confirm provider facts when independent information cannot be obtained. Label the result **OWNER-CONFIRMED**, preserving its timestamp/source and uncertainty; do not relabel it independent API verification. General provider status does not prove this project's quota has cleared.

## Limits and retention

- Assistant-originated backend, dashboard, SQL, Auth and storefront requests: **0**. Backend response bytes: **0**. No credentials, API keys, JWTs, invoices with personal details, screenshots or business records requested.
- Accept **one redacted text report, maximum 16,384 UTF-8 bytes**, containing only the fields above and relevant run/incident identifiers. This is an evidence-retention ceiling, not a claim that a human's provider dashboard page has a bounded transfer cost.
- Proposed report fields: project reference; observedAt UTC; source label; owner-confirmed/independently supplied classification; cycle start/end/timezone; plan/allowance/used/remaining/unit; reporting lag; enforcement state; project state; publicEndpointStatus=`UNTESTED`; unresolved notes. Unknown values remain explicit.
- No repeated polling, screenshots, connection fallback, live test request or automated next phase. If a smaller provider management query becomes necessary, first prepare its exact supported tool/endpoint, fields, privilege, time/byte/request limits and separate approval. No such connector capability is assumed available here.

Stop on wrong project, stale/contradictory figures, cycle not reset, restriction/paused state, insufficient remaining allowance, missing trustworthy source, credential requirements, sensitive records or oversized evidence. Retain only the redacted result and decision. Do not inspect billing credentials or infer a billing reason from error status alone.

## Decision after Phase A

**Confirmed new cycle + usable allowance + acceptable project/enforcement information** permits only consideration of Gate 2, not live catalogue access or deployment. Unknown/negative evidence remains HOLD. The existing scheduled Pages job and normal visitors may consume newly available quota; account for them before setting a manual experiment budget. Any pause/disable requires separate workflow authority.

The earlier HOMECOMING next-phase document contemplated using a first approved public request as a recovery observation. Authorisation 42 now explicitly separates provider restoration (A) from the exact public compatibility plan (B). This runbook follows that newer sequence without changing B's protocol/hash.

Exact proposed first approval wording is in [RECOVERY_RUNBOOK.md](RECOVERY_RUNBOOK.md). Phase A has not been requested or executed automatically by this documentation mission.

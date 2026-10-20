# BLACKBOX — backend cost centres

Authorisation 29A · 20 October 2026 · documentation-only research.

Derived from the preserved [original assessment](BLACKBOX_GITHUB_ASSESSMENT_2026-10-20.md) and [unchanged research evidence](RESEARCH_EVIDENCE.json). Findings distinguish VERIFIED source, SYNTHETIC tests, HISTORICAL measurements, DERIVED models and UNKNOWN production usage. No new production measurements or test reruns were performed for publication.

## 3. Attribution and historical timeline
| Service | Evidence | What cannot be determined |
|---|---|---|
| PostgREST / API gateway | Legacy catalogue JSON carries embedded image data; authenticated lists and Forge revisions use Data API. | Actual outbound bytes by endpoint or service and billing category. Do not double-count one response as separate database and gateway egress. |
| Direct database / Supavisor | Application repository does not supply session-level traffic metrics. | Query-tool, MCP, backup or development-automation downloads; bytes and actors unknown. |
| Auth | Source identifies sign-in/user/refresh paths. | Production counts, bytes, retry patterns or attack traffic. |
| Edge Functions | Source identifies checkout, order/account, preview/email and conditional dispatcher calls. | Deployed versions, invocation counts, response sizes and attributable billable traffic. |
| Storage | Source defines a business-image bucket; historical six product images are embedded in database rows. | Current Storage traffic; existence of a bucket does not prove those photos are downloaded from it. |
| Realtime / other | No application channel/postgres_changes subscription identified in reviewed non-vendor application sources. | Other clients or project-wide activity; bundled SDK capability is not evidence of active subscriptions. |

**No billing-grade egress breakdown is available under GitHub-only access.** Endpoint rankings below describe source fan-out and potential bytes, not measured production frequencies. No anonymised live logs, user agents, origins or error-rate exports were available. Automated abuse cannot be confirmed or excluded. An intentionally public key is not a privileged credential; rotating it alone would not remove oversized public responses.

| Date / GitHub evidence | Finding | Classification |
|---|---|---|
| 28 September, 0a3a6d7ff255fc952c64fce80ab711cdd626f729 | Product generation introduced with */5 schedule. Historical generator used GET catalogue_components?select=* and catalogue_options?select=*. | VERIFIED historical source |
| 29 September, 54d75821c91a0bc64555d21d4baded5db3749d99 | Five-minute schedule still present; asset stamping added. | VERIFIED historical source |
| 27 September–2 October spike | Frequent image-bearing generation is a plausible contributor after 28 September. Exact successful run count, payloads then, visitor volume and development traffic unavailable. | INFERRED, not attribution |
| 9 October, e7b68b885dc201ef99707fe1e458a18eba2ee3e7 | Public cache/technical projections and 15-minute schedule introduced. | VERIFIED GitHub history |
| 19 October, current main | Schedule reduced to daily with source-only change. | VERIFIED |
| 20 October, run 39391123342 | Product generator rejected HTTP 402 before publication. | VERIFIED |
| 24 October | Owner-reported expected billing reset, not independently confirmed service recovery. | HISTORICAL expectation |

The previously reported 13.44 GB / 5 GB allowance is not independently verified current usage. Earlier references to 506 identical requests were not corroborated with primary logs during this pass and are not used to calculate attributed traffic.

## Billing guardrails
Do not double-count PostgREST response bytes as separate database and API egress without official accounting definitions. Counts are not bytes. Direct database/Supavisor, Storage and unknown clients remain unallocated. The conditional email cron definition is source evidence, not proof of the installed job or current delivery count. Do not change email, Auth or RLS on speculation.


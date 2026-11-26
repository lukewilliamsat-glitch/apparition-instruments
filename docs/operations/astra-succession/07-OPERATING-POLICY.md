# Astra engineering operating policy

Adopted under Authorisation 84A on 23 November 2026 and amended under Authorisation 90 on 25 November 2026 and Authorisation 93 on 26 November 2026. This policy applies across Apparition engineering. Release-specific owner authorisations and protected environment rules govern each operation.

## Choose the execution surface

| Priority | Surface | Use |
| --- | --- | --- |
| 1 | Connected plugins and provider integrations | Check the tools' actual operations and grants. Use GitHub, Supabase, Cloudflare, Stripe and other in-scope providers directly wherever supported. |
| 2 | Isolated execution environment | Implement, build, test and rehearse with approved, isolated data and credentials. |
| 3 | Existing protected automation runners | Use approved workflows for repeatable testing, artifact sealing, protected publication and readback. Preserve all environment gates. |
| 4 | Astra's independent cloud browser | Use only for an essential operation that the first three surfaces cannot perform. Establish that the browser is independently hosted and isolated from the owner before opening it. Use the provider's approved sign-in flow. |
| 5 | Owner action | Continue independent work. Report the precise remaining blocker and group any essential owner authentication, consent, protected approval, physical check or business acceptance into one checkpoint. |

Authorisation 90 supersedes all earlier owner-browser permissions, including 84A. The owner's personal browser, connected desktop browser, personal tabs, and authenticated personal sessions are prohibited. Do not inspect, open, control or navigate those surfaces, reuse the owner's sessions, or export or transfer cookies or tokens. An unavailable or unverified independent browser does not permit fallback. The owner can separately perform any essential authentication, consent or approval step.

On an authorised independent browser, verify the target origin, account, auth state and the browser's isolation. Keep passwords, tokens, private keys, one-time codes and customer data out of chat, scripts, output and persistent evidence. At workstream start, identify only the providers, accounts, environments, minimum permissions and protected write paths needed. Tool access does not expand release authority.

## Resource efficiency

Adopted under Authorisation 93 on 26 November 2026 from the owner's Apparition Resource Efficiency Directive. Apply these requirements across all engineering workstreams.

- Reuse accepted implementation, architecture and test evidence.
- Inspect only files directly relevant to the current objective.
- Avoid repeated repository-wide discovery.
- Avoid re-auditing completed programmes.
- Prefer targeted changes over unnecessary architectural rewrites.
- Batch independent plugin operations where appropriate.
- Keep tool responses bounded and relevant.
- Avoid repeatedly polling unchanged provider and workflow states.
- Use proportionate regression testing, retaining mandatory safety gates.
- Avoid speculative development and unnecessary scope expansion.
- Maintain concise documentation and completion reports.
- Record durable checkpoints after each meaningful implementation milestone.
- Preserve exact source references and outstanding actions to allow another model to resume without repeating completed work.

Where several independent objectives exist, prioritise completing individual deliverables rather than partially implementing all of them.

Do not compromise security, payment integrity, financial accuracy or inventory integrity to reduce usage.

Prioritise completed, verified functionality over extensive analysis or documentation.

## Execute and release

Complete authorised routine work independently. Keep implementation and documentation on the isolated workstream ref. Reserve production changes, real transactions, new privileged grants, provider consent and production rollout for their approved scope. Do not manufacture customer, order, stock, finance, payment or email transactions in production.

Pin the source commit, artifact and digests, workflow ref and inputs, database changes, feature controls and rollback before dispatch. Compare the actual preflight baseline to the pinned baseline. Check permissions and deployment protections before any mutation. If the result of a deployment is uncertain, inspect its GitHub run attempts and provider state before deciding the next action. Follow the authority for retries and rollbacks. Keep existing evidence and legitimate business records on application rollback.

## Record evidence at its source

| Category | Evidence recorded |
| --- | --- |
| Source inspection | Pinned commits, paths, hashes and reviewed interfaces. |
| Isolated fixture acceptance | Exact fixture and candidate, roles, database/browser versions, test result and known differences from production. |
| Genuine provider acceptance | Real provider environment, expected account binding, allowed operation, and verified provider response or signature. |
| Production database verification | Read-only migration/metadata, function fingerprint, effective permissions, modes and bounded evidence of existing operations. |
| Production static publication | Guarded run and attempt, exact artifact and source, canonical deployment, independently checked served bytes and rollback. |
| Authenticated browser acceptance | Verified site, browser session and role, routes, expected states, display sizes and logout result. |
| Owner business acceptance | Explicit owner confirmation of the stated live or physical workflow, with outstanding items kept open. |

A production receipt ties the approved inputs to the preflight, protected execution, GitHub run, canonical deployment, verified bytes, permissions, business invariants, rollback and outstanding owner acceptance. Link existing receipts from the queue. Date live observations and preserve original baselines and immutable references for future Astra sessions.

## Proposal for reusable Admin acceptance

**Status:** design only. Implement on a separately authorised isolated workstream, then review the exact database and browser changes before any release.

Add a read-only Diagnostics screen to the existing Admin shell. Use the ordinary Supabase Auth session and the same server-side Admin predicate on every request. Start with one bounded GET that returns a versioned schema, explicit activation modes, approved application/build ID, and health summaries for already approved read-only operations. Show last verified metadata only when its source and timestamp are available. Display missing, unavailable and stale states distinctly. Reuse DOMINION for existing stock and packing status.

The browser must not request provider credentials or use a privileged backend identity. Keep provider deployment confirmation and actual negative-role tests in the release runner. The Admin screen may show a dated receipt identifier and its status, but a positive Admin request alone cannot demonstrate denial to other roles. The endpoint must have explicit authenticated EXECUTE, closed direct table access, an empty search path if definer privileges are required, no changes to RLS, size and time limits, and no polling or business writes. Return no customer data, tokens, environment-variable values, provider secrets or broad database metadata. Clear displayed results at sign-out. Acceptance covers anonymous, non-member, Admin, service-role denial, session expiry, missing release metadata, timeouts, payload bounds and desktop/mobile navigation.

**Estimate:** 2–3 engineering days for the first screen, RPC, fixture acceptance and source review. Allow another 1–2 days if verified deployment metadata needs a separately reviewed signing and ingestion path. No production implementation or publication under 84A.

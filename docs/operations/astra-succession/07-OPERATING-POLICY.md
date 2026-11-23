# Astra engineering operating policy

Adopted under Authorisation 84A on 23 November 2026. This policy applies across Apparition engineering. Release-specific owner authorisations and protected environment rules govern each operation.

## Choose the execution surface

| Priority | Surface | Use |
| --- | --- | --- |
| 1 | Connected provider integrations | Discover actual permissions and operations. Use GitHub for source, commits, Actions and artifacts, Supabase for schema and permitted database checks, and Cloudflare for deployment metadata and configuration. |
| 2 | Astra native Computer Use browser | Use it for supported browser-only settings, GitHub protected environments, provider dashboards, genuine Admin sessions, visual checks and responsive acceptance. Prefer the provider's supported authentication flow. |
| 3 | Owner-connected browser | Use the owner's browser when the necessary authorised session cannot reasonably be used in the native browser. |
| 4 | Owner action | Group genuine authentication, consent, release approvals, physical device checks and business acceptance into one checkpoint. Identify the exact limitation after checking the integration, native browser and established authorised procedure. |

Native and owner browsers have independent sessions. Verify the target origin, account, auth state and observed capability before claiming a cross-tool check. Reuse a current session without exporting cookies or tokens. Use secure sign-in or verified native takeover for login. Keep passwords, tokens, private keys, one-time codes and customer data out of chat, scripts, output and persistent evidence.

At workstream start, identify the actual providers, relevant account and environment, minimum permissions, tested read capability and any protected write or approval path. Check only providers in scope. Browser and plugin capability changes do not amend an authorisation.

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

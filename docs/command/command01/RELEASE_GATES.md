# COMMAND 01 release gates and rollback
## Current authority
Authorisation 37 permits isolated implementation, synthetic tests, branch-only CI and evidence publication. It does not permit production integration or deployment.

## Preservation
- Production main stays `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`.
- No existing tracked blob is changed, including dist, backend, Stripe, SQL, authentication, Admin, Studio, FORGE, GIGA assets or the existing static.yml workflow.
- The only new workflow runs on pushes to the exact engineering branch, limited to candidate/test/workflow paths. Contents read only, checkout credentials not persisted; no secrets, environments, Pages permissions, OIDC, deployment actions, schedule or manual dispatch.
- Evidence-only documentation commits do not retrigger candidate acceptance.
- Main's existing Pages workflow still targets main pushes/manual/daily execution. This mission does not dispatch it or make a main push.

## Next independent milestone
Recommend **COMMAND 02 — owner review and authenticated read-contract design**, not automatic editing or deployment. Review the genuine screenshots and interactions first. Then define a server-authorised summary/detail adapter using the existing Admin membership/transport rules, authenticated least-data projections and real freshness/version semantics. Production access, any schema/RPC change, authenticated live tests and route publication need separate explicit approval.

Before production integration:
1. Owner approves interface, vocabulary, responsive behaviour and scope.
2. Reconcile current main and existing Admin changes without merging unrelated frozen work.
3. Design and fixture-test authenticated role/access failure behaviour; confirm server-side authorisation and RLS independently under separately scoped authority.
4. Specify actual image metadata and version identities without downloading images in bulk.
5. Preserve existing editing/stock/checkout write contracts and dirty editor protection. COMMAND 01 has no editor.
6. Perform screen-reader/assistive-technology acceptance and real device checks where necessary.
7. Resolve a verified safe deployment/rollback route separately; Atlas is not certified and HOMECOMING remains a separate blocked release candidate.
8. Approve any production read measurements explicitly; do not claim fixture byte reductions as billed savings.

## Rollback
No live rollback is necessary: nothing is deployed. To stop evaluation, stop using the engineering branch; all historical checkpoints and production main remain independently intact. Do not reset, clean or delete them.

If a later approved integration adopts these additions, use an ordinary reviewed inverse commit restricted to COMMAND prototype/test/doc files and its dedicated workflow. Never revert unrelated main history, replace a Pages payload from unverified source, change Supabase, delete original images or alter GIGA manifests as a rollback shortcut.

## Unverified
No current production health, Supabase billing reset, database state, Stripe state, authenticated real account flow or live business data was inspected. The existing Pages/Supabase restrictions are outside this milestone.

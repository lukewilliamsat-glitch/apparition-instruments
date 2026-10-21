# COMMAND 02 release gates
Current authority is isolated implementation and synthetic acceptance only. Passing CI does not approve production integration.

## Before a real Admin adapter
1. Owner reviews the actual interface, supported field scope, conflicts and discard/uncertain-save flows.
2. Reconcile current production main with this candidate; preserve COMMAND 01, BLACKBOX, Atlas, Spectre, Phoenix, FORGE and GIGA checkpoints.
3. Separately approve authenticated production reads, and verify membership, resource allowlist, RLS and least-data projections. No live permissions were checked here.
4. Review a real server write contract. Existing generic saves are sequential across component/internal/inventory tables and do not expose the simulated component compare-and-set/idempotency contract. Do not attach this fixture adapter to that method unchanged.
5. Establish actual atomicity, revision checks, safe retry, audit and protected-field preservation. Any required SQL/RPC work needs its own exact reviewed approval; none is prepared/applied here.
6. Keep inventory writes separate and quantity-conditional. Preserve images/private cost/structured content, SKU relationships, assemblies and checkout pricing/stock authority.
7. Review manufacturer-key options, category-specific structured specs, any linked kit pricing and future galleries as distinct scope. Do not expand the present whitelist opportunistically.
8. Complete owner, screen-reader/assistive-technology and relevant real-device acceptance under scoped authority.
9. Independently verify a complete publication and rollback route, then obtain explicit production deployment approval. Atlas is not certified; the separate HOMECOMING/BLACKBOX release states are not changed by COMMAND.

## Preservation and rollback
The candidate is outside production dist and has no live navigation integration. Existing main and production workflows are unchanged. Its new Actions workflow is exact-branch-only, contents read, no secrets, Pages, OIDC, production environment, schedule or deployment action.

No live rollback is needed. Stop using the engineering candidate to stop evaluation; fixture records disappear with that page. GitHub preserves its source/evidence and the unchanged COMMAND 01 reference independently. Any future adoption/reversal must be a reviewed ordinary commit limited to COMMAND paths and its optional extension hooks, never a reset, force push, broad revert, image deletion or database rollback.

## Recommended next milestone
Owner review followed by a separately authorised **COMMAND authenticated read/write contract design and security review**, before production wiring or more product domains. No automatic next phase.

## Current evidence-publication gate

Functional acceptance passes, but the mission remains PARTIAL until the ten original synthetic PNG captures listed by filename, byte count and SHA-256 in BROWSER_ACCEPTANCE.md can be committed under this document directory's SCREENSHOTS path. None is currently in the COMMAND 02 branch tree.

Automatic approval review rejected the public `validation-errors.png` blob upload twice, stating the specific publication/payload was not authorised. The second attempt followed a recheck of Authorisation 38 sections 3, 17 and 18 and exact PNG provenance. Further screenshot operations stopped; no alternate publication route is authorised by this handover.

Obtain explicit owner confirmation of those ten exact public payloads before a fresh reviewed attempt. Preserve current source and text evidence meanwhile. The successful run's original evidence artifact expires on 20 November 2026; this retention limit remains a continuity risk until durable PNG publication succeeds. No new CI execution or source change is needed solely to preserve the already verified captures.

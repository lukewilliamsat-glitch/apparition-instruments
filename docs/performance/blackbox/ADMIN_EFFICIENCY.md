# BLACKBOX — Admin efficiency

Authorisation 29A · 20 October 2026 · documentation-only research.

Derived from the preserved [original assessment](BLACKBOX_GITHUB_ASSESSMENT_2026-10-20.md) and [unchanged research evidence](RESEARCH_EVIDENCE.json). Findings distinguish VERIFIED source, SYNTHETIC tests, HISTORICAL measurements, DERIVED models and UNKNOWN production usage. No new production measurements or test reruns were performed for publication.

## Existing authenticated read/write behaviour
Main's component list reads components?select=*, inventory?select=* and component_internal?select=* independently, then joins them. Authenticated responses do not enter the public catalogue cache. Lists occur in catalogue/stock screens and several overview/settings/order/kit/build-sheet workflows.

The synthetic fixture measured 1,055,551 raw response bytes for one three-GET list; two lists caused six GETs. A stock repository update plus one explicit UI-style list refresh caused seven GETs and one fixture PATCH, 2,111,167 raw read bytes and two full component lists. This was not a browser DOM run.

Save validates against a fresh full list. Stock updates read the prior quantity and condition the PATCH on it. These safety reads must not be removed merely to lower request counts.

## Recommended optimisation
Reuse and reconcile frozen FORGE V4 summary/detail and refresh-coordination work only under a later implementation approval. Listing can omit image while preserving required metadata; editor opening needs authoritative original detail. Unloaded image must remain distinct from deliberate deletion, and incomplete summaries must never form authoritative save payloads.

Preserve dirty editors, stale/auth/selection generation handling, post-save invalidation, failure recovery, RLS, inventory CAS, exports and full-data consumers. The existing external order picker is already image-free. Assemblies/options/export contracts need individual review rather than silently changing the full-list API.

## Incomplete evidence
Current production request counts, response sizes, membership state, browser usability and deployed frozen-candidate parity are not verified. No Admin login or business data access occurred.


# BLACKBOX — request frequency model

Authorisation 29A · 20 October 2026 · documentation-only research.

Derived from the preserved [original assessment](BLACKBOX_GITHUB_ASSESSMENT_2026-10-20.md) and [unchanged research evidence](RESEARCH_EVIDENCE.json). Findings distinguish VERIFIED source, SYNTHETIC tests, HISTORICAL measurements, DERIVED models and UNKNOWN production usage. No new production measurements or test reruns were performed for publication.

## Model
Let C be successful uncached image-bearing catalogue responses, S successful scheduled generations, P other successful push/manual generations, R visible Operations refresh cycles and L authenticated component lists.

- Catalogue body scenario: (C + S + P) × applicable body bytes, after removing overlapping/shared calls. S and P are channel labels, not additional counts if already included in C.
- Normal product generation starts two independent GETs; a fully successful complete workflow sequence has five explicit backend calls. The failed 402 run did not reach later generators.
- Admin catalogue lists: 3L GETs for component/inventory/internal resources, excluding options/auth and additional workflow reads.
- Operations: 2R RPCs, with coalescing inside one controller; nominal one-minute visible polling, additional boundary/visibility events and hidden timer suspension.
- Do not multiply every module import, click or page view by a full response. Exact matching cache keys can share one read; search/filtering uses loaded records.

## Observed source versus assumptions
Current cron is 0 3 * * * (one nominal daily opportunity, not a guaranteed execution time). Earlier five- and fifteen-minute schedules are historical. Visitor counts, actual successful runs, tab duration, cache-hit rates and response bytes by endpoint remain unknown.

The 19 original synthetic scenarios established: 20 concurrent identical reads → one mocked request; 20 settled identical reads within TTL → one; distinct filters/projection order/request-function identity → independent requests; expired or invalidated cache → another read; 402 does not trigger automatic retries or become cached.


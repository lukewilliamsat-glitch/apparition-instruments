# BLACKBOX — cache analysis

Authorisation 29A · 20 October 2026 · documentation-only research.

Derived from the preserved [original assessment](BLACKBOX_GITHUB_ASSESSMENT_2026-10-20.md) and [unchanged research evidence](RESEARCH_EVIDENCE.json). Findings distinguish VERIFIED source, SYNTHETIC tests, HISTORICAL measurements, DERIVED models and UNKNOWN production usage. No new production measurements or test reruns were performed for publication.

### What existing caching actually provides
**VERIFIED:** 30-second expiry; 32 entries / 20 MiB serialised public data maximum. Cache keys include public key plus exact URL and are scoped to request-function identity. Identical pending requests coalesce. Small entries may use sessionStorage; large public catalogue results may use optional Cache Storage across navigation. Session payload limits are 64 KiB per entry and 256 KiB total.

This is not a shared server/CDN cache. Different visitors, processes, wrappers, filters, projection order, expired entries and failed browser storage can result in separate reads. Two approximately 12 MB projections exceed the 20 MiB cache budget and can evict one another. Failed/non-array results are not cached. Admin writes invalidate public caches; stale stock never authorises checkout. Browser persistent-cache reuse was not exercised in a real browser here.


# Performance and egress boundaries

Source-only review; **no live performance requests or production latency/billing measurements**. Read alongside the pinned [DAWNBREAKER egress assessment](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/542cc90cf9c301b4571d246ce9ae105bddefc2d0/docs/operations/dawnbreaker/EGRESS_RISK.md) and [NIGHTFALL release gates](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c3003c6a56075964f5036ea57507aed8f431b64e/docs/performance/blackbox34/RELEASE_GATES.md). Their solved investigations are not rerun here.

## Current source mechanisms

- Default public component reads still include `image`; static-image adapter remains **enabled:false**. Cards' `loading=lazy` delays image display/decoding but cannot undo embedded original bytes already received in catalogue JSON.
- Product detail imports the shared catalogue/commerce graph and then refreshes, rather than reading only one product's complete detail. Identical transport requests can coalesce or reuse the public cache, so source imports must not be counted as separate real transfers without observation.
- Browser kit-data eagerly loads component/kit/permission metadata. Shared tool models can reach that graph. The dedicated technical matcher and scoped commercial support query are already image-free; do not replace them with full catalogue reads.
- Public cache: 30-second expiry, 32 entries / 20 MiB serialized budget, exact URL/public-key/fetch-function scope, optional persistent public reuse and strict expiry/invalidation. This is neither a shared CDN cache nor a network-response cap. Authenticated data must remain outside it.
- Operations refreshes store/announcements for visible pages every 60 seconds and on boundaries/visibility events, with in-flight coalescing. No exponential error backoff is present. Checkout status rerenders can affect focus/progress (RAV15). Fresh OPEN/checkout authority must not be replaced by indefinitely cached availability.
- Pages product generation bypasses settled cache, includes embedded images and lacks explicit response-size/row/deadline caps. Its 8 MiB individual decoded-image check happens after retrieval. Operations/News/CMS add backend dependencies; CMS is unconditional for static-only markers. No build was run.

## Static asset measurements

Measured committed files, not encoded HTTP responses or billed Supabase traffic:

| Asset | Bytes / dimensions | Assessment |
|---|---|---|
| `assets/apparition-logo.png` | **2,201,238**, 2048×2048 PNG | Shared header/footer crop a large square source. Same URL in two elements does not prove two downloads; caching/coalescing may reuse it. RAV07 proposes measured display variants. |
| `assets/angel.png` | 4,233,738, 1365×2048 PNG | Homepage references this illustration. Optimisation should preserve transparency/detail and actual use; no automatic compression was performed. |
| `assets/the-violinist.png` | 2,299,680, 1024×1536 PNG | Homepage editorial artwork. Prioritise actual above/below-fold demand and responsive variants in future browser measurements. |
| `assets/les-paul-modern.png` | 1,669,102, 1584×2048 PNG | Homepage illustration reference; identity/technical recognisability must survive any approved derivative. |
| `assets/guitar.webp` | **146,330**, 1536×1024 WebP | Hero is already materially smaller than the shared PNG logo; “compress the hero first” is not justified by source bytes alone. |

These are first-party static assets, distinct from Supabase catalogue egress. No page weight, LCP, INP, CLS, cache-hit rate or guaranteed saving is inferred. Product snapshots contain four generated-image URLs whose bytes are not in Git; a repository-only inventory cannot establish their deployed sizes or existence.

The external Google Fonts import adds a third-party dependency; no committed woff/woff2 was found. Historical screenshots omit that import and use fallbacks. Network font behaviour/fidelity remains untested. Script imports, module top-level awaits and layered CSS affect startup; source byte counts are not CPU/interaction timings.

## Existing NIGHTFALL solution and remaining approval

NIGHTFALL already implements verified source/image identities, deterministic immutable names, bounded demand loading, full-byte hash validation before display, leases/budgets, safe placeholders and durable archive/portable assembly in isolation. It is a **single-photograph** contract. It does not add catalogue search, basket photos or a general gallery.

Its fictional 500-product result (25.6 MB → 1.536 MB initial viewport image bodies, warm zero) is historical synthetic evidence, not billed production savings. Do not redesign that solution or propose full image-bearing fetches as a shortcut. RAV09 is an integration dependency requiring separately approved recovery/compatibility, real asset inventory/capture, publisher/archive permissions, hosting behaviour, complete payload/rollback and activation. None can proceed while DAWNBREAKER Phase A is ON HOLD under this audit authority.

## Recommendations by boundary

1. **Source-only frontend package:** visible startup failure states, retain recoverable basket intent, truthful ordering copy and stable checkout focus. Preserve request budgets, private boundaries and stock/server authority; do not introduce extra full catalogue reads.
2. **Static presentation package after approval:** optimise actually used logo/artwork variants, reserve image space, validate reduced motion/fallback fonts and measure on five widths. Retain original bytes and visual/technical identity; no generic image generation or new CDN dependency is required.
3. **Later production integration:** use NIGHTFALL's existing approach after its gates, and separately design any snapshot/publication-only route with complete provenance. The historical successful Pages payload is not currently recovered. Backend recovery alone is not publication proof.

DAWNBREAKER Phase A remains ON HOLD, provider recovery UNKNOWN and public catalogue UNTESTED. Current billed usage and background scheduled/visitor traffic remain unknown; no monthly extrapolation or commercial hosting decision is made.

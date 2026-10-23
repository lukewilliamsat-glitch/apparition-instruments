# RAVEN — BLACKWING storefront audit

Authorisation 44 · 23 October 2026 · **PARTIAL: source audit and roadmap complete; fresh browser journeys NOT TESTED.** No implementation or release is approved by this report.

Baseline: production main `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`, tree `eb2c9f1824602d19ed27f010cf080190a06c713e`. New audit branch: `engineering/raven-blackwing-audit`, based directly on that checkpoint. All 899 inherited files must remain byte-identical. Only this documentation directory is added.

The storefront already has a coherent graphite/cream/brass identity, specification-led product presentation, category routes, a configurable Les Paul harness, saved basket, secure-checkout handoff and extensive technical education. A generic dashboard/luxury-template redesign would discard useful work. The priority is to make purchasing states and product information as dependable as the engineering tools.

## Main findings

1. **Failure handling can be bypassed at module import.** A rejected initial catalogue load prevents several downstream page bodies/error handlers from running. Empty basket/checkout containers or unresolved snapshot states are possible. This is source-proven control flow, not a newly executed live outage test.
2. **The FAQ contradicts the purchase interface.** It says online checkout/payment are not enabled while catalogue, basket and checkout source describe secure purchasing. Current service availability is separately unknown.
3. **Unavailable basket items are silently filtered.** A saved component absent from the current catalogue disappears from `readBasket()`; a subsequent ordinary save can persist that omission.
4. **Product content is structurally ready but thin in committed snapshots.** Eight of nine have generic descriptions; none has the optional physical, installation, contents or QC sections. Useful electrical specifications and qualified fitment guidance already exist. Live catalogue content was not queried.
5. **The known wide hero defect remains an existing release dependency.** SPECTRE/HOMECOMING already fixed and tested it in isolation: **EXISTING FIX — RELEASE BLOCKED**. No rewrite or deployment is proposed here.

Other actionable findings include checkout rerender/focus risk, ambiguous contact submission state, an indirect delivery-help link, a 2,201,238-byte shared logo source, known enlarged-text header overflow, and remaining NIGHTFALL integration gates. Preferences such as search, galleries and typography maintenance are ranked separately from correctness.

## Evidence and limits

The current workspace has no Chrome executable in the checked runtime locations and cannot create the inherited network namespace (`unshare: Operation not permitted`). No application fixture was opened, no harness protection was weakened and no CI was triggered. Fresh 390/768/1024/1440/1920 customer journeys, 200% text, focus and reduced-motion checks remain **NOT TESTED**. Existing source-only/DOM tests were inspected, not represented as fresh Chrome passes.

Genuine historical SPECTRE captures at 390 and 768 were retrieved from GitHub, checked against their committed SHA-256 manifest and visually reviewed. Their fallback-font homepage scope is explicit; they do not cover shopping journeys. Wider hero measurements and keyboard checks are inherited historical evidence. No screenshot or asset bytes are newly committed here.

Read [ROADMAP.md](ROADMAP.md) for ranked work and acceptance criteria, [EVIDENCE_INDEX.md](EVIDENCE_INDEX.md) for source identities/limitations, and [FINDINGS.json](FINDINGS.json) for machine-readable evidence levels. [ARCHITECTURE.md](ARCHITECTURE.md), [CUSTOMER_JOURNEYS.md](CUSTOMER_JOURNEYS.md), [DESIGN_AUDIT.md](DESIGN_AUDIT.md), [RESPONSIVE_ACCESSIBILITY.md](RESPONSIVE_ACCESSIBILITY.md) and [EGRESS_PERFORMANCE.md](EGRESS_PERFORMANCE.md) develop distinct parts of the assessment.

Recommended first separately authorised package: **honest purchasing-state feedback** (RAV01/RAV02), using synthetic failures and the existing isolated harness when available. Saved-basket recovery follows as a distinct semantics-sensitive change. No automatic implementation follows this audit.

DAWNBREAKER Phase A stays **ON HOLD**; provider recovery **UNKNOWN**; public catalogue **UNTESTED**. Main, existing branches/workflows, Supabase, Stripe, storefront, product data and deployment remain untouched. NOCTURNE's approved Admin visual direction informs consistency only; it is not a storefront styling instruction.

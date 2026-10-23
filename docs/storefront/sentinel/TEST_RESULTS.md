# Executed acceptance

Successful hosted CI: [39988495190](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39988495190), source `0f4b82d6f618ecc7e661c3b3ff13ca1b58b66ca4`, tree `95ffc5e561d5dd1429618f9c8cb940778e5fe56b`. Node v22.20.0; Chrome 155.0.8059.39; happy-dom 20.14.5; playwright-core 1.56.1. All following results are newly executed on SENTINEL, not borrowed historical passes.

| Layer | Executed result |
|---|---|
| Pre-fixture isolation | PASS; ten inherited process/browser negative controls, zero application fixtures before PASS; sandboxed Chrome, loopback-only namespace, child isolation. |
| LANTERN offline | PASS; all six suites, including 83 original startup checks unchanged. Checkout, Operations, caching and product-content regression coverage preserved. |
| Inherited DOM | PASS; native components success/empty plus p10c-storefront-truth, p10d-product-detail, premium-storefront-v1, holiday-checkout-basket, p09a-contact, p07b4-contact. |
| SENTINEL Node/DOM | PASS; basket 20, checkout 8, contact 10 checks, plus unchanged kit-snapshot and p11ef-product-commerce suites. |
| LIGHTHOUSE native Chrome | PASS; all 33 cases, including failure/deadline handling, safe recovery, responsive accessibility-oriented checks, FAQ/Operations and fictional purchase preparation. |
| SENTINEL native Chrome | RAV03 PASS (7 candidate cases); RAV15 PASS (7); RAV06 PASS (14); all three original defects reproduced separately. |
| Source integrity | PASS before and after; exact reports equal; 918 of 922 inherited files unchanged, four approved frontend files changed. Existing backend, content and workflows unchanged. |
| Artifact read-back | PASS; 38 original PNGs verified against retained manifests, ZIP bytes/digest match GitHub metadata. |

RAV03 covers schema/identity/quantity bounds, unknown checkout rejection, no stale price/stock claims, malicious storage, escaping, normal additions/edits, mixed kit snapshots, reload and deliberate removal. RAV15 covers stable idle focus, pending duplicate events, Operations pause/open, definite response/manual retry with the same ID, queued basket changes/error retention, amount mismatch, validated fictional navigation sink, late closed-state handoff rejection, uncertainty and cancellation. RAV06 covers validation, sent, failed, invalid, rate, timeout, lost response, malformed JSON, ambiguous arrival, duplicate events and typed progress.

The separate local Node 22 run also passed six offline and five targeted/commerce suites under socket-denying seccomp. It is supporting evidence; hosted Chrome is the basis for focus/interaction claims. Node tests substitute fictional fetch/navigation callbacks and never contact Stripe.

Earlier runs remain historical diagnostics: 39982971323 used an incorrect one-wire-request assumption; 39988007497 passed RAV03/RAV15 but its RAV06 selectors were ambiguous. Neither is accepted as complete SENTINEL evidence. Correcting submit selectors did not alter application source or weaken assertions. Chromium reset replay was observed with one application fetch and seven same-ID transport attempts; existing idempotency remains necessary.

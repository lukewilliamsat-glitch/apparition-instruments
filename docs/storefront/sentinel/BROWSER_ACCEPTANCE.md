# Genuine Chrome acceptance

Chrome 155.0.8059.39 on the isolated hosted Linux runner; source/run and originals are indexed in EVIDENCE_INDEX.md. Real HTML, native module graph, real renderers/controllers and fictional loopback backend responses were exercised. Baseline contexts serve exact original frontend modules from LIGHTHOUSE; candidate contexts serve the checked-out SENTINEL modules. No real contact delivery or payment session is created.

| Width | RAV03 intent/edit/reload/remove | RAV15 keyboard/status/pending/retry | RAV06 pending typing/uncertain label |
|---:|---|---|---|
| 390 | PASS | PASS | PASS |
| 768 | PASS | PASS | PASS |
| 1024 | PASS | PASS | PASS |
| 1440 | PASS | PASS | PASS |
| 1920 | PASS | PASS | PASS |

RAV03 retained missing quantity 3 while a known quantity changed to 2, survived a real reload, blocked checkout with zero create requests, and removed the missing intent only on explicit action. Mixed kit/component snapshots survived unchanged. Malicious storage did not create DOM markup or execute script. Unknown states do not trigger additional catalogue fetches.

RAV15 native Tab and Enter reached/activated the existing checkout button. Unchanged status retained the same form and focused element. Pending duplicate events made no second application request; pause kept the original form disabled; reopening did not auto-submit. A deliberate retry after definite rejection used the same request identity. Ambiguous reset stayed disabled with aria-busy false and Checkout outcome unconfirmed, including after repeated status/submit events. Cancellation retained the saved basket. The actual page has no inline customer details form; no invented payment-form text-entry claim is made.

RAV06 confirmed success hid the form and focused its existing success panel. Definitive failure/validation/rate restored the action. Uncertain timeout/lost/malformed/ambiguous cases retained message text and the duplicate guard, with aria-busy false and Delivery not confirmed. Five-width pending keyboard journeys retained new textarea progress and focus after settlement; the settled action remained horizontally reachable. The timeout case uses native browser route failure ERR_TIMED_OUT rather than claiming a real production-duration timeout.

All 33 LIGHTHOUSE browser regressions also passed on this source: failure/loading distinctions, native focus recovery, alert exposure, menu Escape/help/contact navigation, local basket preservation, explicit reload/cache behaviour, long text, reduced-motion preference, doubled computed text and CDP 200% visual scale. Their known limitation remains 2px document overflow at enlarged 390px; other tested widths had zero. CDP visual scale is not desktop browser-chrome zoom.

Zero attempted external requests, page errors or fixture routing errors in both browser reports. Manual inspection of actual PNGs confirmed readable unavailable-item context, incomplete-total messaging, checkout focus outline and the settled contact label. Role/label/native focus checks do not establish spoken screen-reader announcements, physical-device usability or comprehensive WCAG compliance. Owner design/interaction approval is still outstanding.

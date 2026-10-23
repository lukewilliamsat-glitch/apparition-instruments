# Accessibility-oriented and owner presentation review

Scope: isolated desktop Chrome and fictional data. Native keyboard interaction, accessibility-tree semantics and geometry support the findings; no spoken screen-reader, physical-device or full WCAG certification is claimed.

At 390, 768, 1024, 1440 and 1920px, recovery controls are reachable by native Tab order and natural scrolling. Reload receives the existing solid 2px focus outline; Ordering help follows it. When initial content owned focus before replacement, focus moves to the recovery heading. Normal header focus is not stolen by the boundary. At mobile width, Menu opens, Escape closes it/restores focus, and keyboard navigation reaches the real FAQ disclosure and Contact form.

Failure has an exposed native accessibility-tree `alert`. Pending loading is a separate visible `status` while the original main is hidden/busy. Reduced motion is requested and verified with the browser's media query. Existing labels/structure are also exercised by inherited DOM suites. Actual announcement timing/pronunciation still needs assistive-technology review.

Two distinct scaling checks are recorded: every rendered element's computed font size is doubled before reachability checks at all five widths; CDP visual page scale is separately verified at 2 on checkout. Neither is falsely described as desktop browser-chrome layout zoom. The 390px text test records 2px document overflow; other required widths record zero. Main recovery actions remain reachable. A long fictional product name/SKU/description at 390px records zero document overflow. Broader RAV08/header and physical-device review remains separate.

## Evidence-grounded owner questions

| Topic | Observation / remaining decision |
| --- | --- |
| Startup wording | The route is explicitly unavailable and the text distinguishes retained intent from an order/reservation. No exception details leak. The repeated explanation occupies substantial space at enlarged text; concision is an owner choice, not silently changed here. |
| Pending presentation | The real pending capture shows one status line and the footer moving up when main content is hidden. It prevents unverified purchase controls but is visibly abrupt. Owner presentation acceptance remains open. |
| Deadline | At 15 seconds, unavailable UI settles; a response at 18 seconds does not restore purchasing controls. This is a UI deadline, not request cancellation. |
| Recovery controls | Primary Reload and secondary help/contact links fit at normal mobile size and wrap into reachable actions at doubled text. An explicit reload causes one new catalogue request; none occurs automatically. |
| Ordering guidance | Opening the native FAQ Orders disclosure reveals the conditional handoff/payment-confirmation wording; fictional basket → checkout preparation works without creating a session. No current production availability is inferred. |

No LANTERN copy, layout or CSS was changed in LIGHTHOUSE. Owner sign-off is still required. Full-page captures preserve Chrome's rendering and focus/scroll state; fixed elements can appear at their capture scroll position.

## Additional existing issue, outside this correction

The native add-to-basket handler writes its acknowledgement into the first `.product-feedback`, which is the injected availability paragraph hidden while OPEN. The basket saves correctly and the visible basket review confirms the item, but the acknowledgement is not visible. This pre-existing issue was observed in Chrome and left unchanged because it is outside RAV01/RAV02. It is not hidden behind a claim that all storefront accessibility/status messaging is accepted.

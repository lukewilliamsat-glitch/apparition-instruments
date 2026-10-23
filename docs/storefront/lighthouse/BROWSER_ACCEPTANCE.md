# Genuine Chrome acceptance

**PASS — isolated RAV01/RAV02 only.** Tested source `932f714b263775215ac091fbef362ad8b5bbc8b5`, tree `fcbcdf9e76f42c81e5c2b10cbb4a1169c27efd4c`; [CI 39981284222](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39981284222). Node 22.20.0 / Chrome 155.0.8059.39. All 33 cases pass with zero unhandled page errors, external application attempts or fixture routing errors.

Native ESM/HTML/controller/renderer execution covers catalogue success and empty; 401/402/500; malformed JSON/non-array response; unexpected renderer initialisation rejection; native product/basket/checkout catalogue and kit-definition failures; delayed fulfilment after deadline; bounded timeout UI; stored basket preservation; no stale prices or purchase controls; explicit reload/help/contact navigation; current Operations authority; successful add → visible basket → prepared checkout without any payment/session POST; FAQ disclosure consistency and repeated refresh cache reuse.

The module graph and application functions are not replaced by a DOM double or stub renderer. Only the documented fictional data/configuration and external-font omission differ from the source. The product's independent marketplace handoff retains its scoped identifier after recovery. No actual external listing is opened.

| Viewport | Status/AX alert and actions | Reload focus outline | Doubled-text reachability | Doubled-text document overflow |
| --- | --- | --- | --- | --- |
| 390px | PASS | solid 2px | PASS | 2px |
| 768px | PASS | solid 2px | PASS | 0px |
| 1024px | PASS | solid 2px | PASS | 0px |
| 1440px | PASS | solid 2px | PASS | 0px |
| 1920px | PASS | solid 2px | PASS | 0px |

At each width, two repeated actual catalogue refreshes add zero transport reads. One explicit reload adds exactly one read. Mobile keyboard navigation opens the FAQ Orders disclosure and reaches the real Contact form; Menu/Escape restores focus. Focus restoration after replaced main content passes. Reduced-motion media preference is verified in every opened context. Long product text at 390px fits without document overflow.

The actual UI deadline is 15,000ms; the late fixture resolves at 18,000ms. Recovery remains unavailable after late settlement. The loading status is visible while original main content is hidden. This does not claim request cancellation. Accessibility-tree alert semantics are verified; spoken announcements, physical devices and full WCAG certification are not claimed. Doubled computed text and CDP visual scale 2 are distinct from desktop browser-chrome layout zoom.

Sixteen original PNGs are retained and independently verified; see EVIDENCE_INDEX.md and ACCEPTANCE.json for complete filenames, source/browser identities, dimensions, byte lengths and SHA-256. Owner presentation approval remains open. Existing minor/header and hidden acknowledgement limitations are described in ACCESSIBILITY_REVIEW.md.

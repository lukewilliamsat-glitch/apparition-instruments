# COMMAND 01 isolated browser acceptance
**PASS for the synthetic read-only candidate.** This is not live Admin acceptance or production certification.

## Exact execution
- Tested source: `5f82f7403e188605895cf53427c03d8b157681cd`; tree `c3699c2b1ff75235e7f19f4673296a3bcde4daf5`.
- [GitHub Actions run 39618086032](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39618086032), job `119284092684`: success.
- Node.js **22.20.0**, hosted Google Chrome **155.0.8059.39**, Ubuntu 24.04 runner image `20261012.334.1`.
- Pinned disposable controller: `playwright-core@1.56.1`, installed with scripts/browser downloads disabled. npm integrity metadata was compared to `sha512-hutraynyn31F+Bifme+Ps9Vq59hKuUCz7H1kDOcBs+2oGguKkWTU50bBWrtz34OUWmIwpBTWDxaRPXrIXkgvmQ==`.
- Chrome is supplied by the GitHub-hosted runner image. No independent browser archive checksum/signature was verified; hosted-image provenance is not a claim of independent binary verification.
- Artifact `12353302276`, 914,122 bytes, SHA-256 `d03032a44d4b0b94c877d915e2da638950385f66b74161cf2c60c21ce4fae0a7`. Download hash and ZIP CRC/path integrity verified. Artifact expiry: 20 November 2026; JSON evidence and original screenshot bytes are committed here, so review does not depend on artifact retention.

## Isolation before application loading
Reused the established SPECTRE35 namespace proof from commit `4f09bd5b4d5109df6028a8dc0d00468512d9af1c`, adapted only for this candidate and its test entry points.

A separate Linux network/mount/PID namespace exposes loopback only and no external routes. Application/test processes run as the unprivileged runner with an empty environment, disposable HOME/profile and zero effective capabilities. The Python child inherits the same network namespace. Direct IPv4 and IPv6 socket probes to documentation addresses fail. Chrome uses its sandbox, a disposable context, blocked service workers and disabled extensions/background networking.

**Before opening any COMMAND page**, ten browser negative controls demonstrate blocked external IPv4, IPv6, DNS, redirects, images, scripts, frames, workers, WebSocket and top-level navigation. Only the harmless loopback probe is reachable. Application fixtures opened during this stage: **0**. No production endpoint is used as a probe.

The real application is then served from a dedicated loopback origin with an explicit file allowlist. All observed application requests/responses stay on that origin; no fetch/XHR/image/WebSocket request is issued. Synthetic list/detail operations are in-memory transport calls. CSP retains `default-src 'none'`, self-only scripts/styles, and denies image, connection, frame and worker loading. No production credentials or browser sessions are present. This is process-level isolation, not request interception alone.

## Final results
- **42/42** focused Node tests under Node 22.
- **32/32** actual Chrome test groups; no page errors or console errors.
- Search, five composable filters, technical/literal search, clear/chips, stable filtered-out selection, explicit detail loading, GBP/kit pricing, all five image states, optional metadata and legitimate empty data pass.
- Reversed summary/detail responses, superseded errors, coalesced refresh, retained rows after refresh failure, explicit retry, changed/deleted records and delayed focus handling pass.
- Keyboard selection/Enter/Escape, focus restoration, search text selection during refresh, teardown, remount without duplicate handlers and missing-transport fail-closed handling pass.
- Product-supplied HTML displays as text. Arbitrary image references do not create DOM images or requests. No editing, upload, save, publication or stock-write controls exist.

| Viewport | Document width | Inspector width | Geometry / long-name wrapping / close-control clearance |
|---|---|---|---|
| 390px | 390px | 358px | PASS |
| 768px | 768px | 724px | PASS |
| 1024px | 1024px | 330px | PASS |
| 1440px | 1440px | 350px | PASS |
| 1920px | 1920px | 390px | PASS |

The text stress test doubles every element's measured font size through a **self-origin test stylesheet**, without changing the application's CSP. It verifies document width, enlarged search control height, icon containment and uncut column headings. This is text enlargement, not browser-native zoom emulation.

Reduced motion is emulated and computed transition duration/scroll behaviour are checked. Semantic labels, table headings, status/alert regions, visible keyboard outlines and text stock/eligibility labels are present.

Selected normal-state palette pairs were also calculated offline: body 15.54:1, muted sidebar 7.34:1, table header 8.34:1, search placeholder 7.71:1, low-stock text 10.89:1, out-of-stock text 9.37:1, error copy 9.16:1, focus outline 8.76:1. This is not an audit of every control boundary, disabled state or visual combination.

## Corrections and honest limits
Code review corrected inherited nowrap/margins on product buttons, mobile inspector scroll clearance, and repeated/delayed inspector focus stealing from search. The visual stress test identified a fixed-height search field and column-heading clipping; these now scale/wrap correctly. Regression assertions are included.

Early CI failures included a test attempting CSP-prohibited inline CSS and the resulting console-error assertion. The harness now serves its text-scale stylesheet on the permitted origin; security policy was not weakened. Viewport captures replaced full-page captures to avoid fixed/sticky compositing artefacts in evidence. Full CI history is in TEST_RESULTS.json.

No automated accessibility library, screen reader, touch device, Safari/Firefox or authenticated production account was used. No comprehensive WCAG compliance, real Supabase egress saving or backend authorisation result is claimed. In the doubled-font stress image, the decorative monogram glyph extends beyond its fixed border; it obscures no control or content and remains a non-blocking visual refinement for owner review. Business controls and data remain usable.

## Genuine Chrome captures
All nine PNGs are unmodified viewport screenshots of the actual prototype, not a separate demonstration page. Checksums are retained in TEST_RESULTS.json.

- [Desktop overview](SCREENSHOTS/desktop-overview.png)
- [Desktop inspector](SCREENSHOTS/desktop-inspector.png)
- [Active filters](SCREENSHOTS/desktop-active-filters.png)
- [No results](SCREENSHOTS/desktop-empty.png)
- [Error and retry](SCREENSHOTS/desktop-error-retry.png)
- [Mobile catalogue](SCREENSHOTS/mobile-catalogue.png)
- [Mobile inspector](SCREENSHOTS/mobile-inspector.png)
- [Tablet inspector](SCREENSHOTS/tablet-inspector.png)
- [Doubled text](SCREENSHOTS/increased-text.png)

Owner review is interface acceptance only. Any real Admin integration, production reads, image handling or deployment needs the separate gates in RELEASE_GATES.md.

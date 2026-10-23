# NOCTURNE real-Chrome acceptance

**PASS within isolated automated scope. Owner design approval remains open.**

Tested source `1bbe60fd216a412eed7349c8d79acdd50a94931e`, tree `7a0ff98a10165b113e09cf9341d1fbe02d8f8bd1`. [CI 39930046308](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39930046308), job `120335780760`, attempt 1: success. Runtime v22.20.0, real hosted Chrome 155.0.8059.39, pinned playwright-core 1.56.1 with the inherited integrity check. Hosted browser provenance is recorded; no independent binary signature verification is claimed.

## Functional and visual results

Unchanged COMMAND 01–04: **219/219 Node tests and 119/119 Chrome groups**. New NOCTURNE acceptance: **47/47 groups**. Combined Chrome: **166/166**. All **10/10 pre-application isolation controls** pass before any fixture page opens. Browser/test processes are unprivileged, sandboxed and use a clean synthetic environment, disposable profile and loopback-only kernel namespace. The child process inherits the namespace. External IPv4/IPv6 routes, DNS, redirects, image/script/worker/frame/WebSocket and navigation probes are denied.

Actual application resources use one explicit loopback allowlist. No application fetch/XHR, image, font, WebSocket, external response, console error, page error or production-service request is observed. No real credentials, SQL, live authentication or business records are used. Source equality passes before and after execution for all 993 inherited blobs. The 61/61 PostgreSQL result belongs to original IRONCLAD CI; no SQL was rerun here.

Fourteen baseline and fourteen candidate captures cover catalogue, selection, desktop/tablet/phone editing, dirty draft, review, validation, confirmed save, conflict, denied write, expired session, unknown save and authentication required. Six additional candidate captures cover 1024/1920 editing, 390/1024 doubled text, phone review and phone conflict. These are original viewport PNGs from the actual application, not mockups. Recorded scroll positions are preserved in TEST_RESULTS.json.

## Artifact and independent readback

[Original before/after evidence — artifact 12490998340](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39930046308/artifacts/12490998340). Requested retention 30 days; actual expiry **2026-11-22T09:14:00Z**. Archive **4,402,591 bytes**, SHA-256 `8a185092679e46110f066ef09e656ac44ef7214117b45e42f6bcbab3abde3fe7`. Downloaded after upload through the supported GitHub integration and checked independently.

Verification passes GitHub digest/byte equality, ZIP CRCs, safe unique paths, no encryption/symlinks, an exact **54-file allowlist**, all 34 PNG signatures/full decodes/dimensions/byte lengths/hashes, source/run/browser binding, matching before/after source reports and all suite/isolation results. No runner profiles, raw databases, seed files, credentials or unexpected payloads are retained. PNG bytes were not edited or recompressed after capture. Original runtime/capture reports remain in the archive; the durable Git JSON retains source and screenshot fingerprints after expiry.

Authorisation 41 permits Actions-artifact retention only. No NOCTURNE screenshot, encoded image or ZIP is published in Git. Temporary retention is not permanent or owner-private storage.

## Capture inventory

All originals are in artifact `SCREENSHOTS/`. TEST_RESULTS.json records each SHA-256, byte length, dimensions, browser, baseline/candidate source, execution commit and scroll position. The artifact metadata above supplies expiry.

| Original filename | Dimensions | PNG bytes |
| --- | --- | ---: |
| before-01-catalogue.png | 1440 × 1100 | 130,600 |
| before-02-selected.png | 1440 × 1100 | 186,931 |
| before-03-desktop-editor.png | 1440 × 1100 | 176,966 |
| before-04-tablet-editor.png | 768 × 1100 | 73,908 |
| before-05-mobile-editor.png | 390 × 1100 | 60,241 |
| before-06-dirty-draft.png | 1440 × 1100 | 176,455 |
| before-07-change-review.png | 1440 × 1100 | 140,090 |
| before-08-validation.png | 1440 × 1100 | 177,527 |
| before-09-saved.png | 1440 × 1100 | 179,171 |
| before-10-conflict.png | 1440 × 1100 | 191,900 |
| before-11-permission-denied.png | 1440 × 1100 | 141,560 |
| before-12-session-expired.png | 1440 × 1100 | 26,844 |
| before-13-uncertain.png | 1440 × 1100 | 178,060 |
| before-14-auth-required.png | 1440 × 1100 | 27,727 |
| after-01-catalogue.png | 1440 × 1100 | 144,881 |
| after-02-selected.png | 1440 × 1100 | 194,671 |
| after-03-desktop-editor.png | 1440 × 1100 | 186,451 |
| after-04-tablet-editor.png | 768 × 1100 | 86,896 |
| after-05-mobile-editor.png | 390 × 1100 | 73,569 |
| after-06-dirty-draft.png | 1440 × 1100 | 180,722 |
| after-07-change-review.png | 1440 × 1100 | 142,030 |
| after-08-validation.png | 1440 × 1100 | 185,652 |
| after-09-saved.png | 1440 × 1100 | 186,618 |
| after-10-conflict.png | 1440 × 1100 | 170,865 |
| after-11-permission-denied.png | 1440 × 1100 | 143,349 |
| after-12-session-expired.png | 1440 × 1100 | 42,725 |
| after-13-uncertain.png | 1440 × 1100 | 193,126 |
| after-14-auth-required.png | 1440 × 1100 | 42,844 |
| after-15-editor-1024.png | 1024 × 1100 | 106,449 |
| after-16-editor-1920.png | 1920 × 1100 | 208,927 |
| after-17-text-200-390.png | 390 × 1100 | 58,817 |
| after-18-text-200-1024.png | 1024 × 1100 | 110,767 |
| after-19-mobile-review.png | 390 × 1100 | 59,661 |
| after-20-mobile-conflict.png | 390 × 1100 | 60,539 |

## Owner review

Compare the `before-` and `after-` pairs. Review charcoal/brass balance, supporting-text size, desktop density, phone section selection and action tray, and comparison/status language. Functional checks do not approve visual preference. Screen readers, native browser zoom, other browsers, physical touch devices and on-screen-keyboard behaviour remain outside this acceptance.

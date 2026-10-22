# COMMAND 03 — Operation Afterimage visual evidence recovery

Authorisation 39A · 22 October 2026 · **PASS**

## Reason and scope

The original COMMAND 03 acceptance captured eight genuine Chrome screenshots but excluded their PNG bytes from its text-only artifact. The old manifest recorded fingerprints; it did not retain the images. This pass freshly recaptured the same scenarios against the unchanged frozen application. These are new captures, not reconstructed originals. Seven hashes happen to match the historical manifest; `write-denied.png` differs. No application change was made to reproduce historical hashes.

The owner authorised the existing Actions artifact mechanism for temporary retention, not public Git screenshot publication. No PNG, encoded image, browser profile or recovery archive was added to Git.

## Source and execution identity

| Item | Verified identity |
| --- | --- |
| Branch | `engineering/command03-the-bridge` |
| Preserved handover | `a43b9525fa080e6d1905cf298d922684746a6c4e` / tree `b43d8e7d1297c1c4aa6da0c0400b12cf8dd07a8e` |
| Frozen tested application | `53c4063cccc6be097bc53a0c04f1c9ef2c75bf7c` / tree `c3124dac437bb9e72e7a2d7632b1cc6f2f452b1e` |
| Evidence execution commit | `598b8d230514034f3a5a02784da229f22cea1111` / tree `77e70fb988309e9bb41c5d536f45dc1fdcf011d5` |
| Browser | Google Chrome `155.0.8059.39` (preinstalled hosted-runner executable) |
| Runtime | Node.js `v22.20.0` |
| Controller | Pinned `playwright-core@1.56.1`, existing verified npm integrity value |
| CI | [Run 39770441983](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39770441983), attempt 1, successful job `119796321985` |

`SOURCE_IDENTITY.json` in the retrieved artifact verifies the original commit/tree and all eight COMMAND 03 application blobs against the frozen source. It also verifies all **974 original blobs other than the two authorised workflow/harness changes** byte-for-byte against the handover. This includes production files, COMMAND 01/02 code and earlier published screenshots. The execution commit identifies the changed evidence tooling; it is not substituted for the frozen application identity.

Only these evidence files changed before execution:

- `.github/workflows/command03-acceptance.yml`: shallow history needed for source verification; fail-closed source gate; exact eight-file PNG upload allowlist; 30-day retention; upload errors if no files found.
- `tests/command03/browser.mjs`: capture output location, truthful retention metadata, source proof binding, scenario labels and exact eight-capture completion assertion.

All original browser test bodies, fixture states, capture viewport sizes and screenshot options remain byte-identical. `tests/command03/run-browser.sh`, logic tests and application files remain unchanged. This report is the only subsequent documentation addition; its path does not trigger the acceptance workflow.

## Artifact retention and independent readback

| Item | Verified result |
| --- | --- |
| New artifact | `command03-afterimage-evidence` — ID `12422172177` |
| Owner review URL | [Open retained evidence](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39770441983/artifacts/12422172177) |
| Created | `2026-10-22T11:26:59Z` |
| Actual expiry | `2026-11-21T11:26:58Z` (30 days requested) |
| Expired at verification | `false` |
| Archive bytes | `817061` |
| Archive SHA-256 | `1762971e40e69b6cc25c7cb12ac91ee87c4b40a6a7e61cfccb1f71edb46c0579` |
| Content | 23 files: exactly eight original PNGs and 15 allowlisted JSON/text reports |
| Previous text-only artifact | `12420970795`, run `39766989517`; retained diagnostics but no PNGs |

The new artifact was located through GitHub's artifact API, downloaded through the supported artifact integration and read independently after upload. Its complete ZIP SHA-256 matches GitHub's recorded digest. ZIP CRCs, unique/safe paths, exact file allowlist, absence of encrypted/symlink entries, all PNG signatures, full image decoding, dimensions, byte lengths and individual hashes passed. No unexpected files, real credentials, customer payloads, private browser profiles or sensitive configuration were found. The image bytes were not modified or recompressed after capture.

The archive contains `SOURCE_IDENTITY.json`, `SCREENSHOT_CAPTURE_MANIFEST.json`, `BROWSER_RESULTS.json`, `NODE_RESULTS.json`, Stage A isolation results, COMMAND 01/02 regression reports, namespace proof and runtime/controller information. The capture manifest correctly records upload/readback as pending at capture time; this report records the completed independent verification.

This is temporary Actions retention, not permanent storage or an owner-private destination. A longer-lived/restricted image destination would require separate approval. The Git text report remains recoverable after artifact expiry; it cannot recreate lost PNG bytes.

## Fresh capture manifest

| Filename | Dimensions | PNG bytes | SHA-256 | Scenario |
| --- | --- | ---: | --- | --- |
| `unauthenticated.png` | 1440 × 1100 | 27647 | `5e5495e2970c77cce1bd7e55fa79f72061ef1abfcb50266c4cab054570f34bd9` | Locked startup before synthetic session installation |
| `authorised-editor.png` | 1440 × 1100 | 177038 | `93a6b84cbd5b33f0ded720b8cc421248f4ca171142c943415cfc1c55bc021e38` | Authorised authoritative product editor, general tab |
| `write-denied.png` | 1440 × 1100 | 155630 | `bb24f740594dc1b36e847d628c55bd7e383358e90161669ef2d5dc03a52fada0` | Write permission revoked after review; retained draft and disabled save |
| `expired-draft-retained.png` | 1440 × 1100 | 26759 | `55935965a70d58a73b6fa7dfa90ac674ae86a3a8e00b128d13726695922044fc` | Expired synthetic session conceals protected data and retains dirty draft |
| `version-conflict.png` | 1440 × 1100 | 179251 | `688059affb44c818ae24577fbefcd32fb94f9c2825799e21854da72dc43e0a0c` | Original/local/current-authority conflict review |
| `uncertain-save.png` | 1440 × 1100 | 158343 | `d02867c53d8d6b6fbf4062dcf23d4abfea98fcbcf386ce670cbb8a252f2f18b0` | Committed synthetic save with unknown response, pending reconciliation |
| `mobile-editor.png` | 390 × 1100 | 56792 | `9be734bf45455b66718feaca074b2f6f095f7a8a9bfa1f3b411002e0626c23f4` | 390px general editor with retained responsive draft |
| `tablet-editor.png` | 768 × 1100 | 70062 | `f191c0f3e235e52ad5428626ba7aa54bbb2ee82821a441ac028aa31a6d2a8ec7` | 768px general editor with retained responsive draft |

All eight retrieved originals were visually inspected. The locked and expired views conceal the protected workspace; the authorised editor is genuine; denied write, conflict and unknown-save messages match the fixture state; the 390px and 768px editor captures retain their original viewport/scroll semantics. These are viewport captures, not full-page illustrations. Draft retention and disabled actions are additionally established by browser assertions, not inferred from a still image.

## Acceptance and isolation

| Suite | Node.js | Real Chrome groups |
| --- | ---: | ---: |
| COMMAND 01 | 42/42 | 32/32 |
| COMMAND 02 | 54/54 | 39/39 |
| COMMAND 03 | 59/59 | 35/35 |
| Total | **155/155** | **106/106** |

All ten pre-application negative controls passed before opening any candidate: IPv4, IPv6, DNS, redirect escape, image, script, worker, WebSocket, frame and navigation. The fresh kernel network namespace exposed only loopback and no external routes. Direct TEST-NET IPv4/IPv6 process probes failed with `ENETUNREACH`; a child inherited the same namespace. Browser and tests ran unprivileged with a clean synthetic environment, disposable profile, sandbox, disabled extensions/background networking, blocked service workers and a single allowlisted loopback fixture origin. Existing isolation code was not loosened.

The COMMAND 03 browser recorded 771 local static resource requests, zero fetch/XHR/image/WebSocket API requests, zero production requests, zero console errors and zero page errors. COMMAND 01/02 also passed their existing network assertions. Responsive, text-scale, reduced-motion and 14/100/500-product fixture cases passed. No live authentication, backend persistence, real customer data or comprehensive assistive-technology acceptance is claimed.

## Production non-interference and review gate

Production `main` remains `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`; its 899 blobs are unchanged. The COMMAND 01 and COMMAND 02 branch heads remain `3b84871ccb338296b52b4fe3fe350be17284d235` and `048824545c1fc3655778bc7cca22bc6f2e1bc447`. All pre-existing branch heads except the authorised COMMAND 03 evidence branch were unchanged at post-run verification.

Only the branch-scoped COMMAND 03 acceptance run was initiated. The production Pages workflow and other workflows were not modified or dispatched. Its `main` push trigger cannot match this engineering branch. No application deployment, public PNG Git publication, Supabase/Stripe access, customer email, transaction, database or production change occurred.

Owner review: open the artifact URL while signed into GitHub, inspect `SCREENSHOTS/` against the eight scenarios above, and review the desktop/mobile/tablet presentation plus denied/expired/conflict/uncertain-save messaging. Artifact expiry is **21 November 2026 at 11:26:58 UTC**. Visual preference/sign-off remains an owner decision. No COMMAND 04 or production integration is authorised by this result.

Related originals: [browser acceptance](BROWSER_ACCEPTANCE.md), [prior test results](TEST_RESULTS.json), [release gates](RELEASE_GATES.md). Their historical partial-retention status is preserved; this report closes only the fresh evidence-retention gate.

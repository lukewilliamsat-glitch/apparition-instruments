# COMMAND 02 browser acceptance

## Executed candidate and environment

[Successful final run](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39630582702), job `119327445240`, tested source `04bd1adfd8b6b1e21180b4f78622a404b9eb5701`, tree `b59e0039dae486477907fd541eb965d9df451564`.

Node **22.20.0**, real Chrome **155.0.8059.39**, GitHub-hosted Ubuntu 24.04 image `20261012.334.1`. Existing hosted Chrome was used; no independent binary checksum verification is claimed. Controller `playwright-core@1.56.1` was pinned and checked against its published package integrity:
`sha512-hutraynyn31F+Bifme+Ps9Vq59hKuUCz7H1kDOcBs+2oGguKkWTU50bBWrtz34OUWmIwpBTWDxaRPXrIXkgvmQ==`.

## Isolation before application execution

A Linux network namespace exposed only loopback and no external routes. Browser, fixture server, Node tests and inherited subprocesses ran inside it under an unprivileged account and clean environment, without production credentials. Direct TEST-NET IPv4/IPv6 socket probes failed with ENETUNREACH, and an inherited child reported the same namespace. Chrome used a disposable profile, enabled sandbox, disabled service workers/extensions/background networking and a single permitted fixture origin.

All ten harmless pre-application controls blocked: IPv4 HTTP, IPv6 HTTP, synthetic DNS, image, local-to-external redirect, WebSocket, script, worker, frame and navigation. The local fixture stayed accessible. Neither production endpoints nor customer payloads were used as probes. Request interception was an additional restriction, not the sole process-isolation claim.

The final application request logs contain only fixture-origin static resources. No application fetch/XHR, image transfer or WebSocket request occurred. Production requests: **0**. Browser console errors: **0**; unhandled page errors: **0**. Original request logs and process proof remain in the CI artifact; TEST_RESULTS.json retains control outcomes and compact origin/resource summaries.

## Results

**39/39 COMMAND 02 Chrome groups; 32/32 inherited COMMAND 01 Chrome groups.** The same job passed 54/54 new and 42/42 inherited Node cases. Full case names and results are preserved in TEST_RESULTS.json.

Coverage includes catalogue/search/filter context; selected authoritative editing; descriptive, price and spec edits; review/save/confirmed authority; semantic money comparison; required/precision/duplicate-SKU validation; immutable and stock/image/private boundaries; discard; dirty switching/filter/refresh/close/navigation/reload guards; failed-save retry; uncertain committed-save reconciliation; simultaneous submits/newer edits; concurrent conflicts/reload; reversed requests/stale errors; malformed responses; authoritative permission denial; stalled-write deadlines; equal-revision saves of different products; empty/failing catalogue; and responsive workloads.

Keyboard sections, labelled native forms, native review/dirty dialogs, Escape, focus restoration and retained caret/selection were exercised. This is basic functional accessibility acceptance, **not complete WCAG, screen-reader, assistive-technology or real-device certification**.

| Viewport width | Document width | Editor width |
|---:|---:|---:|
| 390 | 390 | 358 |
| 768 | 768 | 724 |
| 1024 | 1024 | 578.40625 |
| 1440 | 1440 | 655 |
| 1920 | 1920 | 915.40625 |

No unintended horizontal document overflow was observed. 200% text sizing and reduced-motion mode preserve critical controls. The inherited decorative monogram border at increased text size is not a functional release blocker; broader visual/accessibility review remains owner acceptance.

## Synthetic browser measurements

Single samples include an intentional 80 ms fixture transport delay; these are not production or statistically controlled timing/egress measurements.

| Fictional products | Catalogue refresh ms | Search plus frame ms | Editing extra reads | Editing catalogue row mutations |
|---:|---:|---:|---:|---:|
| 14 | 81.4 | 5.8 | 0 | 0 |
| 100 | 87.4 | 2.2 | 0 | 0 |
| 500 | 101.4 | 8.2 | 0 | 0 |

Each workload also exercises selection, edit/save, conflict and refresh. No measured production egress saving is claimed.

## Genuine captures — exact public-publication approval manifest

All ten PNGs depict the actual final interactive candidate, not a separate mockup. Captures are originals from the successful run; dimensions and SHA-256 values were independently checked. Visual review included editor, dirty/review/conflict flows, validation, uncertain outcome and mobile/tablet states.

**Capture status: 10 present in verified CI artifact; 0 committed to COMMAND 02 Git tree.** Intended destination is `docs/command/command02/SCREENSHOTS/<filename>`. This is a payload manifest, not a claim that those paths already exist.

| Filename | Bytes | Width × height | SHA-256 |
|---|---:|---|---|
| catalogue-selected.png | 151036 | 1440 × 1100 | `7e5295589f943b7859243e2b2131dc80ef896b63a30481c154c8fe80b677989a` |
| change-review.png | 136704 | 1440 × 1100 | `4f4dad321e513807deb9b5311004aa7c4af504a04de53efc3c4fe77ac2f34c6f` |
| conflict-resolution.png | 165235 | 1440 × 1100 | `d992a43580c522d0b6f2bd03d9ae8a2a6d0d8f985ec9bdbc23a6c724aec016c9` |
| desktop-editor.png | 176310 | 1440 × 1100 | `2d8941af6b70c95e1beebd21ab5c0b00312166e3b02b8c7303e0fb72790c8d63` |
| dirty-editor.png | 165697 | 1440 × 1100 | `12db79db562ab040e5093166a67ee9a2d4ca07486223e3b32259b94923718d38` |
| mobile-editor.png | 56988 | 390 × 1100 | `488d7dc35f7c4cc662844275afb5a0f76e849e3cc528968b9a3c6485ee7364aa` |
| save-outcome.png | 153987 | 1440 × 1100 | `c4239ad42f1e578f11291ae6f6d6060935f2d7cee156b63031d29579e233db06` |
| save-success.png | 160887 | 1440 × 1100 | `1c730c64af3bdece3748a04c785c24eafaa27035bd5cdb0568dea2644132335f` |
| tablet-editor.png | 71395 | 768 × 1100 | `e2df74644c599ea8bd0910cbb110a6f0442e7502f008d6dcfe8e3c6bcf3898cc` |
| validation-errors.png | 170420 | 1440 × 1100 | `4b0519ac3b2f319a0ecc037941bedd29d659536fa2c377d9527e79a737376d4b` |

[Original evidence artifact](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39630582702/artifacts/12359356215), ID `12359356215`, expires **20 November 2026**. ZIP size 2,260,908 bytes; SHA-256 `f54fcec558d89cddd6bf94c02580542da3ab91bd0e7177d7b6c290e636cae4ae`. Full download hash, ZIP CRC/path safety and report source identities were verified. Retained original Node/browser/isolation reports and screenshot-manifest.json accompany the captures. No routine owner download is required.

Automatic approval review rejected `validation-errors.png` creation twice. The second rejection, after exact approval/file checks, stated: “This would persist a large screenshot blob in a public GitHub repository for COMMAND 02, but the trusted user instructions shown do not authorize that specific publication or payload.” Uploads stopped. Two earlier unreferenced blob creations are not durable branch preservation and were not linked into a commit. No alternative API or payload encoding was used to bypass rejection.

Explicit owner confirmation of **these ten exact synthetic public PNG payloads** is required before another reviewed publication attempt. Functional browser acceptance passed, but the overall mission is PARTIAL while its required Git screenshot evidence remains incomplete.

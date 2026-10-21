# Browser acceptance

**Result: PASS within the stated isolated scope, with the limitations below.**

[Run 39583250290](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39583250290) tested source `232017a80fd6c5f2a3083d99cd9f647d8f4db27e` (tree `4592109bee7e5a3793a651cc05511eba762bf54d`), Chrome **155.0.8059.84**, Node **v22.20.0**, pinned disposable `playwright-core@1.56.1`. Hosted Ubuntu 24.04 Chrome was reused; no independent browser-archive checksum/signature is claimed. Controller integrity is recorded in the CI artifact; repository dependencies were not changed.

## Environment and outbound denial

Setup downloads the controller and checks out source before isolation. Application/browser execution then occurs in a fresh Linux network, mount and PID namespace, with loopback only, no external routes, a fresh HOME/profile, zero effective capabilities, Chromium sandbox enabled, extensions/background networking disabled and service workers blocked. The controller and fixture server share this namespace. No production credentials, sessions or customer records are used.

Before any application fixture opens, 10 browser negative controls pass (IPv4, IPv6, DNS, redirect, image, script, frame, worker, WebSocket, navigation). Direct Python IPv4/IPv6 process probes return ENETUNREACH (101), and a child inherits the isolated namespace. A local probe remains reachable. Browser interception is not the process isolation mechanism. The stage-A probe uses only harmless documentation IPs and a reserved `.invalid` name.

The actual homepage HTML, local artwork, CSS and presentation modules are served. Only external font imports, public backend configuration and store-notice reads are substituted at the fixture server. The three catalogue paths imported transitively by Forge's existing shared modules return synthetic rows through a loopback-only injected fetch transport. All other fetch origins reject before transport, backed by self-only CSP and the network namespace. This is not a live backend acceptance test.

Final result: **0 external attempts, 0 unexpected console errors, 0 page errors, 0 server errors**. One intentionally invalid font URL is refused by CSP and recorded separately as expected, not counted as an unexplained warning. Production contacts: zero.

## Responsive matrix

| CSS viewport | Hero usable width, before → after | Heading width, before → after | Font size, before → after | Lines, before → after | After overflow / CTA visible |
|---|---:|---:|---:|---:|---|
| 320 | 288.00 → 288.00px | 288.00 → 288.00px | 56px → 51.2px | 3 → 3 | None / Yes |
| 390 | 358.00 → 358.00px | 358.00 → 358.00px | 62.4px → 62.4px | 3 → 3 | None / Yes |
| 768 | 691.22 → 691.22px | 691.22 → 691.22px | 61.44px → 61.44px | 3 → 3 | None / Yes |
| 1024 | 921.62 → 921.62px | 900.00 → 900.00px | 81.92px → 81.92px | 3 → 3 | None / Yes |
| 1280 | 1152.00 → 1152.00px | 900.00 → 900.00px | 102.4px → 102.4px | 3 → 3 | None / Yes |
| 1440 | 1280.00 → 1280.00px | 900.00 → 900.00px | 115.2px → 115.2px | 3 → 3 | None / Yes |
| 1920 | 910.00 → 1280.00px | 900.00 → 900.00px | 120px → 120px | 3 → 3 | None / Yes |
| 2560 | 270.00 → 1280.00px | 270.00 → 900.00px | 120px → 120px | 6 → 3 | None / Yes |
| 3440 | 0.00 → 1280.00px | 0.00 → 900.00px | 120px → 120px | 22 → 3 | None / Yes |
| 3840 | 0.00 → 1280.00px | 0.00 → 900.00px | 120px → 120px | 22 → 3 | None / Yes |


Heights: 900px at 320/390, 1024px at 768, 1080px at other standard widths. At all ten normal-width after states, all three intended lines are intact, no heading/document horizontal overflow occurs, no header collision occurs and the CTA is visible in the initial viewport. Measured line text (spaces excluded for Range counting): `Makeyour`, `presence`, `heard.`.

## Additional acceptance

- **46 recorded layout cases:** ten original-before measurements plus 36 corrected/diagnostic states. The intentionally broken baseline is not represented as 10 functioning layouts.
- **21 functional checks:** CTA keyboard focus/Enter and navigation disclosure at every normal width; parallax and reduced motion. CTA retains `#range`, scrolling works and its focus outline is 2px solid. Mobile Menu opens/closes and Escape restores focus; desktop Components opens through keyboard ArrowDown and closes through Escape.
- Same live document resized through 3840 → 2560 → 1440 → 1024 → 768 → 390 → 320 → 1440, always three lines and no new overflow.
- Measured CDP visual scale 1, 1.25, 1.5 preserves heading geometry and word containment. This is visual/pinch zoom, not desktop browser-chrome layout zoom.
- Default browser text size set to 24px and root computed size asserted at 320,390,768,1440,3840. All hero headings fit. Before/after document scroll width is compared explicitly; see the pre-existing header exception below.
- Initial fallback, pending controlled font and loaded local DejaVu Sans face pass; loaded face also checked at 320,390,768,2560,3840. Missing font falls back safely. No external-font parity claim.
- Long unbroken paragraph token stays inside the 288px mobile column after the additional max-width correction.
- No-JavaScript hero at 2560 passes; disabled customer-UI stylesheet diagnostic at 3840 retains three heading lines.
- Manual visual review of genuine CI screenshots at 320,390,768,1440,2560,3840: existing artwork/overlay retained; no clipped heading or isolated letters; supporting copy and CTA legible. Enlarged-text screenshot reviewed separately.
- Final source-only audit: **94 pages passed** local links, fragments, IDs, navigation/footer, script syntax and imports. This local audit used Node24.19.0 for `--check`; browser application testing used Node22.20.0. No full commerce or live service test is claimed.

## Remaining limitations

- Exact external Space Grotesk/Inter/JetBrains Mono font parity was not tested. External font imports are removed only by the isolated server; production CSS imports are unchanged. Arial/monospace fallbacks and a delayed local DejaVu Sans face were tested.

- CDP visual/page scale 100%, 125%, 150% was measured via visualViewport.scale. This is not desktop browser-chrome layout zoom; true browser UI zoom remains an owner acceptance item.

- At 320px with default text enlarged to 24px (150%), the existing header Menu control extends to x=326.84px. Document scrollWidth is 327px both before and after. The corrected hero fits. Unrelated header changes are deferred; this is not a claim of zero whole-page overflow under all accessibility settings.

- No live storefront, backend availability, customer workflow or full screen-reader acceptance was tested.

The 7px enlarged-text header overflow is reproduced in unchanged main and is outside this hero-only change. [Diagnostic screenshot](SCREENSHOTS/text-150-320.png). No broader navigation correction was made. This is a remaining accessibility risk for a separate approval, not an acceptance assertion silently removed.

Review [before/after mobile](SCREENSHOTS/before-390.png), [after mobile](SCREENSHOTS/after-390.png), [before tablet](SCREENSHOTS/before-768.png), [after tablet](SCREENSHOTS/after-768.png), [before desktop failure](SCREENSHOTS/before-2560.png), [after desktop](SCREENSHOTS/after-2560.png), [before severe failure](SCREENSHOTS/before-3840.png), [after severe width](SCREENSHOTS/after-3840.png). Additional 320/1440 captures are retained.

## Evidence and earlier runs

Original CI artifact: ID `12338281898`, ZIP SHA-256 `bccac42613ad9f667f4812d5cbac0dada46aa178cdc4d7bb390873fa19f9c0f0`; complete digest and ZIP integrity independently verified after retrieval. Actions retention expires 20 November 2026. Selected original PNGs and machine-readable results are committed here for durable review; raw request records remain in the artifact. Every retained screenshot has its own SHA-256 in `TEST_RESULTS.json`.

Four earlier fresh runs failed for documented reasons: incomplete fixture font-import stripping/backend isolation setup; a hover-versus-click test assertion; the pre-existing enlarged-text header overflow; then the long paragraph token. The final evidence uses the corrected full stylesheet cascade and verified original CSS fixture. Earlier incomplete runs are listed in `TEST_RESULTS.json`, not presented as accepted results. There were no unchanged-job retries and no production deployment runs caused by these branch pushes.

## Next owner decision

Perform visual review of the isolated evidence, including the font/zoom and enlarged-text limitations. Any future production integration requires explicit owner approval and current-main reconciliation. Do not run the backend-dependent Pages workflow or deploy this branch automatically.

# SPECTRE homepage hero correction — Authorisation 35

**PASS for the isolated correction; ready for owner visual review. Not deployed.**

Production main remains `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f` (tree `eb2c9f1824602d19ed27f010cf080190a06c713e`). Branch: `engineering/spectre-hero-responsive-fix`, based directly on that main. No BLACKBOX application changes were merged.

Tested source commit: `232017a80fd6c5f2a3083d99cd9f647d8f4db27e`; tree: `4592109bee7e5a3793a651cc05511eba762bf54d`. The later evidence-only commit is identified by the Git history containing this document. [Successful isolated CI](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39583250290).

## Cause and correction

Viewport-based padding from `customer-ui.css` was applied inside a hero box capped at 1550px by `style.css`. At wide viewports the remaining text column shrank to 270px, then zero. Inherited `overflow-wrap:break-word` split words and eventually individual characters. The paragraph shrank too.

Only `dist/customer-ui.css` changes application behaviour:

- Remove the homepage hero-content max-width cap, retaining the existing shared gutters and centered 1280px usable content area.
- Use normal word wrapping for the heading while preserving its two explicit `<br>` elements, desktop font sizes and 900px heading maximum.
- Lower only the small-mobile heading clamp floor from 3.5rem to 2rem, allowing 320px and increased-default-text layouts to fit.
- Bound the hero paragraph to `min(100%,58ch)`, including unusually long unbroken tokens.

No artwork, overlays, HTML, CTA destination, navigation, parallax code or other application files changed. All other 898 baseline blobs are identical, including the existing Pages workflow, backend, Admin, commerce, Forge and disabled image adapter.

## Evidence

[Root cause](ROOT_CAUSE.md) · [Browser acceptance](BROWSER_ACCEPTANCE.md) · [Machine-readable results](TEST_RESULTS.json)

[Before 2560](SCREENSHOTS/before-2560.png) → [After 2560](SCREENSHOTS/after-2560.png)  
[Before 3840](SCREENSHOTS/before-3840.png) → [After 3840](SCREENSHOTS/after-3840.png)  
[Mobile](SCREENSHOTS/after-390.png) · [Tablet](SCREENSHOTS/after-768.png) · [Desktop 1440](SCREENSHOTS/after-1440.png)

The screenshots are genuine Chrome captures of verified main-derived local source, not captures of production and not the owner's original screenshots. Original screenshot viewport/zoom metadata was unavailable; both reported symptom classes were reproduced.

## Scope of changes

Application: `dist/customer-ui.css`. Test-only additions: `.github/workflows/spectre35-hero.yml` and `tests/spectre35/{browser.mjs,isolation.mjs,run-browser.sh,baseline-customer-ui.txt}`. Evidence: the four documents/JSON and original screenshots in this directory. No dependency changes.

The isolated CI workflow is exact-branch push-only, path-filtered, read-only, with no secrets, schedule, manual dispatch, Pages artifact or deployment job. It reuses the BLACKBOX namespace/probe approach, not its image-delivery implementation. All five executions were fresh commits; there were no unchanged-job retries.

## Remaining owner review and rollback

Review desktop, tablet and mobile screenshots and the enlarged-text limitation in [Browser acceptance](BROWSER_ACCEPTANCE.md). External-font parity and true browser-chrome zoom remain unverified. At 320px/150% default text, an existing header control causes the same 7px document overflow before/after; the hero fits.

No deployment or merge is authorised. A separate owner decision is required before production reconciliation or publication; this branch is not a production release. To discard this proposed behaviour, leave production main unchanged. If later approved for integration, isolate this CSS diff; rollback is a non-force inverse of its four property changes after reconciling newer work. Do not reset branches or replace unrelated CSS. The baseline CSS fixture is the exact original blob `5a77dc0a6ee40fab7d1335c9c9c3003f36a36891` for comparison, not an instruction to overwrite a newer whole file.

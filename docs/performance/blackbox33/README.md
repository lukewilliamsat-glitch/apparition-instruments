# BLACKBOX 33 — isolated browser evidence

Overall acceptance: **PARTIAL**. The browser environment is resolved: Stage A passed all ten negative controls and the final real-Chrome run passed **30/30** executed checks. Three explicit coverage limits remain; this is not production certification or activation approval.

## Frozen source and tested harness

| Reference | Commit | Tree |
| --- | --- | --- |
| Production main, checked again 21 October 2026 | `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f` | Unmodified by this mission |
| BLACKBOX 31 | `baf899a62863998b749bca8387793a6b1ed5db61` | `8597a99b14e663613ae0749c546a7db56c096654` |
| BLACKBOX 32, application under test | `870a99c8ed99f981728f26b1eedb415af218b424` | `07105ce9420ee84c109a585938ea4aec04c8d087` |
| Final BLACKBOX 33 harness | `b0c62497fed249e0a1c28885ee0a54813d9eecb0` | `8f67a08aa92f6d3327e9979d47c0976316df1acc` |

Branch: `engineering/blackbox33-browser-verification`. All 926 inherited BLACKBOX 32 files remain byte-identical. The four additions before this documentation commit are the branch-only workflow and three files in `tests/blackbox33/`. No application correction was necessary. Production image delivery remains `enabled:false`.

## Durable evidence

- [Environment and isolation](ENVIRONMENT_AND_ISOLATION.md), [machine-readable isolation proof](ISOLATION_PROOF.json).
- [Browser results and cache observations](BROWSER_RESULTS.md), [selected original network events, phase totals and screenshot hashes](NETWORK_CACHE_RESULTS.json).
- [Eleven actual browser screenshots](SCREENSHOTS/), at 390, 768 and 1440 pixels, plus two deliberate-failure placeholders.
- [Remaining release gates](RELEASE_GATES.md).
- [Final successful CI run](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39454638477), job `118738152278`.

Original CI ZIP artifact `12279911398`, SHA-256 `4e75066afc27139e9636761db8ed31d71b34a38eed50bc7d85d3ddc9688b9e90`. Its complete ZIP integrity and digest were verified. CI retention is fourteen days; these selected results and unchanged screenshots are preserved in Git. After temporary workspace loss, summaries were regenerated from that authentic archive without rerunning tests. Full raw event lists remain in the expiring CI artifact; the selected JSON explicitly identifies what it omits.

## Coverage limits

1. The existing catalogue has category/manufacturer filters, but no text-search control. Filters passed; text-search acceptance is not claimed.
2. The existing basket has text-only items. Actual Add to basket and basket values passed; basket photograph rendering is not claimed.
3. The fixture omitted the existing external Google Fonts import and used shipped fallback fonts. Exact remote-font visual parity is unverified.

These exclusions require owner review. No new search, basket imagery or font distribution was introduced. Basic keyboard/focus and responsive checks are not comprehensive accessibility certification.

## Execution history

| Run | Result | Reason |
| --- | --- | --- |
| [39452205942](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39452205942) | PASS | Isolation-only feasibility; no application fixture |
| [39453281888](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39453281888) | FAIL | 27 UI checks passed; boundary check detected 34 blocked external font attempts; no escape |
| [39453858324](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39453858324) | PASS, 28/28 | Fixture-only font correction |
| [39454638477](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39454638477) | PASS, 30/30 | Added explicit warm replacement and rollback coverage |

Four isolated engineering runs, no repeated rerun of a failed job. No production workflow was initiated by these branch pushes. Documentation-only publication is excluded by the new workflow's path filters. No Supabase, Stripe or live storefront was contacted. No real product images, customer data, emails, transactions or deployment were involved.

Next decision: review the three scope exclusions, then separately authorise a bounded image-free backend/view compatibility preflight after service recovery, with exact requests and byte limits agreed first. Publication and activation remain separately gated.

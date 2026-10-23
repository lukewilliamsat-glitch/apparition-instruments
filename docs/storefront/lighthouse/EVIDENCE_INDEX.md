# Evidence index and original-byte retention

- Tested commit: `932f714b263775215ac091fbef362ad8b5bbc8b5`; tree `fcbcdf9e76f42c81e5c2b10cbb4a1169c27efd4c`.
- [Successful CI run 39981284222](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39981284222).
- [Artifact 12512828995 — raven-lighthouse-evidence](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39981284222/artifacts/12512828995).
- Artifact ZIP: **5,426,475 bytes**; SHA-256 `00465964bc645bb508877b9cf2f6924a65ed1b0a7cd997062c3eaf9383e98753`.
- Created 23 October 2026, 15:49:01 UTC; expires **22 November 2026, 15:49:00 UTC** (provider metadata).
- Downloaded independently after runner cleanup through supported GitHub artifact tooling. ZIP size/digest match GitHub metadata. All **16 original PNGs** match their capture byte lengths, SHA-256 and decoded dimensions and validate as PNGs. No image was edited or re-encoded. Before/after source reports are equal.

ACCEPTANCE.json durably retains the complete screenshot manifest, verification timestamp, all case results, original Node stdout/stderr, source identities and isolation proof. Full request logs/namespace metadata and the actual image bytes remain in the expiring CI artifact. A text summary cannot restore expired PNG evidence. No screenshot/product image was committed to public Git.

All captures use Chrome 155.0.8059.39, the tested source above and fictional records. The manifest distinguishes viewport from full-page PNG dimensions. Existing fallback fonts were used; no remote font or image was requested.

| Original filename | PNG dimensions | Bytes |
| --- | --- | ---: |
| `catalogue-390.png` | 390 × 21293 | 975,809 |
| `unavailable-390.png` | 390 × 1000 | 81,652 |
| `text-200-390.png` | 392 × 2202 | 171,804 |
| `catalogue-768.png` | 768 × 13345 | 945,094 |
| `unavailable-768.png` | 768 × 1000 | 96,063 |
| `catalogue-1024.png` | 1024 × 12585 | 942,767 |
| `unavailable-1024.png` | 1024 × 1000 | 97,918 |
| `text-200-1024.png` | 1024 × 1221 | 173,373 |
| `catalogue-1440.png` | 1440 × 10026 | 700,091 |
| `unavailable-1440.png` | 1440 × 1000 | 110,032 |
| `catalogue-1920.png` | 1920 × 10035 | 724,519 |
| `unavailable-1920.png` | 1920 × 1000 | 113,434 |
| `pending-390.png` | 390 × 1000 | 47,615 |
| `product-long-390.png` | 390 × 5246 | 397,275 |
| `basket-ready-1440.png` | 1440 × 1248 | 169,043 |
| `checkout-prepared-1440.png` | 1440 × 1660 | 191,883 |

Historical/debug artifacts belong to their listed earlier runs in REGRESSION_RESULTS.md and are not accepted evidence. The original LANTERN source/document checkpoints remain unchanged. The final commit containing this index adds documentation only; its full identity is reported in the engineering handover.

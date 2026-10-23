# SENTINEL — isolated reliability candidate

**PASS in isolation; owner interaction approval outstanding.** RAV03, RAV15 and RAV06 each reproduced in genuine Chrome and each passed its own acceptance. No live service or deployment was used.

Branch: `engineering/raven-sentinel`. Base: successfully tested LIGHTHOUSE `932f714b263775215ac091fbef362ad8b5bbc8b5`; its final report remains separately preserved at `35032409c2f9ce01cbd2741aa32697e0fbbdbaaa`.

Tested application/harness: `0f4b82d6f618ecc7e661c3b3ff13ca1b58b66ca4`. Tested tree: `95ffc5e561d5dd1429618f9c8cb940778e5fe56b`. Final documentation commit is the containing GitHub commit, reported with its tree in the ECLIPSE handover. Documentation-only changes after this tested checkpoint do not change application or test bytes.

| Item | Result | New behaviour |
|---|---|---|
| RAV03 | PASS — 7 after cases, 20 targeted Node checks | Valid unavailable component intent survives edits/reloads; explicit removal; no incomplete checkout. |
| RAV15 | PASS — 7 after cases, 8 targeted Node checks | Stable form/focus, one application attempt while pending, same request identity, honest uncertain hold. |
| RAV06 | PASS — 14 after cases, 10 targeted Node checks | Settled uncertainty stops saying Sending; message/duplicate guard retained. |

[Successful CI run](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39988495190): Node v22.20.0, Chrome 155.0.8059.39, 31 SENTINEL browser cases (3 baseline + 28 candidate), 33 inherited LIGHTHOUSE browser cases, 6 offline suites, 8 inherited DOM suites and 5 targeted/commerce suites. Ten pre-fixture isolation negative controls passed. All external attempts, page errors and fixture errors: zero.

Read ROOT_CAUSE for verified findings, IMPLEMENTATION for the four-file change, SECURITY_INVARIANTS for boundaries, TEST_RESULTS/BROWSER_ACCEPTANCE for executed checks, EVIDENCE_INDEX for retained originals, and RELEASE_GATES for remaining owner decisions. ACCEPTANCE.json contains exact per-case, per-file and per-PNG evidence without publishing images in Git.

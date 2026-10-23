# ECLIPSE I — LIGHTHOUSE

23 October 2026 · Authorisation 46 · **PASS within isolated RAV01/RAV02 acceptance. Owner design approval and production adoption remain separate.**

| Identity | Value |
| --- | --- |
| Branch | `engineering/raven-lighthouse` |
| Base / frozen LANTERN final | `b396ec59d317b58ed1c9cd94f8f65620cd50a04c` |
| Tested application/harness commit | `932f714b263775215ac091fbef362ad8b5bbc8b5` |
| Tested tree | `fcbcdf9e76f42c81e5c2b10cbb4a1169c27efd4c` |
| CI | [39981284222](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39981284222) |
| Final evidence identity | The documentation-only child commit containing this package |

Genuine sandboxed Chrome 155.0.8059.39 passes 33 native application cases, with 16 original PNGs independently downloaded and verified. Node 22.20.0 passes the six LANTERN offline suites (83 startup checks) and eight DOM/regression executions. Ten inherited browser isolation controls pass before any application fixture opens. There are no external application attempts, unhandled page errors or fixture routing errors in the accepted run.

All storefront source is identical to LANTERN. LIGHTHOUSE adds the authorised test-only workflow/harness and gives the experimental VM test explicit ownership of its complete graph for Node 22; all 83 assertions remain. Of 912 inherited blobs, 911 are unchanged and the one changed file is that test. No frozen branch, production workflow, backend contract, commerce authority, main, asset, legal policy or deployment changes.

Review [browser acceptance](BROWSER_ACCEPTANCE.md), [regressions/history](REGRESSION_RESULTS.md), [CI architecture](CI_ARCHITECTURE.md), [accessibility and owner questions](ACCESSIBILITY_REVIEW.md), [evidence index](EVIDENCE_INDEX.md), [machine record](ACCEPTANCE.json) and [remaining gates](RELEASE_GATES.md). Historical LANTERN results remain intact and are not relabelled as browser acceptance.

Phase A remains ON HOLD; provider recovery UNKNOWN; public catalogue UNTESTED. No real backend, Auth, Stripe, mail, customer record or storefront request occurred. SENTINEL is a separately preserved next phase based on this tested checkpoint; passing LIGHTHOUSE does not permit production integration or recovery.

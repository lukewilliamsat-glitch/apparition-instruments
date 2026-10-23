# Regression and compatibility results

**Accepted source:** `932f714b263775215ac091fbef362ad8b5bbc8b5` / tree `fcbcdf9e76f42c81e5c2b10cbb4a1169c27efd4c`. Node **22.20.0**, happy-dom **20.14.5**, playwright-core **1.56.1**, Chrome **155.0.8059.39**. Executed on the isolated hosted runner, not inferred from local or historical evidence.

| Executed checks | Result |
| --- | --- |
| LANTERN startup VM / source coverage | PASS — unchanged 83 assertions |
| `p07b-checkout`, `p07b2-checkout-status`, `operations-v1-checkout` | PASS — original suites, injected fictional providers only |
| `egress-cache-browser`, `product-content` | PASS — original Node suites; the cache suite's name does not make it a Chrome run |
| Native Components entry + renderer in happy-dom | PASS — success and valid empty; one catalogue transport read each |
| `p10c-storefront-truth`, `p10d-product-detail` | PASS — inherited assertions preserved |
| `premium-storefront-v1`, `holiday-checkout-basket` | PASS — 82 shells, nine product snapshots, presentation/Operations contracts |
| `p09a-contact`, `p07b4-contact` | PASS — mocked mail/auth/payment records; no email or service request |
| Native Chrome application journeys | PASS — 33 cases, detailed in BROWSER_ACCEPTANCE.md |
| Source before/after | PASS — exact equality; 911 of 912 inherited blobs unchanged |

Commands, stdout/stderr, case outcomes and isolation proofs are retained in the CI artifact and indexed by ACCEPTANCE.json. The original test outputs may say “live Checkout” or “Browser”; they describe mocked scenarios, not live service execution. No SQL was executed.

## Required test-harness correction

Node 22 reproducibly crashed with SIGSEGV while the experimental VM suite constructed many graphs. Retaining only contexts did not fix it; retaining the SourceTextModule/SyntheticModule wrappers, contexts and repository references through the process lifetime does. The same 83 assertions then pass under both the proven namespace and the stricter no-socket fixture runner. This is an observed test-harness compatibility correction, not a claim of a diagnosed Node engine defect. The exact allowed source transform is checked; no assertion, response case or safety check was deleted or relaxed.

An independent disposable Node 22.20.0 archive was obtained from the same official actions/node-versions release used by CI and verified before execution (SHA-256 `e9ab857d83b44bf4fa3b220b3a0731afee615dd67b8ee7754dd6dcd8a4f81818`). Local diagnosis does not substitute for the accepted CI run.

## Earlier runs, not acceptance

| Runs | Outcome and correction |
| --- | --- |
| 39975443164 / 39976319086 / 39977172093 | VM lifetime crash; fixture incorrectly exposed unsupported categories as individually purchasable. Native failure recovery worked. Correct fixture eligibility and graph ownership, keeping assertions. |
| 39978628963 | Test assumed a normal heading was focusable. Corrected to genuine Tab traversal. |
| 39979097230 / 39979345647 | Test read a collapsed FAQ answer. Corrected to keyboard opening of its native disclosure. Earlier remote-font removal damaged CSS; corrected to removing the complete quoted import and asserting fallback typography. |
| 39979607389 | Existing hidden add acknowledgement exposed. Core flow now verifies the actual saved intent and visible basket review; the independent acknowledgement issue is documented, not fixed outside scope. |
| 39980370476 | CI green, but artifact review found an invalid paused Operations fixture and one unhandled page error. Superseded, not accepted. |
| **39981284222** | Valid timed Operations fixture, zero page errors, all required suites and genuine browser cases PASS; original artifact read-back verified. |

Original LANTERN Node 24 results and earlier COMMAND/SPECTRE/NOCTURNE browser work concern different source identities. They are historical context only.

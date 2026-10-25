# GitHub Pages background exposure

**Source assessment complete; ongoing usage UNKNOWN; workflow unchanged.** Main workflow blob is `a43d31b3d7371d02fe016a57a19a2690ceb0ea86`. It has a daily `0 3 * * *` UTC schedule, main-push and manual-dispatch triggers. The old fifteen-minute comment is stale. GitHub scheduling is not a punctual execution guarantee: the latest run was created at 08:02:30Z, not 03:00Z.

| Mechanism | Observed source / implication |
| --- | --- |
| Normal full build | Two catalogue/options GETs + two Operations/News POST RPCs + one CMS POST RPC: **five source-defined backend calls** if all stages run; content bodies/current costs unknown |
| Scheduled/manual run | Product and Operations conditional stages run because the event is not push; CMS runs unconditionally |
| Marked main push | `[static-only]` / `[cms-only]` skip dependency install, product and Operations stages; **do not skip CMS RPC**. This is not a backend-free release method |
| Concurrency | Group `pages`, `cancel-in-progress:false`; serialisation protects some deployment overlap but does not cap bytes or monthly jobs and is not a budget/recovery guarantee |
| Permissions | contents:read, pages:write, id-token:write; `github-pages` environment configured. Environment approval/protection rules have not been independently verified |
| Artifact | Upload `./dist` via upload-pages-artifact; source comment claiming entire repository is stale. Current proof concerns a generated payload, not raw source |
| Deploy | deploy-pages follows upload; full build/deploy are coupled. No independently accepted publish-only/restoration workflow is installed by this assessment |
| Failure | Generator failure blocks later steps normally; backend requests may already have transferred bytes. Do not continue partial output manually |
| Engineering reports | This branch changes documentation only and is not main; its publication does not trigger this main-only production workflow. No dispatch/rerun/cancel occurs |

Fresh read-only GitHub run metadata: latest retained run **40175066908**, event schedule, source `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`, completed success on 25 October; preceding **40075678350**, event schedule, same source, failed on 24 October. The current latest-ten response contains no newer run; this is a point-in-time observation, not a perpetual absence guarantee. ANCHOR independently preserves that successful run's exact artifact. This investigation does not retrieve any artifact or contact generator inputs.

Daily catalogue generation can consume substantial allowance without manual action, because source still selects embedded images and runner caching does not persist across builds. At historic full-body sizes, even daily repetition matters; actual filtered generator usage is unknown. Browser visitors and visible-tab RPC loops remain independent exposure. No claim is made that the daily build alone caused the prior overage or that successful generation proves provider recovery.

## Separate authorisation proposal

If the owner wants emergency schedule containment, a narrowly scoped follow-up could remove only the scheduled trigger block from `.github/workflows/static.yml` on an isolated reviewed candidate, preserving main-push/manual triggers and all steps/permissions, then request explicit production-workflow adoption. The approval must name exact base, candidate diff, cancellation policy for any already queued/running jobs, and restoration decision. Removing the cron block would not prevent main-push/manual builds or customer traffic. No suspension or patch is implemented here.

A longer-term separate engineering scope should design and test generation versus publication separation, verified complete payload reuse, immutable source/payload binding, accepted rollback, retention and deliberate CMS freshness. Do not infer that a main-push marker, fresh allowance or archived ZIP already supplies this route.

Sources: [current exact workflow](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/.github/workflows/static.yml), [product generator](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/scripts/generate-product-pages.mjs), [Operations generator](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/scripts/generate-site-operations.mjs), [CMS generator](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/scripts/generate-hub-cms.mjs), [25 October run](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/40175066908), [24 October run](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/40075678350), [ANCHOR provenance](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c1100c77f22a9ee85fbe1ffbc663d092838af6ad/docs/operations/anchor/RELEASE_PROVENANCE.md).

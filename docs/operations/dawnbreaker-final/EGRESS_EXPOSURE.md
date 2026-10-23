# GitHub-only production exposure snapshot

Observed **2026-10-23T16:45:55.048Z** using read-only GitHub metadata and pinned source. No provider report has been assessed. All current plan/cycle/allowance/used/remaining/enforcement/project-service figures remain **UNKNOWN**. Phase A is ON HOLD and public endpoints UNTESTED.

| Evidence | Current observation | Interpretation limit |
|---|---|---|
| Main | `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f` | Git source identity; does not identify the complete currently served generated payload. |
| Static workflow | `.github/workflows/static.yml`, Git blob `a43d31b3d7371d02fe016a57a19a2690ceb0ea86`; unchanged | Push to main, manual dispatch and cron share a deployment-capable job. We invoked none of them. |
| Schedule | `0 3 * * *` (nominal 03:00 UTC daily); stale comment says fifteen minutes | Nominal schedule is not a guaranteed start time or provider-cycle boundary. No schedule changes observed. |
| Latest Pages run | [39922853022](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39922853022), main source, schedule, created 2026-10-23T08:10:58Z, updated 08:11:13Z; failure | Same failure already recorded at the original DAWNBREAKER checkpoint. No newer Pages run appeared in the refreshed latest-first run page. |
| Latest job | `120312000218`: product generator failed; Operations/CMS and upload/deploy skipped | Fresh step metadata confirms failure stage; we did not rerun it or make a new backend request. Historical 402 in the original report is not today's provider state. |
| Publication concurrency | Global queued and in-progress queries each returned total_count=0 | Point-in-time observation only; future schedules/dispatches or external publishers remain possible. No cancellation or disable occurred. |

Scheduled/non-push runs execute backend-dependent product and Operations generators regardless of static-only/cms-only push markers. CMS generation is unconditional in this workflow and its source calls the public CMS RPC when run as a script. Consequently a marker is not a backend-free publication route. On restoration, existing scheduled work and ordinary visitors may consume allowance without a manual recovery experiment. This mission neither measures nor attributes any amount.

The existing `pages` concurrency group has cancel-in-progress:false. It serialises that workflow group; it does not reserve provider quota or prove absence of other writers/publishers. Main and production workflow configuration remain unchanged. Current workflow enabled/disabled management state and active deployment/payload association are not separately established by these source/run reads.

Before a later experiment, use fresh owner-confirmed usage with units, reporting lag, reserve and an explicit concurrent-exposure decision. The 131,072 accepted-body byte budget of the future preflight is not an absolute billed-egress ceiling. No suppression, monitoring installation, workflow edit or recovery action is approved here.

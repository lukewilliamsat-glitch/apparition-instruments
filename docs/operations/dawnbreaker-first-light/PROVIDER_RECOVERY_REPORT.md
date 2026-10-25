# Phase A — provider evidence assessment

**PARTIAL — RESET EVIDENCED, SERVICE STATE INCOMPLETE.** Authorisation 49 releases the previous planning HOLD for assessment only. The owner's dated 25 October reset confirmation supports the reset claim. Current enforcement and service health are not established. A restriction visible on 24 October is not fresh evidence for a current HOLD classification; absence of a newer banner is not evidence of clearance either.

| Required provider fact | Actual supplied evidence | Current assessment |
| --- | --- | --- |
| Organisation identity | Earlier owner-supplied display: Apparition Instruments | Historical display association; current association not freshly confirmed |
| Project identity | Earlier display: Apparition Instruments Webstore, eu-west-1 | Display association only; exact intended project association requires owner confirmation, not a public identifier dump |
| Plan | Earlier display: Free | Current plan UNKNOWN |
| Billing-cycle beginning | No actual new-cycle boundary supplied | UNKNOWN; calendar reset expectation is insufficient |
| Billing-cycle ending | No actual new-cycle boundary supplied | UNKNOWN |
| Included allowance | Earlier display: 5 GB | Historical allowance; current included amount/unit definition UNKNOWN |
| Consumed egress | Earlier display: 0.00 GB | Dated rounded display; current used amount UNKNOWN |
| Reported remainder | Not explicitly supplied | UNKNOWN; do not derive 5 GB remaining |
| Evidence timestamp | Screenshot filename indicates 24 October, phone clock 10:33; upload metadata about 09:33 UTC; owner statement dated 25 October | Exact capture/provider observation time/timezone UNKNOWN; file metadata is not provider reporting time |
| Reporting freshness/lag | No provider freshness/lag statement supplied | UNKNOWN |
| Organisation restriction | Restriction banner visible in earlier view | Current cleared/present/unknown state remains UNKNOWN |
| Project health/status | No fresh active/restricted/paused confirmation | UNKNOWN |
| Quota warning | Historical quota restriction notice | Current warning UNKNOWN |
| Incident notice | Separate technical-incident banner in earlier view | Exact incident identity, applicability and current resolution UNKNOWN |

Evidence classes: the earlier display content is owner-supplied and historically reviewed; the new reset statement is **OWNER-CONFIRMED**, not an independent provider observation. The successful scheduled GitHub run `40175066908` generated backend-dependent output on 25 October. This independently verifies that historical workflow outcome, not all current endpoints, quota state, project health, current usage, RLS or migration parity. No fresh dashboard report is present under this authorisation at this checkpoint.

Public catalogue endpoint status: **UNTESTED BY ASSISTANT**. Assistant provider/Auth/REST/RPC/SQL/storefront requests and backend bytes: **0**. No credentials, customer rows or sensitive configuration are needed. Existing background scheduled publishing and visitors may consume allowance independently of this zero-request assessment.

## One minimum owner follow-up

Provide one redacted owner-confirmed text summary, at most **16,384 UTF-8 bytes**, from trusted provider billing/usage and project status: organisation/project display association; current plan; actual cycle start/end/timezone; included, used and explicitly reported remaining egress with units; observation time/timezone and provider reporting time/lag; organisation restriction and project active/restricted/paused state; quota warning and relevant incident status; unknowns explicit; publicEndpointStatus=UNTESTED. No keys, credentials, database rows, customer details, invoices or private project/storage identifiers. Screenshots need not be requested; any voluntarily supplied later evidence must be redacted and assessed for freshness.

PASS requires sufficient fresh evidence of renewed usable allowance and cleared relevant restrictions. Fresh evidence of continued relevant restriction yields HOLD. Insufficient current evidence without a supported reset would yield UNKNOWN. This checkpoint supports PARTIAL and does not approve future public preflight, privileged inspection, live experiment or deployment.

Sources: [runbook](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/542cc90cf9c301b4571d246ce9ae105bddefc2d0/docs/operations/dawnbreaker/RECOVERY_RUNBOOK.md), [reset contract](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/542cc90cf9c301b4571d246ce9ae105bddefc2d0/docs/operations/dawnbreaker/RESET_VERIFICATION.md), [historical owner-evidence assessment](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/faa860df58901a1c4ebbf7cba5b3677b3fd6bafc/docs/engineering/archivist/POST_RESET_READINESS.md), [successful GitHub run](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/40175066908). The uploaded Authorisation 49 is the current owner statement; its private attachment identity is not published.

# Atlas freeze and handover

Owner decision: Authorisation 27, 20 October 2026. **Pause further Atlas certification work. Atlas is not technically certified or complete.** This is a documentation checkpoint, not a release or baseline-adoption approval.

## Why Atlas was started

The storefront build depended on backend-driven generators while Supabase restrictions could prevent publication. Atlas was started to establish a safe static-only release route, preserve the working storefront, recover a defensible baseline and prepare narrowly scoped changes such as the secondary Spectre homepage without regenerating commerce content or contacting Supabase. It did not authorise replacing the live site with a reconstruction.

## Engineering achieved

| Phase | Preserved result |
| --- | --- |
| 2A | Offline snapshot validation, publication-mode decisions and protected-file overlay assembly; synthetic safety tests. |
| 2B | Digest-pinned release-input/preflight contracts and isolated, non-deploying engineering CI. |
| 2C | Interruption recovery, end-to-end release preflight and workflow-maintenance safety analysis; partial capture explicitly remained non-deployable. |
| 2D | Candidate reconstruction, discrepancy review and fail-closed certification/owner-decision boundaries. |
| 2E | Version reconciliation, exact Operations preservation and release rehearsal. A separately approved schedule-only main change established daily 03:00 UTC execution; it did not deploy the site. |
| 2F | Historical log authenticated 423 upload paths, associated 415 source objects and preserved 54 exact public observations in a separate corrected candidate. |
| 2G | Executed source transformations and CMS-seed reconstruction, classified generator uncertainty, hardened screenshot receipts, separated historical/current verdicts and verified reproducible engineering recovery. |

## Frozen identity and evidence

- Production main verified: `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`.
- Engineering branch: `atlas/phase2g-certification-closure`.
- Commit: `fe16cc5752460dcc2a26968d4ee144b7bc940893`.
- Tree: `7f755f189ebe88ddf4d8232708cceb00bf57a3b0`.
- [Phase2G report](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/fe16cc5752460dcc2a26968d4ee144b7bc940893/docs/atlas/phase2g-release.md).
- [Successful isolated CI](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39402161682): 370/370 tests and nine denial probes under Node 22.23.3; local Node 22.20.0 also passed. No Pages artifact was uploaded.

All 325 priority source/stamping paths reproduce exactly. Of 44 priority generator paths, 39 match repository CMS-seed output, one is a read-only source template and four require unavailable historical catalogue inputs. Complete CMS replay matches 43 outputs, with a documented sitemap difference. Two clean synthetic full builds match; in-place reuse of generated/stamped output drifts on eight paths. Six reports reproduced byte-for-byte during fresh recovery. Validation-only assembly preserved 422 protected files and exact local-candidate rollback.

## Unverified and deployment risks

Historical reconstruction is **not current production certification**. Original artifact-payload bytes and historical database responses remain unavailable; authentic source seeds do not prove historical RPC state. Individual public observations are not a fresh complete live inventory. Independent inventory/functional witnesses and dynamic runtime review remain incomplete.

All 24 real-browser cases remain pending: managed execution denied Chrome's required Unix IPC before any candidate page opened. Node tests, PNG validation and route manifests do not substitute for browser acceptance, authenticated workflows or live checkout verification. Exact local rollback does not prove restoration of the unknown current live deployment payload.

Existing production workflow dependencies, artifact completeness, generator inputs, mixed versions and rollback must be reconciled before any future release. Preserve Operations content, image identities, checkout authority, existing applications and all earlier frozen checkpoints. Do not keep searching expired artifacts as a prerequisite for useful business work.

## Stop and ownership decision

Freeze Phase2G; do not modify its branch, resume certification or start another Atlas phase under this handover. No deployment or baseline adoption is authorised. Either requires a separate explicit owner decision with scope, evidence, risks and rollback reviewed first; baseline adoption must never relabel reconstructed bytes as authenticated historical/live bytes.

Apply the [cloud-first policy](../engineering/CLOUD_FIRST_POLICY.md). The earlier Windows/Docker runner remains an optional historical preparation, not a mandatory owner setup task. No routine ZIP download or local development installation is required. Proceed next only with a separately authorised, small Project COMMAND milestone.

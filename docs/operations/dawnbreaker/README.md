# DAWNBREAKER — recovery readiness

Authorisation 42 · 23 October 2026 · **planning complete; recovery and release NOT EXECUTED**.

This documentation-only branch starts at production main `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`. It adds only this directory. It does not install NIGHTFALL, COMMAND, HOMECOMING, a workflow, SQL, assets or credentials. The expected 24 October reset is an owner-reported expectation, not evidence of restoration or permission to act.

## Verified starting position

| Reference | Verified commit |
|---|---|
| Production main | `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f` |
| COMMAND 04 IRONCLAD | `20002c45933a7f24b08f6d5f0199a7fc8fa1a282` |
| COMMAND 04A NOCTURNE | `993108aa7d65ac204ef54a7018a85f5c783813fd` |
| BLACKBOX 34 NIGHTFALL | `c3003c6a56075964f5036ea57507aed8f431b64e` |
| SPECTRE 35 HOMECOMING | `f89657ec28c73a153f65c1f346fc974747bd5994` |

Remote identities matched all five expected checkpoints. All 31 pre-existing branch heads were recorded for preservation verification. Trees, pinned evidence and source-only checks are in [EVIDENCE_INDEX.md](EVIDENCE_INDEX.md).

## Findings that govern recovery

- Latest observed Pages run [39922853022](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39922853022) started **23 October, 08:10:58 UTC** and failed in product generation: `catalogue_components` HTTP 402. Upload and deployment were skipped. This log does not establish today's billing balance or the cause of enforcement.
- The normal pipeline makes two concurrent catalogue/options reads, two concurrent Operations RPCs, then a CMS RPC. A recognised `[static-only]` or `[cms-only]` push still runs the CMS RPC. No existing workflow path has been established as backend-free.
- Historical image-bearing catalogue bodies were large. Source confirms several remaining image-bearing consumers; their current traffic and billed contribution are unknown. See [EGRESS_RISK.md](EGRESS_RISK.md).
- The exact NIGHTFALL three-request proposal is recovered and its serialized-plan hash independently recomputes. It remains unexecuted and separately gated.
- A successful historical Pages workflow is visible, but its complete payload is unavailable in the current artifact listing. Active payload association and complete rollback bytes remain unverified. Restored Supabase alone cannot release HOMECOMING.

## Use the package

Start with [RECOVERY_RUNBOOK.md](RECOVERY_RUNBOOK.md). Its gates separate **A: owner-mediated provider confirmation**, **B: bounded public catalogue compatibility**, **C: privileged compatibility review**, and **release approval**. Each requires its own authority. No action starts automatically on 24 October.

[PRODUCTION_PIPELINE.md](PRODUCTION_PIPELINE.md) maps generation and publication. [RESET_VERIFICATION.md](RESET_VERIFICATION.md), [NIGHTFALL_PREFLIGHT.md](NIGHTFALL_PREFLIGHT.md), and [COMMAND_COMPATIBILITY.md](COMMAND_COMPATIBILITY.md) define the future phase boundaries. [HOMECOMING_GATES.md](HOMECOMING_GATES.md) covers both complete-site release prerequisites and NIGHTFALL integration gaps.

The owner-approved NOCTURNE charcoal/brass direction, information density, mobile section chooser and action tray are a **design baseline only**, as recorded in Authorisation 42. Accessibility, physical-device, backend and deployment gates remain separate. Frozen NOCTURNE documentation/source is unchanged.

No Supabase, Stripe or storefront service was contacted; no production build, SQL, deployment, image extraction or publication was performed. Full isolated engineering programmes were not rerun. The next decision is approval of Phase A only, using the exact proposed wording in the runbook.

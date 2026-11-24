# QUARTERMASTER 84C staging release register

24 November 2026. Sealed candidate passed the isolated gates. Persistent installation and publication await confirmed staging Auth identities.

| Item | Pinned identity |
| --- | --- |
| Source | `cd0714a37817085cd9c4a666e4fe1a45d0fb8030`. Reuses the accepted 84B artifact and writer source. |
| Disposable rehearsal | [Run 45391192174](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/45391192174), attempt 1, PostgreSQL and Chromium succeeded. |
| Wrapper | [Artifact 14918089422](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/45391192174/artifacts/14918089422). SHA-256 `c36b0958431fa6b0e812cce88723b7fbbccacabacf2f2998c923a6ecfb9f5b9b`. |
| Atomic stage SQL | SHA-256 `015c8d8446902ce48f462bc4099eb3f88451a4604066ad0952b032da9c0789a0`, including seed SHA-256 `3b66590d2b7d9ea6830785de6113a9f1c17dbe36a5eccadaf7de4e2dc693dbfb`. |
| Static package | 18 files. ZIP SHA-256 `539df247ff7b7f06bd378f87fdc498be88ae6b4f7727cd50fc8d4a5e90e30904`. Inventory SHA-256 `03f55a7d0c6b01c8f7d2382a788dc975155c48645d6973b30583378fa161b59a`. |
| Protected uploader | Code commit `03dddd350727690b731e6c9c0a9dba29e7b24ed3`. Publish script SHA-256 `dc374d2d43da3b93973d67989044b054a5e3280d7d343aab4e1c9e8c076d4132`. Reviewed pending workflow SHA-256 `964a7f141797f474615d57adbdefa1e23564c796cfe29eb334560050efc5d751`. |
| Supabase scope | Project `prwmowexhonguvtiywsy` only. Stage issuer and exact PostgREST/Auth allowlist. No Edge, checkout, webhook, mailing, carrier, Stripe or eBay routes in the package. |
| Preview scope | Approved target `apparition-phoenix-preview`, branch `quartermaster84c-stage`, intended route `https://quartermaster84c-stage.apparition-phoenix-preview.pages.dev/admin/orders/`. The Access redirect was verified before publication. Preview project canonical `a73b0e75-fd2c-4321-953d-c6c173e9ecfe`; prior latest remains the separate 84B-P fixture `704c4ce5-7d52-4aaf-8155-eda60a6db978`. |
| Production preflight | Canonical 84B `3d31097e-0418-4547-bdb0-bd9f7ce91b6e`, exact source `15efc3473d9b91ab6664c5c2e47408bdca529b40`, two read-only packing functions; UNITY paused, QUARTERMASTER observe, Aftercare Direct off, OPEN, delivery revision 5. Counts 34 Orders, 35 inventory, seven financial revisions. Nine Edge versions matched. FIRST LIGHT remains rollback `62f2f737-da53-49a5-960f-a38bdd10af11`. 84B owner business acceptance remains pending. |

## Identity prerequisite and release sequence

Use Dashboard Authentication → Users → Add user → Create user in **apparition-staging**. Confirm the password users `84c-operator@fixtures.example`, `84c-finance@fixtures.example`, and `84c-observer@fixtures.example` without sending invitations. Keep passwords in the owner's password manager. At preflight check three exact confirmed password users, all without existing general Admin grants. The atomically applied seed grants a fixture-only seat to each and the existing staging finance Admin authority to the finance approver alone. Operator and observer retain scoped membership and cannot call the general finance writer.

Verify the authoritative staging schema fingerprints and prior preview receipt again. Apply the pinned SQL once through the staging connector and verify its migration ledger receipt, four fixture order identities, one supplier, zero initial packaging stock, three exact scoped roles and anonymous denial. Register the reviewed publishing workflow at `.github/workflows/quartermaster84c-stage-preview.yml` on the existing guarded `engineering/phoenix66-preview` ref once. Verify the protected run and actual bytes, independent Access protection, application headers and retained canonical targets. Await native signed-in acceptance using the three distinct roles through the normal verified staging Auth flow.

| Seat | Scope |
| --- | --- |
| Operator | 84C-only synthetic order and supplier, packaging SKU, receipt, reserve, pick, completion, release, actual postage evidence and unsaved finance review. |
| Finance | Staging finance approver through established ECLIPSE authority. Review, explicit approval, saved revision and OMNISCIENCE. No new packing writer capability. |
| Observer | 84C Orders, DOMINION and bounded QUARTERMASTER observation. |
| Anonymous, unbound and service-role client | Denied internal evidence and mutation. No new direct relation or helper grants. |

## Rehearsal and recovery

The SQL failed atomically when a confirmed user was absent. With fixture identities, PostgreSQL exercised direct access denial, wrong-role denial, disabled/observe denial, duplicate receipt, last-unit contention, stale generation, release/re-reserve, partial pick persistence, exactly one physical packaging deduction, and preserved component inventory. It verified £0.40 packaging, £1.30 postage estimate and £1.15 recorded postage, plus incomplete-evidence rejection, order-basis conflict, concurrent finance save conflict, exact retry receipt, and OMNISCIENCE's recorded totals. The extended disposable run verified an authorised correction on revision 2 preserved revision 1. Chromium exercised both widths and fixture sign-in, expiry and sign-out.

Drain SHA-256 `d8a4fb9f2ce49999db37fd96f49313915be173d4f70901e144626def8a48f793`. Final disable SHA-256 `07b28c92acf90580844a1d37984c2875b1aaaedb79c0bd6ff7973ada2793eb10`. Drain freezes new receipts, reservations, picks, completion and approvals. Resolve known uncertain requests, then release only physically unconsumed holds. Final disable requires zero reservations and revokes the scoped writer RPCs. Completed stock movements and finance history remain. Failed preflight leaves the stage untouched. For a fresh pass use the next unused seeded order or rebuild disposable PostgreSQL. Retain completed stage evidence and the existing fixture/deployment alias. If the stage test seats are retired, remove the separately recorded temporary finance Admin membership and retire the three Auth users through the approved staging process.

## Acceptance still open

- Persistent SQL/seed, exact preview deployment, genuine Auth, stage database-backed browser and financial acceptance have no receipts yet. The target alias is not a live 84C walkthrough until the publisher and readback succeed.
- Production writer release composition follows genuine stage acceptance. Require the final cumulative Admin archive, exact dormant writer SQL and original Orders and finance bindings, named production roles, protected publisher, separate activation transition, complete packing drain and evidence-preserving reversal. This stage package is deliberately incompatible with production.
- Existing 50 × 50 mm [Niimbot proofs](https://chatgpt.com/library?file_id=libfile_2b36395af1908191a28c1aacfaec6a70&account_id=personal) remain available. Physical labels are a separate acceptance gate.

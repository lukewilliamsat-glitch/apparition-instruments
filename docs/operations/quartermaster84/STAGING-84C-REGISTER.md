# QUARTERMASTER 84C staging release register

24 November 2026. Sealed candidate passed the isolated gates. The three corrected staging Auth identities are confirmed. Staging SQL and seed are applied. The protected staging preview is live. Genuine signed-in desktop role acceptance and the synthetic packing-to-finance journey passed. Owner business acceptance and the remaining live coverage are listed below.

| Item | Pinned identity |
| --- | --- |
| Source | `c74b0303702105bb42ec74c882addba8dba6929d`. Reuses the accepted 84B artifact and writer source. |
| Disposable rehearsal | [Run 45394609239](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/45394609239), attempt 1, PostgreSQL and Chromium succeeded. |
| Wrapper | [Artifact 14920546326](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/45394609239/artifacts/14920546326). SHA-256 `3fe57a7ee15acf8d06d796cd1b720adc3a13f66fa1083ddb3f5388ecf55b0f26`. |
| Atomic stage SQL | SHA-256 `84cda3a968e228d230879ab9b75d192599c0a7517cac25ea5f630a526d5da5a7`, including seed SHA-256 `a82f260164bd77a92f0b16fe02865a16906fce4adda8c9f76f3879c3483bef24`. |
| Static package | 18 files. ZIP SHA-256 `539df247ff7b7f06bd378f87fdc498be88ae6b4f7727cd50fc8d4a5e90e30904`. Inventory SHA-256 `03f55a7d0c6b01c8f7d2382a788dc975155c48645d6973b30583378fa161b59a`. |
| Protected uploader | Code commit `244f3616c081701fe45fa2ec8622cba80155f617`. Publish script SHA-256 `62a83181dcc003bab52c815c4a7a560c675b620382fefb82182c9d358f8ce143`. Reviewed pending workflow SHA-256 `f5f8296a8a8884d5e40a44990e7522eec63306b301de67f6bb0fdf60ce687be3`. |
| Supabase scope | Project `prwmowexhonguvtiywsy` only. Stage issuer and exact PostgREST/Auth allowlist. No Edge, checkout, webhook, mailing, carrier, Stripe or eBay routes in the package. |
| Preview scope | Approved target `apparition-phoenix-preview`, branch `quartermaster84c-stage`, intended route `https://quartermaster84c-stage.apparition-phoenix-preview.pages.dev/admin/orders/`. The Access redirect was verified before and after publication. Preview project canonical `a73b0e75-fd2c-4321-953d-c6c173e9ecfe`; prior latest was the separate 84B-P fixture `704c4ce5-7d52-4aaf-8155-eda60a6db978`. |
| Production preflight | Canonical 84B `3d31097e-0418-4547-bdb0-bd9f7ce91b6e`, exact source `15efc3473d9b91ab6664c5c2e47408bdca529b40`, two read-only packing functions; UNITY paused, QUARTERMASTER observe, Aftercare Direct off, OPEN, delivery revision 5. Counts 34 Orders, 35 inventory, seven financial revisions. Nine Edge versions matched. FIRST LIGHT remains rollback `62f2f737-da53-49a5-960f-a38bdd10af11`. 84B owner business acceptance remains pending. |

## Identity prerequisite and release sequence

The original domain instructions were corrected before staging SQL. The existing enabled synthetic Auth guard requires @example.invalid. Its function-definition MD5 is `2f7a054f7d60cccb1673602c55cb9591`. The disposable rehearsal verifies guard rejection of the earlier domain and the exact stage prerequisites. No change to the guard was required.

Use Dashboard Authentication → Users → Add user → Create user in **apparition-staging**. Confirm the password users `84c-operator@example.invalid`, `84c-finance@example.invalid`, and `84c-observer@example.invalid` without sending invitations. Keep passwords in the owner's password manager. At preflight check three exact confirmed password users, all without existing general Admin grants. The atomically applied seed grants a fixture-only seat to each and the existing staging finance Admin authority to the finance approver alone. Operator and observer retain scoped membership and cannot call the general finance writer.

Verify the authoritative staging schema fingerprints and prior preview receipt again. Apply the pinned SQL once through the staging connector and verify its migration ledger receipt, four fixture order identities, one supplier, zero initial packaging stock, three exact scoped roles and anonymous denial. Register the reviewed publishing workflow at `.github/workflows/quartermaster84c-stage-preview.yml` on the existing guarded `engineering/phoenix66-preview` ref once. Verify the protected run and actual bytes, independent Access protection, application headers and retained canonical targets. The native signed-in acceptance followed using the three distinct roles through the normal staging Auth flow.

| Seat | Scope |
| --- | --- |
| Operator | 84C-only synthetic order and supplier, packaging SKU, receipt, reserve, pick, completion, release, actual postage evidence and unsaved finance review. |
| Finance | Staging finance approver through established ECLIPSE authority. Review, explicit approval, saved revision and OMNISCIENCE. No new packing writer capability. |
| Observer | 84C Orders, DOMINION and bounded QUARTERMASTER observation. |
| Anonymous, unbound and service-role client | Denied internal evidence and mutation. No new direct relation or helper grants. |

## Rehearsal and recovery

The SQL failed atomically when a confirmed user was absent. With fixture identities, PostgreSQL exercised direct access denial, wrong-role denial, disabled/observe denial, duplicate receipt, last-unit contention, stale generation, release/re-reserve, partial pick persistence, exactly one physical packaging deduction, and preserved component inventory. It verified £0.40 packaging, £1.30 postage estimate and £1.15 recorded postage, plus incomplete-evidence rejection, order-basis conflict, concurrent finance save conflict, exact retry receipt, and OMNISCIENCE's recorded totals. The extended disposable run verified an authorised correction on revision 2 preserved revision 1. Chromium exercised both widths and fixture sign-in, expiry and sign-out.

Drain SHA-256 `d8a4fb9f2ce49999db37fd96f49313915be173d4f70901e144626def8a48f793`. Final disable SHA-256 `07b28c92acf90580844a1d37984c2875b1aaaedb79c0bd6ff7973ada2793eb10`. Drain freezes new receipts, reservations, picks, completion and approvals. Resolve known uncertain requests, then release only physically unconsumed holds. Final disable requires zero reservations and revokes the scoped writer RPCs. Completed stock movements and finance history remain. Failed preflight leaves the stage untouched. For a fresh pass use the next unused seeded order or rebuild disposable PostgreSQL. Retain completed stage evidence and the existing fixture/deployment alias. If the stage test seats are retired, remove the separately recorded temporary finance Admin membership and retire the three Auth users through the approved staging process.

## Staging migration receipt

Staging migration `20261124123950`, `quartermaster84c_staging_integration`, applied once to `prwmowexhonguvtiywsy`. Readback verified four new 84C orders, one supplier, one zero-quantity packaging material, three confirmed scoped roles, one general Admin grant for finance alone and closed private grants/RLS. Anonymous HTTPS returned HTTP 401 / 42501. The exact staging Auth guard fingerprint remains active. Existing five stage orders, three stage suppliers and two prior finance revisions were retained.

## Protected publication receipt

[Run 45396137208](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/45396137208), attempt 1, successfully uploaded deployment `96237d9e-1586-45c6-979a-0d55d22217a0` and independently read back all served assets behind Access. The protected alias is [QUARTERMASTER staging Orders](https://quartermaster84c-stage.apparition-phoenix-preview.pages.dev/admin/orders/). Verified original production `3d31097e-0418-4547-bdb0-bd9f7ce91b6e` and original preview project canonical `a73b0e75-fd2c-4321-953d-c6c173e9ecfe` remain canonical in their respective projects. A staging observer-role database read returned four fixture orders with writer and finance permissions both false.

## Genuine native browser acceptance

24 November 2026. Cloudflare Access granted entry through its email-code flow. The application then used three separate password sessions in `apparition-staging`. All writes affected the approved synthetic fixture `84C-FIXTURE-1`.

| Role | Live browser evidence |
| --- | --- |
| Operator | Orders opened the packing workshop and returned to the same order. Received one `84C-MAILER` at 40p from the fixture supplier, reserved it, released it back to availability and reserved it again. Saved one of two picks, reloaded and resumed at one, then saved both picks and completed one pack. The parcel was 40 × 30 × 20 mm, 75 g, Large letter, with synthetic tracking. Postage displayed a £1.30 estimate and £1.15 recorded actual. ECLIPSE showed an unsaved proposal at revision 0 with no approval button. |
| Finance | Approved the proposal once and received **Saved revision 1**. OMNISCIENCE showed **Recorded**, packaging £0.40, shipping £1.15 and contribution £7.95. The packing route showed the saved pick list with no writer actions. |
| Observer | Saw the fixture order and the saved 2/2 pick list with no writers. The finance deep link showed only the order, with no proposal or approval. DOMINION showed UNITY paused and QUARTERMASTER review observe. |
| Sign-out | The finance route after operator sign-out and the packing route after observer sign-out both returned to the staging sign-in. Cloudflare Access continued to protect the host. |

## Independent readback after the browser walkthrough

Supabase recorded one receipt, one positive packaging movement, one completing movement with a delta of −1, zero remaining batch and physical units, zero outstanding reservations, two pick events, the packed state and the 40p, 130p and 115p values. There was one committed approval receipt and one revision for the fixture. Two prior non-84C financial revisions remained present.

Cloudflare verified the 84C preview deployment and separate canonical 84B production deployment. FIRST LIGHT and Release C retained their successful rollback deployment records. Production readback showed UNITY paused, QUARTERMASTER observe, Aftercare Direct off and delivery revision 5. Orders, inventory and finance revision counts remained 34, 35 and seven. Production had zero packing, material and movement rows, and the writer schema was absent. Nine active Edge Function versions and JWT settings were retained.

## Remaining acceptance

- The live native browser ran at 1363 CSS px. The accepted isolated Chromium run covers 390 px and expiry. Genuine narrow-width and elapsed-session expiry remain open. Stale/concurrent attempts and drain/recovery remain disposable PostgreSQL evidence.
- The owner can open [protected staging Orders](https://quartermaster84c-stage.apparition-phoenix-preview.pages.dev/admin/orders/), sign in through Cloudflare Access and use the observer fixture to check `84C-FIXTURE-1` → **Open packing workshop** → 2/2 picks → **Back to this order**. A finance fixture session can inspect the saved result from ECLIPSE → **Open OMNISCIENCE result**. The historical 84B-P fixture walkthrough and this database-backed 84C application are separate environments. Request explicit acceptance of the staging workflow and of the live 84B read-only view separately.
- See the [sealed 84D writer candidate and consolidated walkthrough](WRITER-RELEASE-PREPARATION.md). Printing was removed from the active release requirements.

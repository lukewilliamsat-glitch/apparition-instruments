# Release A76: production execution and acceptance receipt

19 November 2026 GMT. Operator decision: **LIVE, independently verified.** Authenticated owner walkthrough pending. Authority: Authorisation 76. Readiness record `fe98ac8de24c437c945c07df8e3e88e58dff219d`, accepted recovery record `046b14cd10d362115b45b42ef20e4537ea799992`, scoped recovery run `44524518530`. Baseline and intervening activity were refreshed before mutation. Owner reconciliation and the bounded activity results were retained privately. No exception was found that invalidated the approved plan.

## Database and Edge

Supabase project `acdxpxvksvdwfajntzfx`. Each exact approved file was verified against the immutable artifact and applied once, in order. Read-only production migration history confirmed these execution IDs:

| Source file | Approved SHA-256 | Production migration ID |
| --- | --- | --- |
| 20261117092035_overseer_delivery_v1.sql | `669b6d1292f9dd012889c88115ba0b36c4431c9164c672673af213b1016aac5c` | `20261119130030` |
| 20261117092047_overseer_aftercare_direct_v1.sql | `12d1ea5a03050aed5fdac0267bd1ee4d44c9f83fa9bc3746e72b97d4a0e99bed` | `20261119130043` |
| 20261117095412_overseer_order_date_correction.sql | `d2d1fb5ec06b1b0f4a62932076dc26e7c8eba38cbc544c03c783028a711cb4bd` | `20261119130052` |
| 20261117102331_eclipse_fulfilment_finance_v1.sql | `a90c3c2bf240b769c51e6f857ee5d7880f555889ea3ff50be484a8e305c39ce0` | `20261119130058` |

Function definition checks matched: migrated checkout `ba4bf95a75a64036cb04f280be006d92` and finance `289cf4e98092b59ab9b51d5aa0f1bb34`; unchanged external orders `df2e46524aba50edb6140f4eb87d3f3e` and inventory `9d1c421b855ded51ce681ec46cf32a13`. Historical financial revisions still exist. Orders, inventory, Admin membership and financial revision tables retain RLS, authenticated SELECT and no anonymous SELECT. The Delivery Admin, order date history and ECLIPSE cost-library reads each rejected both anonymous and no-membership roles; the anonymous delivery preview remained callable. Public delivery quotes returned 399p at £49.99 and 0p at £50.00. No live payment, email, order, date correction or financial record was submitted for testing.

Only `create-checkout` was deployed, now **v16**, ID `95e8a038-9d6c-4684-950e-464379d941ce`, provider bundle SHA-256 `22732f6a3f48ea243b69524a721b7b2bd7dc7205453dec5b8450b6f9c464de14`. Independent provider readback matched both exact source files: entrypoint `20ee849aae00f1cdc4cc030832ddba07d241c7521315a5d38b2e423b0c06f621`, shared customer-auth `7b68f37cc5b8d0995c8a26a2f456b6ee9edb2e8a8d5b4cc57c1c75f8cee2c906`. Prior gateway settings remained as reviewed: verify_jwt false, import_map false, AUTH enforced in the reviewed handler where needed. The production-origin CORS preflight returned HTTP 204. Transactional-email and Stripe-webhook both remained active at v15 with unchanged digests. Direct Aftercare database mode is off and no Direct Edge handler was published. Manual Aftercare UI remains in the served bundle. Operations is OPEN, the legacy tariff is active, and new rates, automatic Stripe fee retrieval, Commerce, full IRONCLAD and OMNISCIENCE were left inactive.

## Static production publication

Cloudflare Pages `apparition-instruments:production`, canonical deployment **`17e4c767-75da-4e2c-8505-892a56713f0f`**, status success and source `cc34aa5ae5326134dbc215af673b5132c45da29c`; public origin https://apparitioninstruments.co.uk/. Source run [44086149319](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44086149319), artifact `14329886408`; exact ZIP `ac7b361723c2eea4b75fb4b9c6827ae542ae36c7a8f6bcdf2b84c0365f6ea023`. Composition SHA-256 `9974858e8b6e62fb34450d47b3872ecb55a53e18b0c15f1b7d87e4e585548998`; static inventory SHA-256 `bd70e3bec8effff31a60688e23ea6a90643e5125915b46a7b30265d86670e9ae`. All 476 files verified, with 33 intended changes. The exact reviewed manual workflow was the only changed path on main (`e6c13d17694dc07c8ccc51408942af586d588af9`) and the publisher branch (`57bf5ff75f1c68370675e59d73da8ca77fe73d7f`), workflow blob `f60f0513d15e0031a255d75326370954dc444106`. Registration did not publish the app.

The single [publication run 44529917775](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44529917775) passed its production gate and pinned package validation. Cloudflare completed deployment at approximately 13:06:31 GMT. The workflow then marked failure on its first `/admin/` byte comparison (publish job `135580890017`). Subsequent independent production reads served the exact pinned `/admin/` bytes (different from the previous deployment) and all 15 other targeted assets. The initial response body was not preserved in that workflow; the exact reason for the transient mismatch is unproven. The run was not repeated. Independent provider readback verified the new canonical production ID, source SHA and live custom domain; every URL below subsequently returned HTTP 200 and exact bytes from the verified ZIP.

| Public path | Observed SHA-256 |
| --- | --- |
| `/` | `48eba7593d390a109dcb15e62eead0a605db390d894284718f53a45fb632c930` |
| `/admin/` | `2d680499d22684c80cfb95f0bd0ab2a92fce7e7654e8e928c0be5f79f32b36ea` |
| `/admin/admin-gate.mjs` | `cc4c8ff18a25ddb7721c7775681dc2e9399635734c8d09d10c9e955c46700328` |
| `/admin/delivery/` | `92614bd21d41a495a2ad2fc8ba448f50b313a2dbfa644c54ac82a13f50fc32b2` |
| `/admin/ironclad/` | `4680f5e8ad7518bafc49de5604798787b9fc6f45c21dd046f057093df036839b` |
| `/admin/orders/` | `f094df839b1ad1ec29dded986b12d10ba3715221c20f1c5a3f387c11a3015b24` |
| `/admin/orders/customer-aftercare.mjs` | `a67b5c80bdf539f94cc0f5712e1176435f5f0de649a37f726b8329c624f0dad7` |
| `/admin/orders/eclipse-settings.mjs` | `f41429e4a36bd37cc5baa5d596f5b22f453b6e6d0192d7a74e213bca8b63b84d` |
| `/admin/orders/eclipse-ui.mjs` | `cba6b96f2923413847cc83d903d1163d6d635022127d0402cb5a90fa89fc0d05` |
| `/admin/orders/order-date-correction.mjs` | `2150996a8e4b538408348814aec1b0f373967bd6084ab71171af711eefe9c88a` |
| `/checkout/` | `82f19b5c42c6464dc5295e32fdd32982f8d7048306b3e8dedbb733c8c1cab235` |
| `/checkout/checkout.mjs` | `4ce96cf5f1d111a15f7ad3c1c41e9af0a5ac83eb742b245ccc1130fd248f3064` |
| `/components/` | `881a8151416ca1b1c06d04d9322a00af23eb33e5713899cfdc1786aa069f0ceb` |
| `/operations/snapshot.json` | `fd5709af3c61bc8dfc945558ad805559845dacb9380f8451ce2cb8887d1d90b2` |
| `/products/bleed-cap/` | `4c4f8788d5691aa17d97c3107b70d6596e226aba6b5f4d167318e60e7e58a8b4` |
| `/products/bleed-cap/image.png` | `70e19fa835d6da870e73a85a209dc20ead47f9687c26fafe277ecab366a1278e` |

## Rollback and authenticated walkthrough

The immediate Cloudflare rollback `41fab337-e7df-499f-9292-fef300e46fe7` was independently rechecked as an available successful production deployment. The full rollback package remains artifact `14327320952`, ZIP `52f876edfba409ef1442eceae9a283b0024b53f2a195711f43113b0d6dd43cfe`. Checkout rollback remains the preserved v15 two-file closure; its original provider bundle was `b4cd49962cc53a594d119320e3b8ffab26890ef6b29da4d89e0d9423167081dd`. Both v15 files matched the live checkout immediately before v16 and are in the private handover. If required, use Cloudflare rollback and/or redeploy just the preserved v15 source with prior settings, then verify independently. Preserve additive schema, records and financial revisions. No rollback was required or performed.

For the remaining owner-session acceptance, sign in at /admin/, open Delivery Command and confirm the legacy tariff, then open an existing order and inspect commercial date history, ECLIPSE, existing finance revisions, the Fulfilment Cost Library and manual Aftercare. Direct sending should say off. Verify Armoury remains the landed-cost calculator if desired. Do not save, activate, correct or send for this walkthrough. Release B requires separate authorisation and a fresh verified baseline with this release as the immediate application rollback if still current. Release B and C were not executed.

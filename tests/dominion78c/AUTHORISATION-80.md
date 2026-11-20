# IRONHEART 80 integration and release boundary

**Scope:** isolated engineering on `engineering/dominion78c-foundations` only. No production mutation, provider call, publication or physical printer test. Release C remains live; owner's first signed-in OMNISCIENCE checks looked good and the fuller weekend check is still outstanding.

## Physical stock writers

On 20 November 2026 the production function names, fingerprints and Orders/Inventory trigger metadata were checked in a short read-only transaction. No business rows were queried. Accepted contracts were recreated in disposable PostgreSQL 17.6. The single physical quantity remains `public.inventory.quantity`; the IRONCLAD tracking trigger retains its batch, measurement and movement responsibilities.

| Path | Actual transaction and idempotency boundary | Isolated result |
| --- | --- | --- |
| Legacy component editor | Release C `backend/component-data.mjs`: Admin-filtered Inventory PATCH compares current quantity; new component creates an Inventory row; unused delete invokes `delete_unused_component`. Existing RLS requires explicit Admin for writes. | The reservation trigger blocks a conflicting quantity update. The exact legacy delete RPC aborts while a referenced hold exists. The separate Catalogue metadata edits remain on their existing boundaries. |
| Stock adjustment / stocktake | `ironclad69_write` request UUID and revision/count checks -> `ironclad69.change_qty` -> Inventory update -> `ironclad69_track`. Stocktake is one guarded transaction. | An adjustment and stocktake against held stock roll back; no partial movements. |
| Procurement | `ironclad69_write` `quickPurchase` -> PO, ordered, receive; request replay returns original batch. Inventory tracking stores acquisition batch and receipt history. | Receipt during a live reservation increases physical and usable quantities without changing the hold; duplicate receipt doesn't add stock. |
| Quality and measurements | Existing measurements, set membership and batch guards; no parallel stock counter. | Actual allocated set consumed only when retired IDs match. A newer non-FIFO set can't be proved by the legacy depletion rule; the sale, stock and provenance changes all roll back. An actual bench scan is still a release requirement if claiming physical unit traceability. |
| Website quote and order | `create_guest_kit_order` validates configuration and pricing, fills the saved BOM and binds request UUID, without retiring stock. | Real Les Paul builder snapshot validates and reaches stock and packing through the isolated paid route. No live Checkout calls. |
| Paid stock retirement | `fulfil_paid_stripe_checkout` locks Orders, validates saved payment and intent, and calls `apply_order_inventory` once with saved items. `dominion79.consume` owns reserved order transitions. | Replays coalesce. The legacy call cannot bypass the reservation even when physical slack would otherwise permit its earlier Inventory update; order guard failure rolls the transaction back. Reviews and unmatched late payments do not retire stock. |
| External order creation / edit | `create_external_order` locks request UUID and channel plus external reference, then creates Orders and immediately retires its saved BOM in one transaction. `edit_external_order` is revision/time-guarded metadata only. | An external order blocked by a hold creates no record. A valid retry completes and a second retry doesn't retire again. Marketplace import stages evidence only. |
| Fulfilment, dispatch and returns | `advance_order_fulfilment`, `correct_order_fulfilment`, `record_order_dispatch_details` act on the existing Orders state/history; `record_verified_stripe_refund` uses provider refund/event IDs, with partial acknowledgement before progression. None are stock adjustment paths. | The exact refund RPC replay produces one refund record; advancing an acknowledged partial refund does not change quantity. Packing and partial picking do not mark dispatch. Refund evidence does not put physically returned stock back automatically. |

## Pack-to-finance

`ironheart80.sql` adds one-order Admin lookup with no buyer PII, BOM and availability evidence, partial pick progress with request replay and stale-view rejection, and verified postage receipts. Existing packaging code owns lot, reservation, completion and cost. The packing transaction cannot complete until every saved BOM line is confirmed and the current partial refund has been reviewed. The fixture Admin workspace uses the real lookup, shows current availability and separate actual/estimated costs, and checks available packaging against measured contents. No published navigation or automatically sent communications.

`finance80.mjs` prepares an explicit ECLIPSE revision proposal from packing evidence, without overwriting confirmed costs or historical preset snapshots. Estimated postage stays outside actual finance. The actual BLACK LEDGER save RPC and OMNISCIENCE reader were exercised in the fixture; a stale basis or replay cannot duplicate a cost entry or modify an earlier revision. No automatic finance save was enabled.

## Smallest proposed deployment, not approved here

1. **A, disabled additive database:** The exact proposed `ironheart80-stage-a.review.sql` starts with `paused` / `disabled`, has no holds, no callable functions, no application triggers and no replacement of existing writers or grants. It contains only private RLS-protected tables and indexes and asserts the expected checkout, inventory and external-order fingerprints. Foreign keys reference existing Orders, Inventory and IRONCLAD tables; review the transient lock impact and the internal referential-integrity triggers. Reconfirm current dependency identity and rollback before requesting explicit migration authority. The full runtime fixture migrations still refuse all other databases.
2. **B, read-only Admin:** Package only UNITY/QUARTERMASTER evidence views against the accepted Admin. Exclude Marketplace routes, provider adapters and write controls. Exercise authorised and denied sessions, verify current stock and financial fingerprints and retain the same static rollback.
3. **C, controlled writer:** Separately approve the reservation and packing activation with actual writer inventory, owner-selected bench evidence, audit and rollback rehearsal. Treat unexpected historical shapes and unproven non-FIFO picks as explicit review states. Stage C requires production-ready hooks and permissions; today's fixtures are a tested integration candidate.
4. **D, provider:** Before Checkout or provider activation, bind verified Stripe Sandbox expiry/attachment and signed payment handling and reconcile older partially attached sessions. eBay remains a separate read-only OAuth/signing authorization and cannot post stock. Keep the current checkout and its tariffs as fallback.

To stop an activated pilot, freeze new holds first, leave verified settlement/release and protections running, and reconcile each in-flight reservation against the provider. Expiry alone is never proof of nonpayment. Restore the accepted Release C static application `f290e564-6dde-4123-a349-997c70308729` if it remains the immediate prior release; remove experimental hooks only after zero unresolved holds and a reviewed writer drain. Preserve legitimate purchases, payments, stock movements and financial revisions. No data rewind.

The only present owner tasks are the fuller OMNISCIENCE walkthrough and the optional label proof check. Print the A4 proof at 100%, measure the 50 mm bar and a circle, then test the four types on 50 × 50 mm round Niimbot M2 stock for centring, legibility and edge clearance. Until then the output is a layout proof only.

## Immutable acceptance

Tested commit `67509b42be3e193beb6b1499f71e5bf67d154afe`. [Run 44730265444, job 136267901071](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44730265444/job/136267901071) passed all 15 JavaScript tests, native PostgreSQL 17.6 integration and Chromium against the exact Release C shell. The Stage A schema was applied and audited in a transaction in the isolated database, then rolled back; all its database objects were absent before the full runtime fixture began.

| File | SHA-256 |
| --- | --- |
| `ironheart80-stage-a.review.sql` | `1e4f79c5a4e321b0e80450b10adf72b80ae3adb5b51dc1c09554c3811e6942de` |
| `unity79.sql` | `4607a5c8c894f1d313f4a8868763f3892048a759ee675c883d79441c230e2248` |
| `ironheart80.sql` | `1d1fb070938cdd7f1d531401883d8c7a83ae111e3be1115f06df03df1e1076dc` |
| `quartermaster79.sql` | `208cf52b19d4033390bb59b84319647966475118891ec585753b2e0a5ef1b81d` |
| `finance80.mjs` | `7881012bbb140743dc8c0423d3cc396024bd42aac3cfabb3d2b168793ff0fcf6` |

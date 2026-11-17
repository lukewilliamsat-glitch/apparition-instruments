# IRONCLAD: The Forge (69A)

Routine procurement now opens in a separate editor from a compact reference, supplier and status toolbar. GBP hides conversion input. Quantity is the default basis for allocating shared costs, with value or explicit allocation available under Advanced. Cost calculations remain authoritative on the server. Parts are suggested only if ordered or received purchase lines agree for that supplier/component. Draft saves are revision-checked; ordered or received lines are immutable. Cancel/reissue an unreceived order or use a separately authorised adjustment for a partially received one.

Quick purchase reuses the normal draft, order and receipt actions inside a single transaction. Stock never increases outside the receipt. A repeat request returns the original receipt; a supplied purchase reference is unique for its supplier. With no reference the server derives one from the purchase payload. Add a distinct real supplier reference for an intentionally identical second purchase. Notes do not change the computed reference. Receipt records keep the effective date separate from the immutable recording timestamp.

## Allocation boundary

Physical inventory stays in `public.inventory`. Accepted measurements may be maintained against eligible saleable stock without decrementing it. The IRONCLAD private unit registry owns its bench commitments and quality holds. Protected quantities are restricted to isolated non-saleable components; public product, kit and checkout paths cannot be allowed to consume those units. Relisting remains guarded. No new Commerce allocation path is activated.

The reservation adapter returns zero and reports Commerce disabled if the deferred schema is wholly absent. Installation drift is not treated as an empty reservation state. Where that schema exists, the adapter reads its actual holds and blocks bench commitment while Commerce is on. A shared saleable unit-allocation contract still has to coordinate reservations, public availability and both legacy and Commerce fulfilment before bench sets or holds can be attached to saleable units. The live release must not enable the two engines independently.

Unknown opening batches can receive one separately audited, date-stamped acquisition basis backed by actual evidence. The captured original quantity and amounts remain intact. ECLIPSE can use the existing direct-component evidence path; no saved financial revision or historical acquisition snapshot is restated. Exact measured-unit, set, fixed assembly and configured-kit attribution remain deferred pending an order-to-unit/BOM allocation contract. QR labels and stocktake coordination beyond 50-item scopes remain deferred.

## Staging and production

| Order | Repository migration | SHA-256 | Supabase staging history |
| --- | --- | --- | --- |
| 1–2 | The [two baseline migrations](README.md) | See baseline | See baseline |
| 3 | `20261117115654_ironclad69a_procurement_v2.sql` | `804b43a8d9baa147d95fc9a6209009fbcd0af420f27d5e8d450126b698ed434f` | `20261117120143` |
| 4 | `20261117120217_ironclad69a_scoped_draft_access.sql` | `18bcee8c849f80049eb06cc74457a744624a572f65916ba5ec36781a3de42e82` | `20261117120257` |

The two previously accepted baseline functions contain legacy Commerce references, so never expose them between migrations. For full production activation, verify ANCHOR, review the production schema and test the complete exact package in order on a production-shaped replica without Commerce, compare stock invariants, and obtain approval for the exact checksummed migration package. Keep checkout, ECLIPSE/OVERSEER release authorisations and Commerce independently gated.

The separate, front-end-only overlay is an Admin-gated cost estimator and live Inventory link. It contains no fixture, purchase transport or storage, and makes no change to inventory, Orders, website tools or database schema. It is composed on the exact current Operations Ascendant artifact, with its current deployment as the rollback point. No publish of the protected fixture as live Admin is permitted.

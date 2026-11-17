# AUTHORISATION 68A: Order date correction and owner acceptance

## What the date means

The correction changes the existing UK commercial calendar date on an admin-recorded eBay, Direct or Other order. Website orders and orders with Stripe checkout or payment identifiers cannot be corrected through this route. The current date, updated date, reason, authorised actor and correction time are appended to history. The update is locked to the current order version, and an exact repeat of the same operation returns without another mutation. No date can follow the UK business day of recorded creation, payment or fulfilment. The operation updates only the commercial date and the normal order revision timestamp; it does not change recorded payment, allocation, dispatch or any finance data.

Orders and the Marketplace Economics report use the same commercial-day calculation. Paid website orders use the London day of the recorded provider payment; pending website attempts fall back to record creation. The invoice remains on its existing date source. No Orders sales export is implemented in this candidate; there was no export route to update. Finance snapshots and settlement evidence are unchanged. A corrected sale can move reporting month without affecting its amounts.

## Staging

Apply only to stage project prwmowexhonguvtiywsy under this authorisation. Migration: 20261117095412_overseer_order_date_correction.sql. SHA-256: d2d1fb5ec06b1b0f4a62932076dc26e7c8eba38cbc544c03c783028a711cb4bd.

Staging proof in tests/overseer68/order-date-staging.sql used the existing synthetic external order and staged Admin and buyer identities under PostgreSQL role and JWT claim checks. It verified the date correction across months, idempotency, rejection of a stale editor, buyer rejection, website rejection, chronology, required reason, history and unchanged order payload, financial basis, inventory and mail. A separate read-back confirmed persistence. This test did not open an authenticated hosted website session.

## Four-workstream owner walkthrough

The protected visual preview is fictional, including all display amounts and mail recipients. Order date corrections there are written only to the current browser. The separate SQL evidence above uses the genuine staging database. No external mail transport is accessible in the fixture.

1. Delivery Command: open the workspace, calculate £25 and £50 example baskets, edit a method, save the draft and review activation. Check the result and history.
2. Aftercare Direct: open the fictional eBay message, choose a template, render the preview, confirm the recipient and record an internal test. Check the receipt and Message history.
3. Operations Ascendant: inspect the scheduled state and customer notice, cancel the fictional schedule, then filter Recent activity.
4. Order date correction: open AI-068101, choose Correct order date, select 31 October 2026, enter a reason, acknowledge the month change and save. Check October and November totals, reload, then open Order date correction history. Reset fictional order clears only the preview fixture.

## Independent production release gates

- Operations: see README.md; verify current provider policy and a frontend rollback, then release only under separate production authority.
- Delivery: see README.md; verify the migration and pricing hook against the current baseline, deploy with existing rates preserved, and activate a new configuration separately.
- Aftercare: see README.md; verify the exact sender and eBay relay by separately approved controlled transport tests before any sending. Keep the two activation gates independent of browser publication.
- Order date: inspect current Orders grants, external channel invariants, triggers and BLACK LEDGER order basis without writing. Obtain separate production approval for the exact migration and UI payload. Apply the additive migration first, verify privileges, then publish the Orders bundle. Use only a separately named synthetic production record for any write acceptance. Rollback the UI and revoke the two RPC entry points if necessary; retain the append-only history and all corrected business dates. Never roll back a customer order by mutating its recorded timestamps.

Commerce, Stripe Sandbox and the live store state are out of scope.

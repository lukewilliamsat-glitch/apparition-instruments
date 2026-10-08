# External Order Editing V1

Admin Orders → external order → Edit Order. Customer email is optional, normalised on save, and can be added after dispatch. Saving metadata never sends mail or changes stock. Concurrent stale edits are rejected; refresh before editing again.

External fulfilment uses the existing forward-only state machine. At dispatch, a valid email prompts Yes (dispatch and explicit request), No (dispatch only), or Cancel (no mutation). Without email, dispatch proceeds without notification. After dispatch, Send Dispatch Email confirms a direct customer recipient. Marketplace relay addresses are not supported. The administrator must have permission to use that address for this communication.

The existing `order_email_deliveries` ledger stores one explicit dispatch request, frozen recipient/order snapshot, Admin actor, claim, attempt and outcome. Existing SMTP credentials and the dispatch template are reused. Sent means mail-server acceptance, not inbox delivery. Sending/claimed, Failed and Unknown require review: no automatic retries and no resend. A network loss after claim/SMTP never permits another claim. Legacy dispatched orders without evidence show Unknown until an explicit request. No historical backfill occurs.

Item/quantity/price amendments are unavailable. The current inventory engine supports original deductions, not audited amendment deltas; adding that ledger is deferred. Native website fulfilment/email paths remain unchanged; explicit external records cannot enter the automatic scheduler.

Backend: additive migration `external_order_editing_v1`, existing transactional-email function gains authenticated `/external-dispatch`. Metadata/request RPCs require current Admin membership; claims and result recording are service-only. Existing ledger RLS remains enforced. All development fixtures run locally with mocked delivery. No production business rows or customer emails are used for deployment verification.

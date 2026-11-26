# CONVERGENCE 92 recovery

Stop new reservations by moving the singleton lifecycle control from accepting to draining, and require one returned row. Keep the signed receiver and receipt lookup running for sessions already issued. Local time or browser abandonment does not prove nonpayment.

Read the existing durable plan before creating or resuming Checkout. Its binding and idempotency key identify the one provider request. An uncertain create must be reconciled through that same key or existing Session. Attach only a provider object that matches the saved order, amount, currency and binding. The guarded attachment updates the order and plan in one transaction.

For uncertain settlement, inspect the signed receipt, provider Session, hold state, batch provenance and inventory movement before retrying. Receipt replay returns duplicate. A consumed hold and one physical movement establish stock disposition. Payments on resolved holds require manual review and preserve existing quantities.

Refunds use the existing verified Stripe refund writer. Duplicate refund IDs reconcile once. Money refunds never replenish stock automatically. Restore inventory only through the separately controlled physical return workflow.

Application rollback preserves all committed orders, plans, payment and refund evidence, batch history and financial revisions. The immediate application fallback is NOCTURNE 91 deployment 04971be9-6d8a-42f2-bad5-ae553dc8aeb6. Keep the original live checkout writer and v16 checkout, v10 status and v15 webhook until separately approved cutover.

The staging-only archived commerce67 schema remains private and its two triggers remain disabled. Re-enabling it requires zero unresolved UNITY holds and provider Sessions, then the archived definitions and original grants must be reviewed. Restoring two reservation authorities concurrently is unsafe.

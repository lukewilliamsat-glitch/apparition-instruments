# UNITY 93 activation package

Production activation is not authorised by 93. This package changes no Cloudflare static bytes and retains canonical `9a69e1ab-59fa-44e6-9e7e-03ed50d3d175`. NEXUS, NOCTURNE and OM-AUTO-002 stay closed; constituent acquisition costing stays separate.

## Fresh preflight and custody

Require production UNITY paused, QUARTERMASTER workshop, expected 92 application, original checkout v16, status v10, webhook v15 and email v15 before installation. Pin original paid writer MD5 `bb9667b96e2aa3d8a557863434463294`, create-order MD5 from `create-order.accepted.sql`, and catalogue view MD5 `16626212b80b5685c88aa75fe6bcdd24`. Require the expected unused foundations, no competing reservation authority and zero open UNITY holds. Stop on drift.

Reconcile every unpaid pending legacy website Checkout Session with Stripe before enabling new holds. Use bounded pages, verify account, amount, currency and Session identity, retain payment/expiry evidence and drain uncertain Sessions. Do not infer expiry from local time or fabricate production transactions. This live-provider reconciliation is a release-time gate; no live Stripe operation was used for isolated testing.

The existing live `STRIPE_SECRET_KEY` stays server-side in create-checkout. Register exactly one new live signed endpoint at `/functions/v1/convergence93-webhook`, after proving no prior successful registration exists, and pipe its signing secret directly into encrypted production Vault name `convergence92_webhook`. Do not overwrite existing custody or expose values. The old endpoint and its `STRIPE_WEBHOOK_SECRET` remain unchanged. New checkout and refund events use the existing version-pinned types. Do not retry uncertain registration.

## Exact installation and cutover sequence

Every path is relative to the sealed ZIP. Use one migration per reviewed step, recording the actual receipt; do not reinstall successful steps.

1. `convergence92/runtime.production.review.sql`: runtime and existing IRONCLAD bridges, paused. Includes authoritative provider expiry correction; keep private tables and functions closed.
2. `convergence92/plans.production.review.sql`: immutable private checkout plan store.
3. `convergence92/webhook.production.review.sql`: original bounded signed receiver.
4. `convergence92/checkout.production.review.sql`: service-only transactional prepare/attach.
5. `convergence93/receiver.production.review.sql`: signed legacy coexistence and existing contact-save contract inside settlement. It uses the already installed `save_stripe_order_contact`; do not reinstall that accepted writer.
6. `convergence93/availability.sql`: preserve public catalogue columns, row filter and grants; subtract held/quarantined/allocated stock without exposing private reservation rows. Verify genuine read-only GET semantics.
7. Deploy new `convergence93-webhook` with `convergence93/receiver.production.review.ts` as `index.ts` and `convergence93/legacy/*` under `legacy/`. Signature verification remains mandatory; gateway JWT is off only because this is a signed Stripe webhook. Existing confirmation claim/send/finish contracts are reused after paid or duplicate settlement.
8. Deploy the existing `stripe-webhook` using `convergence93/legacy-router.production.review.ts` as `index.ts`, with every other accepted `legacy/*` file at its original root name. The signed old handler acknowledges valid UNITY-bound Checkout events without invoking its legacy stock writer. Its legacy contact, payment, refund and confirmation paths are preserved.
9. Assemble `create-checkout` with `convergence92/create-checkout.production.review.ts` as `create-checkout/index.ts`, `convergence92/session.mjs` as `create-checkout/session.mjs`, and `convergence92/customer-auth.baseline.ts` as `_shared/customer-auth.ts`. Initially use `create-checkout/index.ts` as entrypoint with no `UNITY92_CHECKOUT` flag; it retains the exact original v16 path. Do not copy the staging wrapper, fixture restriction, test credential reader, test data or Sandbox credential into production.
10. After fresh native/provider/security gates and complete legacy drain, compare-and-set the singleton from paused to accepting, requiring exactly one returned row. Activate the same bundle with `convergence93/activation-entry.production.review.ts` as root `index.ts` entrypoint. Existing environment keys are reused; no new live API key or browser credential is required. A cutover failure must freeze new reservations and inspect actual deployment/state before any retry.

Anonymous checkouts use one server-assigned `guest:checkout` owner key: at most three concurrent guest holds across the shop. Rotating basket UUIDs cannot evade that bound. Authenticated accounts retain the existing per-account cap. Expiry is 45 minutes for new plans; elapsed time never releases an uncertain payment. This conservative global guest limit is part of the proposed production composition, not a per-IP or bot-proof claim.

## Protected execution contract

Register `production-gate.review.yml` as `.github/workflows/unity93-production-gate.yml` only under the separate production release authority. Dispatch on `engineering/convergence92` once, with `execution_confirmed=true`, exact accepted `approved_source`, `acceptance_run`, `artifact_id` and `candidate_sha256` from the release register. The existing `phoenix66-production` gate must pass. The gate verifies provenance and records protected approval; it does not claim to install SQL or deploy Edge Functions. The connected release executor performs the exact steps above within the same separately authorised release, refreshing actual state between checkpoints.

## Drain and recovery

Compare-and-set accepting to draining before recovery; require one returned row. New reservations fail closed, existing plans resume their original Session and idempotency key, and signed settlement/refunds continue. Inspect provider Session, raw-signature receipt outcome, order payment, hold, physical inventory, batch movement and provenance before retrying. Provider-confirmed unpaid forced expiry may release before the original local deadline. A paid or resolved hold cannot release or consume again.

Do not restore unreserved legacy checkout while unresolved UNITY Sessions or held stock remain. After complete drain, restore original v16 checkout and original v15 webhook from the sealed accepted baselines. Keep the new signed receiver for historical payment/refund recovery. Preserve additive schema, paid orders, physical movements, contacts, financial revisions and audit history. Restore public availability only through the reviewed original view after no active holds or measured-unit protection would be hidden. Static rollback remains the existing 92/91 application receipt; this release introduces no static publication.

Owner acceptance uses the first genuine business order after separate activation, including saved address, once-only confirmation, order/stock evidence and existing packing/finance workflows. No artificial live payment is required.

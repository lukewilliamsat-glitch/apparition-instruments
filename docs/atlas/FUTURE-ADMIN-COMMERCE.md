# Atlas roadmap additions — requested, not implemented

Authorisation 19 formally records these owner requests. No Admin, checkout, database, Stripe, product-image storage or customer-facing code was changed for them.

## Product image galleries

Multiple images per product; primary image selection; reordering; thumbnail gallery; full-size viewing; per-image alt text; upload validation; image optimisation; safe replacement/removal; appropriate dimensions/MIME/byte/hash/version metadata; independently cacheable static delivery; **no base64 image payloads in routine catalogue JSON**. Preserve originals and previously published versions until a separately approved retention policy. Trusted capture/archive/manifest publication must complete before a public reference activates. Admin URLs are not authoritative writable image values; failed publication must not discard the current photograph.

## Shipping administration

Editable postage rates, shipping methods, destinations, free-shipping thresholds, appropriate shipping classes, server-side checkout validation and audit history. Audit current commerce_shipping, order delivery pricing and Stripe session creation before choosing schema/UI. Agree effective dates and reproducible order totals. Existing orders keep their applied shipping price; changing rates cannot rewrite history. Public display may be cached; server checkout decides eligibility and final amount.

## Discount management

Percentage and fixed-value discounts; free-shipping codes; minimum spend; expiry; usage limits; product/category eligibility; activation/deactivation; redemption tracking; Stripe checkout integration; server-side validation; prevention of unauthorised stacking. Audit current data model, refund/payment and idempotency flows first. Use one authoritative eligibility/redemption policy and a clearly defined Stripe representation; do not create competing Supabase/Stripe sources of truth. Concurrent usage limits, retries, abandoned sessions, refunds, currency/rounding and historic order totals need isolated fixtures and explicit business decisions.

## Implementation gates

1. Audit current authoritative checkout/data model offline, then separately approved read-only reconciliation as needed.
2. Agree owner workflows, schema/contracts/security and audit requirements; prepare exact migrations/privileges for review if required.
3. Implement isolated fixtures and server validation before public forms; no live customer test orders/emails.
4. Separate asset bootstrap, backend changes, frontend publication and activation approvals. Preserve baseline/rollback and cross-feature regression for Admin, checkout, inventory, email, Studio and Forge.

These are future engineering phases, not additions to the Phase 2A tooling implementation. No new notification channel, auto-email, asset deletion, production secret or payment behaviour is authorised by this roadmap.

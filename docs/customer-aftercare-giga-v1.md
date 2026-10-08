# Customer Aftercare GIGA V1

Starting canonical HEAD `aac8ae559c3a53d666d4845776c9fdfb0dc64595`, tree `3a859a37abd6e09d98bf8bd3bd073119a57cccc1`.
Isolated worktree: `/workspace/scratch/47dd7656a6b9/customer-aftercare-giga-v1`. Preserved Email Preview branches and Forge candidate remain untouched.

## Reminder and policy

Seven calendar days after the latest valid recorded dispatch transition, using the dispatch timestamp's Europe/London date. No invented dispatch timestamps, business-row backfill, timer, scheduler, bulk action, or automatic email. Missing/invalid/future dispatch dates, unpaid/refunded/cancelled/undispatched orders, and unreviewed partial refunds are blocked. Redispatch history changing an existing aftercare record requires review; it does not create a second successful follow-up.

State is lazy: untouched reminders are derived read-only. `order_aftercare` stores only explicit reschedules, handling, skipping and email states, with actor/reason/timestamps/history. Existing `order_email_deliveries` owns email recipient, template/operation identity, actor, attempt and provider outcome. Copying is not sending or completion. Failed/uncertain attempts never retry automatically; manual resolution can be recorded without rewriting the original attempt.

Policy checked 8 October 2026 against primary sources:
- eBay UK spam policy: https://www.ebay.co.uk/help/policies/member-behavior-policies/spam-policy?id=5033
- eBay member-to-member policy: https://www.ebay.co.uk/help/default/default/membertomember-contact-policy?id=4262
- Contacting a buyer: https://www.ebay.co.uk/help/selling/selling-getting-paid/find-contact-buyer?id=4083
- ICO service messages: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/identify-direct-marketing/
- ICO electronic mail marketing: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/

Inference: a brief message about the purchased order offering installation support fits an order-related support purpose. V1 removes suggested general resource promotion, purchasing invitations, discounts, feedback requests and slogans. This does not establish consent to promotional marketing. Website/direct messages are manually confirmed support only. eBay aftercare relay delivery is deliberately disabled: dispatch relay permission is not treated as permission for courtesy follow-ups. eBay drafts include no links/contact addresses and are copied into the original order conversation only. OTHER/missing direct recipients require external handling. Admins must respect any buyer objection or conversation restrictions and skip instead of messaging when inappropriate.

`aftercare_email_suppressions` provides durable recipient-wide support follow-up suppression; the Admin action records the customer's contact preference with a reason and skips the current reminder. Server also honours saved `aftercare_opt_out`/`do_not_contact` true flags. No marketing mailing list or segmentation is created. Suppression applies to aftercare only, preserving essential transactional order messages.

## Security and preview

Reuses the current preparation/confirmation handler, signed identity, ten-minute expiry, renderer/content hash, actor/order/kind binding, isolated iframe and explicit recipient confirmation. Preview is read-only and uses real saved order data. eBay/OTHER preparation omits underlying buyer email and delivery address. Direct relay transport is blocked server-side and in atomic SQL, not only hidden in the UI.

A service-only confirmation locks the order and recipient suppression boundary, rechecks the entire snapshot and eligibility, and claims one original aftercare ledger row. The existing automatic eligibility kind allowlist excludes aftercare. Existing provider mark/finish functions are reused; a small atomic finish wrapper updates reminder state and ledger together. Provider acceptance is not inbox delivery. Lost claim/finish transport requires audit review and never automatic resend.

All new tables use RLS, with Admin-only SELECT; browser writes go through explicitly guarded RPCs. Internal state/claim/finish functions are service-only. SECURITY DEFINER functions use empty search paths and explicit execution grants. Intentional Admin-facing wrappers can produce the generic advisor notice https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable .

## Acceptance

Without sending: open Customer Aftercare; inspect Due/Upcoming/Completed/Skipped/All and UK dates. Open an eligible due order, check exact recipient/subject/HTML/plain text and cancel. For eBay copy a draft, confirm no send/completion is implied, and inspect the message in the order conversation manually. Check reschedule/skip/handled only when intentionally updating the reminder; do not change business orders to test. Respect objections via contact suppression. Confirm sending only as a real owner-approved support action.

## Durable checkpoints

Checkpoint A: `03c104f30db5e8dd5ae1acf97657c2e058546fe1`, tree `e51deb1d050dcb19676ef519b179ebfb56fd0d83`. Isolated model tests passed before preservation.

Focused verification: `aftercare-model.mjs`, `aftercare-backend.mjs`, `aftercare-admin.mjs`. Tests use ephemeral PGlite and DOM fixtures, mocked SMTP, and no production customer data.

Checkpoint B: `f11204cf85254aeb3fb4bf4d627a6a8297b3b212`, tree `b3782b7a094daec350345f8b530d88ed667f45d0`. Shared review dialog, actual server templates, queue, panel and manual actions preserved locally; no intermediate publication.

The Orders page treats aftercare read failure independently: core Orders continues working, while aftercare is unavailable with no follow-up actions. This was verified with the actual entry module. The only shared dispatch presentation change is omission of placeholder tracking references (N/A/none/not available); real carrier/tracking handling and approved existing output remain covered by regressions.

Final relevant gate passed: aftercare-model, aftercare-backend, aftercare-admin, aftercare-orders, email-preview-backend, email-preview-admin, email-preview-dispatch, fulfilment-email-v1, external-order-editing-db, external-order-editing-admin, external-order-editing-email, p08b4-email-experience, external-orders-db, external-orders-admin. Approved existing website template byte hashes, existing eBay branding/relay restrictions, first/resend behaviour, fulfilment corrections and external editing passed. Git whitespace check passed. No production business rows or real mail were used in testing; schema/code scope and isolated before/after snapshots establish this pass's data safety, not a global production checksum.

Checkpoint C: `7a58361a602441f7777d08e00c1150c51ae4ac17`, tree `8baaa7d7266a27b65f4b7b292e5c778ef39b751c`. All 14 focused/regression suites passed before backend publication.

Production migration history assigned version `20261008143829_customer_aftercare_giga_v1`; the canonical migration filename is aligned to the applied version with unchanged SQL. New table RLS and grants were read back: no anonymous SELECT and no direct authenticated writes.

Production transactional-email is ACTIVE version 12. Custom Auth/Admin checks and the existing verify_jwt=false setting are retained. All five reachable deployed files match tested local source. All eight new function bodies match the migration byte hashes; roles/grants and empty search paths were read back. The three Admin-facing SECURITY DEFINER wrappers retain explicit current membership checks; their generic advisor notices are intentional. Schema and function deployment did not execute production reminder actions or send emails.

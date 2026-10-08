# Email Preview GIGA V1

Starting canonical commit: `8e810bbe43f3500faa19c817e243b8f296967218`.
Starting tree: `c2fea63138ca496dae7afed86bd58688d861cffb`.
Work uses a new isolated checkout, with canonical ancestry; the older fulfilment checkout and protected Forge candidate are unchanged.

## Authority and exact content

`transactional-email/prepared.ts` extends the existing Edge function with Admin-only `POST /prepare-dispatch` and `POST /confirm-dispatch`. The existing `renderEmailV2('dispatched', ...)` supplies subject, HTML and plain text. Its source file and approved website/eBay output are unchanged. Provider submission receives the same prepared message object after confirmation; it never accepts browser HTML, items, totals or recipient overrides.

Preparation calls `get_dispatch_preview_context` under the current Admin JWT. This read-only RPC checks current payment/refund review, fulfilment, saved-recipient marketplace policy and first-send/resend eligibility. It does not claim, insert or update a ledger row. A ten-minute HMAC-SHA256 identity is signed with a domain-separated existing server secret. It binds actor, order, mode, unique operation ID, expiry, template identity, SHA256 of the entire authoritative order/dispatch ledger context, and SHA256 of subject/HTML/text/recipient/sender/renderer source. No permanent preview storage or new tables are needed.

Confirmation verifies current Auth identity and Admin membership again, then signature, expiry, binding and current content/state. Service-only `confirm_dispatch_preview` locks the order and dispatch ledger, rechecks eligibility and JSONB snapshot equality, and atomically freezes the reviewed recipient/order and claims the existing notification ledger. A first send stays an original record; a resend has its own operation ID, reason and reference to the latest successful notification. Existing attempt/result functions record provider acceptance, failure or uncertainty. Pending/claimed/failed/uncertain attempts cannot be converted into resends. Lost transport after a claim requires audit review and never auto-retries. Legacy direct sending is rejected; legacy dispatch-without-email remains available.

The authenticated SECURITY DEFINER preparation wrapper is deliberately Admin-guarded with an empty search path, explicit grants and no anonymous execution. Internal state/confirmation helpers are service-only. This follows the existing Admin RPC boundary; the advisor may flag the intentional authenticated wrapper generically: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

## Admin workflow

Communications offers **Preview Dispatch Email** and **Preview Resend Email**. The dialog shows authoritative From, recipient, subject, order/channel/mode, actual HTML and a plain-text alternative. HTML uses an empty iframe sandbox, no parent access or script capability, and a preview-only CSP allowing approved branding images and inline template styles. Dynamic message fields remain escaped by the unchanged renderer. Metadata and plain text use text nodes.

Recipient review is an explicit checkbox. Resends additionally require a 5–1000 character reason. Draft reasons survive cancelling/back-to-order and refresh. Buttons are keyboard accessible, focus returns to the opener, Escape cancels safely, Enter in fields cannot submit, and a send disables repeat actions. A stale preview displays **Preview out of date**, with Refresh Preview and Cancel; it never regenerates content and sends silently.

Dispatch chooses **Dispatch without Email**, **Dispatch & Preview Email**, or **Cancel**. The accepted fulfilment transition completes without email first. Only the refreshed Dispatched order can then be previewed. Cancelling the preview leaves that explicitly stated status change in place. Email failures/uncertain outcomes do not roll back fulfilment. Payment/inventory logic and corrections are unchanged. Automatic lifecycle activation is unchanged.

## Checkpoints and tests

Checkpoint A: `c3f409192a203e5c24d9e38cf8cb6e9c4e0fcdb6`, tree `fd1353c1df03a8a48b48fc5dac1f1f76644f1ebc`.
Checkpoint B: `2f5931a7a09ffe64b8b8b8f3cab40722e79d2a2e`, tree `f54b1fa6ec6e599534c2ea459b68c5bbc1756db0`.

Relevant integrated gate: `email-preview-backend.mjs`, `email-preview-admin.mjs`, `email-preview-dispatch.mjs`, `external-order-editing-db.mjs`, `external-order-editing-admin.mjs`, `external-order-editing-email.mjs`, `fulfilment-email-v1.mjs`, `p08b4-email-experience.mjs`, `external-orders-db.mjs`, `external-orders-admin.mjs`. All pass using isolated PGlite/DOM fixtures and mocked provider delivery. The actual Orders module is exercised for website/eBay cancel/no-email/preview/failure sequences. Existing website template byte hashes pass; eBay branding and no-link policy pass. No browser infrastructure was installed. Rendered owner acceptance remains separate.

Migration `20261008134245_email_preview_giga_v1.sql` adds three narrowly scoped functions and grants only. It does not rewrite orders, inventory, payments, customers or notification rows. Production aggregate checksum access was rejected by automatic approval review under the earlier data-access restriction and was not retried; business-data safety evidence is the migration/code scope and isolated tests, not an asserted before/after production checksum.

Deploy compatibility order: migration, transactional-email function, then tested canonical GitHub/Pages frontend. Read back function sources/grants and deployed source; do not send a real customer email to test publication.

## Owner acceptance (no email required)

1. Open an eligible Dispatched order and choose Preview Dispatch Email.
2. Check actual recipient, subject, approved branding and plain text on desktop/mobile.
3. Cancel and confirm no new notification attempt appears.
4. On an order with a successful previous notification, choose Preview Resend Email; verify recipient confirmation and a reason are required. Cancel safely.
5. To check expiry without editing business records, leave a preview open for more than ten minutes, then confirm only if you intend the action; it must reject as out of date. Alternatively inspect the covered stale-state tests without initiating a send.

Forge, aftercare, marketing, homepage, catalogue and unrelated systems are outside this pass.

Backend publication: migration history version `20261008134245`; transactional-email ACTIVE version 11. Existing verify_jwt=false is retained because the function implements current Auth/Admin checks and existing service/scheduler authentication.

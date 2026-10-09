# Email Template Studio GIGA V1

## UX polish, 9 October 2026

Starting published main f6d02159dfcd0ee74a7587d35b4f77a07d375ce2, tree ae0e36eff48c49864126e952730e7ffdce28845c. The approved migration is already recorded as 20261008161807_email_template_studio_giga_v1; do not reapply it. This pass changes only the Studio UI, a bounded Aftercare plain-text formatting branch and focused regression coverage.

Grouped compact Aftercare/Dispatch navigation accompanies balanced editor/authoritative-preview panels. Navigation moves above the panels on tablet and panels stack below 900px. The preview and text editor scroll independently; history is collapsible. Subject/heading counts, descriptive placeholders, local validation errors and explicit saved-draft validation make the action state clearer. Publication still revalidates on the backend and requires confirmation. Initial selection, template selection and historical previews use the existing fixture-only backend, never customer lookups or sending.

Every preview regeneration or format change creates a fresh sandboxed iframe, resetting its browsing context without cross-origin reads, relaxed sandbox attributes, scripts or page scrolling. Plain-text scroll resets independently. Editor selection/focus use preventScroll; inserting a placeholder replaces the current selection and keeps the cursor immediately after it. Unsaved edits warn on navigation, while clean editors do not warn.

Aftercare plain text now groups its protected order reference before the greeting and keeps the approved body paragraphs contiguous. Aftercare HTML stays byte-identical to v13. Website/eBay dispatch retains exact full-payload parity, including conditional tracking and support/footer differences. The existing signed renderer/content hash makes previously prepared identities stale after backend rollout; regenerate order previews before confirming. No published template version, migration, Admin transport allowlist or database permission changes are required.

Focused UI tests exercise the actual shared transport, isolated SQL and authoritative preview handler. Computed responsive CSS is checked at 1440/1024/768/390/320px; scroll-context replacement, cursor/selection, invalid-draft publication gates, history/restore/discard, optimistic conflicts, recipient confirmation and a legitimately signed pre-polish renderer identity are covered. SMTP remains mocked. Owner visual/mobile and authenticated browser acceptance remain separate from asset and database-role verification.

Starting canonical main: cd951cfe70d344637c6aa59d3ea7b991c358aca1, tree f9d5f9acc550c5cca36efcbbf37262bdb7ba13e7.

## Architecture and operations

Admin /admin/email-templates/ supports Website/eBay Dispatch and Aftercare. Three text fields (subject, heading, blank-line body paragraphs) are rendered through the existing v2 shell. Greeting is paragraph one, introduction paragraph two, support/sign-off paragraphs follow. Delivery details, order items, branding, company information and permitted footer links remain in trusted code. No editable HTML, CSS, images, links, sender, recipient or transport values.

Templates default to WEBSITE for direct/non-eBay channels. Other-channel Aftercare remains manual and replaces the direct reply instruction with the original order conversation. eBay Aftercare stays copy-only. Editing cannot authorize a delivery route. eBay publication requires order-message support wording and rejects URLs, email addresses and promotional invitations. Valid placeholders are first_name/order_number and, for dispatch body content, shipping_service/tracking_reference. Optional delivery values remain authoritative; missing values are not fabricated. Subject/heading need readable literal text. Missing or unreliable Aftercare first names use Hello,.

email_templates stores current immutable version, optional draft and monotonic revision. email_template_versions stores immutable content, version number, previous version, publisher and timestamp. email_template_audit records before/after administrative mutations. email_template_uses binds prepared delivery claims to reviewed versions. All tables have RLS; no anonymous access and no direct authenticated writes. Current Admin membership is checked by each administrative RPC, not a user-editable claim.

get_admin_email_templates and mutate_email_template are the only new shared Admin transport resources. Save may retain an invalid bounded text draft. Publish validates content and locks the template, activates one new version and clears the draft atomically. All actions require an expected revision. Restore creates a draft, never edits history. Published versions and audit entries cannot be updated/deleted. UI distinguishes unsaved edits, Saved Draft and Published and Live, protects unsaved edits and retains local text after conflicts.

The fixture-only /template-preview endpoint independently verifies Auth/Admin membership and uses renderEmailV2. It never looks up customers, signs a send identity, claims a notification or calls SMTP. Historical previews read immutable versions under the Admin user's RLS. Sample context is visibly marked as not a real customer/order. The preview iframe retains sandbox/CSP isolation.

Prepared order previews resolve the current published version using service-only get_published_email_template and include its identity in the HMAC/content hash. Confirmation re-renders and checks actor/order/recipient/state/expiry/content/version. claim_email_template_preview holds a shared template-row lock and checks the version before delegating to the unchanged original claim functions. Publication takes an exclusive lock on that same row, closing the read/claim race. Existing atomic claims, audit, recipient confirmation, resend reason, policy, scheduler kinds and manual eBay Aftercare restriction remain intact. Pre-rollout prepared messages become stale and must be regenerated.

SMTP subject validation now permits bounded plain-text subjects from validated server rendering, with CR/LF/control rejection. Server/credentials/sender and recipient protections are unchanged; no client-controlled email body is accepted.

## Initial content

Dispatch v1 seeds are imported without intentional changes. Four SHA-256 snapshots (website/eBay, tracked/untracked) generated from the starting canonical renderer prove exact JSON payload byte parity after migration, including HTML/text/subject/recipient. Aftercare v1 seeds contain the owner's exact approved body, subject Checking in after your Apparition Instruments order and heading HERE IF YOU NEED US for both channels. The eBay support paragraph uses eBay order messages; footer links are omitted by trusted channel rules.

## Focused verification

New renderer, database/prepared-email and Admin suites cover seed retry safety, role boundaries, direct-write denial, immutable history/audit, draft isolation, stale revision conflicts, publish/restore/discard, text/placeholder validation, escaping, optional tracking omission, greetings, approved copy, eBay policy, version/content binding and a republish at the claim boundary. Admin tests use actual shared transport, real isolated SQL, actual authoritative fixture preview, modal cancel/confirm, history, placeholders/focus, beforeunload, conflicts and denied-state UI.

Relevant existing suites: email-preview-backend/admin/dispatch, aftercare-model/admin/orders/transport/backend, fulfilment-email-v1, admin-gate, p08b4-email-experience and admin-v2-shell. Only ephemeral PGlite fixtures and mocked delivery are used. No production business rows or real customer emails are used for tests.

## Rollout and acceptance

Apply additive migration first (idempotent seeds never overwrite a current version/draft), then deploy transactional-email with existing custom Auth and verify_jwt=false, then publish Pages in a fresh workflow run. Read back schema/permissions, four templates, approved copy and deployed function source. Compare live stamped Admin assets with the canonical tree. Backend unavailability fails closed; managed delivery does not silently fall back to unversioned templates.

Owner: open Email Templates, preview each variant, confirm the approved Aftercare copy and unchanged dispatch content; make a harmless draft edit, preview it, discard it, inspect history and confirm the published version did not change. Open a real order email preview and cancel. Do not send a customer email to test acceptance. Full owner-authenticated live workflow and visual/mobile acceptance remain manual; asset HTTP 200 alone does not prove them.

Protected: Forge candidate 044dee881740a26ed2d08eeb3875b904ea95fa83 was not imported or modified. No changes to orders, inventory, payments, customer records, scheduling, suppression, Conjure or Hub implementations.

## Production migration approval review, 8 October 2026

Preserved original implementation checkpoint ce9f9fbc5811114e8a38de53a1ea9bf370486b77. Production migration requests did not apply; metadata review confirms all four Studio tables and six functions remain absent. No backend deployment or canonical publication occurred.

Revised migration removes all five DROP statements. Policies and immutable triggers are conditionally created, and matching existing definitions survive retries. Unexpected named policy/trigger definitions abort. Six CREATE OR REPLACE FUNCTION declarations are replaced with guarded CREATE FUNCTION. Guards compare exact function body, signature/argument names/defaults, language, return type, volatility, security mode and fixed search_path; unexpected overloads or definitions abort without replacing them. All seeds still use ON CONFLICT DO NOTHING. New helper functions remain absent from production at the review pre-flight. Further deployment must repeat the read-only collision check.

admin_members remains the existing Admin authority, with only user_id/created_at and authenticated self-SELECT policy. Current Auth identity plus membership is checked server-side for every template mutation. Published versions and audit entries retain immutable triggers, and direct authenticated writes remain denied.

The actual ACTIVE v12 production renderer matches canonical cd951cfe source. Test-only v12 oracle fixtures exercise complete end-to-end old/new authenticated preparation, using 18 persisted orders across WEBSITE/EBAY/DIRECT with untracked, placeholder tracking, valid/invalid tracking URLs, carrier/ref escaping, item quantities/prices, totals, external origins, support/footer/channel differences and exact sender/recipient/subject/HTML/text comparisons. All payloads match exactly. Other lifecycle payloads match. Mixed old/new backend prepared identities reject safely; neither test sends a message. Editable seed paragraphs are not the entire email: required conditional system sections remain authoritative in v2.

Mixed rollout: additive migration alone has no effect on ACTIVE v12 rendering; v12 ignores new tables. New backend retains existing request/response fields and adds version metadata, compatible with old Orders frontend. New frontend accepts old preview metadata without templateVersion. Old signed previews reject on new backend, requiring re-preview; no silent new-copy send. Studio frontend publication remains gated until migration and function are independently verified.

Additional isolated migration tests prove retries preserve customized published content/drafts/history, reject unexpected functions/overloads/policies/triggers, roll back the migration transaction, and roll back original email/Aftercare claims if version-audit insertion fails after claim. Production review uses metadata only, never customer/order reads, record mutations, SMTP or deployment.

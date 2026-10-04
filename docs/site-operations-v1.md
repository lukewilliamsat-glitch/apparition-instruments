# Site Operations V1

Start: `2d8cf37f7dd082d5f4e6419738ea02201cf33b5d` (tree `998590a4203eed9ae537895dab2d8f52d85dbec6`). Recovery branch: `operations-v1-recovery`.

## Authority and scheduling

`site_operations` has exactly one configuration row. `desired_state=OPEN` clears its schedule. `ORDERS_PAUSED` is effective from `pause_from` (inclusive) until optional `resume_at` (exclusive); no end means manual resume. Database timestamps determine checkout availability without cron or an open Admin browser. Admin date inputs and public messages use Europe/London; ambiguous/nonexistent daylight-saving input times are rejected rather than guessed. Optimistic update timestamps prevent stale Admin overwrites.

Existing Admin Auth and `admin_members` remain authoritative. The three new tables have RLS and private Admin SELECT policies. Only membership-checked `set_store_operations` and `save_news_post` can mutate them; client table INSERT/UPDATE/DELETE are revoked. Audit records retain authenticated actor, action, entity, before/after and time. Internal reasons, creator/updater identities and audit records never enter public projections.

Public `get_site_operations` and `public_news` are bounded security-definer projections with an empty search path and explicit allowlists. They deliberately expose no private authoring metadata. The service-only `assert_store_accepting_orders` fails closed on a missing configuration and takes a shared row lock. `create_guest_kit_order` calls it before initiation; all previous pricing, ownership and idempotency code remains intact. `create-checkout` checks it before order initiation and again immediately before requesting Stripe. A paused response is a safe HTTP 409; unavailable/invalid status is HTTP 503. No client flag authorises checkout.

A pause does not cancel previously issued Stripe sessions or existing orders. A configuration change can occur after the final check while an external Stripe request is in flight; an already initiated request is not retroactively cancelled. Fulfilment, inventory deduction, refunds, email lifecycle and historical data are untouched. Browsing, product stock/prices, Add to Basket and basket editing continue. A saved basket reserves neither stock nor price. Basket/checkout UI uses a fresh uncached status read, rechecks on return from bfcache/another tab and at schedule boundaries, and disables only checkout on failure.

## News and announcement delivery

News supports DRAFT, SCHEDULED, PUBLISHED and ARCHIVED; constrained categories, immutable saved slugs, publication/optional expiry, CTA and announcement metadata. Publish now uses server time (or the already elapsed original publication date); schedules require a future timestamp. Expired News remains in the archive; expiry removes its announcement. Archived, draft and future posts are absent from the public RPC and generated output.

Body text supports headings, paragraphs, ordered/unordered lists, links and basic emphasis. Raw HTML is escaped. Links accept safe site-relative paths or HTTPS without credentials. No editor framework, arbitrary HTML, styles, embeds or image uploads were introduced.

`scripts/generate-site-operations.mjs` consumes only the two public RPCs. It creates `/news/`, `/news/<slug>/`, article metadata/Article structured data, sitemap entries and `operations/snapshot.json`. Removed/archived routes are removed on rebuild. The existing Pages workflow refreshes public products and News on its nominal five-minute schedule or manual dispatch. GitHub scheduling/queueing can delay static publication or removal; this is a presentation delay, never a checkout-authority delay. `[static-only]` publications use committed verified snapshots. No production sample posts are created.

Public shells fetch one shared cacheable same-origin snapshot. One bar appears after the header: an effective store pause wins and is not dismissible; otherwise News priority, publication recency and slug determine the winner. News dismissal is local to that browser. Announcement expiry and known store boundaries update without polling. Homepage Latest News shows at most three effective posts and disappears when empty. News is discoverable in the footer. Public modules do not import Admin authoring code.

## Homepage adapter

The warm cream Signal Path is a bounded editorial projection of the existing Modern Tele neck-selection graph. `homepage-state.mjs` uses the existing instrument adapter for response assumptions; `educational-truth.mjs` validates topology; `homepage-editorial.mjs` projects canonical component artwork and actual selector contacts into desktop and compact arrangements. Generator and Forge technical renderers remain independent and unchanged.

Volume lug 1 is ground, lug 3 signal input and lug 2 the wiper/output. Main path: pickup → selector → volume input 3 → wiper 2 → jack TIP. Tone branches from input 3 through the authoritative 0.047 µF capacitor and tone control to ground. Both layouts terminate the conductor at the transformed canonical TIP coordinate, distinct from sleeve. Editorial omission of dense technical annotations changes no electrical identity.

Explicit `--home-*` cream/ink/muted/rule/gold tokens isolate the section from global dark styling. Only the conductor overlay travels in restrained gold; components/resting wires never fade. Reduced motion hides travelling overlays and presents the complete static narrative. Electrical response uses the unchanged shared model, with clearly labelled illustrative assumptions and no acoustic claim. The duplicate older Signal Path figure was consolidated into this single section.

## Hub and validation boundary

Existing Hub primitives already supply 72ch reading width, 1.85 body line-height, heading hierarchy, callouts, figure captions, metadata and contextual learning. They are retained; no broad Hub redesign or article churn. News remains a separate time-based model. New News/announcement primitives live in shared operations CSS, loaded by the existing brand hub; the shell projection recognises News as editorial.

Validation is offline: ephemeral migration replay, role/RLS/RPC tests, checkout mocks, safe-rendering/SEO fixtures, Admin confirmations, SVG structure/anchors, computed responsive structure at 320/360/390/412/768/1024/1400/1920 and existing regression suites. Existing business-data fixtures run only locally. No production test order, pause, News post, inventory mutation or email is permitted. Only the initial OPEN operations seed, schema/migration ledger and checkout Edge deployment change production backend state.

Browser inspection, screenshots and image generation: none. All rendered acceptance remains pending Luke.

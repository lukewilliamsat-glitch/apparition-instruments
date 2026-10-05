# Discovery V2 and measurement

The 14 intent families in scripts/luthier-hub/discovery.mjs nominate a primary guide, supporting guides, category, useful tools and component family. dist/luthier-hub/discovery.json is its generated public projection. A supporting guide keeps its own canonical; no duplicate route or redirect is introduced. The capacitor specification, switch contact and ground/jack references have differentiated search metadata; comparison, physical selector wiring and fault diagnosis remain separate primary intents. Category links provide the next practical step without replacing the existing reading order or presentation.

## Search Console setup

No token or Search Console account data is currently supplied. For the URL-prefix property https://apparitioninstruments.co.uk/, select HTML tag verification in Search Console. Copy only the real meta tag content value into GitHub repository Settings → Secrets and variables → Actions → Variables: GOOGLE_SITE_VERIFICATION. This is a public ownership token, not a Google account credential. Never store passwords, OAuth credentials or private account tokens here. The Pages workflow injects the tag into the homepage head of the deployment artifact. It preserves existing owners' tags and does nothing if unset. Trigger the Pages workflow, confirm the token in live source, then click Verify in Search Console. Keep the value configured for subsequent builds. Domain properties require Google's DNS verification instead.

Google reference: https://support.google.com/webmasters/answer/9008080
Submit https://apparitioninstruments.co.uk/sitemap.xml. The generator includes self-canonical public pages, not aliases, admin/account/basket/checkout/utility routes. News generation publishes only effective published/scheduled posts; drafts/future/archived posts have no static route. Notice expiry does not remove an otherwise published article. Robots allows crawling, including shared rendering assets; private routes retain noindex and backend authentication remains the access boundary.

## Repeatable review

Export Search Console Search results with a recorded date range and comparison period. Record impressions, clicks, CTR and average position by query and landing page, then segment by device and country. Keep raw export dates and filters with decisions. Compare similar periods and seasonality; low-volume data needs time rather than an automatic conclusion. Position is an aggregate, not a stable rank.

- Relevant high impressions with relatively low CTR: examine the actual query, title/meta and snippet; preserve accurate scope.
- Relevant queries around positions 8–20: review whether the primary guide answers the intent and has useful internal links. This range is a candidate review band, not a universal rule.
- Multiple landing pages for the same query: compare intents and the registry nomination before changing titles or links. Do not automatically redirect supporting pages.
- Impressions for an unanswered intent: record a candidate guide only if an authoritative technical source supports it.

Use measured evidence, not invented volumes or universal CTR thresholds. Record one hypothesis, bounded action and review date; allow enough subsequent data before judging it. No performance claims are made in this pass.

## Commercial operator configuration

Site Operations includes a gated Commercial destinations section. Select product ID, SKU, component family, collection route or storefront. Family uses the existing component category; category targets a collection path. Enter a verified seller-owned HTTPS eBay /itm/ or /str/ URL, optional label, enabled state and optional paused-only applicability. Save upserts the selected scope; Edit keeps its identity stable; Remove deletes it. Specific product → SKU → family → category → storefront precedence chooses one useful option. Disabled and unset rows never create actions. All configuration reads/writes require existing Admin membership RLS. A deliberately public allowlisted RPC exposes enabled customer actions only, with no Admin records or identities. No URLs are duplicated into generated HTML.

OPEN keeps the website purchase action and adds at most one restrained external link. Effective ORDERS_PAUSED (including Holiday Mode) can show the configured external option while all technical content and basket retention remain. Educational routes get no handoff. No automatic redirect or checkout-guard modification occurs. Failed destination reads add no option; they cannot enable checkout. Public reads occur once per eligible page load; reload after Admin changes. A disabled specific destination permits an enabled broader fallback; paused-only rows apply only when paused.

## CMS V2 roadmap — documentation only

Future Admin article editor with WYSIWYG and structured fields, DOCX export/import, preview before publish, import diff/change review, draft/published workflow, revision history and restore. Slug, category, SEO, schema and knowledge/tool/component relationships remain structured authority fields; Word primarily controls body content. The V2 discovery registry is reusable by that editor. No DOCX libraries, editor or speculative article storage are introduced.

Independent/dependent volume and pickup phase switching remain deferred: the preceding authority review did not establish alternate connection recipes and no electrical infrastructure has changed in this pass. Future work needs supported topology evidence, not a new model created merely to publish a guide.

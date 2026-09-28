# Apparition Instruments — master chat continuity handover

**Created:** 28 September 2026  
**Purpose:** canonical continuity record for moving the long-running Apparition development conversation into a fresh ChatGPT/Astra session without losing project logic, decisions, safety boundaries, phase history or the immediate next action.

> READ THIS FILE FIRST IN A NEW APPARITION DEVELOPMENT CHAT.

This document records conversation/project context. GitHub `main` and production Supabase remain authoritative for implementation and live data respectively. Always verify the current `main` HEAD and live state before changing anything.

---

## 1. Project identity

- Business: **Apparition Instruments Limited**.
- Production site: `https://apparitioninstruments.co.uk/`.
- Canonical repository: `lukewilliamsat-glitch/apparition-instruments`.
- Canonical branch: `main`.
- Production backend: connected Supabase project.
- Payments: live Stripe Checkout is configured and has already processed successful live payments.
- Transactional email: server-side SMTP infrastructure exists for order lifecycle/refund email.
- GitHub is the canonical source-controlled application copy. Do not treat an old ChatGPT Site/Astra workspace as source of truth.
- Production business data belongs in Supabase. Do not write live business data back into GitHub.
- `dist/` is directly deployed by GitHub Pages and is part of the editable canonical project rather than merely disposable generated output.

### Source-control state at this handover

The last **application implementation** checkpoint before planning-only documentation was:

`9fb4f2c68e94562c5a06b6f0ab24117f48e5a626` — P11E/F.

After that, four **documentation-only Signal Forge commits** were added:

1. `91c6ff9471f628c2f541bcb89d6fa88827a055c3` — Add Signal Forge planning workspace.
2. `8e6dfbe9509ee0f1f5d097c05174ea88f023bebe` — Document Signal Forge architecture.
3. `bf683434ffd85b6f5d000e642cc46e7da5ed2211` — Add Signal Forge roadmap.
4. `0b0681acdce0a94bc6cb1e7272f8bb238b2bd144` — Record initial Signal Forge decisions.

The commit adding this handover comes after those. A new session must verify `main` rather than assuming any SHA in this file is still HEAD.

---

## 2. Development workflow and non-negotiable safety rules

Luke prefers **tight, economical, usage-optimised passes** rather than repeated broad audits.

Normal pass discipline:

1. Verify canonical GitHub `main` first.
2. Inspect only the surfaces required by the pass.
3. Preserve approved design and unrelated behaviour.
4. Do not perform unrelated refactors or opportunistic feature expansion.
5. Use targeted tests/regressions appropriate to the changed boundary.
6. Commit/publish/deploy only tested work.
7. Verify deployed source where appropriate.
8. Reconcile production read-only state when the pass touches sensitive commerce/data boundaries.
9. Stop at the requested checkpoint and return a concise completion report.

### Production safety

- Production Supabase writes require real Supabase Auth, explicit Admin membership and appropriate RLS.
- Never weaken RLS to make a feature easier.
- Never allow anonymous or ordinary customer writes to Admin-owned production data.
- Never expose service credentials or privileged keys to the browser.
- Schema/migrations belong in GitHub. Live business data remains in Supabase.
- Checkout, stock and final price authority remain server/commerce authoritative.
- Do not create Orders, payments, refunds, Auth users, Contact submissions, emails or inventory mutations during an audit unless Luke explicitly authorises a live acceptance action.
- Never manufacture or replay lifecycle events merely to make a test pass.

### Visual review convention

Luke normally performs rendered desktop/mobile visual acceptance himself. If he says a surface is visually accepted, do **not** burn Astra usage on another browser/rendered visual review unless a later change makes it necessary or Luke explicitly asks.

### Completion report convention

Reports should clearly distinguish:

- what changed;
- GitHub start/final SHA;
- migrations/Edge Functions if any;
- tests/regressions;
- deployment/source verification;
- production data mutation status;
- manual/live checks not performed;
- exact next recommended stage.

Do not claim a live/browser check occurred when it did not.

---

## 3. Current production baseline / known live records

At P11E/F closure the reported production state was:

- Components: **36**.
- Inventory rows: **36**.
- Inventory units: **715**.
- Orders: **8**.
- Delivery records: **2**.
- Eligible generated product pages: **9**.
- Catalogue options: **24** after concurrent Admin editing.
- Sitemap: **34 unique URLs**, including 9 product URLs.
- Price fingerprint: `08c67b2ccf8caebcaa8cde19026993ea`.
- Inventory fingerprint: `4414da86fea6f6d27ab36f856a78f83c`.

Important historical test Orders:

- `AI-010010`: paid, no refund, completed historical lifecycle/tracking example.
- `AI-010015`: fully refunded, £4.00 original total, £4.00 refunded, £0.00 net paid.

P09 closure found 8 Orders, including six historical unpaid checkout attempts. Customer Order surfaces now deliberately exclude unpaid attempts.

A fresh single golden-path production Order was intentionally deferred while later work continued. The Order count remained 8 through P11E/F, so that one-Order final acceptance journey has **not yet been consumed** as of this handover.

---

## 4. P09 — customer account / Order platform — COMPLETE

P09 created the customer identity and Order ownership foundation.

### P09C — customer Order ownership

Final checkpoint: `4941c7b882b01bdb4e0394da9df74e434b9d32ce`.

- Verified Supabase Auth email can claim previously unowned guest Orders with the same normalised email.
- Email matching ignores case and surrounding whitespace.
- Claim occurs server-side and persists the Auth user ID.
- Existing ownership cannot be replaced.
- My Orders retrieves by persisted owner ID, not browser-supplied email/user ID.
- Authenticated checkout associates future Orders directly.
- Guest checkout remains supported.

### P09D — customer Order Detail

Final checkpoint: `fbbc6ec2cb94290fc232555e492d8c008e06f165`.

- `/account/order/?reference=…` opens owned Order Detail.
- Server verifies session and persisted ownership.
- Customer receives an explicit safe payload, not a raw Order row.
- Lifecycle/history, saved item snapshots, persisted totals/refunds and dispatch details are authoritative.

### P09E/F — customer invoice + Order-aware support

Final checkpoint: `d3d8fe52524196a17c52a25763c9f614d7cffa78`.

- Customer invoice is print-friendly and owner-protected.
- It uses persisted historical items/prices/totals/refunds.
- Static hidden refund-row display bug was fixed.
- Order-aware Contact pre-fills the reference and verifies ownership server-side before attaching a verified reference.
- General/guest Contact remains available and manually entered references remain unverified.

### P09G audit / P09H closure

Final P09 implementation checkpoint: `6e320deb81519744d0c7f14640d0a95cba9f3522`.

P09G found a blocker: authenticated checkout assigned ownership before Stripe payment verification, so an abandoned unpaid Order could have appeared in My Orders. P09H fixed this.

Current rules:

- My Orders and direct detail return only owned Orders that have a historically paid state, including partial/full refunds.
- Unpaid attempts can retain internal ownership so a later trusted webhook can complete them, but they are not exposed as customer Orders.
- Historical email reconciliation runs on the authenticated **list** request only.
- Detail/invoice requests are read-only and cannot trigger an ownership claim.
- Admin and customer invoices use a shared document renderer while retaining separate access gates.

### Deferred P09 acceptance

One final low-value live golden-path Order remains desirable when Luke is ready. It should cover account → abandoned/unpaid visibility boundary → payment/webhook → lifecycle → dispatch/tracking → completion → invoice/support → refund → signout, with inventory/email/event reconciliation. Do not repeatedly create test Orders; Luke explicitly prefers one end-to-end Order rather than many test purchases.

---

## 5. P10 — storefront/product experience — COMPLETE

Final P10 implementation checkpoint: `5d3cbb549adbfab9ce4ab443680e99506d0627b5`.

### P10A — Treble Bleed Designer Frozen Reference

Initial: `e26237662968c1c4ce7740b07b8e8fa8ea2437ed`.  
Visual amendment: `a6f1be6ea99935b6210beb924c2f26faecdd14af`.

- Freeze Reference captures current model inputs, response and readable configuration summary.
- Live curve remains active.
- Existing Volume 10 comparison remains separate.
- Update Reference replaces the single snapshot.
- Clear Reference returns to live-only behaviour.
- Frozen curve is visually distinct and immutable while live controls change.
- Initial bug was only colour: `--teal` resolved to the same gold as live; corrected to a distinct cyan dashed stroke.

### P10C — storefront truth/discovery

Checkpoint: `242c7759a0e500cd688cb12f1e11a894f4018386`.

- Removed obsolete “online ordering coming soon” wording now that checkout is live.
- Homepage Components route leads to catalogue.
- Basket accurately describes secure checkout.
- Help Me Choose clearly states its supported passive four-pot Les Paul scope before questioning.

### P10D — Product Detail architecture

Checkpoint: `b9cbaa7d6a78897eb6cfe9f24218d6411f596926`.

- Shared Product Detail architecture introduced.
- Product identity is Component ID.
- Category quick-buy and Product Detail use the same Component/add path.
- Unknown, inactive, kit-only, unpriced and later zero-priced Components are not purchasable products.
- Out-of-stock public products may be read but not added.
- Product Detail links back to category and relevant guidance/tools.
- Quantity-aware kit test was corrected: two premium treble bleeds are required, not one.

### P10E — structured product data

Main closure checkpoint: `41305fbf3de56efa0b9a52e4f451ed3a2ee7b482`.

Structured Admin/Product Detail fields now include:

Potentiometers:
- numeric resistance in kΩ;
- controlled Type;
- controlled Shaft;
- controlled Taper;
- Manufacturer selectable from known values/addable;
- manual fields such as tolerance/series/part reference remain possible;
- optional physical dimensions in mm were added later in P10H.

Capacitors:
- numeric capacitance;
- unit selector `pF / nF / µF`;
- numeric voltage in V.

Treble bleeds:
- numeric capacitor + unit;
- optional resistor in kΩ;
- controlled topology: Capacitor only / Parallel RC / Series RC.

Category-specific structured facts live in existing `product_content.technicalSpecs`; legacy `specs` remain available for compatibility. Product Detail omits empty optional rows/sections.

### P10F — Wiring Kit clarity

Checkpoint: `3ac6667f8d4eaecf5d6a0cfd7f777271b931f246`.

- Wiring Kits landing distinguishes Build Your Kit from Help Me Choose.
- Builder now directs customers to Basket/secure checkout instead of obsolete ordering-unavailable copy.
- Existing Builder price/quantity/stock/configuration model preserved.

### P10G — catalogue dictionaries

Checkpoint: `aa6813763b2d487beca7d0344da0bfd46a88ab0d`.

Migration added `public.catalogue_options`.

Dictionary architecture:
- immutable set/key identity;
- editable display label;
- previous-label aliases;
- active state;
- display order;
- public read including disabled entries so historical/current products can resolve;
- Admin-only writes;
- no ordinary delete at this stage.

Canonical option identities included:
- Pot types: `standard`, `push_pull`, `mini`.
- Shafts: `short`, `long`.
- Tapers: `audio`, `linear`, `reverse_audio`.
- Treble bleed topology: `capacitor`, `parallel`, `series`.

`Push/pull` and `Push/Pull` resolve to one `push_pull` identity displayed as `Push/Pull`.

Engineering units `pF`, `nF`, `µF`, `kΩ`, `V` deliberately remain semantic constants rather than editable catalogue dictionary labels.

Admin route: `/admin/catalogue-settings/`.

### P10H/I — fitment intelligence + rich kit experience

Implementation: `771531f5b05c817d37e15c661822b254412dd9d2`.  
Visual flow amendment: `bd371b46f086cc2befc4809aa4b1acf741174a5a`.

- Potentiometer dimensions can be stored numerically in mm.
- Physical dimensions are separate from electrical specs.
- Builder shaft choice includes expandable measurement-led guidance.
- No brand-based fit guarantee.
- Product Detail displays populated physical dimensions only.
- Production had no authoritative structured dimensions, so none were guessed/populated.
- Builder choices show concise Component facts, imagery/fallback and Product Detail link when eligible.
- Links open in a new tab so configured kit state remains.
- Help Me Choose supported result explains what can be compared/changed in Builder.
- CSS flow bug under potentiometers/shaft length was fixed by removing a shared `height:100%` behaviour and keeping rich blocks in normal document flow. Luke visually accepted the result.

### P10J — storefront closure

Final P10 checkpoint: `5d3cbb549adbfab9ce4ab443680e99506d0627b5`.

- Structured product specifications take precedence over conflicting manual labels.
- Zero-priced Components cannot be offered for purchase when checkout would reject them.
- Luke had already completed rendered desktop/mobile acceptance, so no redundant browser review was repeated.

---

## 6. P11 — discovery, SEO, product trust and tool-to-commerce — COMPLETE

### P11A-D — crawlable product architecture / SEO / internal linking

Checkpoint: `0a3a6d7ff255fc952c64fce80ab711cdd626f729`.

Key architecture:

- Static GitHub Pages with client-side catalogue refresh remains the production model.
- Legacy `/products/?id=<Component ID>` route remains functional but `noindex,follow`.
- Eligible products now have direct static crawlable URLs such as `/products/pot-short-cts-a/`.
- Slug derives from stable Component ID and generator rejects collisions.
- Product identity, description and specs exist in initial HTML.
- Generated eligibility excludes inactive, kit-only, zero-priced and unpriced Components.
- Out-of-stock eligible products may remain indexed.
- Per-product title, description, canonical, Open Graph, Product/Offer JSON-LD and breadcrumb/BreadcrumbList data exist.
- Static price/availability are snapshots; browser refreshes live commerce data.
- Pages workflow regenerates product pages from Supabase on pushes, manual dispatch and a five-minute schedule. Scheduled jobs may be delayed; urgent catalogue changes can be followed by manual dispatch.
- Static category cards derive from eligible catalogue rather than stale hard-coded cards.
- Treble Bleed category and Designer cross-link.

### P11E/F — product content/trust + tools-to-commerce

Application checkpoint: `9fb4f2c68e94562c5a06b6f0ab24117f48e5a626`.

#### Product Detail / trust

- Product Detail and generated HTML use authoritative descriptions, specs, physical dimensions, included-items and guidance fields.
- Optional product-specific QC statement is Admin-maintained and shown only when populated.
- No unsupported QC claims were invented for existing products.
- Related products are deterministic eligible alternatives from the same category.
- Related products exclude current/ineligible products, use preferred product URLs and identify out-of-stock state.
- Images retain natural proportions.

#### Treble Bleed Designer exact product matching

This is an important precursor to Signal Forge.

- Matching uses complete structured electrical data only.
- Match dimensions: topology + electrically normalised capacitance + resistor value where applicable.
- No product-name matching.
- No nearest-match guessing.
- Multiple exact matches are shown separately.
- Out-of-stock exact match retains Product link but cannot be added to Basket.
- Catalogue failure does not break electrical modelling.
- Matching does not alter Frozen Reference or the electrical engine.
- Existing Basket path is reused.

At P11E/F final inspection, exact matches included `bleed-premium` for Parallel RC 1 nF + 150 kΩ and capacitor-only products whose structured data matched. Products lacking complete structured electrical fields cannot exact-match until their data is populated.

#### Wiring Generator → Builder

- Existing supported Les Paul circuit-to-Builder handoff retained.
- Verified across 54 configurations.
- Unsupported configurations do not gain a false kit claim.

#### Guarded catalogue deletion

Migration: `20260928154321_p11_catalogue_option_delete`.

Admin now has confirmed **Delete permanently** for unused manufacturer options.

Database-side deletion:
- checks Admin membership;
- locks/checks relevant dependencies;
- refuses deletion when Components or Kit Definitions depend on the option;
- anonymous users cannot execute it;
- core electrical/control dictionary identities cannot be permanently deleted through this route;
- no automatic Component reassignment or Kit cleanup occurs.

Two joke/test manufacturers were intentionally **not** deleted because dependencies existed:

- `Poofart LTD` → Component `Poofart` → `kit-les-paul` dependency.
- `TheMoist Men` → Component `12312321` → `kit-les-paul` dependency.

Luke wants these removed eventually, but dependencies must be deliberately resolved first. Do not cascade-delete or silently rewrite the Kit Definition.

### P11 visual status

P11E/F did not run an interactive browser visual pass. Luke had asked to keep Astra usage economical and normally performs visual review himself. Do not assume a visual defect exists merely because Astra did not render-review it.

---

## 7. P11 final closure

**P11: COMPLETE.** P11A–D and P11E/F are complete. The subsequent economical cleanup clarified the Admin manufacturer usage count at `ac469fbbc507d626ad5c00d3959cb579c6e38522` and passed focused verification.

P11G was investigated; no canonical requirement or acceptance criteria exist. The placeholder is retired. Future work should be defined from actual requirements rather than continuing P11 lettering.

The outstanding single final live Order acceptance journey remains deferred P09 scope, outside P11.

---

## 8. Signal Forge — canonical future-platform planning

Signal Forge planning now has its own canonical repository folder:

`docs/signal-forge/`

Files:

- `README.md` — product vision and core principles.
- `ARCHITECTURE.md` — conceptual circuit model, diagram semantics, Design Mode, Build Mode, physical component instances, Order/account/commerce and protection boundaries.
- `ROADMAP.md` — V1/V2/V3 and later Pro milestones.
- `DECISIONS.md` — stable `SF-DEC-###` decisions for cross-session reference.

These are planning documents, not yet production implementation contracts.

### Signal Forge product vision

**Design it → understand it → order it → receive measured components → build it → verify it.**

Signal Forge is intended to unify the existing Wiring Diagram Generator and Treble Bleed Designer concepts into a much broader guitar-electronics design/simulation/build platform while reusing existing Apparition systems.

### Core architectural rule

Do **not** build Signal Forge as one hard-coded diagram per guitar configuration.

Model composable:

- components;
- terminals/lugs;
- electrical connections;
- pickups/positions;
- volume/tone controls;
- pot values/tapers;
- capacitors;
- treble bleeds;
- loading resistors;
- selector switches;
- Push/Pull and other switching;
- output/load elements.

Named guitars/topologies are starting templates over the model.

### Initial priority families

- Les Paul: HH, 2V2T, 3-way; Modern, 50s and 60s.
- Telecaster: classic SS, 1V1T, 3-way first, then common variants.
- Stratocaster: SSS, HSS/SSH, HSH and HH priority configurations, but pickup layout, pot count/roles and switch type must be independently representable.
- PRS Custom 24: HH / 1V1T with supported 3-way/5-way and split behaviour as validated.

Example that must be representable without a bespoke hard-coded preset: 500 kΩ controls with a 470 kΩ loading resistor on a single-coil path to produce an effective load close to 250 kΩ.

### Diagram UX

Current/older diagrams can make branches appear to merge. Signal Forge must make electrical meaning visually explicit:

- connected junction = explicit connection marker;
- crossing without connection = unambiguous hop/bridge or equivalent;
- terminals/lugs identifiable;
- casing solder/ground points explicit;
- supplied vs existing components distinguishable in kit context.

Target interaction: click/hover a wire, lug or component to highlight its relevant electrical path and de-emphasise unrelated paths.

### Design Mode

Free/core experience should allow users to:

- choose a familiar topology;
- configure pickups/controls/switching;
- alter component values;
- add supported mods such as treble bleeds/loading/splits;
- see wiring update;
- see response/simulation update where modelled;
- freeze/compare a reference;
- match structured Apparition products;
- hand supported configurations to kit/product workflows.

### Build Mode

Build Mode should turn a supported circuit into step-by-step physical installation rather than forcing a novice to interpret the whole diagram at once.

A step should be able to show:

- component and role/position;
- source terminal;
- destination terminal;
- current wire/path only;
- relevant solder/ground instruction;
- visual highlight;
- access back to full circuit at any time.

Core Build Mode for an Apparition kit should remain free/included rather than paywalled.

### Physical component instances / “Your Circuit”

A catalogue definition and a physical supplied part are different entities.

Example:

- Catalogue: CTS A500k, nominal 500 kΩ, tolerance ±10%.
- Physical instance: actual measured 501.7 kΩ.
- Assignment: Order/kit → Neck Volume.

Future customer experience can therefore show the exact measured values of parts actually supplied. Do not overwrite catalogue nominal data with instance measurements.

Potential future flow:

Order/kit QC → assign measured physical parts → customer account `Your Circuit` → nominal vs actual values/simulation → secure QR/deep link from QC card → guided Build Mode.

### Free vs Pro principle

Do not decide the hard paywall too early.

Strongly favour keeping free anything that helps a customer:

- understand the circuit;
- configure a practical design;
- simulate core behaviour;
- see wiring;
- match/buy Apparition products;
- successfully install an Apparition kit.

Potential Pro territory after real usage validates demand:

- multi-circuit/multi-reference comparison;
- tolerance / Monte Carlo analysis;
- large persistent guitar/project libraries;
- professional luthier/client workspaces;
- advanced exports/document packs;
- organisation presets;
- deeper protected analysis.

If valuable Pro computation/data later needs protection, use authenticated server-side boundaries and entitlements. Do not rely on hiding/minifying browser code as security.

### Commercial loop

Technical question/search → Apparition education/tool → configure → understand → see wiring → exact compatible product/kit match → purchase → receive measured/QC parts → guided install → retain `Your Circuit`.

The ecosystem, not just the individual pot/capacitor, is intended to become the differentiator.

---

## 9. Existing product/catalogue philosophy to preserve

- Use stable Component IDs as identities.
- Structured electrical data beats names/free-text for machine decisions.
- Structured product specifications take precedence over contradictory manual display labels.
- Keep legacy/manual fields only where required for compatibility/history.
- Product Detail should omit empty optional sections rather than show placeholders.
- Missing product imagery should use an intentional fallback.
- Rich choice blocks must remain in normal document flow; avoid fixed heights that can cause overlap.
- Product images should retain their natural proportions in current P11 Product Detail/related-product surfaces.
- Do not invent physical dimensions, QC claims, fit guarantees or electrical data.
- Measurement-led fitment guidance is preferred over brand-based promises.
- Product/kit matching should be exact and explainable rather than nearest-match guesswork unless a future feature explicitly introduces ranked alternatives.

---

## 10. Important routes / locations

Public/customer:

- `/account/` — customer account / My Orders.
- `/account/order/?reference=…` — protected Order Detail.
- `/products/<stable-product-slug>/` — crawlable generated Product Detail.
- `/products/?id=<Component ID>` — legacy client route, functional but `noindex,follow`.
- Wiring Kits / Builder — existing supported kit configuration journey.
- Treble Bleed Designer — existing electrical tool with Frozen Reference and exact product matching.
- Wiring Diagram Generator — existing wiring tool with supported Les Paul → Builder handoff.
- Luthier Hub — education/guidance area, deeper expansion deferred.

Admin:

- `/admin/catalogue-settings/` — managed catalogue dictionaries and guarded permanent manufacturer deletion.
- Existing Admin Components/product-content editor — authoritative structured product/electrical/physical content entry.
- Existing Admin Orders/invoice/lifecycle tools remain separate from customer access gates.

Repository planning:

- `docs/signal-forge/` — canonical Signal Forge planning.
- `docs/handover/APPARITION_CURRENT_HANDOVER.md` — this continuity record.

---

## 11. Known deferred work / banked ideas

Do not treat these as automatically approved next tasks:

- Broader Luthier Hub expansion.
- Wider tool-to-commerce matching beyond exact supported cases.
- More product-content population by Luke through Admin.
- Authoritative physical dimension population after real measurements.
- Wider Help Me Choose / kit-family coverage.
- Signal Forge implementation itself.
- Saved circuits / My Guitars.
- Physical component-instance/QC measurement system.
- QR-linked `Your Circuit`.
- Subscription/entitlement implementation.
- Professional/Pro workflows.
- Account password/email/self-service deletion improvements and My Orders pagination remain later customer-platform work.

---

## 12. Reactivation prompt for a fresh chat

Paste the following into a new ChatGPT/Astra development conversation:

```text
# APPARITION INSTRUMENTS — CHAT REACTIVATION / CONTINUITY

We are continuing the existing LIVE Apparition Instruments webstore and technical-tool project.

Canonical repository:
- GitHub: lukewilliamsat-glitch/apparition-instruments
- Branch: main
- Production site: https://apparitioninstruments.co.uk/
- Production Supabase is already connected.
- Live Stripe and server-side transactional email infrastructure already exist.

IMPORTANT: do not modify anything immediately.

First:
1. Verify the current GitHub `main` HEAD.
2. Read `docs/handover/APPARITION_CURRENT_HANDOVER.md` in full.
3. Read the Signal Forge planning index at `docs/signal-forge/README.md`; use `ARCHITECTURE.md`, `ROADMAP.md` and `DECISIONS.md` when Signal Forge/future-platform decisions are relevant.
4. Treat GitHub `main` as canonical source and production Supabase as authoritative live business data.
5. Preserve the safety/workflow rules in the handover. Do not weaken RLS, expose privileged credentials, mutate production business data during audits, or create live Orders/payments/refunds/emails/Auth users/Contact submissions unless I explicitly authorise that action.
6. Do not repeat broad audits or rendered visual reviews that the handover says are already accepted.

Current implementation context at handover:
- P09 customer account/Order platform: complete.
- P10 storefront/product experience: complete.
- P11A-D discovery/SEO/product architecture: complete.
- P11 discovery, SEO, product trust and tool-to-commerce: complete. P11G was an orphaned placeholder and is retired.
- Subsequent commits before this handover were documentation-only Signal Forge planning commits.
- A final one-Order P09 golden-path live acceptance is still deliberately outstanding; do not create repeated test Orders.

Current next-step status:
P11 is complete. P11G was an orphaned placeholder and is retired. The single final live Order acceptance journey remains deferred P09 scope; do not perform it without explicit authorisation. Define any future phase from its actual requirements.

Before acting on a new request, verify current `main` and use the closed P11 status above.
```

---

## 13. Continuity note to the next assistant

Luke has deliberately developed this project through many small controlled Astra passes and cares strongly about preserving working behaviour. Do not mistake enthusiasm about future Signal Forge ideas for permission to begin implementing them during a storefront/P11 pass. Keep current implementation work and future-platform planning separate unless Luke explicitly merges the scopes.

The project has accumulated useful infrastructure precisely because authority has been kept explicit: GitHub source, Supabase live data, stable Component IDs, server-side Order ownership/payment boundaries, structured electrical product data and guarded Admin mutations. Preserve those boundaries.

When Luke says a visual check “looks good”, treat that as the accepted rendered checkpoint unless a later change directly affects that surface.

When usage is constrained, prefer a narrow source/code inspection and focused regression over broad re-auditing.

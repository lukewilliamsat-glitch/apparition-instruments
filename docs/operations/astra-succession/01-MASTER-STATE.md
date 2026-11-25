# Apparition Astra master state

**Current operating checkpoint · 25 November 2026**

NOCTURNE 89 is live. See [02 Release queue](02-RELEASE-QUEUE.md) for the canonical deployment and Authorisation 90 delivery evidence and [07 Operating policy](07-OPERATING-POLICY.md) for the mandatory plugin-first hierarchy and prohibition on the owner’s browser, tabs and sessions.

## Historical 83H production baseline

| Area | Observed state |
| --- | --- |
| Cloudflare Pages | Project `apparition-instruments`, production branch `production`, custom domains `apparitioninstruments.co.uk` and `www.apparitioninstruments.co.uk`. Canonical and latest deployment both `f290e564-6dde-4123-a349-997c70308729`, successful, created 20 November at 10:49:49 UTC. [Immutable deployment](https://f290e564.apparition-instruments.pages.dev/) |
| Exact application | Release C source `7fc5a1dcbf94064a5ec23831fcf2205047259294`, sealed 485-file artifact `14619393716`. Cloudflare directly identifies the source and the artifact in deployment metadata. File count and hashes come from the accepted package receipt. [Sealed artifact](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44716584356/artifacts/14619393716) |
| Rollback | Current C would roll back to the successful corrected Release B `e9d6806a-a568-4c0f-b533-c99eebda9699`, source `c906a28ec218d6ee715681cdc4fc362f79e9a34d`, artifact `14618294558`. FIRST LIGHT would roll back to current Release C `f290e564-6dde-4123-a349-997c70308729`, with the exact 485-file ZIP embedded in the candidate. Prefer application rollback and preserve additive schema and real records. [Release C publication receipt](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/f2e10ec9fdac23e3b2c268a80dabf13697353d99/docs/operations/grand-ascent78/ascension79-live-c.md) |
| Supabase | Production project **Apparition Instruments Webstore** (`acdxpxvksvdwfajntzfx`). Release A `20261119130030`, `20261119130043`, `20261119130052`, `20261119130058`; IRONCLAD `20261120094415`; OMNISCIENCE `20261120104633`; Stage A dormant foundations `20261120153844`; FIRST LIGHT read RPC `20261120162112`. [Complete live migration ledger](06-EVIDENCE-INDEX.md#installed-supabase-migration-ledger) |
| Store operations | `OPEN` in production configuration and the public operations snapshot. Holiday announcements retained as historical content in the static snapshot. [Public site](https://apparitioninstruments.co.uk/) · [Operations snapshot](https://apparitioninstruments.co.uk/operations/snapshot.json) |
| Delivery | UK Delivery £3.99 below £50 and free from £50. Active OVERSEER delivery revision 5 also preserves £4.99 `method-2`, stored label **Royal Maill Next Day+**, description **Next Day Delivery Aim**. Both have zero minimum order and units. The production read-only quote returned 399p and 499p at £49.99, and 0p and 499p at £50. The configured dispatch/delivery days were 1/2 for standard and 1/1 for the additional method. No active promotion or product override. Legacy GB fallback independently reads 399p and 5000p. Preserve the owner-configured option and the stored wording. |
| Checkout, accounts and communications | Established Stripe live checkout is the production fallback. `create-checkout` v16, `checkout-status` v10, `stripe-webhook` v15, `transactional-email` v15 and `my-orders` v5. Account order access follows verified customer identity and order ownership. Legacy/manual eBay order records, relay handling and Aftercare remain established workflows. |
| Stock | `public.inventory` is the sole physical quantity authority. IRONCLAD `ironclad69_track` enabled on it. IRONCLAD owns procurement, measurements, stocktakes and history. Catalogue owns definitions and existing component editing. Availability, quality holds, batches and allocations are derived or supporting evidence. |
| Finance | BLACK LEDGER evidence/revisions and ECLIPSE order financials, reconciliation and fulfilment cost library remain live. OMNISCIENCE Finance is live, with Admin-controlled management reporting and private outlay/reimbursement tables protected by RLS. Keep existing historical revisions and financial approvals. Automatic provider ingestion remains deferred. |
| Dormant controls | UNITY `paused`, QUARTERMASTER `disabled`, Aftercare Direct `off` with no active Direct Edge handler, new Commerce remains isolated, new eBay OAuth/sync remains unapproved, advanced COMMAND read adapter and writers deferred. The 15 private Stage A tables have RLS and zero direct SELECT grants to the application roles. |
| Owner acceptance | Release A signed-in accepted. IRONCLAD/navigation and OMNISCIENCE received initial positive owner checks per receipts. Fuller walkthrough remains due on genuine work, including IRONCLAD procurement/stock evidence and OMNISCIENCE contribution, real applicable expense/director entry and export. FIRST LIGHT signed-in preflight and post-publication acceptance remain open. |

## Active Edge inventory

| Slug | Version | Gateway JWT check |
| --- | ---: | --- |
| `create-checkout` | 16 | Off |
| `checkout-status` | 10 | Off |
| `stripe-webhook` | 15 | Off |
| `transactional-email` | 15 | Off |
| `my-orders` | 5 | On |
| `sync-order-contact` | 8 | Off |
| `contact-enquiry` | 3 | Off |
| `smtp-diagnostic` | 4 | On |
| `send-legacy-confirmation` | 2 | Off |

The gateway flag describes provider configuration. Application-level identity, Stripe signatures and established internal transport controls still apply. No checkout, payment, order, stock or email write was tested during 83H.

## Application and trust boundaries from 83H

- Cloudflare serves the sealed static storefront and Admin. The deployed tree includes cumulative overlays. Use the sealed artifact and its inventory for byte identity. `main` is the GitHub default branch for manual publisher registration.
- Supabase Auth supplies sessions. The shared Admin shell checks `public.admin_members`. Backend RPCs enforce their own membership or role checks, and customer order endpoints enforce account ownership. Production catalogues, orders, finance and stock keep their existing interfaces. RLS is enabled on `public.admin_members`, `public.orders`, `public.inventory` and `public.order_financial_revisions`.
- The installed `public.dominion81_status()` is stable and security-definer with an empty search path. Its body matches the approved file and calls `ironclad69.actor()` first. Production definition MD5 `46709eee25d4a13232a6d51c1f5028f1`; actor MD5 `dfd0d21e2b3f4f16701b8deb7f5953c4`. Effective EXECUTE is denied to anon and service role and granted to authenticated. The guard rejects a missing subject or non-member with SQLSTATE `42501`. The JSON contains a schema version, two modes and six individual counts capped at 1,001. It carries no record IDs, personal data or write contract.
- Native and Chromium fixture results support acceptance of the Stage B bytes. A genuine signed-in production Admin RPC response and signed-in browser acceptance remain separate evidence. See [authority and controls](04-SAFETY-AND-AUTHORITY.md) and [evidence provenance](06-EVIDENCE-INDEX.md).

## APPARITION NEXT · OPERATION PHANTASM

After HOMECOMING, explore **THE HARNESS AWAKENS** in a protected preview. The owner wants an electronics-first, cinematic homepage with accurate, photorealistic guitar components that assemble into a complete wiring harness as the visitor scrolls. Include interactive inspection of the components.

Use a premium, clean composition in dark charcoal and antique brass, with restrained Victorian-gothic influence and a subtle macabre atmosphere. Exclude generic guitar heroes, exaggerated science fiction, Halloween styling and decorative skulls. Evaluate GSAP, Three.js and optimised static assets for fidelity, performance and accessibility during preview planning. Retain the current production homepage until the owner accepts the replacement and authorises publication. 83H records this direction only.

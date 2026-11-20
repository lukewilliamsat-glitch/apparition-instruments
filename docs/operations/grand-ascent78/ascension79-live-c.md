# Grand Ascension Release C production checkpoint

20 November 2026. On the 78C acceptance walkthrough, the owner replied “All looking good!” and in Authorisation 79 reported that the signed-in IRONCLAD application and integrated Admin navigation are functioning correctly. This is owner-reported Release B acceptance; no claim is made of an independent signed-in B test.

The only database change was one execution of approved `20261117162718_omniscience74_v1.sql`, SHA-256 `f73d9b68df1eb8bd4a251d29ec58df1941132a4549d80c79e1790260fd9ea6be`, recorded by Supabase as `20261120104633 omniscience74_v1`. Preflight found the migration and schema absent, 34 existing order rows, a 90,112-byte heap and no active order writers. Postflight verified a ready, valid reporting index, RLS and no client direct grants on both private finance tables, and anonymous/service-role denial of the four Admin RPCs; authenticated RPCs still require the existing finance Admin guard. Order, stock and financial revision fingerprints matched before and after. No synthetic production financial entries were added.

| Record | Identity |
| --- | --- |
| Guarded publication | [44722435335](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44722435335), attempt 1; production gate and publisher succeeded |
| Exact registered workflow | Blob `b093007c97f5500be74656d3a4f5f88c5566b526`; default branch commit `d16f6cfe1f8fa6493852a73b345cc45a1ce80aa1`; guarded branch commit `bc271252b7048c347ae9b3ea38d40a5e0517d652` |
| Canonical Cloudflare deployment | `f290e564-6dde-4123-a349-997c70308729` (production, successful) |
| Application | `7fc5a1dcbf94064a5ec23831fcf2205047259294`; exact 485-file artifact `14619393716` from [44716584356](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44716584356) |
| SHA-256 identities | Wrapper `0a303d83433e480bfa897075f4b8e30b8fbd0152d7772e3af35dc61150ae5b14`; inner `be062020a7f3362357cd9a5f6613fe75104d55bb38aeaedccd695b0c55ea0c30`; inventory `0ab8c2fbf0e328f5d1e24871bb769e7b64768e811fd071f8bd4b7505819d17ad` |
| Live readback | 30/30 matching: public storefront, product image, basket, checkout, Admin entry and OMNISCIENCE, IRONCLAD, Orders and dependencies, including versioned imports |
| Immediate app rollback | Corrected, accepted Release B `e9d6806a-a568-4c0f-b533-c99eebda9699`, verified successful production; reuse the guarded Cloudflare application rollback and preserve the additive C schema and legitimate finance records |
| Other installed migrations | A: `20261119130030`, `20261119130043`, `20261119130052`, `20261119130058`. B: `20261120094415` |
| Active Edge | Checkout v16, checkout status v10, Stripe webhook v15, transactional email v15 (no changes) |

Operations OPEN. UK postage £3.99 below £50 and free from £50. Aftercare Direct and new delivery rates off, new Commerce absent, and no automatic Stripe fee retrieval introduced. No production orders, payments, stock changes, finance edits or customer communications.

**Publication verified; signed-in Release C walkthrough pending.** The owner has been asked to check Finance → OMNISCIENCE and existing Orders/ECLIPSE/BLACK LEDGER and IRONCLAD read-only. Do not close GRAND ASCENSION until that confirmation is recorded.

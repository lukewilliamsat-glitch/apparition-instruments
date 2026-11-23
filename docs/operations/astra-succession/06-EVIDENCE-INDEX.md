# Evidence index

**Verified 23 November 2026.** Production provider metadata, published byte samples, historical receipts and isolated tests describe different stages of the release.

## Live evidence from 83H

| Source | Readback and scope |
| --- | --- |
| Cloudflare Pages project and production deployment history | Canonical/latest Release C `f290e564-6dde-4123-a349-997c70308729`, source `7fc5a1dcbf94064a5ec23831fcf2205047259294`, production successful. Corrected B `e9d6806a-a568-4c0f-b533-c99eebda9699` is the previous successful deployment. No Stage B source in the returned production history. [Canonical site](https://apparitioninstruments.co.uk/) · [Immutable Release C](https://f290e564.apparition-instruments.pages.dev/) |
| Public production GETs | Homepage, account, checkout, Admin, OMNISCIENCE, IRONCLAD, Circuit FORGE, Wiring Diagram Generator, Treble Bleed Designer, configured kit builder and Operations snapshot returned 200. Five sampled Admin bytes matched the Release C audit hashes, including `admin/application.mjs`, Admin HTML, IRONCLAD HTML and OMNISCIENCE HTML/entry. Both Stage B route and entry returned 404. Snapshot state OPEN. This was unsigned and generated no orders or actions. [Operations snapshot](https://apparitioninstruments.co.uk/operations/snapshot.json) |
| GitHub Actions | Workflow ID `425197387` active and zero runs both across all events and with the `workflow_dispatch` filter. Exact blob `c4c41a11936191bdafdb4954c7b5e6379ed81c50` verified at both refs. Both protected environments restrict deployments to `engineering/phoenix66-preview`. Protected target variable inspection required access unavailable through the readback. No uploader credential use attempted. [Workflow](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/workflows/dominion81-stage-b-production.yml) · [Actions run API](https://api.github.com/repos/lukewilliamsat-glitch/apparition-instruments/actions/workflows/425197387/runs) |
| Supabase Management API and read-only SQL | Installed ledger and all nine active Edge versions queried in production. RPC checked via `pg_proc`, effective EXECUTE privileges and exact actor predicate. Live body matches approved source. Private Stage A RLS/ACL, inventory trigger, store, packing, UNITY and Aftercare controls checked. Production delivery revision 5 and pure quote readback verify two options at £49.99/£50. A genuine authenticated Admin RPC read and owner acceptance remain outstanding. [Ledger](#installed-supabase-migration-ledger) · [Baseline](01-MASTER-STATE.md) |

## Canonical GitHub sources and receipts

| Evidence | Pinned source and independently checked result |
| --- | --- |
| HOMECOMING completion | [Completion register at 388a9b5](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/388a9b53f4898d32a561349b82be2ccd9715ab7f/docs/operations/homecoming82/COMPLETION.md). Its FIRST LIGHT pre-install/approval status is historical. |
| Release C source, package and publication | [Source 7fc5a1d](https://github.com/lukewilliamsat-glitch/apparition-instruments/tree/7fc5a1dcbf94064a5ec23831fcf2205047259294) · [CI 44716584356](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44716584356) · [sealed 14619393716](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44716584356/artifacts/14619393716) · [acceptance files 14619907257](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44716584356/artifacts/14619907257) · [publication 44722435335](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44722435335) · [Release C production receipt](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/f2e10ec9fdac23e3b2c268a80dabf13697353d99/docs/operations/grand-ascent78/ascension79-live-c.md). |
| Corrected B application rollback | [CI 44716260408](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44716260408) · [sealed 14618294558](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44716260408/artifacts/14618294558) · [unification audit and matrix](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/388a9b53f4898d32a561349b82be2ccd9715ab7f/docs/operations/grand-ascent78/unification-audit-78b.md). |
| A/SENTINEL, IRONCLAD and OMNISCIENCE | [Release A applied SQL receipt](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/388a9b53f4898d32a561349b82be2ccd9715ab7f/docs/operations/release-a76/production-receipt.md) · [SENTINEL incident/recovery](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/388a9b53f4898d32a561349b82be2ccd9715ab7f/docs/operations/release-a76/incident77-receipt.md) · [IRONCLAD atomic SQL](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/388a9b53f4898d32a561349b82be2ccd9715ab7f/docs/operations/release69b/ironclad69b-production.atomic.sql) · [OMNISCIENCE SQL](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/a1d9e41fd4443f92f050c013c7bb1b70fa67568c/supabase/migrations/20261117162718_omniscience74_v1.sql). These link the approved source files and the deployed migration versions. |
| Installed Stage A | [Approved review SQL](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/67509b42be3e193beb6b1499f71e5bf67d154afe/tests/dominion78c/ironheart80-stage-a.review.sql) · [successful isolated CI 44730265444](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44730265444). Live installation verified separately in Supabase. |
| FIRST LIGHT read SQL and publisher | [Exact SQL](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/388a9b53f4898d32a561349b82be2ccd9715ab7f/tests/stageb81/stageb81.read.review.sql) · [reviewed publisher](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/388a9b53f4898d32a561349b82be2ccd9715ab7f/docs/operations/homecoming82/stageb82-publisher-review-only.yml) · [main registration](https://github.com/lukewilliamsat-glitch/apparition-instruments/commit/8c3769cd6078db00122b878f94be4e8e8c2a96ea) · [guarded registration](https://github.com/lukewilliamsat-glitch/apparition-instruments/commit/7b2ea433612546beaaad958bc326cdacf5e48385) · [protected target precedent 43845328622](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/43845328622). |
| Stage B and cumulative acceptance | [Accepted CI 44766548831](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44766548831) · [sealed 14643717958](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44766548831/artifacts/14643717958) · [cumulative CI 44768901567](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44768901567) · [Stage B workflow](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/49e011c6ef0bd583dca403f888912b465b610b0c/.github/workflows/stageb81-isolated.yml). Exact 488 files, 62 Chromium routes, 147 assertions, four role/session paths and unchanged customer bytes. |
| Workshop, eBay and provider adapters | [HOMECOMING 44770162646](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44770162646) · [491-file workshop 14645814636](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44770162646/artifacts/14645814636) · [evidence 14646468596](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44770162646/artifacts/14646468596) · [isolated workflow](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/78c37ad24f0eef9723271986ec2818a09dcdb296/.github/workflows/homecoming82-isolated.yml). |
| Stripe-shaped native settlement | [Successful 44771240560](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44771240560) · [native test source](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/578056a53c8bf1c20ca6d22a280c5307bfb0ec47/tests/homecoming82/settlement82.native.mjs). Disposable PostgreSQL and synthetic signed bytes. |
| Recovery | [74R scope/custody receipt](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/046b14cd10d362115b45b42ef20e4537ea799992/tools/cloud-anchor74/74r-recovery-acceptance.md) · [successful 44524518530](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44524518530). Historical original Pages artifact ID `12590914632` returned 404 from the currently accessible GitHub API. Preserve any separately retained original copy per existing custody record. No archive access, restore, replacement or cleanup attempted. |

GitHub run conclusions, source identities and accessible artifact metadata were checked. The Stage B, C and workshop artifact records were available and returned the expected wrapper hashes. ZIP contents and acceptance proofs are inherited from the sealed runs and exact receipts. Recheck artifact availability before use. See [exact digests and expiry](02-RELEASE-QUEUE.md). The provider contract links used in HOMECOMING are in its [completion register](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/388a9b53f4898d32a561349b82be2ccd9715ab7f/docs/operations/homecoming82/COMPLETION.md).

## Installed Supabase migration ledger

The 56 rows below are provider-recorded versions in production as of 23 November 2026. Earlier file timestamps in source can differ from recorded apply versions. Release A, B, C, Stage A and FIRST LIGHT source mappings are linked above.

| Installed version | Migration name |
| --- | --- |
| `20260924131615` | `p05a_backend_foundation` |
| `20260924131924` | `p05a_domain_identity_constraints` |
| `20260924183910` | `p05b_public_component_availability` |
| `20260924194844` | `p06a_safe_component_deletion` |
| `20260924215744` | `p06b_physical_requirements` |
| `20260925090045` | `p07a_guest_orders` |
| `20260925135634` | `p07b_checkout_pricing` |
| `20260925135741` | `p07b_qualify_delivery_country` |
| `20260925142332` | `p07b2a_paid_order_fulfilment` |
| `20260925142431` | `p07b2a_qualify_inventory_update` |
| `20260925151810` | `p07b4_order_contact` |
| `20260925153411` | `p07b5_order_fulfilment` |
| `20260925200421` | `p07b7_confirmation_delivery` |
| `20260925222950` | `p08a_legacy_order_confirmation` |
| `20260926124503` | `p08a1_refund_lifecycle` |
| `20260926134458` | `p08b2_delivery_foundation` |
| `20260926135045` | `p08b2_expected_refund_review` |
| `20260926174829` | `p08b4_dispatch_details` |
| `20260927090811` | `p08b5a_ai010010_canary` |
| `20260927105232` | `p08b5b_delivery_boundary` |
| `20260927105436` | `p08b5b_global_activation` |
| `20260927111426` | `p09a_contact_audit` |
| `20260927162408` | `p09c_order_ownership` |
| `20260927165005` | `p09ef_verified_contact_order` |
| `20260928081731` | `p10g_catalogue_options` |
| `20260928154321` | `p11_catalogue_option_delete` |
| `20260930114021` | `external_orders_v1` |
| `20261002163408` | `platform_qa_catalogue_read_grants` |
| `20261004174609` | `site_operations_v1` |
| `20261005084639` | `commercial_destinations_v1` |
| `20261005102445` | `luthier_hub_cms_v2` |
| `20261005112215` | `hub_cms_docx_drafts` |
| `20261005141419` | `hub_content_expansion_v3` |
| `20261005142814` | `hub_media_foundation_v3` |
| `20261005175714` | `manifest_composition_v1` |
| `20261006082019` | `conjure_v3_line_adapter` |
| `20261006091313` | `manifest_universal_private_documents` |
| `20261007101404` | `forge_pro_foundation_v1` |
| `20261007124642` | `forge_pro_open_preview_v1` |
| `20261008075917` | `external_order_editing_v1` |
| `20261008081744` | `ebay_relay_dispatch_v1` |
| `20261008083746` | `fulfilment_email_v1` |
| `20261008134245` | `email_preview_giga_v1` |
| `20261008143829` | `customer_aftercare_giga_v1` |
| `20261008161807` | `email_template_studio_giga_v1` |
| `20261009113213` | `forge_instrument_workspace_v3` |
| `20261009145448` | `catalogue_delivery_v2` |
| `20261027175837` | `black_ledger_financial_v1` |
| `20261119130030` | `overseer_delivery_v1` |
| `20261119130043` | `overseer_aftercare_direct_v1` |
| `20261119130052` | `overseer_order_date_correction` |
| `20261119130058` | `eclipse_fulfilment_finance_v1` |
| `20261120094415` | `ironclad69b_production_atomic` |
| `20261120104633` | `omniscience74_v1` |
| `20261120153844` | `ironheart80_stage_a_dormant_foundations` |
| `20261120162112` | `dominion81_stage_b_read_only` |

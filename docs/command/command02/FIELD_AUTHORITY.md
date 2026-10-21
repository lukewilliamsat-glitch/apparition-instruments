# COMMAND 02 field authority — source review, no live checks
Baseline main: `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`. COMMAND 01: `3b84871ccb338296b52b4fe3fe350be17284d235`. No database query or migration is performed.

## Verified existing pathways
- `dist/backend/component-data.mjs` (`a0bbf8f3c4a2301b8650ab7f95f813d925ffec8a`): Admin reads components, inventory and component_internal separately. Existing save normalises the complete record, writes private cost, conditionally writes inventory and PATCHes components. These sequential requests are **not a single database transaction**. Component PATCH has an ID condition, not a component revision/CAS condition.
- `dist/admin/data.mjs` (`d4f2edaa3afb26295dbad0f4cfc2db0973efe092`): parseGBP, unique case-insensitive SKU, immutable original ID, field limits, spec text and eligibility semantics.
- `dist/admin/admin.mjs` (`9e6d36b9c6fc7e806e4e5fb3e222887d3c378307`): actual edit controls, manufacturer option/key mapping, category-specific electrical/physical controls, dedicated stock dialog.
- `dist/backend/providers.mjs` (`b9078fa9e465c65bb21bd41f95f3ece6879904d0`): authenticated resource allowlist, current user's access token, post-write public-cache invalidation.
- `dist/admin/admin-auth.mjs`, `admin-gate.mjs`: Auth identity and admin_members membership, repository injection after authorisation, clearing repositories on sign-out. None is imported/booted by COMMAND 02.
- Existing foundation migration and domain-identity migration source declare membership-based RLS USING/WITH CHECK, component/spec JSON object constraints, integer-pence columns, case-folded SKU uniqueness and component foreign keys. This is historical source evidence, **not current deployed policy verification**.

## Field map
| Field / storage | Type and null semantics | Existing write / validation authority | COMMAND 02 |
|---|---|---|---|
| id / components.id | Text PK; existing ID retained on edit | normaliseComponentInput forces originalId; relationships reference ID | Immutable; never in patch |
| sku / components.sku | Required text 1–80; case-insensitive unique | Admin normaliser + database unique index | Editable; fixture store validates uniqueness atomically |
| name / components.name | Required text 1–300 | Admin normaliser + database length check | Editable; overlength rejected, not silently truncated |
| description / components.description | Text; empty string permitted; Admin limit 5000 | Admin normaliser; database text | Editable, plain text |
| manufacturer / components.manufacturer; manufacturerKey / product_content | Text and option identity; empty supported | Actual Admin resolves catalogue_options and preserves option identity | Read-only; keyed selector integration deferred |
| category / components.category | Existing six component categories | Admin category/spec/physical handlers; database only broad text constraint | Read-only to avoid partial category migration |
| specs.Series, specs.Reference / components.specs | Existing common spec text fields, up to 300; empty removes optional key | specificationFields and existing text-object normaliser | Editable; preserve all other keys |
| Other specs and technicalSpecs / product_content | Category-dependent structured facts, derived legacy text and physical relationships | product-content/electrical-specs/physical-specs and specialised Admin controls | Read-only; no technical number/unit coercion |
| salePrice / components.sale_price | Nullable nonnegative integer GBP pence | parseGBP + Admin checks + database integer/check | Editable; selling price, no promotional semantics |
| kitPrice / components.kit_price | Nullable nonnegative integer GBP pence | Existing save/kit binding semantics + DB check | Editable fixture component value; no assembly/kit definition writes |
| kitPriceQuantity / components.kit_price_quantity | Nullable positive integer, >=1 | Admin normaliser + DB integer/check | Editable; not a quantity-discount tier |
| active / components.active | Non-null boolean | Existing Admin flag and component PATCH; RLS/DB | Editable synthetic flag; not a draft/publish lifecycle |
| individually / components.individually | Boolean | Existing component save; RLS/DB | Editable synthetic eligibility |
| inKits / components.in_kits | Boolean | Existing component save; RLS/DB | Editable synthetic eligibility; not assembly editing |
| stock / inventory.quantity | Whole nonnegative quantity; source bigint bound | changeStock reads inventory then PATCHes with previous quantity condition | Read-only; no stock mutation in generic patch |
| stockUnit / inventory.stock_unit | item, m, g | Existing Admin/repository + DB enum-like check | Read-only; C02 fictional metre examples use canonical m |
| image / components.image | Original writable image data; null differs from omitted | Existing image validation and authenticated save | Not read/written; metadata placeholder preserved separately |
| internalUnitCost / component_internal | Private nullable pence | Separate private table and Admin save | Excluded from read model and patch |
| product_content other fields / physicalSpecs | Structured customer content and geometry | Existing specialised controls/validators | Preserved untouched; deferred |
| updated_at / fixture revision | DB timestamp exists; no verified generic component CAS exposed in save | No component revision guard or idempotency contract in inspected save path | Synthetic revision only, not a deployed schema capability |

Client guidance rejects prices outside signed PostgreSQL integer pence (2,147,483,647) and kit quantities outside positive signed integer range. This is stricter than the existing safe-JavaScript-integer client check and matches the inspected column type. Blank monetary inputs mean null. GBP parsing accepts at most two decimal places; no rounding. Existing text trimming is explicit; identifiers/specification values are never truncated or technically reinterpreted.

## Security and integration limits
Fixture authority revalidates the patch whitelist, required fields, types, prices, SKU uniqueness, permission and expected revision at commit time. Client controls are not authorisation. Unsupported stock/image/private/identity fields are rejected even when bypassing the UI.

Production generic component saves lack the transactional/revision/idempotency contract simulated here. No component-specific immutable version history or save audit is established by the inspected path. A timestamp column alone is not proof of either. Future integration needs a separately reviewed server contract that preserves hidden image/private/content fields and existing inventory authority; this candidate cannot be attached directly to the production save function. No SQL or new RPC is proposed/executed here.

All source links resolve under [the verified baseline](https://github.com/lukewilliamsat-glitch/apparition-instruments/tree/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f). Assembly records, galleries, discounts, promotions, checkout, order and payment logic remain outside scope.

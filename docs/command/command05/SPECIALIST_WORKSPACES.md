# Existing specialist facilities preserved

Only two inherited files change: shared navigation and gate composition. Every other inherited blob is compared byte-for-byte to main in preservation acceptance, including production workflow, migrations, all specialist HTML/controllers/styles, order/stock/pricing logic and account/FORGE. No specialist is rewritten as a new COMMAND tab.

| Facility | Source-defined destination / entry | Acceptance and limit |
| --- | --- | --- |
| Inventory/components, assemblies, maintenance | `/admin/?view=inventory`, `?view=assemblies`, `?view=maintenance`; `admin.mjs` | Existing forms/actions preserved; main repository unchanged; legacy writes not adopted by COMMAND |
| Wiring kits/build costing | `/admin/wiring-kit-master/`; `app.mjs` | Inputs and private costing tool preserved; requires its existing Admin gate, not a COMMAND inventory capability |
| Catalogue settings | `/admin/catalogue-settings/`; `settings.mjs` | Original options workflows preserved |
| Orders/external sales/fulfilment | `/admin/orders/`; `orders/app.mjs`, external/edit/lifecycle modules | Original queue, create/edit, status/stock deductions preserved; no real order/data loaded |
| Build sheet/invoice | `/admin/orders/build-sheet/`, `/admin/orders/invoice/` | Nested gated entries remain unchanged; reached through existing order context |
| Customer Aftercare | `/admin/orders/?view=aftercare` | Existing Orders route retained and made directly discoverable in shared navigation; no emails sent |
| CMS/Conjure/media | `/admin/hub-cms/`, `/admin/conjure/`, `/admin/hub-media/` | Original controller/form identities preserved; Conjure retains its separate shell and access gate |
| Operations/News/announcements/commercial destinations | `/admin/site-operations/` and existing hashes | Original scoped sections preserved; no holiday state or configuration changed |
| Email Preview/Template Studio | `/admin/email-preview/`, `/admin/email-templates/` | Original entries/permissions preserved; synthetic tests only, no live preview/customer records |
| Instrument/FORGE | `/circuit-forge/`, `/circuit-forge/projects/` | Actual main implementation is a separate public/account workspace, not a hidden COMMAND Admin replacement. Added discovery link; original account/project protections untouched |
| Overview/account | `/admin/overview/`, `/account/` | Existing entries and sign-out remain intact |

Navigation labels are not proof of domain feature parity. Node acceptance tests actual shell preservation of every original form/control for each route and source byte conservation; selected inherited shell/catalogue/content/order/aftercare tests exercise synthetic domain behaviour. Browser reachability must identify structural-only routes separately. No live specialist authentication, data grant or write compatibility is claimed. Granular real read-only/stock/finance role access to legacy screens remains a backend launch gate; shared existing Admin membership is not a new financial permission system.

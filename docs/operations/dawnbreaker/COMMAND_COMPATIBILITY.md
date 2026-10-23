# Future Phase C — separate backend compatibility review

**Planning only; no schema query, authentication, SQL or product/customer read occurred.** Phase B's three public responses cannot establish COMMAND readiness. Phase C requires a distinct privileged-access decision, exact query contracts and redacted evidence handling. Passing it would authorise no DDL or mutation.

## Proven source versus unknown deployment

[IRONCLAD acceptance](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/20002c45933a7f24b08f6d5f0199a7fc8fa1a282/docs/command/command04/ACCEPTANCE.md) records 61 PostgreSQL cases and inherited/COMMAND browser and Node acceptance under isolation. The fixture demonstrates transactional product/inventory/cost/revision/receipt/audit behaviour on synthetic schema, local login roles and principal mappings. **It does not implement deployed Supabase JWT/auth.uid()/admin_members integration.** Fixture trust authentication, caller session_user mapping and fixture operation counters must not be copied into production.

Current-main source establishes these review targets, not their installed state:

| Source | Compatibility concern |
|---|---|
| `supabase/migrations/20260924131615_p05a_backend_foundation.sql` and identity/availability/grant follow-ups | Components, inventory and private costs are separate; admin_members gates policies; public invoker views and column/table privileges must be reconciled together. Migration files do not prove ledger/application parity. |
| `dist/admin/admin-auth.mjs` | Ordinary Auth token/user/refresh checks then own admin_members lookup. Session tokens in local browser storage; expired/denied distinctions. Real JWT verification, revocation and capability mapping remain unverified. No login is performed here. |
| `dist/backend/providers.mjs`, `component-data.mjs` | Authenticated transport and legacy full-list/save path. Existing save independently writes private cost, conditionally inventory, then component; no single atomic shared revision/receipt contract established. |
| `component-data.mjs` changeStock | Quantity predicate protects a particular inventory write. It is not a shared product revision or transaction across all writers. Preserve its safeguard. |
| `assembly-data.mjs` | Multi-table kit/assembly writes temporarily hide a definition; not one atomic product transaction. Its dependencies and visibility rules must survive integration. |
| Checkout/order/external-sale/stock functions and migrations | Inventory can be changed outside the editor. Every writer, including installed jobs/functions/manual integrations, must participate in the future revision/stock authority or be explicitly contained. Source alone cannot enumerate outside clients. |

## Sensitivity and approval boundaries

| Class | Potential evidence | Required authority / exclusions |
|---|---|---|
| B — public sampled metadata | The immutable three-request plan | Anonymous public read only; no schema, account or images |
| C1 — structural database metadata | Exact columns/types/constraints, view options/dependencies, limited object fingerprints | Privileged read-only catalog access or trusted owner export; names/security architecture may be sensitive. Not a harmless catalogue query. |
| C2 — effective security and migration metadata | Effective grants/RLS/owners, installed RPC settings, ledger versions/checksums, admin membership mechanism | Explicitly authorised trusted operator/privileged DB access; no member rows, auth.users, tokens, passwords, provider secrets or raw function bodies containing literals |
| C3 — operational identity/write behaviour | Actual JWT/revocation/permission, CAS, transaction, replay, audit behaviour | **Outside initial read-only Phase C**. Requires separately approved synthetic/nonproduction or bounded integration acceptance; no real product/customer mutation implied. |

Do not place privileged SQL or credentials in Phase B's request adapter. No service-role key is an acceptable way to make B pass. Provider dashboard/management APIs, DB catalog SQL and ordinary public REST have different capabilities and risk; do not substitute between them without exact scope approval.

## Bounded review candidate — not execution-ready approval

First reconcile pinned GitHub source offline and ask the owner which trusted metadata channel is available. Before **any** backend access, produce the exact read-only statements/tool calls and hashes, selected object allowlist, result schema, privilege, timeout/cancellation behaviour and redaction rules for owner approval. No executable SQL or recovery job is added by DAWNBREAKER. Unknown deployed names are not a licence for unrestricted discovery.

Proposed ceiling for a single approved metadata batch: **8 statements/tool requests maximum**, sequential, no retries/pagination; **5 seconds each**, at most 40 seconds of request deadlines; **16,384 accepted response bytes each / 65,536 aggregate**, maximum **50 rows each**, reaching a row limit stops as incomplete. Use a read-only transaction and local statement timeout where the approved SQL channel supports them; no EXPLAIN ANALYZE, DML/DDL, function invocation with side effects or temporary objects. Transport/body cancellation limits must be reviewed as for B. These are new **proposed** limits, not inherited or already approved authority.

| Candidate slot | Exact information contract to finalise before approval | Must not return |
|---|---|---|
| C1 | Allowlisted components/inventory/component_internal/admin_members/catalogue/options and relevant revision/receipt/audit object existence, column types/nullability/default fingerprints, constraints/index fingerprints | Any business rows, images, costs or private notes |
| C2 | Expected migration versions/names and available checksums against source; flag missing/out-of-band state. Ledger schema/column names must first be known from approved metadata. | Migration statement bodies, arbitrary schema export |
| C3 | Allowlisted object owners, relevant role attributes and effective table/column/function privileges for public/anon/authenticated and the proposed trusted executor | Role passwords, role membership identities unrelated to this contract |
| C4 | RLS enabled/forced flags; approved normalised policy descriptors/fingerprints; view security_invoker and dependencies | Protected table rows; assume-no-hidden-rows conclusions |
| C5 | Relevant RPC signatures/result types, volatility, SECURITY DEFINER/INVOKER, owner/search_path/EXECUTE grants and source fingerprints | Unrestricted function bodies or secrets in definitions |
| C6 | Admin-membership table/policy structure, trusted actor/capability source and documented session/JWT boundary | Membership entries, user IDs/emails, JWTs, passwords or auth account data |
| C7 | Relevant installed trigger/rule/function dependency fingerprints to reconcile the source writer inventory | Executing writers, jobs, webhooks, email or checkout |
| C8 | Presence/types/constraints/retention prerequisites for shared revision, idempotency/receipts and immutable actor-bound audit/status | Receipt/audit rows or operation lookups against real users |

These are output contracts, not ready-made catalog queries. A channel unable to produce these bounded, reviewed outputs is a HOLD. More objects/rows, an unsupported endpoint, a needed raw definition or schema mismatch requires a new reviewed batch and approval; never expand a query mid-run. Redact at the trusted source before evidence leaves the project. Owner-provided evidence is labelled accordingly, not independently queried.

## Required compatibility decisions

Map real table/column semantics, integer pence/ranges/nullability, text IDs/SKU uniqueness/collation, existing Series/Reference specs and protected image/inventory/cost boundaries to COMMAND. Establish a trusted server actor from verified authentication; client-supplied roles/GUCs/capabilities cannot authorise writes. Generic authenticated customers cannot become admins. Review current-authority rechecks on entry, lock wait, replay and reconciliation, including expiry/revocation semantics.

Every participating product/inventory/private-cost write must use one transaction and one shared revision CAS, with quantity checks where relevant. Review order/stock legacy writers, external integrations and maintenance access. A new RPC alongside bypassing direct writes is not sufficient. Specify actor-bound persistent collision-resistant operation IDs, canonical request binding, transactionally durable receipt/audit, current-authority replay/status, unknown-until-reconciled response loss, append-only history and retention/privacy. An absent receipt must not be presented as confirmed failure.

Read-only metadata can identify structural compatibility and gaps. It cannot prove transaction crash/failover/load behaviour, effective live JWT claims or all hidden-row access outcomes. Additional security/transaction acceptance remains separate, with synthetic data and approved isolation where possible.

## Exit and integration gates

Return MATCH / GAP / UNKNOWN per contract with pinned source, approval, channel, counts/bytes/time and redacted fingerprints. Stop on unexpected sensitive output, privilege escalation, schema drift, missing evidence or any limit/error. Do not repair grants/RLS or apply the IRONCLAD fixture.

Production integration subsequently requires exact reviewed DDL/code hashes, auth/legacy-writer reconciliation, backups and complete rollback, deployment ordering, narrowly bounded live acceptance, owner design/device/accessibility decisions and a new authorisation. NOCTURNE visual approval changes none of these backend gates.

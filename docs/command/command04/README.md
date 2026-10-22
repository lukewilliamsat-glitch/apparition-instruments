# COMMAND 04 — Project IRONCLAD

Authorisation 40. Isolated engineering candidate; no production endpoint, migration or deployment.

## Source-grounded scope

Base: COMMAND03 `2c2d629a6194506d34c2fbbcce4742fceee94488`, tree `e85d7e8c181f1f8cfd576cedbe53c64a8958f7cf`. Production source reviewed: `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`. See the inherited [COMMAND03 source authority](../command03/SOURCE_AUTHORITY.md) and exact blob references there. Re-read `dist/backend/component-data.mjs`, `dist/admin/component-repository.mjs` and the foundation/identity SQL during this mission.

The existing save issues independent private-cost, inventory and product writes. Existing inventory updates predicate on the old quantity; no atomic product/revision/receipt contract is established. IRONCLAD adds a separate, functioning synthetic boundary rather than attaching a misleading guarantee to that legacy path. All inherited source files and prior screenshots remain unchanged.

## Implementation

- `prototypes/command04/contract.mjs`: strict `command04-v1` envelope, bounded canonical JSON, stable product identity, source-derived editable field validation, explicit stock command and private-cost capability boundary.
- `server.mjs`: injected trusted synthetic authority, serialized transactions, private staging, revalidation immediately before visibility, revision CAS, case-folded SKU uniqueness, actor-scoped idempotent receipts and private immutable-copy audit evidence. It is an in-process reference model, not durable database storage or a production auth server.
- `wire.mjs`: reuses COMMAND03's session and bounded read-query fixture; replaces save/status with IRONCLAD. Source-shaped summary/detail records read from the same authority as writes. Fixture seed null/default normalization is explicit, never a fallback for missing live data.
- `entry.mjs` / `index.html`: compose unchanged COMMAND01 workbench, COMMAND02 editor and COMMAND03 bridge against the new synthetic authority. Existing protected stock/image controls remain unavailable in this limited editor. No `dist/` route or live transport is activated.
- `tests/command04/postgres-fixture.sql`: executable **disposable PostgreSQL fixture**, outside the migration directory. It creates a fresh isolated schema and roles; it is not suitable for production application.
- `tests/command04/postgres.py`: actual database concurrency, rollback, role/grant/RLS, identity, immutable-history and reconciliation verification through a local Unix socket.
- `tests/command04/logic.mjs` and `browser.mjs`: deterministic contract/compatibility tests and genuine browser interaction. New browser screenshots are not captured or published.
- `source-integrity.py`: before/after byte checks of all 977 inherited files, current source identity and exact added-file scope.
- `run-isolated.sh` and the **new** `command04-acceptance.yml`: branch/path scoped, contents:read, no secrets, no environment, no Pages/OIDC write rights. Existing workflows remain unchanged.

## Mutation and reconciliation contract

Envelope: `{protocol, operationId, id, expectedRevision, patch?, inventory?, internalCost?}`. Product patch supports only existing COMMAND02 name, SKU, description, Series/Reference, price/kit quantity and eligibility fields. Product id, category, raw specs, stock unit, image, revision and internal fields cannot be smuggled into the generic patch. Omitted images stay unloaded/preserved; there is no image-write endpoint. Private original image bytes never appear in read/save/status responses.

Prices/costs use integer pence in the existing 32-bit range. Inventory uses explicit `{mode: 'set'|'adjust', value, expectedQuantity}` with safe-integer limits derived from the source bigint check. Inventory and cost each require separate server capabilities, beyond product read/write. The limited existing editor cannot grant them.

Every supported product/inventory/cost operation compares the shared product revision and advances it exactly once. Stock also predicates on the expected quantity. Case-folded SKU uniqueness is authoritative; a stale revision cannot overwrite another mutation. ID is immutable. Image data and unrelated specs survive ordinary patches.

A receipt binds **actor + operation ID + complete canonical command**. Exact duplicates return the original committed result, including its original revision even after later changes. Different content under that key fails. Another actor cannot discover or reconcile the receipt. Current permission is checked again on replay/status; a previous success does not grant continuing access.

There is no automatic write retry. Response loss is unknown until same-actor reconciliation establishes commitment. An absent receipt is **unknown**, not proof of non-application. PostgreSQL returns unknown while another transaction is uncommitted. The in-process reference can additionally report its pending work. A future HTTP adapter must return success only after database commit and preserve the operation identity on an exact retry.

## Disposable PostgreSQL security and transaction design

The fixture contains six RLS/FORCE-RLS tables: principals, products, inventory, private costs, operations and audit. Five foreign keys retain referential integrity with no deletion cascades. Receipts/audit reject UPDATE, DELETE and TRUNCATE, including when attempted by the non-login owner.

The three callable functions are read_product, mutate and operation_status. They run as a non-login, non-superuser, NOBYPASSRLS owner under a fixed `pg_catalog` search path with schema-qualified object references. The private record helper has no client EXECUTE. Default PUBLIC function EXECUTE is explicitly revoked; caller roles receive only schema USAGE and the three specific entry points. No caller gets direct table privileges, ownership or membership writes. RLS owner policies do not grant caller table access.

Caller identity comes from the authenticated PostgreSQL **session_user**, resolved against an owner-controlled fixture principal table. Actor/capability payloads and caller-editable GUCs cannot enrol or elevate a principal. This models a trusted server identity boundary; it does **not** implement Supabase JWT verification, auth.uid(), session revocation, admin_members integration or production granular permissions.

Mutation holds a shared principal-row lock and checks current read/write/capability/expiry before taking an actor-operation advisory transaction lock. Permission revocation is serialized against that principal lock: revocation committed before entry denies; revocation waiting behind an accepted transaction takes effect after it. Product/inventory rows are locked, CAS is checked, product/inventory/cost/receipt/audit are written in one transaction. Database uniqueness prevents racing SKU claims. Exceptions or transaction/backend interruption roll everything back. No client can invoke a sequence of direct table writes around the function.

The SQL file intentionally fails if its roles/schema already exist; it does not replace existing objects. All fixture tables are seeded with fabricated source-shaped records. The disposable server listens on no TCP interface; its socket directory is mode 0700. Local trust auth is solely a throwaway test mechanism and must never be copied into production. Existing preinstalled PostgreSQL binaries are used if available; no database software download is attempted.

## Verification and evidence

CI uses Node22.20.0 and the established official controller with hosted Chrome. Before any candidate page opens, the inherited ten negative controls demonstrate a fresh loopback-only kernel namespace, failed external IPv4/IPv6/DNS/WebSocket/redirect/resource/navigation probes, and inherited process isolation. Disposable profiles, sandbox, disabled extensions/background networking and blocked service workers are retained.

All application/SQL/Node/browser tests and subprocesses run in that namespace with clean synthetic environments. A text-only 30-day Actions artifact allowlists source proofs, Node/PostgreSQL/browser/namespace results and runtime information. It excludes database directories, seeds, browser profiles and every PNG. Independent artifact readback and final results are recorded in `ACCEPTANCE.md` after the run. The earlier COMMAND03 visual-review artifact remains the approved image-review source.

## Limits and production approval gates

This is not production database certification. The fixture uses JSON-bodied products and login-role principals rather than the current Supabase tables/auth flow. Exact Unicode/collation/normalisation, PostgREST/RPC error mapping and schema/column parity require separate design and verification. The 32-bit fixture revision limit is explicit, not an unlimited version history promise.

The in-memory model serializes all mutations and is not crash-durable. PostgreSQL exercises real row/advisory locks and transactions, but on synthetic schema/data only. Its append-only audit covers supported commands; it is not a full business event-sourcing or disaster-recovery system. No automatic receipt garbage collection exists. Operation IDs in the inherited editor are fixture counters; production integration requires collision-resistant per-intent IDs persisted through retries, not a fresh ID after timeout.

Before production, separately approve current schema/RLS/grant/session verification, real admin_members/capability mapping, all-writer revision enforcement (including legacy stock/order paths), protected-field/image/cost adapters, SQL/DDL/hash review, audit retention/privacy, complete backup and rollback inputs, database transaction/load tests and narrowly bounded release/owner acceptance. Every existing writer must participate in revision/inventory safeguards; the new endpoint cannot safely coexist with bypassing legacy writes without that reconciliation.

No SQL file here is an approved migration. Do not copy it into production, deploy backend components, merge main or connect the fixture to real credentials. Supabase, Stripe, customer transactions and emails remain untouched.

## Recovery / rollback

Recover the verified engineering branch or exact tested commit from GitHub, then read the source/evidence manifests and chat migration document. No owner-side software or routine ZIP transfer is required. No production rollback is needed because production is unchanged. Discard only separately created disposable test environments, never frozen refs or assets. A future production rollout/rollback must be separately designed and approved; reversing this fixture schema is not a production rollback plan.

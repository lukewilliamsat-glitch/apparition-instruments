# COMMAND 03 source authority

Reviewed production-main source: `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`. COMMAND 03 starts at frozen COMMAND 02 `048824545c1fc3655778bc7cca22bc6f2e1bc447` / tree `720ff196024f27a4ce56cd72c857e31767bb70f5`. No live backend connection, account, policy or database inspection occurs.

## Confirmed in inspected source

- [admin-auth.mjs](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/admin/admin-auth.mjs): ordinary access/refresh tokens stored under the existing Admin session key; password sign-in and local-scope sign-out; token refresh within 60 seconds of expiry; Auth user endpoint followed by a filtered admin_members self-read. Membership is not inferred from user-supplied role claims.
- [admin-gate.mjs](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/admin/admin-gate.mjs): restore/sign-in must return authorized before repository injection and UI entry loading. Sign-out clears component, option, assembly, order, Operations and Studio repository references before the network sign-out. Entry failure clears them too.
- [providers.mjs](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/backend/providers.mjs): allowlisted resource names, current Auth accessToken, ordinary publishable client configuration and JSON REST requests. It does not use a service-role credential. Successful business writes invalidate public read caches. Its present send signature does not forward AbortSignal; real cancellation integration is a future gate.
- [component-data.mjs](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/backend/component-data.mjs): existing full Admin listing independently GETs components, inventory and component_internal with select=*. COMMAND 03 preserves that existing repository and adds a distinct summary/detail adapter. It neither imports nor boots the live transport.
- The real save first loads/normalises complete records, upserts private cost, conditionally PATCHes inventory when changed, then PATCHes components by stable id. This is **sequential, not atomic**, and the component PATCH has no verified revision predicate or operation-id contract. A partial failure can therefore differ from the synthetic transaction model.
- changeStock is a separate set/adjust operation: read previous inventory, validate whole non-negative result, PATCH component_id and previous quantity together, then reload. No generic stock-write RPC is assumed. COMMAND 03 stock writes remain blocked.
- Component removal uses rpc/delete_unused_component, independently of normal product save. It is not exposed by COMMAND 03. Order/email/Studio/Forge RPCs are separate domains, not substitutes for a component mutation contract.
- [data.mjs](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/admin/data.mjs), [admin.mjs](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/admin/admin.mjs), [product-content.mjs](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/admin/product-content.mjs): stable original ID, case-folded SKU uniqueness, actual field limits, structured spec and option-key handling, source-image preservation and distinct stock/image controls. salePrice is selling price; kit price and quantity are not promotion tiers.
- The current canonical Admin source predates the frozen FORGE V4 refresh correction. Its generic load/save UI should not be described as already having COMMAND or unmerged FORGE guarantees. COMMAND 01/02 have their own separately tested state protections.

## Historical database definitions present in current repository

- [Foundation](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/supabase/migrations/20260924131615_p05a_backend_foundation.sql): admin_members self SELECT and no self-enrolment grant; RLS enabled on components, inventory, internal costs and related tables; membership predicates on Admin reads/writes; USING and WITH CHECK on mutations. Authenticated role alone does not prove Admin membership.
- [Identity constraints](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/supabase/migrations/20260924131924_p05a_domain_identity_constraints.sql): case-folded SKU indexes, integer-pence relationships and invoker catalogue projection. Money/kit quantity bounds are preserved in the COMMAND schema.
- [Safe deletion](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/supabase/migrations/20260924194844_p06a_safe_component_deletion.sql): separates insert/update/delete policies, dependency protection and a SECURITY INVOKER deletion function with explicit auth.uid/admin_members checks and restricted execute grants.
- [Public grant hardening](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/supabase/migrations/20261002163408_platform_qa_catalogue_read_grants.sql): asserts invoker views and narrows their privileges to SELECT, preserving base-table Admin grants.
- Foundation updated_at defaults do not constitute a component compare-and-set, immutable history or audited atomic command. No such supported product-write endpoint was established in the inspected provider/repository path.

These are source definitions, **not verification that the live project applied them or that no later configuration drift exists**. No SQL is executed or proposed.

## Proposed adapter foundations

Explicit bounded components/inventory projections use the existing column vocabulary. Fixed legacy spec JSON selectors support local technical search without transferring every spec. Actual PostgREST selector parsing, column grants, RLS, pagination behaviour, source ID lengths and deployed response shapes remain unverified until separate read-only approval.

Granular catalogueRead/productRead/productWrite capabilities, per-operation revalidation, cancellation forwarding, synthetic session handles and operation journals are integration interfaces exercised by mocks. Existing Admin membership is coarse; these granular permissions are not claimed to be deployed.

No least-data original-image metadata projection is established. The adapter returns **unloaded**, not absent/deleted, and never requests image/private cost fields. Authoritative checkout, assemblies, source images, payments and emails remain outside this adapter.

## Unknown / future approval gates

Current deployed RLS/grants, session revocation timing, Auth settings, policy drift, real table/JSON projection responses, product-specific audits, version enforcement and atomic/idempotent mutation support require separately authorised verification. Frontend visibility and a valid token are not server authorisation. The candidate cannot be wired to the existing generic save as a safe versioned adapter.

# Existing Admin and integration seam

Main has one shared `dist/admin/application.mjs` navigation/shell, `admin-gate.mjs` authentication/membership orchestration and per-page `data-admin-entry` modules. `admin-auth.mjs` uses the existing Auth session key, verifies user identity and `admin_members`, refreshes expiring tokens and clears local session on logout. Membership is not evidence of granular stock/finance capabilities.

COMMAND adds `/admin/command/` to that shared route list. The gate can mount an exported workspace after membership succeeds and synchronously lock it before sign-out. Existing modules without that export retain their import-based bootstrap. No customer/storefront entry changes. Conjure keeps its own protected shell. A deliberately injected test auth/adapter can exercise the same composition; production imports no test entry and has no synthetic fallback.

Legacy `component-data.mjs` Admin list reads `components`, `inventory` and `component_internal` using unrestricted projections; images/private costs are eagerly returned. It is unsuitable for the new least-data read-only workspace. Its update flow separately writes private cost, optional inventory and product. COMMAND must not call it for reads or saves. Existing inventory/product/assembly/order workspaces remain available under their unchanged auth boundary; preservation is not acceptance of their writes for COMMAND.

Chosen seam: a new source-local read adapter contract, fail closed until deployed metadata, role and egress contracts are independently approved. Current main has no proven granular capability RPC or IRONCLAD live adapter. Current source loading errors are generic gate errors; new workspace states will distinguish no session, denial, inactive adapter, loading/read failure and partial capability.

Checkpoint1 verification: `tests/command05/shell.mjs`, inherited `admin-gate.mjs` and `admin-v2-shell.mjs`, network forbidden in local validation. No live session was loaded.

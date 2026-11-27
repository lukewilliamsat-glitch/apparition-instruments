# LEGACY — pre-PHANTASM recovery

LEGACY: PRE-PHANTASM 95
Full static rollback: Cloudflare deployment 14a0af2b-9ddf-4b64-9690-dc490ddbf476.
Source reference: phantasm95-legacy (3dda2084bb2c1c2e8b9267d34644738114aa0c69).
This private archive retains the complete exact static dependency closure as a conservative superset. It contains no database, environment secrets or customer exports.
Homepage-only restoration: obtain the current accepted cumulative application, replace only index.html with LEGACY/index.html, and supply missing LEGACY stylesheet/script/image dependencies from this archive. Compare existing same-path dependency hashes first. If shared dependencies have subsequently changed, place the original dependency closure under an unpublished build source namespace and rewrite the restored homepage's asset references/import graph into that namespace; do not overwrite later shared files. Preserve every current non-homepage route, Admin file, checkout file, Edge Function and database object. Seal and test the cumulative restored application through the protected publisher with the then-current canonical deployment as its preflight. Publish once and compare homepage/dependency bytes plus unchanged critical routes. Never restore this whole snapshot for a homepage-only repair.
Full static recovery: use the existing protected Cloudflare rollback procedure to the preserved deployment, subject to current compatibility review. Static rollback does not revert deployed UNITY Edge Functions or database state. Keep UNITY signed settlement/recovery active.
Integrity: SHA-256 for every original file is in legacy-manifest.json. No production rollback has been executed.

Private recovery package SHA-256: `07326c2b63e862752f6eac27b92b2c3113d3e82cde464e16544456d8504cb4db`. Verified all 505 original file hashes and archive integrity. Private owner package retained outside public repository and static application. No production rollback executed.

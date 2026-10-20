# Deployment prerequisites and rollback (not authority to execute)

## Staged prerequisites
1. Freeze this branch/commit and validate the same code under Node 22 in an explicitly approved non-deploying cloud job. Demonstrate isolated real-browser networking before fixture acceptance; no production session.
2. Separately approve bounded read-only post-reset verification of catalogue_delivery_v2 columns, invoker security/grants/RLS, current public source identities and digest cost. Do not rerun already applied SQL. If a migration is genuinely missing or different, stop for exact SQL/hash review and new approval.
3. Review the real publication inputs and rollback payload independently. No current-live baseline adoption is claimed and Atlas remains frozen.
4. Separately approve a trusted publisher workflow and exact permissions. Archive-write job: only required repository content write; normal deployment job: contents read, Pages write and OIDC as required by existing infrastructure. No privileged browser token, service-role key or new secret is assumed. Concurrency must prevent overlapping bootstrap/ordinary assembly; guarded archive heads and a final recheck are required.
5. Before bootstrap, establish the independent archive-required lifecycle policy. First image capture must commit the data branch and initialisation marker atomically before deployment. Restore/verify complete assets on every deployment, independent of new capture and adapter flags. Reject missing required refs, uncommitted repairs, corruption and stale assembly receipts. Exactly one Pages artifact; no retries of a duplicate-artifact run.
6. Separately approve initial extraction/publication of real public images, pinned to newly verified identities/byte counts. Leave production originals intact; retain all historical assets and immutable manifests. Verify actual served image bytes/hashes before activation.
7. Separately approve frontend/generator activation only after all prior gates pass. Keep checkout, private Admin and source image authority unchanged. Observe owner-approved real requests/cache behaviour and monitor explicit publication failures.

No steps above were executed against production. No workflow YAML was modified or installed in this candidate.

## Rollback
- Before activation: abandon or revert this isolated candidate; current main/live paths are unchanged and need no rollback.
- Image-only rollback: retain current metadata/stock/prices; explicitly select the appropriate retained immutable manifest only when source identities match. A mismatch is a placeholder or generator error, never another photo.
- Adapter rollback after an approved future activation: publish a separately approved change restoring enabled:false while keeping the archive and all old assets. Legacy database source images remain intact.
- Application rollback: restore the approved application version WITH the complete current durable image set. Do not roll back the archive by deleting newer versions or revert to a workflow that omits restoration. Historical/removed product image URLs must remain available.
- Archive corruption: stop assembly. Recover only hash/MIME/source-verified history into an isolated clone; review and commit repair forward before assembly. No force-push, ref reset, garbage collection or automatic asset deletion.

A source rollback alone is not proof of restoring the current live Pages payload. Deployment and owner acceptance need their own explicit authorisation.


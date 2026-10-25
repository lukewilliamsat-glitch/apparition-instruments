# Publishing and rollback readiness

## Newly observed successful production workflow

Read-only GitHub evidence identifies [40175066908](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/40175066908) on main `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`, event schedule, created 2026-10-25T08:02:30Z, completed/updated 2026-10-25T08:03:19Z. Job 121113848149 completed dependency install, product generation, Operations/News generation, CMS generation, verification/stamping, upload and deployment successfully. The log records 31 published CMS articles and binds artifact 12590914632 to the deploy-pages request. This scheduled run predates ARCHIVIST and was not invoked by this mission.

Artifact **12590914632**, github-pages: **20,301,705 ZIP bytes**, digest **d358efe91b5db0b0845505afd91a3eaa079c4bc0aeaa9a331fe5916d4266e349**, created 2026-10-25T08:02:51Z, **expires 2026-10-26T08:02:50Z**. Metadata is freshly verified. Archive bytes, extracted paths/content, generated data provenance and complete rollback have **not** been downloaded or independently verified. No catalogue image retrieval or public screenshot/image publication is authorised here.

This resolves the earlier fact that no recent successful publication artifact was available: a new potential baseline now exists. It does not by itself prove the complete currently served deployment/payload association. The connector rejects deployment-history endpoints and provides no environment-protection access. Job success plus artifact binding is strong workflow evidence, not an independent served-byte inventory. The previously documented 11 October artifact remains unavailable in earlier evidence; no new claim is made that it has been recovered.

## Production source and transformation chain

static.yml remains at Git blob a43d31b3d7371d02fe016a57a19a2690ceb0ea86. Triggers: main push, manual dispatch and nominal daily `0 3 * * *` UTC; the fifteen-minute comment is stale. permissions contents:read/pages:write/id-token:write; environment github-pages; concurrency pages with cancel-in-progress:false. Environment name does not establish protection rules. Last queued/in-progress global queries both returned zero; that is a point-in-time snapshot, not a lock on later publication.

Non-push runs execute backend product/Operations generation; static-only/cms-only markers skip those two/install steps only under their conditions. CMS generation is unconditional. Search-verification and asset stamping transform the complete dist payload before upload; generated products/News/CMS/photos need not match committed dist. Therefore main source/tree, a CSS Git inverse or a repository ZIP cannot substitute for the original publication archive.

## Gate status

| Gate | Current evidence | Remaining requirement |
|---|---|---|
| Main source identity | Verified unchanged | Recheck before any future action |
| Recent build/upload/deploy | Successful scheduled run and artifact-ID binding | Current active association via separately approved trusted metadata; no live crawl here |
| Complete original payload | Fresh artifact metadata and digest available | Explicitly authorised bounded archive retrieval, original-byte digest check, safe extraction, complete path/size/hash inventory, provenance and durable retention/read-back before expiry |
| Rollback | No independently verified durable complete prior payload | Establish the verified current payload as rollback for a later release, with proven restoration route; do not assume old expired artifacts suffice |
| Backend-free publication route | Not implemented/accepted on production | Reviewed publication-only route consuming exact approved payload and shared concurrency/retention safeguards |
| Candidate integration | Separate isolated SPECTRE/LANTERN/SENTINEL/NIGHTFALL/COMMAND evidence | Exact composed source/output acceptance and owner decisions; no giant merge |
| Owner release authority | NONE under Authorisation47 | New exact artifact/source/rollback/route approval with bounded live checks and rollback triggers |

The urgent independent option is a narrowly scoped read-only retention/verification mission for existing artifact 12590914632 before its expiry, with no Supabase or live-site requests and no deployment. Its known ZIP size/digest permit a concrete one-artifact retrieval contract; expanded limits, private retention target and read-back must be specified before execution. Do not retrieve it automatically under this audit.

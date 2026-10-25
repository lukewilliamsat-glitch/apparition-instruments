# Backend-independent route and restoration

The implemented local assembler/stager/validator and injected coordinator work with complete payloads. The future [Pages-only workflow template](templates/publish-only.yml.example) is **not installed, dispatched, live-tested or approved for production**. Phase 1 synthetic acceptance is not proof of a real restored GitHub deployment.

## Proposed concrete route

1. Retain the exact complete prior ZIP and independently verified receipts privately before any release. Original ANCHOR remains untouched. Stage a separately approved handoff containing only `release.zip`, `rollback.zip`, their two receipts and a redacted, exact owner decision packet; no credentials or private storage retrieval information.
2. The owner separately approves the exact candidate/source/payload/rollback/decision/route and bounded live verification. Template adoption and protected `github-pages` environment rules need explicit authority. No source branch publication implies these approvals.
3. Future dispatcher selects one handoff artifact/run/digest, approval digest and operation (release or restore). Only this repository's main ref is accepted. The route uses shared `pages` concurrency with cancel-in-progress:false. Existing scheduled/main/manual publishers must be reconciled; concurrency is not current-state proof.
4. A metadata check pins the exact artifact/run/size/digest. A pinned download action retrieves only that approved handoff. `handoff.py` verifies complete release/rollback bytes, all receipts, current state and fresh holiday attestation, exact tool commit and owner acceptance. The handoff artifact/transfer/retention permission must be explicitly covered later; this checkpoint authorises none of those real-payload transfers.
5. Select the complete release or original rollback ZIP; reuse its exact verified inner TAR. Recheck the local upload TAR's full file/directory inventory and digest. Upload through pinned upload-artifact, then deploy only that named Pages artifact through pinned deploy-pages. No npm build, product/News/CMS generator, Supabase call, migration or application mutation is in this route.
6. Preserve API-reported deployment receipt and perform the separately approved bounded live read-back. API success alone is not live verification. If uncertain, stop and reconcile; do not blindly resend or automatically restore. A restoration is a new exact decision selecting the entire prior payload and verifying it, never a CSS inverse or a business-data rollback.

The template includes future `pages:write`/`id-token:write` permissions because actual deployment needs them. Only the uninstalled template has those permissions here. The active NIGHTWATCH synthetic-test workflow has contents:read only; the existing production workflow is byte-for-byte unchanged.

The standalone coordinator tests this ordering with an injected state/deploy/read-back port, a local exclusive lock and persistent attempt journal. A port exception or failed postcondition becomes UNCERTAIN; the operation identity cannot silently be retried. Two fresh snapshots detect some races but do not replace the shared remote Pages lock or provide a distributed transaction with provider configuration. Real transport request/time/byte limits and action polling remain part of the later exact release approval.

## Pinning and validation

Official GitHub refs were resolved read-only on 25 October 2026:

| Component | Pinned commit |
| --- | --- |
| checkout v4 | `11d5960a326750d5838078e36cf38b85af677262` |
| setup-python v5 | `a26af69be951a213d495a4c3e4e4022e16d87065` |
| download-artifact v4 | `d3f86a106a0bac45b974a628896c90dbdf5c8093` |
| deploy-pages v5 | `368f82528645a54fb793d4d04e342629a3f51346` |
| upload-artifact, inherited verified pin | `ea165f8d65b6e75b540449e92b4886f43607fa02` |

The template parses as YAML and its standalone Python/shell modules are locally validated. No action deployment was executed. The official deploy-pages `preview` input is alpha/not publicly available according to its action description; it is not an authorised preview-host solution. No preview host/account is assumed, provisioned or deployed. A separately approved suitable host remains optional; otherwise genuine isolated Chrome captures are the owner review route.

The authenticated artifact service for a public repository must not be represented as owner-only durable private storage. No original archive or candidate archive is uploaded there by this phase. Later screenshots/handoff transfer scopes and retention must be explicitly reviewed. No signed URLs or private storage identifiers belong in Git.

Sources: [deploy-pages action](https://github.com/actions/deploy-pages/blob/368f82528645a54fb793d4d04e342629a3f51346/action.yml), [upload-pages artifact format](https://github.com/actions/upload-pages-artifact/blob/56afc609e74202658d3ffba0e8f6dda462b719fa/action.yml). The template uses pinned upload-artifact directly rather than the composite's mutable transitive upload tag.

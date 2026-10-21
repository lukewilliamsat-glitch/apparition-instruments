# COMMAND 02 synthetic persistence
All operations act only on an explicitly injected `kind: command02-synthetic` adapter. Authority lives in memory for one fixture-page lifetime. Reloading the page creates a new fixture set. No Supabase, localStorage, IndexedDB, files, credentials or backend endpoints are used by the application.

## Operations
- `read(id,{signal})`: complete permitted read model, including immutable identity, synthetic revision and original image metadata, without source image data/private cost.
- `save({id,expectedRevision,operationId,patch})`: allowlisted canonical product-field patch. Money is integer GBP pence or null; booleans are actual booleans. Series/Reference map into specs keys, preserving every other field.
- `status(operationId)`: committed with the original authoritative response, confirmed not-applied, pending or unknown.

The fixture catalogue adapter separately supplies COMMAND 01 list/detail contracts. List summaries exclude embedded images and private fields. Detail loads remain on demand. No polling.

## Commit and idempotency
The store validates permission, identity, SKU uniqueness, types, field bounds and expected revision at commit time. It replaces exactly one record synchronously after validation; no partial product update is observable. Stock, image source, private cost and unrelated content are preserved.

Revisions are `sim-N` and advance once per accepted mutation. Two writers based on the same revision produce at most one winner. Operation IDs identify one exact command; retries of that ID return the same result or pending promise, while reuse with different content is rejected. A separate simulated actor can advance authority for deterministic conflict testing.

These are fixture semantics, not claims about current production persistence. The inspected real component save uses sequential requests and has no equivalent component revision/idempotency API.

## Outcomes
- **Confirmed not applied:** permission, validation, missing record or precommit failure retains local edits. A new reviewed request can safely retry.
- **Conflict:** no patch applies; current authoritative values are returned for comparison. Reload/discard must be explicit; no force-save.
- **Ambiguous:** timeout, postcommit disconnect or unexpected response blocks new submissions. Status reconciliation must prove the prior operation's outcome before retry/discard.
- **Committed status recovery:** restores the original result without applying the patch again. Newer unsent field edits are retained.
- **Pending/unknown status or status failure:** uncertainty remains visible and retry remains blocked.

Injected faults include permission denial, validation rejection, timeout before commit, interruption before/after commit, malformed success, delayed requests and concurrent modification. None sends traffic.

## Client safeguards
Review reads current authority and fingerprints the patch. Any later edit invalidates that review. A matching response must carry the correct product ID, operation ID, applied flag, next revision and reviewed values. Stale successes/errors are ignored using session generations. Closing/teardown aborts reads and ignores late responses; it is not represented as proof that an already submitted write could never have committed.

The fixture-only browser handle exposes controls for deterministic acceptance. It contains no real authentication material and is not a production security boundary. An eventual real adapter needs independently reviewed server authorisation, transactional update, versioning, idempotency, audit, protected-field preservation and stock separation.

## Bounded requests and conservative recovery

The session enforces deadlines, rather than relying only on a fixture throwing a timeout. Reads/reviews can fail and retry while retaining local state. A timed-out save records its operation identity and stays unresolved; a pending or unknown operation-status response cannot enable retry or discard. A late confirmed commit updates the baseline while retaining newer local edits.

Malformed/empty patches and malformed specification read models are rejected without phantom revisions or coercion. Tested full-store authority remains separate from the image-free permitted editor read model. Browser reload resets the fictional store; editor reload/discard fetches its current in-page authority.

No production write, SQL migration, auth session, record, image byte or email is needed by any of these tests.

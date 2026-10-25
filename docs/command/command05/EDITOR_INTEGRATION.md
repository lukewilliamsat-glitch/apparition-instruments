# Integrated draft/review, no production writes

COMMAND02 schema/session/view are adopted inside the same Admin catalogue workspace. One selected-product context owns the inspector/editor. General, Series/Reference, GBP selling/kit prices and eligibility proposals use inherited validation and review/discard logic; stock, original images, electrical geometry and private costs remain protected. Local drafts are memory-only; filtering preserves context. Leaving a dirty context requests discard confirmation, and beforeunload protects a full navigation. Sign-out clears proposals; expiry/revocation conceals retained proposals until the original subject is restored. No draft is stored in local/session storage.

The new preview port force-reads through the read boundary, requires draftPreview permission and binds retained work to its original subject. Read hashes are accepted for local comparisons only. The session's save/status methods explicitly refuse the preview-port kind; production save is disabled in render and in its click handler. Direct programmatic save is also rejected before IO. No legacy component save, stock update or write endpoint is used.

Review compares a fresh read identity and displays changed values. It provides no CAS or promise of save compatibility. A changed identity produces conflict, preserves the proposal and moves focus to recovery. There is no force-save. The future IRONCLAD adapter must use a real server revision, trusted actor/session, atomic operation, durable receipt and all-writer participation; existing sim-N acceptance is synthetic only.

An explicitly injected synthetic persistence may exercise inherited saved/unknown/reconciliation states in tests; it must mark itself syntheticOnly, and production imports no fixture. This seam does not enable production writes. The first release remains read only even after owner UI approval.

Local actual-gate DOM acceptance passes draft/review, disabled save (including direct API), field validation, conflict focus, expiry concealment/retention and sign-out clearing. Native Chrome and synthetic unknown-outcome evidence follow in the acceptance checkpoint. No production identity/schema claim.

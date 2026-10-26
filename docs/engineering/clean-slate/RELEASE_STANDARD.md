# Standing release standard

## Ordinary releases

**CHECK DELTA → VERIFY IMPACT → PUBLISH → CONFIRM LIVE.** Finish incomplete functionality before this sequence. Reuse accepted tests when source, dependencies and relevant contracts match; test changed boundaries only. A new authorisation does not invalidate earlier evidence. Record approvals already supplied and do not request them again.

1. Identify current source and the last successful served release, plus any newer attempts. A failed attempt is not automatically the current website. Prove known terminal failures; unknown or competing attempts stop publication. Preserve the current-main lease and GitHub environment enforcement.
2. Use a complete current baseline and complete rollback. Apply a reviewed file allowlist; bind every file, candidate, source and artifact by SHA-256. Preserve unrelated generated content. Get current operational state from the existing authoritative contract. Static snapshots and News are presentation, not checkout authority.
3. Use one production publisher for prepared artifacts. Prefer the supported Pages packaging convention, independently verify uploaded contents before publishing, and retain original candidate/rollback bytes and receipts. A renderer or CSS change does not justify a catalogue/CMS refresh. Generation must be a distinct bounded operation when actually needed.
4. Execute one justified publication. Allow sufficient time for both deployment and restoration. On an opaque terminal failure, retain the exact API/action, deployment ID and timestamps; do not add another application test campaign or retry without new evidence.
5. Confirm the served release and changed files, critical public routes, relevant operational state and disabled/unverified capabilities. Use bounded verification; no real payment, stock change or customer message as a test. Successful Actions status alone is not live acceptance. Record the actual result and rollback identity.

For a sensitive database/security cutover: **VERIFY CONTRACT → TEST TARGETED BEHAVIOUR → CONTROLLED DEPLOY → CONFIRM.** Respect its exact separate authority. Do not introduce privileged endpoints, assume installed grants, or silently enable IRONCLAD.

## Current route and adoption

The two current workflows are retained. The audit repairs are engineering candidates; deployment recovery is still unproved. Adopt one exact-artifact publisher only after it and restoration work. Then retire the legacy deployment portion with a reviewed manifest, retaining its useful generators. Do not use the backend-dependent daily workflow as an allegedly backend-free release.

Until generic release receipts replace the mission plan, inspect/reconcile its exact run IDs, artifact expiry, failure proofs and bounded deployment window before use. Do not bypass it. The new `inspect` workflow option is read-only and requires an exact deployment ID; it is not a publish action. Avoid diagnostic-only main commits.

Keep code in the existing application layout for now: `dist/` is the application source, `scripts/` holds build/release tooling, `tests/` holds targeted fixtures, `supabase/` is historical server source, and `docs/engineering/` records evidence. Do not undertake a src/dist migration or remove generated snapshots during recovery.

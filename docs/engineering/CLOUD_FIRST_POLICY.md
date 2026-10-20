# Cloud-first engineering policy

Adopted by owner Authorisation 27, 20 October 2026. This document establishes policy only; it installs no workflows, protection rules, credentials or infrastructure.

1. **Canonical engineering record:** GitHub is the canonical repository for source code and engineering history. Preserve small, reviewable commits, exact candidate identities and independently recoverable references. Temporary execution workspaces are not the source of truth.
2. **Application backend:** Supabase remains the application backend. A cloud-first policy is not authority to migrate hosting, rewrite records or change backend configuration.
3. **Cloud automation:** Prefer GitHub Actions for automated builds, tests, real-browser acceptance and controlled deployment. Keep engineering validation separate from production publishing, with minimum permissions, pinned dependencies/actions and explicit environment boundaries.
4. **No mandatory owner development setup:** Routine work must not require the owner to install Docker, Node.js, PowerShell, browsers or a development environment. Agents should deliver cloud-preserved results and practical review links. Optional local tools must not become an acceptance prerequisite by default.
5. **No routine recovery ZIP downloads:** Do not make manual archive transfer the normal continuation mechanism. Continue from verified remote commits and evidence references. Existing archives remain preserved recovery options; do not delete or rewrite them.
6. **Durable evidence:** Prefer recoverable commits, protected tags where separately configured, manifests and appropriately retained remote evidence. Record source/run identity, hashes, retention and recovery instructions. Avoid depending on short-lived Actions artifacts alone. No protection or retention setting is changed by adopting this policy.
7. **Backup limits:** Git history is not a complete backup of database state, deployment payloads, secrets or provider configuration. State exactly which systems are recoverable and which are not. Database backups and deployment retention need their own approved designs and verification.
8. **Production approval:** Production deployments require explicit owner approval. A passing CI run, documentation branch, freeze report or source commit grants no deployment or main-merge authority.
9. **Intentional service access:** Supabase and Stripe access must be scoped and separately authorised for the task. Separate source inspection from live API access. No implied permission for customer data, mutations, payments or emails; no real transactions as fixtures.
10. **Demonstrated browser isolation:** GitHub Actions alone does not prove browser isolation. Before application loading, demonstrate process-level network restrictions, disposable profiles, blocked service workers and negative controls for external HTTP/HTTPS, WebSockets, DNS/direct-IP/IPv6 bypass and redirect escape. Preserve diagnostics and fail closed. Interception alone and HTTP 200 responses do not prove acceptance.
11. **Preserve working infrastructure:** Keep current hosting, domains, workflows, application/backend contracts and security protections unless a specific approved change requires modification. Do not resolve a tooling limitation through an unapproved infrastructure migration or weakened safeguard.
12. **Business-focused scope:** Keep missions small, purposeful and independently deliverable. State the business outcome, acceptance criteria, risk and stopping point before work. Avoid repeated investigation, sprawling engineering programmes and speculative refactoring without a concrete benefit.

## Genuine disaster-recovery exceptions

An owner may separately approve an encrypted or otherwise appropriately protected archive, temporary isolated runtime, local recovery exercise or emergency restoration when normal remote recovery is genuinely unavailable. Explain why the exception is needed, its exact contents/permissions, integrity verification, retention, sensitive-data handling and exit procedure. Never request secrets in chat or silently rewrite frozen history.

Exceptions do not become routine owner obligations and never confer production, database, payment, DNS or credential-change authority. This policy implements none of these exceptions and does not retroactively certify Atlas.

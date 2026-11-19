# CLOUD ANCHOR 74P: architectural and operational audit
19 November 2026 · Read-only production evidence and isolated engineering

**Decision D now:** One narrowly authorised, offline evidence operation is warranted.
Keep the current release gate. Use the retained V2 archive; do not take another capture
merely to diagnose its last CHECK. Rehearse a **hybrid architecture (option D)** for
future operations. Treat any revised acceptance contract as a separate decision.

## Evidence chain and process findings

| Evidence | Verified result | Limit |
| --- | --- | --- |
| Original synthetic acceptance 44278328213, source edb6f888 | Native fixture passed. | Did not represent all Supabase provider behaviours. |
| Production attempt 44302798037 | Initial read-only TLS/scope gate refused; restore skipped. | Log did not isolate which preflight predicate failed. The later successful capture is evidence that its own preflight passed, not proof of the initial cause. |
| V1 capture 44308479728 | Capture retained and transactional restore reached comparison; first failure reported columns. | Early comparator stopped at one group. |
| V1 restore-only 44336313394 and isolated 44338445609 | Six groups differed: relations, columns, constraints, indexes, policies and functions. Alternate search path matched columns, indexes and policies only. The later revised fixtures passed. | Alternate printing is a diagnostic without sealed evidence of source semantics. V1 lacks proof required to reconstruct this confidently. |
| V2 isolated 44340817488, production 44349292200 | New proof sealed and native transactional restore reached comparison. Only relations and constraints differed. | V2 fixes the source search path but still does not independently seal the original partition/inheritance graph. |
| 74K isolated 44352635249 and production 44508617098 | PostgreSQL proved four relation ACL equivalences. Three paired constraint definitions remained; no missing identities or validation differences. | Restored-side partition indicators were zero. This is not source graph evidence. |
| 74M isolated 44511177654; production 44516577793 | Three differences were CHECKs with expression-shape hints. Two proven native equivalents; one generic unresolved. 13/14 groups match. No production receipt. | The source definition, rejection stage and production cause remain unknown. |
| 74O isolated 44520477453, exact source 87787ea59ce68c1286cdcb6b3563ebb0fd2e7572 | Broader CHECK replay, multiple diagnostic categories and controller rehearsal passed. | No production restore or live controller approval under this candidate. |

These observations distinguish a backup that **restored** from a recovery procedure
that **met its acceptance contract**. There is no evidence that the sole remaining
CHECK damaged restored data, nor evidence that it is harmless. Guessing its syntax
from migrations or the provider schema would be speculation.

Both encrypted releases are still listed in the private vault. V1 capture 44308479728,
release 449987734, asset 763412160, 10,683,210 bytes, SHA-256
`5b189189cd4c50479e989b445f5e460ab26db84b6d68c5c629c5898d29387fb1`.
V2 capture 44349292200, release 450267164, asset 764153555, 10,888,074 bytes,
SHA-256 `60301a77c0cec89f000b7f605a065006b40139c5aabe35ce7d386aa6f59ba4cd`.
Metadata read only. Independent ciphertext retrieval, decryption and inner digests
are evidenced by the previous production jobs, not re-performed during this audit.

Process causes were treating deparsed SQL as canonical across environments, sealing
too little evidence for later semantic analysis, comparisons that quit too early
or collapsed failures to one label, and fixtures that did not include the provider's
ACL representation or lexical variety. The repeated workflow/tag/environment
configuration was a consequence of putting the evolving verifier itself at the
credential/reviewer boundary. Stop guessing after the first ambiguous failure:
seal the canonicalisation context, emit fixed failure classes, reproduce with fixtures,
then ask for one discriminating evidence operation. Combine owner setup once; separate
archive custody from verification logic. Use a release-specific forward correction
or quiesced recovery plan, not a routine blanket database rollback.

## Recovery contract for independent review

This is a proposed framework, not a waiver of any of the 14 gates. RPO is the maximum
accepted recovery-point age/data-loss window. RTO is the maximum accepted service
downtime. Both require business approval and timed rehearsals.

| Layer | Failure it must catch | Current evidence and gap | Suitable stronger or simpler evidence |
| --- | --- | --- | --- |
| A. Authenticity, integrity and custody | Wrong source, changed bytes, missing backup/key, single account loss | Bound release, asset, size and independently verified SHA; age + member digests; owner's earlier key recovery test. Same GitHub account still represents a correlated retention/control risk. Auth data may contain account records and password hashes; excluding PostgreSQL role passwords does not remove them. Encryption to a public recipient is not proof of origin. | Retain an owner-controlled encrypted copy under a separate identity/failure domain, with authenticated capture manifest and separately held digest/key recovery instructions. Verify retention and key custody on a cadence. Keep runner artifacts out of authoritative custody. |
| B. PostgreSQL restoration | Missing prerequisites, partial imports, non-restorable SQL | Native transactional scoped restore already succeeded. Source database dump and V2 proof share exported snapshot; role export happens afterward and sequence observations are not an MVCC guarantee. Exact source 17.6 and extension allowlist are reviewed compatibility choices, not a permanent recovery requirement. | Retain native transactional restore with failure on first error. Inventory supported versions and dependencies. Rehearse engine upgrades, seal role/sequence evidence and record sequence headroom; define target bootstrap rather than assume clean vanilla is live Supabase. |
| C. Structure and semantics | Broken keys, privilege escalation, semantic drift, lost partitions or RLS | Schemas, relations, columns, constraints, indexes, policies, triggers, functions, sequences, role memberships, admin ACL and core extensions provide useful evidence. Some compare presentation text; CHECK semantic verification is intentionally limited. No sealed source graph, runtime role behaviour, comprehensive dependency or database setting inventory. | Catalogue identities, key/constraint states and validation, dependency closure, canonical typed or independently justified equivalence for security-critical changes, explicit partition/inheritance bounds/edges, sequence ownership/headroom and role-behaviour checks. Treat unclassified or security-sensitive mismatches as blocking. |
| D. Data recovery | Correct row counts with wrong values, missing payment or stock records | Counts/joins plus fixture canary; integrity verifies transfer of the captured bytes. They do not independently attest all row values or application meaning. The synthetic experiment holds all 14 proof groups constant while changing stock quantity and an order value. | Compare deterministic, ordered critical-value digests inside protected storage, plus business totals and reconciliation. Encode types, NULL and ordering explicitly; seal expected values or a keyed digest to avoid low-entropy disclosure. Cover inventory/order/ledger events, then sample lower-risk data under an accepted contract. Never describe an aggregate as row-by-row equivalence. |
| E. Application and continuity | Database looks complete but storefront/Admin cannot operate, or duplicates external writes | Vanilla PostgreSQL proves SQL import, not GoTrue, gateway, Edge, payment or mail. Existing release-specific synthetic work is useful but not a production recovery drill. | Isolated compatible project with outbound sinks only: login/roles, catalogue, stock count, read-only checkout simulation, orders and ledger, fulfilment, payment/webhook idempotency, and admins allowed while ordinary users/anon are denied. Exercise reconciliations in rollback-only or isolated fixtures. Time actual switch/reopen. |
| F. Provider config and external dependencies | Missing objects, credentials, DNS or integrations | V2 scope: public, forge_private, auth, storage metadata and supabase_migrations; vector tables excluded, foreign tables refused, extensions reinstalled from reviewed list. Capture checked zero Storage object rows/vector resources then; this is not a current inventory or object bytes backup. Supabase-managed settings and services are not restored by PostgreSQL. | Keep an independent inventory: Storage bytes and metadata policies, Auth provider config/signing/key reissue/redirects, API endpoints/keys and Edge Functions/secrets, egress schedules, webhooks/cron/realtime, encryption roots, Cloudflare/DNS and frontend rollback, Stripe/eBay/mail configuration. Retain configuration references and safe exports separately, never secret plaintext. |
| G. Freshness and intervening transactions | Recovery overwrites newer sales, finance, receipts, refunds or fulfilment | V2 is a previous point, with no confirmed intervening ledger comparison under 74P. A successful restore cannot make it current. | Prefer forward fixes for migrations. Agree an interruption point, reconcile Stripe/eBay/order/payment/stock/ledger IDs and timestamps since the snapshot, pause only affected writes if authorised, restore to a clone, verify balances and reconcile before cutover. Never overwrite production blindly. |

The 14 groups are useful regression and safety checks. Some are too dependent on
display, while others are insufficient in coverage. Replacing exact text with proven
semantics is appropriate only for a reviewed equivalence class. Dropping security
checks, accepting approximate equivalence, or treating all 14 as proof of service
recovery would be unsafe. A replacement contract should pair trustworthy structural
checks with data-value checks and independently tested business operations.

## Options for Apparition

The Supabase management API identified the matching healthy eu-west-1 project and
confirmed its organisation is **Free**. No production database connection was made.
Supabase lists no managed daily backups on Free. Pro starts at USD 25/month with
seven days of daily backups; extra projects start at USD 10/month. PITR adds about
USD 100/200/400 per month for 7/14/28 days according to current backup documentation.
The seven-day PITR baseline is therefore roughly USD 125/month before extra project
compute, usage, taxes or changed pricing; clone eligibility and cost must be confirmed
before any purchase. Supabase quotes provider-side PITR at up to two minutes of
potential data loss in its worst case under normal WAL archiving. This is not an
Apparition recovery guarantee or an application-level RPO.

| Option | Assurance and coverage | Owner effort, cost and dependencies | Risk and release fit |
| --- | --- | --- | --- |
| A. Finish current CLOUD ANCHOR unchanged | Strong custody and scoped SQL checks, misses service dependencies and complete values. | No added provider subscription; high custom verification and review burden. Native equivalence profiles are costly to maintain. | Preserves all current release criteria. Another uninstrumented run risks no decisive answer. |
| B. Simplify the custom verifier | Keep PostgreSQL-native restore, canonical security checks plus small high-value value/role tests. | Similar infrastructure, much less custom text normalisation; tests must evolve with business flows. | Stronger on meaningful failure modes. Cannot substitute for today's gate without owner approval; insufficient alone for provider settings/files. |
| C. Provider or PostgreSQL-native tooling | Provider daily backups/PITR and paid clone faster for provider-local incidents; native logical exports remain portable. Free's CLI is not a byte-for-byte replacement: its default dump excludes Auth, Storage, data and roles without explicit export steps. Physical clone still omits object bytes/config items and can carry active jobs/webhooks. | Pro/PITR costs above; PostgreSQL physical archiving/pgBackRest require base/WAL access or equivalent host control unavailable through this managed project connection. | Useful complement if required RPO justifies paid service. Provider-only leaves account-wide loss, external integrations and portability gaps; no release waiver. |
| D. Hybrid (recommended future) | Encrypt independently retained native logical exports; verify custody, transactional restore, a focused private semantic/value contract and provider-compatible application rehearsal. Add managed recovery if RPO or turnover requires it. | Existing hosted CI/native tools initially; separate custody and periodic clone drills are the main work. Reduce recurring copies/approver overhead after the one-time design review. Optional provider spend. | Lowest sustainable operational risk for current scale and avoids relying on Supabase alone. Keep existing gate for A/B/C until a new acceptance framework is explicitly accepted and rehearsed. |

At current V2 compressed size, one retained copy per day is about **0.327 GB per 30 days**
per retention location; growth and the actual Supabase transfer are unmeasured.
The private vault uses release assets; Actions artifact retention is not suitable for
authoritative backups. Standard GitHub-hosted Actions for the public source repository
are documented as free; this is not a claim of free private storage/runner costs or
an unlimited budget. Provisional targets for owner review: daily independent copies and
a fresh pre-change recovery point for high-risk work; prove an acceptable time to
restore and reconcile before declaring any numerical RTO. Daily copies imply up to
roughly a day's exposure if successful. Orders, payments, eBay, inventory and ledger
events need independent reconciliation; if that cannot close the business exposure,
set a tighter RPO and price PITR then. Do not purchase or enable it automatically.

## Final CHECK evidence route and tested prototypes

The 74O parser classifies lexical, eligibility, timeouts, execution and typed results.
Inspecting more fixtures cannot determine which path the sealed rule takes.
74O's optional encryption of the same aggregate adds custody, not evidence.

The isolated 74P candidate adds one failure-only witness for exactly one paired,
validation-matching CHECK after all other groups have passed. It evaluates:

1. **Sealed proof vs full restored catalogue**, including safe lexical family flags
   and the first bound mismatch class (e.g. constant, operator, type, collation).
2. **Full catalogue self-replay**, to distinguish unsupported candidate mechanics from
   a disagreement tied to the sealed input.
3. **An independent schema-only restoration of the same archived DDL** in a second
   offline scratch cluster. Compare rendering/validation and replay both its own
   CHECK and the sealed definition there. No second data restore, source lookup
   or raw DDL export is needed.

If both self-replays work and both sealed comparisons disagree in the same typed
field, this localises a real discrepancy in the retained representations as bound on
the recovery target. It does not alone establish production source semantics or the
reason the archive differs. If self-replay fails, investigate only the class it reports.
If only the full restore differs, investigate restoration order, extension or
post-data effects rather than assuming lexical drift. If the second schema can't
be restored or no safe classification exists, explicitly report unavailable evidence.
The same-dump schema witnesses are independent executions, not independent backups or
a reconstruction of the source partition graph. There are no identifiers, values,
function OIDs, raw statements, or low-entropy hashes in output. Unresolved states issue
no receipt; genuine normal 14-group success can issue one, subject to independent
acceptance. A future owner-encrypted witness would be justified only if the bounded
results demonstrate a concrete need, with an independently approved per-field
redaction and no business rows, values or secrets.

Two isolated prototypes exercise this choice. The native archived mutation fixture
distinguishes a changed literal from lexical/parser failure using both restored
catalogues, confirms privacy, and checks that no receipt is issued. A separate encrypted
synthetic restore compares critical business values and Admin/ordinary/anon paths;
the negative fixture detects same-count value changes and changed role visibility.
Neither result approves the production archive, validates the live services or exercises
a live environment approval. The implementation and retained legacy suite completed
successfully on PostgreSQL 17.6 in [isolated CI 44522214244](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44522214244)
before the report was added.

## Controller review and minimum operational path

The 74O controller binds candidate and workflow blobs, exact candidate policy,
archive commitment, run, environment and reviewer to a plan digest. It checks the
pinned owner's review comment through GitHub read-only history, refuses rerun attempts
and duplicate review, and separates vault retrieval from the offline verifier.
Strict manifest parsing means candidate-controlled code and dependencies never run in
the privileged host or see plaintext. Trusted receipt validation checks the plan,
archive, run, proof hash and exact proof groups; backups remain outside public artifacts.
The confidential plaintext boundary remains a disposable network-free container and
verified non-swap tmpfs with cleanup. Treat restored SQL, extension routines and client
toolchains as executable and potentially hostile.

The controller solves repeat approvals **for compatible data-only manifests**, not
recurring verifier changes. The owner still operates mandatory GitHub review, and a
new trusted engine needs an independently approved immutable release. No live test has
shown the selected tag and exact review-comment binding together. Two Git objects,
a synthetic GitHub review and archived native receipt were exercised successfully.
Before general adoption, use a no-production-secret real GitHub reviewer rehearsal
in an approved test environment, and test reject/replay and cleanup paths there.
Do not change visibility or disable bypass controls to obtain cheaper CI.
The source checkout and upload actions and base image are pinned, but Docker still
installs OS packages from mutable signed repositories; review and pin the full built
image/SBOM for repeatable approvals, budget regular security updates and test the
supported PG minor versions. The current serial shared concurrency prevents
overlapping active runs, not intentionally approved fresh dispatches; cancelled
pending jobs and GitHub availability remain operational dependencies.

Recommended simpler core: one small trusted capture contract and one restore runner
pinned by reviewed release, with no mutable verifier selection from workflow input.
Use fixed accepted profiles and separate custody. Keep plan-bound approval if multiple
run choices justify it; use direct protected manual review for a single fixed archive
and exact immutable source. The experiment does not justify a general-purpose
controller migration solely to diagnose this one CHECK.

Next authorisation should cover **only** registration of the exact
`.github/workflows/cloud-anchor74p-evidence.yml` plus one evidenced offline run
of the retained V2 capture under the fixed candidate SHA, reusing the current
restore environment. Register only the manual workflow with the established
no-deployment guard. Create/protect the one exact tag
`cloud-anchor74p-evidence-approved`, update only that environment's allowlist
and approved SHA, retain its mandatory reviewer and disabled bypass and reuse
the three existing restore secrets. No new credentials, encryption keys, archive
capture or general controller activation. Dispatch exactly once with no concurrent
recovery and require the protected reviewer. Release A, B and C still require
formal, independent receipt acceptance and a release-specific freshness/intervening
transaction assessment. No release, restore-to-production, or migration follows automatically.

## External references checked

- [PostgreSQL 17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html), and [continuous archiving / PITR](https://www.postgresql.org/docs/17/continuous-archiving.html).
- [Supabase managed backups and PITR pricing](https://supabase.com/docs/guides/platform/backups), [Free plan backup policy](https://supabase.com/kb/faqs/platform/free-plan-backups), [pricing](https://supabase.com/pricing), [restore to a new project](https://supabase.com/docs/guides/platform/clone-project), [CLI dump](https://supabase.com/docs/reference/cli/global-flags) and [Storage object export](https://supabase.com/docs/guides/storage/management/download-objects).
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [secure Actions use](https://docs.github.com/en/actions/reference/security/secure-use) and [workflow run review API](https://docs.github.com/en/rest/actions/workflow-runs).
- [pgBackRest user guide](https://pgbackrest.org/user-guide.html) and [AWS Well-Architected periodic recovery testing](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_backing_up_data_periodic_recovery_testing_data.html).

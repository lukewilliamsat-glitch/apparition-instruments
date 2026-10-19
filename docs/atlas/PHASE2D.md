# Atlas Phase 2D — certification and release engineering

Engineering branch: `atlas/phase2d-certification-release`. Parent: Phase 2C
`b2963bae6a3c587e8491cd41f7f2b457bad01eca` / tree
`391ddffb7709b0b3481c7682d6f47e12de8352f0`.
Production main remains `bb4ba2a932239a3ef397272b27143f0cd3adcccf` / tree
`0f6ac37987b07050f6d457ff42861943813389e7`.

## Results and limits

The 20-row `evidence/phase2d-version-matrix.json` binds repository, candidate,
preserved HTTP and canonical-stamped SHA-256 values individually. Thirteen
files reproduce exactly through the existing canonical stampSource. Six other
observed versions contain identified content changes and are retained. One
Operations notice requires a content decision; see OWNER-DECISIONS-PHASE2D.md.
The 20 observed versions are historical observations, not a fresh live audit.

The old 417-file reconstruction excludes six product PNG files referenced by
absolute first-party URLs. Its 14 image-category entries are general static
illustrations/branding, not recovered product photographs. The old scanner
explicitly treated absolute schemes as external. The independent certifier now
checks same-origin URLs as local dependencies, without fetching them. Bare module
specifiers are not incorrectly interpreted as first-party file URLs.

A separately bounded six-request public website capture recovered all six PNGs:
8,953,356 identity response-body bytes; exact historical sizes and SHA-256 values.
No redirects/retries, production backend access, image extraction from Supabase,
publication or data mutation. Ledger SHA-256:
`5cc5cb539479cf04c85e5c41b62fdedc3122ca9454767a179e2f34bba0d6aaaf`.
The augmented comparison candidate has 423 files. It remains **uncertified**.
Zero missing local references does not authenticate all historical module versions,
prove a complete deployed inventory, or test authenticated/checkout behaviour.

## Independent technical gate

`scripts/atlas/certify-baseline.mjs` implements `certification.schema.json` and
strict semantic evidence contracts. It independently checks actual inventories,
separate source trees, exact rollback, local/absolute first-party references,
required categories, every observed/source discrepancy and canonical stamping.
Missing, malformed, conflicting, partial or unknown evidence blocks certification.

An independently preserved reference snapshot is required. Exact input manifests,
requirements and discrepancy matrix must be bound to an Ed25519 inventory witness
from a separately trusted reviewer. Functional evidence must cover static
preservation, checkout compatibility, runtime dependencies, product image
availability, News/CMS consistency and rollback. Each signed check binds an actual
pinned local evidence report. Trust anchors are supplied by the operator separately
from the candidate, never accepted from a reconstruction's own claims. No production
signing key or trust anchor is created here. Tests generate disposable keys in memory.

Signatures prove witness identity and binding, not factual correctness by themselves.
The independent reviewer must establish deployment provenance and completeness
before signing. Technical byte, reference, scope and conflict failures remain fatal
even with a valid signature. An owner content decision cannot waive these checks.
Output separates reference completeness, authenticity, version consistency,
functional readiness and publication authorisation. No verdict grants publication.

`prepare-release.mjs` now requires an in-process certificate issued by this verifier
for production preflight. A JSON object claiming success cannot bypass it. Re-run
certification after restart. `run-release.mjs` keeps the previous interfaces and
adds the independent certification gate; it rechecks inputs after assembly and
records deterministic release and rollback identifiers. Validation-only rehearsals
remain explicitly non-production. No uploader or deployment action exists.

## Commands

Use an explicitly verified Node 22 executable and the reviewed inherited seccomp
launcher. Do not execute application fixtures without network isolation.

```bash
python3 tests/atlas/run-offline.py --node /absolute/isolated/node22 --evidence /new/tmp/evidence
```

Technical certification (exit 0 certified, 2 blocked, 1 malformed/inaccessible):

```bash
/absolute/network-deny /absolute/isolated/node22 scripts/atlas/certify-baseline.mjs \
  /local/certification.json REQUEST_SHA256 /operator/trust.json TRUST_SHA256
```

The trust file maps approved reviewer identifiers to Ed25519 public PEM keys. Both
trust contents and pin must be independently obtained, not copied from candidate
instructions. Omit trust arguments for an honest blocked/unknown evaluation.

Full local preflight, with separately approved evidence and no publication:

```bash
/absolute/network-deny /absolute/isolated/node22 scripts/atlas/run-release.mjs \
  PLAN PLAN_SHA256 SOURCE_COMMIT NEW_OUTPUT APPROVAL APPROVAL_SHA256 \
  CERT_REQUEST CERT_REQUEST_SHA256 OPERATOR_TRUST OPERATOR_TRUST_SHA256
```

Reproduce the preserved candidate/Spectre evaluation from the recovery package:

```bash
/absolute/network-deny /absolute/isolated/node22 tests/atlas/preserved-rehearsal.mjs \
  /extracted/phase2c /recovered/engineering /frozen/spectre/dist /new/rehearsal \
  /extracted/public-image-capture 5cc5cb539479cf04c85e5c41b62fdedc3122ca9454767a179e2f34bba0d6aaaf
```

The optional image input is verified against the immutable main inventory hash,
ledger pin, exact URLs, byte counts, SHA-256 and PNG signatures. It cannot overwrite
an existing image. The original 417-file evidence remains unchanged. A fresh copy
forms the 423-file comparison candidate; its 422 non-homepage files survive the
five-file overlay unchanged. Repeated assemblies produce identical receipts and
release evidence. Rollback copies the exact baseline into an independent directory;
it does not mutate or deploy anything. All four frozen Spectre assets are hash checked.

## Workflow maintenance

Actual production cron remains `*/15 * * * *`; main/static.yml is untouched.
`workflow-schedule-only.REVIEW-ONLY.diff` is a one-line cron change to `0 3 * * *`.
Apply only after the non-deployment/configuration gate is independently established.
The earlier Phase 2C workflow-only path-filter negative control had zero runs;
its source-change positive control passed. This is not proof of main's protections.

GitHub documents that skip instructions affect push/pull_request only and can leave
required checks pending. Path filters have the same required-check limitation.
References reviewed 19 October 2026:
https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs
https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

The rulesets collection is empty. The earlier protection read was 403; it was not
repeated. Effective main branch protections, Pages publishing-source configuration,
Actions permissions and environment protection settings remain unverified through
the available integration. Do not infer that they are absent or bypass them.
Owner-assisted read-only checks must establish required checks, push/merge authority,
Pages source, deployment branch restrictions and environment approval rules before
choosing any schedule transition. Neither skip-CI nor deliberate 402 failure is used
as a production safety guarantee. Manual and scheduled production triggers remain.

Only the isolated engineering validation workflow is retargeted to Phase 2D. It has
read-only contents permission, exact branch/job guards, immutable action pins,
no persisted checkout credentials, no production secrets, no deployment environment,
no Pages artifact upload and no generator. Kernel socket denial covers test children.

## Remaining release gates

1. Read-only owner configuration evidence for a non-deploying main maintenance route.
2. An independently authenticated complete static deployment/version inventory;
   reconcile the 390 inherited historical files against it. Six recovered product
   images close a concrete asset gap, but do not prove the rest of the deployment.
3. Decide the Operations notice. Preserve current bytes until explicitly approved.
4. Independent runtime/import-map and static checkout compatibility review, plus
   isolated real-browser acceptance. No real orders, emails or transactions.
5. Technical certification using independently trusted review evidence; separately
   authorise any production workflow installation or publication. Spectre design
   acceptance and publication remain separate approvals.

Frozen Phase 2A/B/C, GIGA RC07, Phoenix and Spectre checkpoints are not modified.
No application, catalogue, checkout, production workflow or adapter source changes
are included. Rollback of engineering is by a new recovery worktree or reverse patch,
never by resetting another working directory or writing main.

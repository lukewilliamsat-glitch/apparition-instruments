# CLOUD ANCHOR 74O: native recovery and controller

## Evidence and scope

Production run 44516577793 independently retrieved and restored V2 capture
44349292200. Four relation ACL differences and two of three CHECK differences
were proven equivalent. The third CHECK had an expression-shape hint and the
old catch-all unresolved result. This establishes no production syntax or
semantic cause. The two vault entries and five historical tags were read as
metadata only; this engineering branch never retrieves production ciphertext.

The new engine uses PostgreSQL 17.6's extended query protocol. A lexical fence
admits one bounded CHECK with standard, E-string or ASCII-tag dollar quoting,
including escapes inside appropriate literals, nested arrays and identifiers.
Ambiguous Unicode escapes, comments, concatenated strings and stacked SQL fail
closed. PostgreSQL binds the original definition against the restored table;
even a bad lexical fence cannot make the extended protocol accept a second
statement. Comparison uses typed nodes, constants, coercions, collation and
object OIDs, direct dependencies, constrained columns and inheritance. Validation
is compared independently and the sibling is added NOT VALID in an uncommitted
transaction to avoid checking data. The engine ignores only the original
location and documented CoercionForm display metadata. Probe connections close
and roll back. Unknown tags, other constraint kinds or unexplained differences
remain blocking. This does not establish the original partition/inheritance graph.

SQL may invoke type input or similar routines during binding despite NOT VALID.
Do not use this runner on a live database. It runs without network interfaces,
provider credentials, a container socket or persistent plaintext; source is a
read-only trusted mount and PostgreSQL scratch is verified non-swap tmpfs. It
performs no ordinary CHECK row scan. Raw notices and messages are discarded;
only allowlisted SQLSTATE classes and fixed local categories are generated.

Diagnostics distinguish source/target syntax and quoting, size/depth limits,
unsafe input, eligibility, local boundary/version, validation and inheritance,
SQL syntax/resolution/types/privileges/data/resources/unsupported/refusal,
statement and lock timeout, worker timeout, malformed results, missing or
unsupported native nodes, native tree/dependency/column differences and proven
equivalence. The controller publishes only structured allowlisted counts,
never the raw restore log. A failure produces no recovery receipt.

## Trust and one-time migration

The protected controller tag names trusted orchestration, Dockerfile, binding
and native recovery engine; only trusted checkout bytes may execute. Candidate
commits supply a fixed-path, canonical JSON manifest containing a supported
comparison profile and a bounded opt-in evidence flag. The controller checks
commit, tree modes, bytes and Git blob identity. It will never check out or
build an arbitrary candidate, source its shell code, load its dependencies,
or accept its assertion of success. This distinction is intentional: fresh
manifests are reusable without an environment rewrite; a change to trusted
verification or code requires a separately reviewed controller release. The
current controller is bound to the retained V2 capture; it is not a generic
archive picker.

The no-secret job uses only read-only GitHub API access to publish the exact
canonical plan and digest. The plan binds controller and candidate commits and
blobs, capture, archive commitment, restore profile, evidence setting,
environment, reviewer and run ID. The protected job recomputes it and requires
one GitHub environment review by the pinned owner ID with that exact digest
in the review comment. A caller-supplied SHA, a digest string, or an unbound
protected approval cannot authorise vault retrieval. Run attempts beyond one
are forbidden; approval cannot be replayed across runs or duplicate reviews.
A fresh dispatch has a new run-bound digest and requires a fresh review.
Legacy recovery workflows share the same non-cancelling concurrency group.

Trusted retrieval alone receives the existing read-only vault token and binding.
A separate step passes the existing verifier identity on stdin to the network-free
engine; it receives no GitHub token or provider credentials. The host checks the
complete receipt schema, proof hash, every one of the 14 groups, and plan, archive,
capture, run and restore identities before posting metadata. The GitHub control
plane and pinned owner identity are trusted. The CI rehearsal uses real Git objects,
fixture API responses and actual native encrypted restoration. It does not claim
to have exercised the protected production reviewer or fetched a production asset.

Registered workflow and policy changes require a separate authorisation. In one
owner session:

1. Register only `.github/workflows/cloud-anchor74-controller.yml` on the default
   branch using the established no-deployment registration process. Verify bytes.
2. Create and protect `cloud-anchor-v2-controller` at the reviewed controller
   SHA, restricting create/update/delete/non-fast-forward with no bypass. Keep
   all five historical tags and their protections untouched.
3. In `cloud-anchor74-restore` only, allow just that tag and set
   `ANCHOR74_APPROVED_SHA` to the controller commit. Retain mandatory reviewers,
   disabled admin bypass and the three current restore secrets unchanged:
   `ANCHOR74K_ARCHIVE_BINDING`, `ANCHOR74_VAULT_READ_TOKEN`,
   `ANCHOR74_ONE_USE_VERIFY_AGE_IDENTITY`. No new tokens or identities.
4. Verify the protected environment and no concurrent recovery. After explicit
   authority for one restore, dispatch the controller tag with the reviewed
   full candidate SHA. Inspect the preflight plan and provide the exact generated
   `approve-anchor74 <digest>` comment in GitHub's protected reviewer gate. If
   self-review is prohibited, use a distinct authorised dispatcher rather than
   weakening the setting. No automatic rerun and no application deployment.

Subsequent reviewed manifests use steps 4 only. The connected GitHub API supports
publishing the single workflow file and independently reading metadata and reviews,
but has no tag/ruleset/environment write or manual dispatch action exposed. Use the
owner's existing authorised GitHub session for those operations; do not request an
administrative token.

## Optional owner-only evidence

The candidate provided here sets fallback to `off`. If independently approved
on another exact plan, `owner-encrypted-aggregate` allows the controller to seal
only the strict aggregate vocabulary from a failure, bound to the run and plan.
No ASTs, definitions, names, values, business rows, credentials or server logs
are included. Plaintext passes in memory to the pinned image's age binary in a
second container with no network, mounts or credentials. The recipient is the
permanent owner public key already validated by the independent 74C recovery test
and retained for V2; it cannot be supplied by a candidate. Maximum 8 KiB.
Only ciphertext is offered to the separate GitHub artifact step (seven days and
recorded SHA-256). It can be downloaded only under that provider's artifact
access rules; it must be treated as distributable ciphertext on a public repo,
not as a private evidence store. No vault-write credential is provisioned and
there is no plaintext artifact. This cannot supply missing historical facts; richer
production evidence would need a separately reviewed disclosure boundary.

Releases A, B and C remain blocked until genuine production recovery passes all
14 groups and its receipt is independently accepted, including V2 exclusions and
intervening transactions.

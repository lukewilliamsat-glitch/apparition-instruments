# 74M restore-only candidate

Run 44508617098 reported three constraint rule text differences, no missing or extra
constraint identities, no validation differences, and no positive restored-side
inheritance/partition hints. Its four native default ACL equivalences remain in use.
The output did not identify any constraint class or establish a production cause.

## Comparison rule

V2 seals constraint identities, the deparsed definition and validation. Upstream
[17.6 ruleutils.c](https://github.com/postgres/postgres/blob/REL_17_6/src/backend/utils/adt/ruleutils.c)
builds constraint DDL from the catalog. A CHECK uses the stored expression tree;
FK output uses the reference, columns, actions and attributes; key and exclusion
definitions also depend on native index metadata. Deparser output can vary with
visibility, literal and coercion presentation. The fixed V2 comparison settings
and earlier restore evidence do not establish which, if any, of these affected production.

When all other proof groups match (including proven built-in ACL equivalents), a
mismatched CHECK on a plain, non-inheriting, non-partitioned restored table can be
replayed in a local, loopback-only PostgreSQL 17.6 transaction. The input is a single,
bounded CHECK clause; unresolved quoting, multiple commands, comments and unsupported
forms are refused. Create a sibling CHECK with NOT VALID to avoid reading business
rows. Verify the original validation state independently, compare constrained columns,
NO INHERIT, dependencies and the entire native bound tree, and roll the probe back.
The comparison omits only parser source positions and the node-specific CoercionForm
display enum described in
[17.6 primnodes.h](https://github.com/postgres/postgres/blob/REL_17_6/src/include/nodes/primnodes.h).
Function/operator/type/collation identities, constants, casts and flags are still
checked. No deparser labels or lexical hints are used as evidence of equality.
FK, PK, UNIQUE, exclusion and unsupported CHECK discrepancies remain blocking;
the V2 capture did not seal source OIDs, direct dependency edges or the separate
partition/inheritance graph. The native comparison concerns the sealed definition
bound against the restored catalog, not objects outside the V2 proof and scope.

Only bounded counts and fixed labels are emitted: kinds, missing/added identities,
validation, display hypotheses, native equality, typed or dependency differences,
and unresolved or unsupported replay. These labels distinguish source evidence
from the restored context. TOC hints are derived from the decrypted archive locally;
the code does not use loose matching of TOC names or assume restore DDL independently
proves source catalog semantics. An unresolved difference still suppresses the receipt.
Should names or expressions be indispensable later, propose a separate opt-in,
freshly reviewed workflow to encrypt a small mismatch-only schema manifest to the
permanent owner key in tmpfs. Retain it only in the private vault and verify its
digest independently. Never include rows, secret-bearing constant values or raw
server logs. No such output path is enabled by this candidate.

## One restore using the existing infrastructure

After exact source and execution approval, register only
`.github/workflows/cloud-anchor74m-restore.yml` on the default branch and verify
byte identity. Create `cloud-anchor74m-restore-approved` at the approved commit and
activate creation, update, deletion and non-fast-forward restrictions without bypasses.
In `cloud-anchor74-restore` only, replace the permitted deployment tag and set
`ANCHOR74_APPROVED_SHA` to that commit. Keep the mandatory reviewer and disabled
administrator bypass. Preserve `ANCHOR74K_ARCHIVE_BINDING`,
`ANCHOR74_VAULT_READ_TOKEN` and `ANCHOR74_ONE_USE_VERIFY_AGE_IDENTITY` for the already
sealed V2 ciphertext. Do not add capture or write credentials. Preserve the capture
and 74D environments, tags and archives. Independently check the approvals and
configuration to the extent visible, then dispatch once on the exact tag and approve
the protected job. Do not rerun. The receipt, if issued, still requires independent
review including omitted services, original graph limitation and intervening transactions.

## Reduce recurring owner work

For a separately authorised migration, use a stable protected controller tag and
one manual default-branch dispatcher. Adopt the controller tag once in the existing
restore environment. Its no-secret preflight verifies a plan with the exact controller
and reviewed candidate commits, workflow blob, restore profile, and archive commitment.
The owner reviews the precise digest and approves the protected job for that run.
The protected job recomputes the digest, rejects any changed plan, checkout or
duplicate execution, and keeps vault retrieval and decryption in the trusted
controller. Run only independently approved comparable engines in the offline
sandbox; keep capture credentials, write credentials and unreviewed candidate scripts
out of privileged steps. Keep the reviewed controller immutable, hard-code credential
roles, and publish only a schema-checked metadata receipt. Keep the existing separation
of capture and restore. This needs a synthetic controller rehearsal and security
review before enabling it.

`restore_plan.py` implements the metadata-only binding and deterministic review digest;
`test_restore_plan.py` tests it against changed metadata and malformed inputs. It does
not query a provider, assert reviewer settings, or grant permission to run. The current
GitHub connector can publish and independently read back source and query Actions and
vault metadata. It does not expose the required environment/ruleset writes or manual
dispatch. Reuse the owner's protected workflow controls instead of requesting a broader
token. GitHub's REST dispatch requires Actions write, and a reusable workflow's
`jobs.<id>.uses` reference cannot be supplied as an expression. A stable controller
with verified immutable inputs avoids repeated environment changes and does not need
dynamic reusable-workflow selection.

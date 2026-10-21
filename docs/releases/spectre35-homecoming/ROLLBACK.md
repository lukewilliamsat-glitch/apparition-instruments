# Rollback status and prerequisites

**Current state: production was not changed; no rollback is needed or executed.**

## What is recoverable

The source-only correction is independently recoverable at commit `ee2ca60616c61304d26b7a2f7b9ff04555337cd0`, tree `f895a3173959b7e243566902be3552e44ecbc2b9`, parent main `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`. Its sole diff is `dist/customer-ui.css`.

Original CSS: Git blob `5a77dc0a6ee40fab7d1335c9c9c3003f36a36891`, SHA-256 `f72258fb8d455513d2cb38e3672f914207f81ee37664c7e6b32edc7d9c320f26`. Reviewed CSS: Git blob `525ae6e3aacb40b2385192e32eb894b351f25c75`, SHA-256 `16d6ebbd2372d54e32565a7999edfd1bc9152c785b77f1bcbf79ee47bba1794a`.

On a separately approved engineering checkout, inspect without changing refs:

```sh
git fetch origin release/spectre35-homecoming
git show ee2ca60616c61304d26b7a2f7b9ff04555337cd0 -- dist/customer-ui.css
git diff 2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f ee2ca60616c61304d26b7a2f7b9ff04555337cd0 -- dist/customer-ui.css
```

These are optional operator commands, not mandatory owner-side setup. Do not cherry-pick the whole preparation branch, which also holds non-production CI/evidence.

## What is not recovered

A Git CSS inverse is not restoration of the full unknown currently served payload. The latest successful upload's artifact `11712976121` is not retrievable. Neither repository source nor Atlas reconstruction is an attested replacement. Therefore an executable production restoration command cannot safely be supplied today; no unverified publication mechanism is installed.

## Required before any future deployment

1. Retrieve and attest the complete exact current payload and its independent per-file inventory, archive/payload hashes, deployment association and relevant metadata.
2. Retain that payload durably beyond Actions artifact expiry, with separate owner approval for any new storage/write permission.
3. Prove clean assembly preserves every original path/byte except explicitly approved CSS and any necessary verified fingerprint references.
4. Demonstrate exact recovery from that saved payload through the same controlled Pages route, without backend reads or regenerated catalogue/CMS data.
5. Record source, payload and release identities, verify no competing Pages deployment, and agree bounded live acceptance and rollback criteria before the first production write.

Stop/rollback triggers: missing or changed product/CMS/assets, incorrect served CSS, headline collapse, inaccessible essential static routes, unintended backend calls, or other material regressions within approved checks. Restore the complete saved previous payload, keep immutable assets/routes, do not reset Git refs, and never roll back business data. Verify recovery independently. If restoration evidence is incomplete, stop and escalate instead of inventing commands.

Synthetic fixtures prove forward overlay determinism and exact byte-for-byte inverse recovery for their eleven-file fixture, plus missing-file/digest rejection. They do not prove recovery of this production site. Do not create a Pages run to experiment with recovery.

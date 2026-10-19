# Recovery and continuation

The delivery package includes complete new tooling source, docs/contracts, fixture/test source, raw isolated test logs, synthetic demo inputs/output, independent patch and verified bundles. Frozen originals and audit ZIP are not duplicated or modified; their hashes are recorded in provenance evidence.

## Independent tooling recovery

After extracting the ZIP, verify SHA256SUMS from its root. Clone the **self-contained tooling-only** bundle (no production history, customer content or frozen development bundles):

```bash
git clone --branch atlas-phase2a-tools atlas-phase2a-tools.bundle atlas-tools
cd atlas-tools
python3 tests/atlas/run-offline.py --evidence /tmp/atlas-recovered-results-new
```

Its root commit/tree is distinct from the integration commit and explicitly recorded in release-identities.json. All required scripts use standard Node modules; no npm install required. A complete `source/` mirror is also supplied as a fallback. Do not install production workflows from any recovery package.

## Integration recovery against canonical-equivalent source

The isolated development branch is based on local commit 403cde30905f2e58040ca579fb6efb773d98c3cd, whose tree equals production main bb4ba2a932239a3ef397272b27143f0cd3adcccf:0f6ac37987b07050f6d457ff42861943813389e7. These commits are not interchangeable history identities. The independent new-files patch applies to either exact baseline tree; forward application must reproduce the recorded integration tree, reverse application restore 0f6ac379… exactly.

Use a fresh local clone/worktree, verify its tree first, then:

```bash
git apply --check /absolute/atlas-phase2a-preparation.patch
git apply /absolute/atlas-phase2a-preparation.patch
```

Stop on different/newer source or existing files; reconcile rather than force/reset/overwrite. After approved local staging, `git write-tree` must match the recorded candidate tree. Do not commit, push or deploy merely because patch application succeeds. Reverse only in an isolated clean recovery fixture, never discard independent workspace edits:

```bash
git apply --reverse --check /absolute/atlas-phase2a-preparation.patch
```

The optional incremental integration bundle has an explicit403cde… prerequisite; it preserves the exact integration commit object but is not independently cloneable without that original prerequisite/history. The tooling-only bundle above is independently cloneable. Do not claim that a reconstructed baseline commit recovers missing authentic Forge RC identities.

## Staging interruption cleanup

Normal exceptions/cancellation remove owned staging and empty reservation. A process kill/power failure can leave a private `.atlas-stage-*` sibling and an empty requested output. Neither is a ready publication artifact. Inspect ownership/path and quarantine only that failed attempt under separate local intent; never glob-delete unrelated work. If a reservation was populated by another process, it is deliberately retained without READY. Existing verified candidates are never overwritten. Select only the expected candidate/site after pinned verify.

## Continuation gates

1. Preserve this package and all earlier Phoenix/Spectre/RC07/checkpoint identities.
2. Confirm current main/tree and live deployment identity before any later publication (read-only scope must be explicit); no Supabase automatically on 24 October.
3. Obtain an authentic complete deployed-output artifact for offline validation, or separately authorise bounded reconstruction capture using CAPTURE-DESIGN.md. Current tools do not capture it.
4. Independently attest production coverage/provenance, review actual Spectre overlay hashes/source/security and define trusted Actions input delivery. Synthetic fixtures cannot stand in for production data.
5. Validate on verified Node 22 if the target runner stays 22; then fixture-test final orchestration/permissions/concurrency and exact workflow diff.
6. Request separate workflow installation/publication approval only with exact source/artifact hashes, complete baseline, isolated permissions, rollback and manual live acceptance plan. No deployment, Supabase, image publisher/adapter, DNS or billing authority is inherited from this package.

Future Admin galleries/shipping/discount requests are recorded only; do not implement them as a continuation shortcut.

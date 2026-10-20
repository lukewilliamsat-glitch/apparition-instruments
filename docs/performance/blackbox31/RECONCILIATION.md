# Existing architecture reconciliation

The recoverable GIGA V2 RC07 checkout independently matches commit `55e5fba390f7cf648490f7e7b5e0114a4d0d510c`, tree `8bd71a5e69dcdaf77add68afcbec5f65a11ece4c`, and was clean before inspection. Selected modules were compared byte-for-byte with git show at that frozen commit before reuse. RC07 was not modified, merged or recertified. No Atlas tooling or unrelated Forge work was imported.

| Component | Classification | Candidate treatment |
|---|---|---|
| Main image planner/writer | Reusable | Existing exact-byte SHA/MIME validation, deduplication, immutable assets, versioned manifest and atomic alias retained unchanged. |
| RC07 trusted publisher | Reusable | Recovered pure callable module unchanged; initial inventory, concurrent identity check, no-change/history reuse and archive verification exercised. |
| RC07 durable Git store | Reusable with targeted hardening | Recovered branch/marker/CAS/history/retention functions. Export now rejects uncommitted recovery repairs, so ordinary assembly cannot hide archive corruption. |
| RC07 retained snapshot | Reusable with extension | Strict lightweight-to-retained mapping reused; added explicit historical manifest pinning with revision validation. |
| Main/RC07 browser adapter | Incomplete for strict path | Existing manifest schema, bounded responses and generation handling reused/adapted. Replaced HEAD-only acceptance with full-byte SHA verification, added origin/path/redirect restrictions and concurrency cap. Enabled-path embedded fallback replaced by safe placeholders. |
| Catalogue delivery projection | Reusable source contract; live unverified | Existing reviewed invoker-view SQL already supplies required fields and identities. No new projection or migration is required by this candidate. No production verification or SQL execution occurred. |
| Public repository/client integration | Reusable | Existing consumer boundary retained; optional configuration injection enables actual isolated integrations. |
| Product generator | Incomplete | Added lightweight retained-archive reader, rollback revision selection and companion-asset retention. Legacy default preserved. |
| Admin image editing | Reusable/protected | No changes; source image values remain authoritative and upload/replace/remove fixtures pass. |
| RC07 staged Actions proposal | Unverified operational prerequisite | Not installed, copied into live workflows, dispatched or certified. Future deployment must restore durable assets regardless of capture/adapter flags and keep archive writes isolated. |
| Current Pages payload / live assets | Unverified | No live access or reconstruction. Must not replace production from this candidate's committed dist alone. |

The smallest path was selective reuse of three recovered publisher/archive modules, existing image planner and public integration boundaries, plus strict resolver and generator corrections. Rebuilding the publisher or importing the full frozen RC07 tree was unnecessary.

Original per-file source SHA-256 values appear in REUSE_PROVENANCE.json. Durable store and retained snapshot now differ only for the documented hardening/extensions. Main source was materialised and verified against all 899 GitHub blob identities before edits.


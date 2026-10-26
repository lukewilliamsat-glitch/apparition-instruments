# Apparition Instruments

The editable website application lives in `dist/`. Do not delete it as disposable build output. `scripts/` contains generators and release tooling; `tests/` contains acceptance fixtures; `supabase/` preserves server source and migration history.

Current repository-health findings, verified corrections, release backlog and source identities are in [CLEAN SLATE](docs/engineering/clean-slate/README.md). The [release standard](docs/engineering/clean-slate/RELEASE_STANDARD.md) distinguishes engineering publication from an actually verified live release.

Dated checkpoints and frozen engineering branches remain evidence, not automatic current production state. Reuse their matching acceptance instead of repeating whole programmes. A green source test or a commit on main does not prove a Pages deployment succeeded.

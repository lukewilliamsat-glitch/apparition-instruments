# Atlas Authorisation 20A — engineering branch preparation

Production main verified: bb4ba2a932239a3ef397272b27143f0cd3adcccf; tree 0f6ac37987b07050f6d457ff42861943813389e7. Original local Phase2A commit 71c8fc1cd244e8f4f12d2a06c826d18926774331; tree cd8c0d0faa34e9afd8701b251d5921bae3ef7ad1. Recovery ZIP SHA-256 e0d2b63637a439f16253eecf23695508390cc1408f24188af51b3cee7160ee39 verified.

The engineering branch preserves the exact 24 Phase2A additions and adds only this note, a one-line daily-cron review diff and a manual Node22 CI review template. It changes no installed workflow or application file. Original local checkpoint/recovery ZIP remain intact. GitHub publication may use a new commit directly on canonical main because original local base403cde… has equivalent content but different history; do not import that unrelated ancestry or treat the new SHA as the original checkpoint.

No local Node22 runtime was found; available Node24.19.0 is not evidence for Node22. The proposed CI template is documentation only, with contents:read, no secrets, no npm install or deployment and inherited Linux kernel network denial. Installing/running it needs separate approval; major action tags should be pinned to reviewed immutable SHAs then. Existing161-case results are preserved rather than redundantly rerun.

The daily schedule patch changes only cron from */15 * * * * to 0 3 * * *. Push/manual triggers remain. Applying it to main would trigger the existing production workflow; no verified non-deploying route is established, so it is NOT applied. The old surrounding comment would remain as a nonfunctional documentation inconsistency in this deliberately one-line patch; update that comment only if separately included in a later reviewed change.

Production-baseline recovery is deferred: Phase1 found last-success run38167017686, uploaded artifact11712976121, but listing was empty/direct access404. An owner-retained original deployment archive is the best lead. Verify run/source identity, whole archive digest, full file manifest, live-only assets and coverage before using it. No production capture, Supabase request or deployment occurs in this pass.

# NIGHTWATCH — First Contact

Authorisation 50, 25 October 2026. **Mission PARTIAL; archive-backed visual candidate awaits the explicitly required owner archive-access approval.** This is working release tooling, not a website deployment or an owner-approved design.

## Implemented checkpoint

- Offline, bounded Pages ZIP/TAR validation and complete path/size/SHA-256 inventory.
- Deterministic release assembly using the exact SPECTRE CSS plus CSS cache-reference changes only; reject other changed/added/deleted content. Preserve generated pages, assets, tools and notices.
- Complete original rollback ZIP retention and verification; restore the whole payload, not a CSS inverse.
- Injected publication/restoration coordinator: pinned complete active state, fresh holiday evidence, shared-lock contract, separate visual/production approvals, one attempted deployment, read-back and uncertain-outcome hold. No default live transport.
- Approved-handoff staging and verification of the actual Pages TAR, with an uninstalled future Pages-only workflow template. No production workflow installation or deployment is authorised here.
- **116/116 synthetic tests PASS** locally (Python3.12.14) and in process-isolated hosted CI (Python3.12.15). [Run 40206536274](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/40206536274) tested source `f614e8807dfafe07bf258954c01decd1352ce74c` /tree `0aa63bac17db0dfda03e30f000df62e78b29ac00`. External IPv4/IPv6 attempts were denied before testing. The original synthetic evidence ZIP was independently read back and its size, SHA-256, CRC and source hashes verified. Chrome155.0.8059.39 is available there, but no browser application/rendering test has run in NIGHTWATCH.

A dedicated `engineering/nightwatch-first-contact` branch was chosen because no earlier NIGHTWATCH-specific branch/path specification was recoverable. Base is verified production main `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`. New code is confined to `scripts/nightwatch/`, `tests/nightwatch/`, this directory and one synthetic-only CI workflow. Existing application, database and production workflow files remain unchanged.

| Phase | Current state |
| --- | --- |
| 1 — infrastructure | Synthetic local/hosted acceptance PASS; real hosted publish/restore route uninstalled/unaccepted |
| 2 — actual visual candidate | Exact CSS and assembly machinery ready; complete authentic candidate NOT yet built |
| 3 — real browser review | NOT RUN; no genuine NIGHTWATCH screenshots or preview yet |
| 4 — holiday protection | Fail-closed checks implemented; current live holiday/payload preservation NOT yet established |
| 5 — owner visual sign-off | NOT REQUESTED; requires genuine candidate and evidence |
| 6 — production | NOT AUTHORISED; requires separate exact release decision after visual approval |

See [implementation](IMPLEMENTATION.md), [publication route](PUBLICATION_ROUTE.md), [archive access gate](ARCHIVE_ACCESS_GATE.md), [holiday gates](HOLIDAY_GATES.md), [test evidence](TEST_RESULTS.json) and [release gates](RELEASE_GATES.md).

No private archive bytes were opened, retrieved, decoded or uploaded. No Supabase/Auth/REST/RPC/SQL, live storefront, payment, order/stock mutation, production build/deployment, main merge or preview hosting occurred. The synthetic CI workflow has contents:read only, targets this engineering branch and has no Pages/OIDC permission. The future publication template is outside `.github/workflows` and cannot run.

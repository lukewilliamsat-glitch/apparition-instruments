# COMMAND 01 — Premium Catalogue Workbench
**PASS within Authorisation 37's isolated scope.** Production integration is not authorised.

Branch: [engineering/command01-catalogue-workbench](https://github.com/lukewilliamsat-glitch/apparition-instruments/tree/engineering/command01-catalogue-workbench).

Tested source commit: `5f82f7403e188605895cf53427c03d8b157681cd`; source tree: `c3699c2b1ff75235e7f19f4673296a3bcde4daf5`. The subsequent documentation commit adds evidence only.

Final [CI run 39618086032](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39618086032): **42/42 Node 22 tests, 32/32 real Chrome journeys, 10/10 browser isolation negative controls**, plus blocked IPv4/IPv6 process probes and inherited-child namespace verification. Five isolated CI executions occurred during hardening; their full outcomes are retained in TEST_RESULTS.json. No production workflow was dispatched.

Nine genuine viewport screenshots are committed, including [desktop inspector](SCREENSHOTS/desktop-inspector.png), [mobile inspector](SCREENSHOTS/mobile-inspector.png), [active filters](SCREENSHOTS/desktop-active-filters.png) and [error/retry](SCREENSHOTS/desktop-error-retry.png).

## Start here
- [Interface and interactions](INTERFACE.md)
- [Data contract and source reconciliation](DATA_CONTRACT.md)
- [Browser acceptance](BROWSER_ACCEPTANCE.md)
- [Machine-readable test evidence](TEST_RESULTS.json)
- [Release gates and rollback](RELEASE_GATES.md)
- [Chrome screenshots](SCREENSHOTS/)

The candidate branches directly from production main `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f` (tree `eb2c9f1824602d19ed27f010cf080190a06c713e`). HOMECOMING, NIGHTFALL, Atlas, Phoenix, Spectre and frozen FORGE/GIGA work are not merged. All 899 existing tracked blobs remain unchanged. The only additions are under `prototypes/command01/`, `tests/command01/`, this documentation directory, and the dedicated branch-only acceptance workflow.

This is a working application, not a decorative mockup: local search and five composable filters, image-free summary reads, on-demand product details, stable identity selection, explicit refresh/retry, asynchronous generation protection and responsive read-only presentation.

## Running without owner setup
The branch's **COMMAND 01 isolated acceptance** GitHub Actions job serves the actual prototype and its unchanged shared Admin dependencies through a loopback allowlist. It proves process-level network isolation before opening the application, then executes Node 22 and real Chrome acceptance. Screenshots and JSON evidence are preserved here; the owner does not need a local runtime, ZIP or account login.

For maintainers only: the static entry point is `prototypes/command01/index.html`. It must be served from the repository root so relative imports resolve. A generic repository-root server is **not** the security boundary used for acceptance. Use the reviewed CI harness. The prototype is outside the production Pages `dist/` output and is not linked from existing Admin.

## Deliberate limits
- All 14 records, identities, prices, quantities and image metadata are fictional.
- No backend, authentication, image-byte delivery, editing, saving, publication, stock adjustment or commerce transaction exists in this candidate.
- `salePrice` means selling price; the current model does not define separate regular and discounted prices. No price-strikethrough or promotional semantics are invented.
- Wiring-kit assemblies use a separate production contract; COMMAND 01 inspects component kit eligibility/pricing, not assembly records.
- Browser checks are not comprehensive screen-reader, assistive-technology or WCAG certification.
- Synthetic byte measurements do not establish production or billed egress savings.

No production integration or deployment follows automatically from passing acceptance.

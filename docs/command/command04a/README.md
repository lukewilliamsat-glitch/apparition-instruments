# COMMAND 04A — Project NOCTURNE

Authorisation 41 · 23 October 2026. A reviewable presentation candidate for Apparition COMMAND. **PASS within isolated automated scope. Owner design approval remains pending.** Tested source `1bbe60fd216a412eed7349c8d79acdd50a94931e`, tree `7a0ff98a10165b113e09cf9341d1fbe02d8f8bd1`; [CI 39930046308](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39930046308) passed. Automated isolated acceptance and owner design approval are separate gates.

The candidate starts from COMMAND 04 `20002c45933a7f24b08f6d5f0199a7fc8fa1a282`, tree `e7025f7ee95eb4389910848dc66122e53ce37dfb`, on `engineering/command04a-nocturne`. The final tested source, CI, artifact verification and current outcome are recorded in TEST_RESULTS.json and BROWSER_ACCEPTANCE.md. A subsequent documentation-only commit preserves this handover.

## What changed

Charcoal surfaces and restrained brass accents sharpen catalogue/editor hierarchy. Supporting text and form inputs are larger. The desktop catalogue remains alongside editing, with bounded local scrolling. Phones use a labelled section chooser and action tray; tablets and phones can browse the catalogue while retaining the same draft. Validation links lead to the affected section. Status guidance distinguishes permission, authentication, draft, review, saving, confirmed, conflict and unresolved outcomes. Native review-dialog Escape restores focus after close.

## What is preserved

All 993 inherited files are verified before and after CI, including all COMMAND 01–04 implementation/tests, IRONCLAD SQL, original screenshot assets, production files and workflows. Only new NOCTURNE prototype/test/document files and its exact-branch engineering workflow are added. The existing framework, schema, prices, stock, permission authority, mutation contract, revisions, audit, receipts and reconciliation remain unchanged.

`prototypes/command04a/index.html` composes the existing modules. `compose.mjs` retains COMMAND 04 orchestration with a fixed fictional workload size (14/100/500). `entry.mjs` adds presentation only; `nocturne.css` has no production consumer. There is no live adapter, external font/image dependency, generated imagery or new application dependency.

## Review map

- DESIGN_AUDIT.md — observed baseline, evidence, decisions and correction history.
- CHANGELOG.md — exact presentation/interaction changes and rationale.
- RESPONSIVE_ACCEPTANCE.md — viewport, text, keyboard and reachability checks.
- BROWSER_ACCEPTANCE.md — real Chrome, original PNGs, artifact and independent verification.
- TEST_RESULTS.json — machine-readable source, suite, screenshot and retention evidence.
- RELEASE_GATES.md — owner approval, accessibility limits and production boundaries.

Use the retained original before/after captures for owner review. No local installation is needed. The static prototype is outside production `dist` and is not published; maintainers must use the reviewed isolated harness, not treat a generic local server as its security boundary.

No production service, live authentication, customer record, SQL, production workflow, deployment, hosting or DNS operation forms part of this mission. Supabase recovery remains independently unverified. No follow-on mission begins automatically.

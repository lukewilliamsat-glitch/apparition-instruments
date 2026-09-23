# Apparition Instruments Project State

## Canonical source

- GitHub `main` in `lukewilliamsat-glitch/apparition-instruments` is the sole canonical development source.
- The GPT to GitHub transfer was approved as complete at commit `26f159107c494df6492299ec16488a9f7d2f0bc9`.
- At transfer acceptance, page and routing parity, application functionality parity, visual and asset parity, and GitHub Pages deployment all passed with no known remaining transfer issues.
- The primary editable application is `dist/`.
- `dist/` is edited directly and is not compiled from a separate `src/` tree.

## Development and deployment

ChatGPT Site v40 is retired from active development. It is a frozen, read-only legacy and reference copy only. Future development must not modify, publish or maintain it.

The live GitHub Pages development and test deployment is:

https://lukewilliamsat-glitch.github.io/apparition-instruments/

Use small, scoped development passes with checkpoint commits rather than large multi-feature passes.

### Future implementation workflow

1. Read the current project state and current GitHub `main`.
2. Implement the targeted change.
3. Run the relevant automated tests.
4. Commit and push the verified change to GitHub `main`.
5. Deploy.
6. Perform targeted live verification only where necessary.
7. Obtain user manual visual approval where appropriate.

### Verification efficiency

- Prefer existing automated tests and targeted runtime or source checks.
- Do not perform broad manual browser walkthroughs unless explicitly requested or genuinely required by the change.
- Do not manually re-test unaffected systems already covered by passing automated regression tests.
- The user will perform subjective visual inspection where practical.

## Current systems

Customer-facing systems include:

- Storefront, component catalogue, basket and checkout foundations
- Wiring Kits and Kit Builder
- Wiring Diagram Generator
- Treble Bleed Designer
- Luthier Hub

Admin and internal systems include:

- Components and Inventory
- Products, Assemblies and bills of materials
- Orders
- Wiring Kit Master
- Production Build Sheets covering picking, wiring, build, QC and print layouts

Current application data persistence remains browser-local. Admin, inventory, order and production records are not shared between browsers, profiles or devices, and clearing browser storage can remove them.

The Wiring Diagram Generator retains its known routing and readability issue affecting how some circuit connections are presented. This is banked work, not a transfer discrepancy.

Invoicing is not yet implemented.

## Next architecture phase

The next major architecture phase is:

- Admin authentication
- Shared persistent data
- Components and Inventory persistence
- Persistent uploaded component and product imagery

The exact persistence architecture has not yet been approved and must not be implemented without an authorised development pass.

## Banked work

Banked feature work remains banked, including Generator V2 and Treble Bleed Designer improvements. Do not begin banked work unless it is explicitly authorised.

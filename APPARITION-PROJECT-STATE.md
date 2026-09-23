# Apparition Instruments Project State

## Canonical baseline

- GitHub `main` in `lukewilliamsat-glitch/apparition-instruments` is the canonical source-controlled copy.
- The current approved baseline corresponds to Apparition Instruments Site version 39.
- The primary editable application is `dist/`.
- `dist/` is edited directly. It is not compiled from a separate `src/` tree.

## Current systems

Customer-facing systems include:

- Storefront, component catalogue, basket and checkout foundations
- Wiring Kits and Kit Builder
- Wiring Diagram Generator
- Treble Bleed Designer
- Luthier Hub

Admin and internal systems include:

- Components and inventory
- Products, assemblies and bills of materials
- Orders
- Wiring Kit Master
- Production Build Sheets covering picking, wiring, build, QC and print layouts

Admin, inventory, order and production records currently use browser-local persistence. They are not shared between browsers, profiles or devices, and clearing browser storage can remove them.

The Wiring Diagram Generator has a known routing/readability issue affecting how some circuit connections are presented. Treat the approved v39 behaviour as the baseline until that issue is addressed in an authorised development pass.

Invoicing is not yet implemented.

## Deployment status

GitHub Pages is currently only a temporary deployment test. Its `/apparition-instruments/` project subpath conflicts with the application's root-relative URLs, causing routes, assets, styles and JavaScript modules to resolve incorrectly. This is a hosting-compatibility issue, not missing source.

Do not rewrite application URLs solely to accommodate the temporary GitHub Pages project subpath.

The ChatGPT Site may be used for development or preview deployment, but it must not contain approved source changes that are absent from GitHub.

## Development rule

### BEFORE EDITING

Read current GitHub `main`.

### AFTER A SUCCESSFUL CHANGE

- Update the corresponding GitHub source.
- Verify the requested functionality.
- Commit the approved change.
- Update or publish the ChatGPT Site when that pass requires it.
- Ensure GitHub and the Site do not knowingly diverge.

Future approved Work changes must be committed to GitHub during the same development pass.

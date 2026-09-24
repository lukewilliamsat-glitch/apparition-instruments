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

Components and Inventory are shared Supabase business data, with Admin writes protected by Supabase Auth, explicit Admin membership and RLS. Assemblies, Kit Definitions, Orders and production records remain browser-local; clearing browser storage can remove these local records.

The Wiring Diagram Generator retains its known routing and readability issue affecting how some circuit connections are presented. This is banked work, not a transfer discrepancy.

Invoicing is not yet implemented.

## Wiring Kit family foundation

Les Paul is the only active production Wiring Kit family. Customer family discovery and Builder loading use the existing Assembly / Kit Definition through an asynchronous repository boundary. Family-specific electrical resolution remains in its adapter; physical products remain Component and Kit Definition data.

Known accepted limitation: adding a third potentiometer brand in Components does not automatically create a new customer-facing brand choice. Admin can discover and map the Component, but the existing Alpha/CTS customer choice dimensions remain as configured. Do not patch this by hard-coding another brand.

Future Kit Definition work must support generating new customer option dimensions without source-code registration. Component and Inventory persistence is complete; Kit Definitions remain local until P05C.

## Next architecture phase

P05A established the version-controlled Supabase schema for the existing `Apparition Instruments Webstore` project. P05B migrated the approved actual browser export: 33 Components and 33 Inventory records. Components and Inventory now use Supabase as the only production authority; the customer catalogue and Builder use the RLS-protected public catalogue and stock boundary. The old browser export remains a private audit snapshot, never an automatic import or fallback. P05C will handle Assemblies and Kit Definitions. See `supabase/README.md` for later Storage and backend boundaries.

The obsolete legacy `price` field was intentionally retired during migration. `salePrice` is the current individual retail selling price and `kitPrice` is the Wiring Kit add-on price; the canonical `pot-short-cts-a` retail price is 699p.

P05D-A replaced the temporary browser-password gate with Supabase email/password Auth plus an explicit `admin_members` row enforced by RLS. Admin routes verify identity and membership before loading modules; session restoration and sign-out use Supabase Auth. The initial confirmed Admin account is provisioned as live Auth and membership data, not source credentials. Assemblies and Kit Definitions remain browser-local until P05C. The public website remains unauthenticated.

The known quantity-aware kit pricing discrepancy remains deferred: CTS kit adjustment is currently charged once instead of once per four physical pots. Resolve generically from the eventual physical Component ID and quantity, not a Les Paul-specific multiplier. P04C family additions remain deferred until shared persistence.

The next persistence pass, P05C, concerns Assemblies, BOMs and Kit Definitions. Persistent uploaded component and product imagery remains separate future work; the approved P05B export contained no local or embedded images.

## Banked work

Banked feature work remains banked, including Generator V2 and Treble Bleed Designer improvements. Do not begin banked work unless it is explicitly authorised.

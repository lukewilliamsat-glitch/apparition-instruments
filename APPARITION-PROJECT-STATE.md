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

The intended customer-facing production origin is `https://apparitioninstruments.co.uk`; `www.apparitioninstruments.co.uk` should redirect to the apex. GitHub Pages remains the host. Production cutover is pending the repository's GitHub Pages custom-domain setting, Squarespace DNS changes and GitHub HTTPS certificate provisioning. Future checkout return URLs and allowed production origins should use the apex once the cutover is verified. The existing Pages Actions workflow publishes `dist/`; a `CNAME` file is not used by this publishing method.

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

Components, Inventory, the Les Paul Assembly/BOM, Kit Definition and new guest-submitted configured-kit Orders are shared Supabase business data. Order creation uses a constrained database RPC to validate the P06B kit snapshot and prices; Orders are readable only by explicit Supabase Admin membership. New Orders are Pending and Unpaid. Order submission does not process payments, reserve or deduct stock. Legacy manually entered browser-local Orders and production Build Sheets have not been migrated; they remain browser-local and are not the new Admin Orders authority.

The Wiring Diagram Generator retains its known routing and readability issue affecting how some circuit connections are presented. This is banked work, not a transfer discrepancy.

Invoicing is not yet implemented.

## Wiring Kit family foundation

Les Paul is the only active production Wiring Kit family. Customer family discovery and Builder loading use the existing Assembly / Kit Definition through an asynchronous repository boundary. Family-specific electrical resolution remains in its adapter; physical products remain Component and Kit Definition data.

P06A.1 lists Active + Available in wiring kits Components in the Kit Definition editor by physical category even when incompatible, with an explicit reason. Supported compatible Components become candidates without a source edit; kit-specific permission is required before customer use. New potentiometer brands and physical shaft variants derive from manufacturer and structured nominal resistance (explicit 500kΩ), audio taper, Short/Long shaft and Standard type. Unitless resistance such as `511` cannot establish the nominal value and is ineligible until its meaning is corrected in Admin. Existing saved resolver mappings and defaults remain authoritative; new compatible variants are derived without manual mapping. Zero stock affects availability, not configuration eligibility. The Builder groups eligible tone capacitors by structured capacitance and prices options from resolved physical requirements. The separate Generator still supports only 0.022, 0.033 and 0.047 µF; Builder installation links are unavailable for other values until Generator support is added.

Admin may permanently delete an unused Component after confirmation. A transactional Supabase function checks Assembly BOM, Kit Definition permissions, defaults and resolver references; referenced Components cannot be deleted. The database policy also blocks a direct Admin DELETE of referenced Components. Inventory is removed atomically with an unused Component. Deactivation with `Active = false` remains the non-destructive alternative. Existing browser-local order snapshots are not a shared database dependency ledger.
The Admin deletion response reports dependency and database errors; an unused Component was verified removable inside a rolled-back Admin database transaction, while a Component retained in a Kit Definition resolver was correctly blocked. No live business record was removed in that check.
Admin refreshes authoritative Components on return to the tab; successful create, edit, stock updates and deletion reload the authoritative repository list. No local Component seed is used as a fallback.

## Next architecture phase

P05A established the version-controlled Supabase schema for the existing `Apparition Instruments Webstore` project. P05B migrated the approved actual browser export: 33 Components and 33 Inventory records. P05C imported the actual browser's one Les Paul Assembly, three ordered BOM rows and Kit Definition with 23 permitted Components. The approved corrections removed the orphan `Poofart` permission and aligned the legacy potentiometer Component pointer to `pot-short-alpha-a` for the Alpha + short default. Components, Inventory, Assemblies and Kit Definitions now use Supabase as production authority; customer catalogue and Builder use RLS-protected public data. Browser-local exports remain private audit snapshots, never automatic imports or fallbacks. See `supabase/README.md` for later Storage and backend boundaries.

The obsolete legacy `price` field was intentionally retired during migration. `salePrice` is the current individual retail selling price and `kitPrice` is the Wiring Kit add-on price; the canonical `pot-short-cts-a` retail price is 699p.

P05D-A replaced the temporary browser-password gate with Supabase email/password Auth plus an explicit `admin_members` row enforced by RLS. Admin routes verify identity and membership before loading modules; session restoration and sign-out use Supabase Auth. The initial confirmed Admin account is provisioned as live Auth and membership data, not source credentials. The public website remains unauthenticated.

P06B stores physical role requirements in the Kit Definition defaults: potentiometers ×4, separate neck and bridge tone capacitors ×1 each, treble bleeds ×2, selector ×1 and output jack ×1 when selected. Customer configuration resolves current canonical Component IDs, multiplies unit kit add-ons by physical quantity (pot adjustments relative to the default), aggregates stock, and snapshots role identities/quantities in the basket. None has zero quantity. The historical fixed Assembly BOM still supports Admin max-buildable and migration compatibility; it does not define the customer-selected physical parts. Live basePrice remains Supabase-authoritative. P04C family additions remain deferred.

Persistent uploaded component and product imagery remains separate future work; the approved P05B export contained no local or embedded images.

## Banked work

Banked feature work remains banked, including Generator V2 and Treble Bleed Designer improvements. Do not begin banked work unless it is explicitly authorised.

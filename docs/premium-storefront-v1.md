# Premium storefront and commercial system V1

Starting HEAD: f4e9c265a66c3baf52d2ca931fd990afb198fdef.
Recovery branch: premium-storefront-v1-recovery at that HEAD.

## Presentation authority

Commercial tokens and primitives extend brand.css. The commercial-page scope applies warm dark, neutral paper and restrained gold to storefront entry, catalogue, product, kit and basket surfaces. Engineering workbench bodies remain outside that scope. Existing fonts, photographs and SVG geometry are reused. No external dependencies, animation libraries or raster assets are added.

Shared product presentation is defined in products/presentation.mjs, used by both the live product renderer and static SEO generator. Identity, purpose, availability, price and native purchase control form the first hierarchy. Description, specifications, fitment, supplied installation/QC content, education and help form the subsequent hierarchy. No price, stock eligibility, basket event, variant choice, checkout or fulfilment rule is replaced. Technical rows remain derived from productDetails and physicalRows. Missing facts are not filled with invented measurements or claims.

Existing public product snapshots are migrated offline by refine-commercial-snapshots.mjs. Their original Product JSON-LD supplies identity, existing specification rows, price and binary availability for presentation only. A numeric sentinel represents existing availability internally; it is never shown as a stock quantity or used to mutate inventory. Existing offers, structured data, canonical URLs, photos and published content are preserved. The script never refreshes the catalogue or reads Supabase. Future scheduled SEO generation uses the same shared presentation helper with authoritative catalogue records as before.

The Components landing has three deliberate discovery routes, functional category filters, specification-led catalogue cards and restrained circuit/selection guidance. Bought-in components are not described as UK manufactured. Testing/assembly claims remain product-specific and appear only where already supplied. Wiring Kits retains Build your kit and Help me choose, supported-family guards, kit contents and fitment checks; the shared surface and CTA treatment supplies commercial consistency.

## Shell and operational boundary

navigation.json is the shared shell source. sync-navigation.py generates consistent desktop/mobile navigation, including Account and Basket, and low-prominence footer utilities. Admin moves out of customer primary/mobile navigation into the footer. Operational Admin-only headers are left alone. Admin route, authentication, roles and backend enforcement remain unchanged. On existing public-shell Admin and checkout documents, only shell navigation/utility markup changes; main content and script entry points are preserved. Legal page content is unchanged.

Future dedicated task: ADMIN AUTHORIZATION + SECURITY HARDENING. Review authentication, roles, direct routes, backend enforcement, session behaviour and privilege boundaries. Moving the link is not a security measure.

## Electrical/editorial contract

Shared editorial paint now uses compatible warm signal, tone, ground, shield, pickup-lead and contact colours. Grounds/shields recede through thin strokes and opacity. Meaningful crossings and terminals are retained. Technical conductors retain category/manufacturer colours. No graph, route, contact, terminal or equation changes are made.

Educational main: pickup → selector → volume input lug 3 → volume wiper/lug 2 → jack TIP.
Tone loading: volume input lug 3 → 0.047 µF capacitor → tone → ground. Lug 1 remains ground; TIP and SLEEVE remain distinct. The existing landing fixture remains intact.

## Validation and acceptance

Fixtures cover 54 shared shells, nine product snapshots, all category entry routes, static/live presentation idempotence, real fields, offers/canonical integrity, price/stock/basket contracts and warm editorial paint over five unchanged circuit routes. Responsive CSS contracts are evaluated at 320, 390, 768, 1024, 1400 and 1920: catalogue columns, navigation replacement, purchase touch targets, details grids and mobile specification stacking. Three foreground/background contrast pairs meet 4.5:1. The consolidated gate covers 40 suites. The historical switch/Hub fixture now permits only authorised primary/mobile navigation and footer utility regions in its non-hero byte comparison; all other bytes and switch/hero assertions remain protected. Existing commerce, kit, electrical, Guided Build, Forge/Generator and SEO regressions pass.

Browser inspection is explicitly prohibited for this pass. No browser is opened or screenshot taken. All rendered desktop, mobile, editorial, catalogue, product, pot/jack and technical-tool acceptance is PENDING LUKE. Automated structural checks do not establish premium visual quality.

Publication uses static-only deployment so this milestone does not invoke the Supabase catalogue generator. Existing independent scheduled refresh remains an established platform behaviour. No Supabase or production business data is accessed or mutated by this pass. No schema or migration changes.

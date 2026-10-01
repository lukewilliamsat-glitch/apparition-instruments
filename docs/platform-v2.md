# Apparition Knowledge + Tool Ecosystem V2

Content explains. Tools demonstrate. Generator builds. Kit Builder configures. Products fulfil.

The Luthier Hub is the educational front door. Eight topic families and six curated learning paths connect eleven real editorial routes, a searchable index, a troubleshooting guide and one glossary. Paths are navigation, not tracked courses. Existing article URLs are preserved. Articles use one title/intro, technical sections, practical implications and misconceptions, then one contextual bench module with a supported example, related learning and a restrained product-category link. New content avoids claims that brand, voltage rating or physical size creates an audible benefit. Electrical voltage transfer is distinct from acoustic output and subjective preference.

`dist/knowledge/registry.mjs` owns editorial topic, article, tool and category relationships. It has no products, stock, prices, equations or manufacturer mapping table. Its example links compose `normaliseCircuitState`, the existing model and established handoff functions. `context.mjs` supplies reusable component cards and contextual learning links. Product context uses that same registry for live and static product rendering; the public catalogue remains authoritative. Category tool links are labelled as examples, not exact product models. Add a future article record and supported sections, join a topic/path/relationship, generate static output with `node scripts/generate-knowledge-pages.mjs`, and run the registry/link tests. Do not hand-code a parallel link or state system. Generated page sources are committed; regenerate only when registry/editorial content changes.

The conductor guide consumes `pickupConventions` and `conductorRoles` directly. Generic and unresolved mappings remain honest about their limits. It supplies no measured pickup assumptions. Troubleshooting narrows checks and links to tools; symptoms are not a diagnostic verdict. Scope is disconnected passive guitar electronics, never amplifier internals.

Homepage discovery preserves the accepted hero, animation and composition. Its existing Hub introduction now states the practical philosophy. Tools and learning remain discoverable at their established routes; internal `circuit-forge` URLs are deliberately retained while customer-facing terminology is Signal Forge, Circuit Lab and Signal Lab.

## Apparition Project / Configuration Architecture

`electronics/state/project.mjs` defines a V1 envelope: `{version, name, electronics, extensions, contextId?, kitReference?}`. `electronics` composes the existing V1 `sf` state, without copying an electrical model. The current adapter supports the validated Les Paul circuit only. `instrumentDescription` derives actual pickup slots and control assignments from circuit components. The envelope does not encode a global fixed pickup count or control layout: future templates can supply newly validated electronics adapters. Unsupported SSS/HSS/HSH/HH/SS/HS or arbitrary layouts are not accepted as today's electrical truth.

Versions and recognized fields are validated. Circuit options, channel controls, pot/pickup presets and load assumptions use the shared normalizer. Unknown electronics fields follow the legacy projection rule and are ignored. Safe opaque future/local data belongs in `extensions`, a bounded JSON object with safe keys, five-level nesting and a 4 KB limit. It is preserved during local restore and compatible tool changes, but never interpreted as topology. Invalid schemas, oversized data and malformed URL state fall back safely with a notice. Unsupported future envelope versions are not silently reinterpreted.

`projectCapabilities` declares what destinations understand. Forge owns current compatible circuit edits. Generator consumes physical configuration and represented pot values while preserving analysis assumptions for return. Designer consumes only its existing supported single-channel response and keeps the source snapshot intact; deeper Designer edits do not claim to update the source topology. Kit Builder consumes Kit Definition choices. A validated optional `kitReference` points to the existing definition ID/family without duplicating its products or BOM. Existing normalized Kit Definition selections are preserved as opaque local/session `extensions.kitSelection`; they can reopen in Builder only when revalidation and exact physical compatibility succeed. Names/model notes within those selections never enter public project sharing. It survives local and same-tab context; public share links contain electronics only. `kit-project.mjs` reconciles the chosen kit's actual resolved pot/cap/bleed values into the existing shared state where representable. When exact reconciliation fails, it clearly offers return to the original source and the ordinary supported installation route. It never invents component compatibility or a BOM.

### Local projects and privacy

Named projects use `localStorage['apparition.projects.v1']`. Only explicit Save, Rename, Duplicate or Delete writes persistent projects. The store limits 25 entries, validates restored records and handles malformed data without silently overwriting it. Explicit Clear invalid saved data is available; delete needs a selected existing entry. New/reset creates an unsaved circuit and leaves saved entries alone. Storage-denied errors appear in the status text. There is no account, authentication, backend write, telemetry or cloud sync.

In-session handoffs use a random `wp` context token referencing `sessionStorage`, retaining the name and safe extension data within that tab. Circuit edits can update this transient working context; they do not create permanent saved projects. Other browsers do not receive this local context. A copied share link has no context token, name, extensions, customer or account data. `ap` carries only `{version,electronics}`, alongside the legacy `sf` projection. Links are deterministic, versioned, bounded, validated and have no server storage or shortening service. Copy has a selectable text fallback when the clipboard API is unavailable. Existing `sf`, `sr`, `g` and Kit Definition links remain valid.

Project controls are an optional disclosure in Forge and Generator. Restoring from Generator opens the electrical authority in Forge. Returning between Circuit Lab and Signal Lab reuses the same instance. No tool is required to understand every field. Unsupported transient graph views, frozen comparisons and bench checkboxes are local to their established consumers, not permanent project records.

## Source-of-truth boundaries and durable principles

| Domain | Authority |
|---|---|
| Circuit topology and components | Existing shared Generator circuit factory |
| Electrical response | `electronics/response`, equations unchanged |
| Current compatible configuration | Shared `sf` state composed by the project envelope |
| Editorial knowledge and relationships | Knowledge registry, static article content |
| Physical wiring/build reference | Wiring Generator |
| Detailed network exploration | Treble Bleed Designer |
| Purchasable choices/BOM | Kit Definition / Kit Builder |
| Product, stock, price | Existing catalogue/store |
| Admin, orders, fulfilment | Existing backend, untouched |

Principle 01: Knowledge stays accessible. Fundamental understanding, baseline interactive tools and standard wiring knowledge remain suitable for an accessible/free experience. Future monetisation should favour advanced capability, convenience, persistence, comparison and professional workflow. No billing, gates or accounts are introduced.

Principle 02: Configure the actual instrument. Families are starting templates, not immutable equations such as “Strat = SSS + 1V2T”. Future validated adapters should represent pickup slots, selectors, controls and assignments independently, in controlled increments. Today's support remains explicitly bounded.

## Future systems, intentionally not implemented

Workshop may compose Customer → Instrument → Project → Electronics → Diagram → Build sheet → BOM → Service record. Customer/account identity belongs in a separate private domain, never the shared URL or core electrical state. Cloud persistence will need its own authorization, privacy and schema migration contracts.

Guitar Builder may compose two domains: physical instrument/CAD geometry and this compatible electronics authority. Body/neck/scale/fret/material/hardware routing data must not become another electrical model. No CAD, Fusion 360, CNC, CAM or manufacturing work is implemented.

Signal Forge V3 may add validated coil-level and switching adapters, split/partial split, series/parallel, phase and coupled Both analysis. Future Tele/Strat/PRS templates must expand incrementally over that validated core. None of these electrical behaviours, new manufacturer measurements, acoustic modelling, audio synthesis, psychoacoustics, accounts, subscriptions, Workshop, CMS, course progress, external search, marketplace automation or External Orders extensions are implemented.

## Verification and bench output

Focused fixture tests cover registry routes and local links, contextual examples, local store operations, schema/URL validation, private-field exclusion, session continuity, compatibility handling, deterministic explanations, real tool DOM handoffs, search, semantic controls and responsive contracts at 320/390/768/1400 px. The legacy product source-contract assertion now recognizes the established shared `kitHandoff` authority. The homepage regression pins the accepted preview bytes rather than requiring the newer Generator export to equal that earlier visual checkpoint; no preview asset or renderer is changed. Existing tool, kit, product and homepage regressions apply only to touched boundaries. No production orders or inventory tests are made.

Existing Generator V2 browser print already provides circuit identity, values, connection list, conductor mapping and notes while opening the required disclosures and preserving bench checkboxes. It is retained, not replaced with PDF infrastructure. New optional project/help controls are hidden in print; configuration and diagram ownership remain unchanged.

Optional capability deferred: committing arbitrary Designer network edits back into the physical project. Designer may represent values outside the Generator's supported network choices; preserving its source snapshot is safer than inventing topology compatibility. Share links intentionally omit local extension data and names. Unknown safe extensions survive local/session continuity, not public sharing.

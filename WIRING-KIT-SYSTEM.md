# Wiring kit system

This extends the existing static site. No backend, payments or new dependencies.

- `dist/wiring-kits/kit-data.mjs`: central kit options, factual descriptions and kit selling prices. Prices are integer pence. The detailed brief sets the Epiphone jack to 500 and matching to 999, overriding typos in its conceptual example.
- `dist/les-paul-kits/config.mjs`: normalization, legacy configuration migration, complete specification, pricing breakdown, versioned kit record and guided URL handoff.
- `dist/les-paul-kits/fields.mjs`: existing builder controls rendered from the same definitions.
- `dist/wiring-kits/help-me-choose/recommend.mjs`: recommendation rules, unsupported-layout checks and fitment notes. The questionnaire is on a separate route.
- `dist/components/catalogue.mjs`: individual component retail prices. Never import this into the kit data or kit calculator.

Kit pricing is base plus selected adjustments. Pot manufacturer and shaft adjustments apply once to the four-pot kit. Capacitor adjustments apply per capacitor and are summed for the required pair. Treble bleed adjustments apply once to both volume controls. Jack, selector and matching adjustments apply once per kit. All current tone capacitor choices have no surcharge because none was supplied.

Old Alpha kit selections normalize to the currently available CTS option. Existing numeric capacitor values migrate to current capacitor IDs. Old 50s treble bleeds normalize to none. Current kit prices are recalculated for the planning basket, not treated as historical orders. Each configured kit remains one basket product, with normalized configuration plus a versioned record suitable for later adaptation into order/build/QC records.

Unknown premium network component values are not invented: their SVG uses a two-terminal network module. The selected hardware is labelled on the schematic; unselected hardware is explicitly not supplied.

For future kits, add a definition to the registry and provide the appropriate controls/diagram/recommendation rules. Do not route unsupported guitar layouts into the Les Paul builder automatically. No inventory or ordering backend is implied.

Run `node tests/kit-system.mjs` for price, normalization, recommendation transfer, diagram-state and configured-basket regression checks.

Builder and basket links open `/wiring-kits/specification/` with the same normalized configuration as guided links. This page is a planning printout, not an order, invoice or QC record. Link recipients still need access to the site. The fitment checklist is a transient page aid and is not persisted as QC data.

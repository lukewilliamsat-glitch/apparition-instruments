# COMMAND 01 data contract and reconciliation
## Authoritative source inspected
Production reference: `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`.
- [Existing repository row mapping](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/backend/component-data.mjs), blob `a0bbf8f3c4a2301b8650ab7f95f813d925ffec8a`.
- [Admin catalogue vocabulary](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/admin/data.mjs), blob `d4f2edaa3afb26295dbad0f4cfc2db0973efe092`.
- [Shared application helpers](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/admin/application.mjs), blob `36854932761edb0259a450d0e16947dd33da38a1`.
- [COMMAND discovery](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/4e2bf850cf2705447f051c8a75d84c0bb5ace678/docs/command/COMMAND_DISCOVERY_HANDOVER.md).

The production row mapper combines catalogue components, inventory and internal data. COMMAND does **not** call that image-bearing three-table list or import its configuration/seed graph. It defines an explicit read-only projection suitable for later reviewed authenticated integration. Existing full-list consumers, exports, assemblies, order pickers, options, image editing and stock validation are unchanged.

## Fixture transport
`createWorkbench({transport,onChange})` requires:
- `kind: 'command01-synthetic'`
- `list({signal}) -> Promise<Summary[]>`
- `detail(id,{signal}) -> Promise<Detail>`

There is no default fetch, URL, credential, public catalogue substitution or backend fallback. The marker is a fixture boundary, **not** authentication or server-side authorisation. The sole entry point explicitly injects a synthetic transport outside production dist. `window.commandFixture` is an acceptance-only handle to that in-memory fixture/controller; it cannot perform backend operations.

Future authenticated transport must be separately authorised, use existing Admin membership/transport/RLS enforcement, expose an explicit least-data projection and bind details to a genuine server revision. The fictional `fixture-1` revision is not production concurrency control.

## Fields
| Read model | Existing meaning | Validation / handling |
|---|---|---|
| id, sku, name | Stable component identity and display | Nonempty identity; ID allowlist; duplicate IDs reject the entire response |
| category | Component classification | potentiometers, capacitors, treble-bleeds, switches, jacks, other |
| manufacturer | Existing manufacturer text | Optional; “Not supplied” fallback |
| active | Existing active flag | Boolean; not a draft/published lifecycle |
| individually, inKits | Individual and assembly eligibility | Boolean; does not override checkout |
| salePrice | Individual selling price, mapped from sale_price | Integer GBP pence or explicit unknown; not evidence of a promotional discount |
| kitPrice, kitPriceQuantity | Existing kit-specific pricing | Integer pence; positive whole quantity when supplied; not multibuy tiers |
| stock, stockUnit | Inventory quantity/unit | Nonnegative whole quantity or unknown; not reservations/reorder authority |
| technicalSpecs | Explicit searchable technical fields | resistance, taper, tolerance, capacitance, voltage, shaft, mounting, connection, material |
| revision | Synthetic freshness binding | Must match the current summary before details are accepted |
| imageState | Summary image load state | Always unloaded; no image value or data URI |
| description, specs, productSpecifications | Detail content | Plain text only; optional |
| imageInfo | Explicit detail image metadata | Validated below; no URL or image bytes |

`internalUnitCost`, arbitrary private fields and embedded image payloads are excluded. Normalisation creates a new object from an allowlist. Prices, stock and image identities must never be used to build a writable payload from this read model.

## Pricing reconciliation
The requested regular/sale distinction is not supported by the current verified source contract. Showing a fictional regular/promotional pair would be misleading. The interface therefore labels `salePrice` as **selling price**, shows actual kit fields separately and explains the limitation. Promotional pricing, vouchers and quantity discounts are future owner decisions.

Wiring kits themselves are a separate assembly contract; the component category list is not extended with invented kit categories.

## Image states
- **unloaded**: no original image data/metadata loaded; omitted/null imageInfo normalises here.
- **absent**: the fixture explicitly records no assigned image.
- **unavailable**: the fixture explicitly reports inaccessible image metadata.
- **available**: metadata only; allowed MIME, positive byte/dimension integers and 64 lowercase hex SHA-256. Fixture hashes are clearly fictional, not verified production assets.
- **removed**: requires explicit synthetic removal provenance. Never inferred from an omitted or null image.

No image URL reaches the read model or DOM. CSP denies images, connections, frames and workers. Existing authenticated image replacement/deletion, GIGA static-image manifests, archive retention and adapter state are not modified or duplicated.

## Async invariants
List generations protect summary success/error handling; AbortSignal is cooperative only. Generation checks remain effective when a fixture ignores abort. Detail generations bind results/errors to selected ID, current revision and mounted lifecycle. Refresh invalidates pending details, retains a valid stable selection and reloads details only when the selected revision changes. Deletion clears selection without substituting the next row. Filters are local, so no filter action can initiate a transport read.

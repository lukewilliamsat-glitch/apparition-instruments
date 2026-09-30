# Wiring Generator V2: build-ready architecture

The workshop UI consumes the existing circuit graph. `build-guide.mjs` projects external connections, terminal contracts, closed selector contacts, shared physical wiring and manufacturer conductor roles into the guide, connection list, parts and terminal inspection. It never stamps new edges, guesses switch pinouts or creates product mappings.

## Authority and responsibilities

Circuit Lab explains physical/electrical topology; Signal Lab models supported response; Generator provides practical endpoints, connection intent and build requirements. Shared `sf` state and existing `g` URLs retain compatible topology and analysis state for return. Independent conductor selectors update the same pickupProfiles read by the renderer and build guide. Existing verified Duncan, DiMarzio, Gibson, Warman and Tonerider conventions are reused. Generic identifies coil functions; unresolved Fender/PRS/Bare Knuckle choices retain generic conductors and are explicitly labelled. No new manufacturer data is invented. Single coils use functional hot/ground identification.

Existing component geometry and terminal contracts remain shared, including rear-view pot orientation, wiper, switch contacts, jack tip/sleeve and supported push/pull layouts. Terminal inspection lists actual adjacent wires and closed contacts. Row selection highlights one physical connection; terminal selection traces the existing conductive net. Crossings never become guide junctions. Generator crossing-marker presentation inherits its owning wire colour/state through an optional renderer callback; Circuit Lab's default marker API and electrical router are unchanged.

## Guide and parts

Every external graph edge appears exactly once in the derived connection list and sequence. Physical intent distinguishes insulated local series joins, casing solder joints and shared terminals. The sequence groups actual pickup leads, controls, bleeds, tones, selector/output and ground connections. Closed switch contacts are identified separately and are not counted as wires to solder. No unconnected terminal is silently grounded.

Parts group actual components by type, role, value and existing/supplied status, preserving exact quantities. Wire/consumable requirements are identified without invented lengths/quantities. Commercial build handoff still resolves existing Kit Definition authority and rejects unsupported electrical values; no SKUs/BOM or inventory logic are introduced.

Checklist completion is in-memory presentation state only. Configuration changes/reset clear it; viewport resizing, zoom and print preserve it. It is not a continuity test or fulfilment state. Analysis-only cable/load/RLC assumptions do not change physical wiring. Malformed shared-state links retain the established safe default behaviour.

## Print and SVG

Browser print uses A4 portrait, a current circuit identity, complete unfiltered diagram, readable legend, guide, connection list and parts. Site navigation/actions and interactive controls are hidden. Critical diagram/rows avoid internal page breaks. Print temporarily opens legend notes and restores their prior state, diagram selection/filter and zoom afterwards. Pagination remains browser-controlled and requires real-device acceptance.

Save SVG remains vector output from the existing current-circuit renderer, omitting interactive hit targets and preserving labels, wires, conductor colours, crossings and real junctions. No rasterisation or PDF service is added.

Focused tests cover topology/list/guide/parts parity, existing manufacturer mappings and unresolved fallback, terminal/contact semantics, wiring styles/bleeds, supported switch layouts, ownership of crossing markers, SVG/export, shared import/return/reset, local checklist and print restoration, A4/mobile contracts, electrical and Kit Definition regressions. Rendered desktop/mobile/print QA is unavailable when no existing browser executable is installed.

Deferred: V3 and new response physics, unverified mappings, wire lengths, physical cavity routes, solder temperature/process recipes, PCB/CAD/PDF infrastructure, accounts/cloud/collaboration, fulfilment, External Orders, unrelated Admin/store and Guitar Builder/CNC work.

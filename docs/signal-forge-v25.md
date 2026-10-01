# Signal Forge V2.5 instrument foundation

Instrument identity and explicit pickup/control/switch relationships compose the existing electrical, topology, Kit Definition and project authorities. The model contains no electrical equations or manufacturer measurements. Configuration describes an instrument; capability validation separately determines what a consumer can represent.

## Ownership and versions

- `electronics/instrument/configuration.mjs`: instrument schema v1, generic references, deterministic validation, structural capability checks, privacy allowlist and legacy description migration.
- `electronics/instrument/circuit.mjs`: adapter to the existing Wiring Engine. Component values derive from instrument controls; graph/contact generation stays in Generator.
- `electronics/state/circuit-state.mjs`: legacy circuit links v1 remain unchanged. New instrument links use circuit envelope v2; instrument v1 is authoritative and derived fields are recomputed on import.
- `electronics/state/project.mjs`: existing project envelope/storage v1 composes either circuit version. No second save system or cloud service. Existing CRUD and bounded extension checks remain.
- Generator pot/cap/bleed options and response assumption presets remain catalogues of record. Kit Definition retains physical product/BOM ownership. No arbitrary BOM generation.
- `response/circuit.mjs`: extraction adapts existing actual volume/tone components for the selected supported instrument segment. Engine, circuit equations, sample calculation, comparison and graph infrastructure are unchanged.

## Reference capabilities

| Generic editable starting point | Actual relationships | Wiring | Signal Lab |
| --- | --- | --- | --- |
| Les Paul / SG HH 2V2T, toggle | Independent neck/bridge volume and tone | Existing Modern/50s/60s | Modern neck or bridge only |
| Tele SS 1V1T, blade | Master volume and master tone | Existing standard three-way | Neck or bridge, generic single-coil assumptions |
| Strat SSS 1V2T, five-way blade | Master volume, neck tone and middle tone; shared cap; bridge has no tone | Existing conventional SSS | Neck only; middle, bridge without tone, and combined selections explicitly unavailable |
| Superstrat HSS 1V2T, five-way blade | Master volume, neck/middle tones, shared cap, full bridge humbucker without tone | Description only | Explicitly unavailable |
| PRS-style HH 1V1T, three-way toggle | Master volume/tone, full passive humbuckers | Description only | Explicitly unavailable |

PRS-style reference does not reuse the existing five-way superswitch conversion. HSS does not reuse the SSS graph. Unsupported arrangements return no Generator/Designer/Kit handoff, retain their editable description and local project state, and show a capability reason. Independent LP volume bleeds that differ are describable but cannot use the current Generator, which applies one bleed choice to both volumes. The editor does not imply that unavailable capabilities work.

The schema represents S, SS, SSS, H, HH, HSS and HSH, plus mixed two-position layouts needed to preserve legacy illustrative sources. It represents 1V, 1V1T, 1V2T, 2V1T and 2V2T with explicit assignments. These broader descriptions are not automatically modelled circuits. Validation checks versions, positions/types/assumptions, duplicates, controls, value boundaries, capacitor sharing, selector family/selection and bounded safe extensions. Optional unknown fields are omitted safely. Modification identities can describe future full/split/partial/series/parallel/phase concepts but non-full modes fail capability checks.

## Workflow

The Instrument disclosure lives inside the established Configure drawer. It shows five reference starting points, an optional local label, actual relationships, independently editable existing pot/cap values, bleed options and model/load assumptions. Existing Les Paul component controls remain usable. New reference selection resets incompatible values and frozen response history. Reset this reference restores its defaults; local New/reset also clears the unsaved project. Workspace switches and presentation resize do not own or mutate configuration.

Generator receives only fully supported topology and actual component values with source instrument metadata; edits to selector, caps, wiring and bleed are captured back into the shared instrument envelope. Designer receives only a supported selected response segment with explicit source instrument/volume relationships and retains its original source snapshot. Experimental Designer edits do not invent changes to the physical instrument. Kit handoff is LP only and still validates matching physical component choices; no Tele/Strat/PRS/HSS BOM is invented.

Public `ap` and `sf` links are deterministic and contain only public configuration: instrument labels, instrument extensions, project names, context IDs, kit selections and project notes are excluded. Same-tab handoffs retain local labels/notes via the existing random `wp` session token. Local projects preserve the complete instrument and tool state only after explicit save. Nothing is sent to Supabase or analytics by this foundation. Legacy illustrative source presets remain distinct from the physical HH drawing; selecting a single-coil assumption in old state does not rewrite the physical pickup layout. Legacy state v1 remains intact and is described minimally from its actual configuration and generic assumptions, without manufacturer identity.

Hub changes are limited to contextual architecture actions in pots, selectors and wiring guides. Guides remain educational and Hub V2 is not redesigned. Reference data is generated by the shared model, not another editorial preset table.

## Future boundaries and deferrals

Workshop customer/jobs/history/BOM/notes/templates attach to the project domain later, without replacing electronics. Guitar Builder body/neck/scale/frets/woods/hardware/routes/finish attach as separate domains to instrument identity. Manufacturing geometry and CAD/CNC remain separate from electrical state. Core understanding, guides and supported standard analysis remain accessible, with no account, subscription or paid gate.

Deferred: coupled pickups, manufacturer measured/named pickups, split/partial split/series/parallel/phase response, active/P90/Filter'Tron models, four-way or Nashville Tele, advanced Strat/super switches, proprietary PRS switching, arbitrary control rewiring, missing HSS/three-way PRS diagrams, amplifier/speaker/acoustic/psychoacoustic/audio models, cloud/accounts/subscriptions, Workshop business features, physical Guitar Builder and CAD/CNC. Those limitations are explicit rather than approximated.

Responsive/DOM contracts exercise 320, 390, 768 and 1400 px, labelled native controls, closed progressive disclosure, state retention and model limits. No browser executable is available; rendered desktop/mobile acceptance is deferred to Luke. No browser infrastructure installed. Admin, commerce, inventory, orders, database functions and email are untouched.

Verification note: automatic review blocked output retrieval for the old combined DOM process because it flagged possible Supabase network access. That result is not claimed. Network-disabled project/integration fixtures and the new instrument DOM fixtures subsequently passed. No Supabase tools or production data operations were used.

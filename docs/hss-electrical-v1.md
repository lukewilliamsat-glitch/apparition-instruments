# HSS electrical architecture V1

Supported: Strat/Superstrat HSS, neck/middle single coils and bridge full-series humbucker, standard two-pole five-way blade, Modern wiring, 1V2T or 1V1T. Instrument schema remains version 1; circuit envelope version 2 and project version 1 remain unchanged. Existing envelopes load without migration. Historical descriptive HSS assignments are retained; unsupported assignments do not silently become the new graph.

| Position | Active pickups | 1V2T tone loading |
| --- | --- | --- |
| 1 | Bridge full humbucker | Tone 2 |
| 2 | Bridge full humbucker + middle, parallel | Tone 2 |
| 3 | Middle | Tone 2 |
| 4 | Middle + neck, parallel | Tone 1 and Tone 2 |
| 5 | Neck | Tone 1 |

Master volume applies everywhere. In 1V2T, Tone 1 targets neck and Tone 2 targets middle plus bridge; both use one shared capacitor, as explicitly represented by the capacitor group. Pole A selects pickups; pole B selects tone branches. In 1V1T a real master tone branch loads the common volume input, and the second tone pot/branch is absent.

`control-assignments.mjs` supplies reusable pickup-target contracts consumed by configuration and the shared five-way circuit builder. Arbitrary assignment editing is not enabled. Normalisation and matching validate the complete arrangement; family names and artwork cannot establish electrical support.

The bridge uses the existing four-conductor humbucker terminals: hot, insulated series link A/B, coil return and separate shield. The series link never connects to ground. The pickup source used for response is an illustrative aggregate R/L/C full humbucker, not an individual-coil or magnetic model. Future coil modifiers must extend validated terminals/contact sets and capabilities, rather than change artwork or reinterpret stored `full` mode.

| Capability | V1 boundary |
| --- | --- |
| Configuration, graph, Build/Trace/Explain, Generator | Both layouts, all five positions |
| Signal Lab / Designer | Single pickup positions 1, 3, 5 using existing equations |
| Combined response | Positions 2/4 explicitly unavailable: no coupled pickup solver |
| Kit Builder | Unavailable: no exact HSS Kit Definition |
| Projects / sharing | Existing instrument controls/targets/values persisted; public sharing removes labels and extensions |
| Advanced switching | Auto/manual split, coil selection, DPDT, push/pull, series/parallel, phase, superswitch, S-1 and manufacturer colours withheld |

Forge and Generator share the same graph, contacts, pickup artwork and state adapters. No HSS renderer or separate state system. Legacy Tele, SSS and HH electrical relationships remain unchanged. Unknown advanced-selector modifiers fail validation; known descriptive pickup modifications withhold graph/handoffs instead of substituting standard HSS.

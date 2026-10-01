# Control Console V2 and Switch Visual System V2

Configure describes hardware and values. Circuit State operates installed selectors and switches. Explore applies Build, Trace or Explain to that same graph.

## Console and state

Seven native disclosures show live hardware summaries: Guitar & Pickups, Controls, Selector, Switching, Values, Wiring and Advanced. Only one opens at a time; initial collapsed groups make the whole configuration scannable. A compact circuit identity and shared pickup glyphs stay visible. The workbench state console shows ordered selector buttons and one DOWN/FULL–UP/SPLIT pair per installed modifier. Private labels remain local.

Both tools call the same state-console presentation module. Tool callbacks update their configuration and reconstruct the authoritative graph. Accordion and zoom changes do not redraw the diagram or change electrical state. State controls use native buttons with pressed semantics; disclosures retain native keyboard operation, focus, text and expanded state. Responsive layout wraps controls without adding a nested Configure scroller. Motion is brief and disabled by reduced-motion preference.

## Switch presentation and routing

Three- and five-way blades share a solder-side metal frame, two wafer banks, common lugs and a contact-driven lever. Build displays the physical hardware without changing between selector positions. Trace/Explain show actual closed pairs; intermediate five-way positions contain both contacts per pole. Inspector maps project those same pairs, never a second truth table.

Push/pull artwork separates the pot, mechanical association and six-terminal DPDT housing. Pole A performs the split; Pole B is visibly unused even though its contacts still move. Build retains physical solder destinations and neutral conductor identities. Trace shows coil participation/shunting; Explain quietens unrelated components and teaches the selected state.

Routing protects component bodies and title regions, prioritises signal/switch paths, and uses short local DPDT-to-host casing returns. HSS reserves volume lug escape space before the attached switch and moves the second tone lower when present. This is placement only: terminal IDs and connectivity are unchanged. Ground/shield remain complete, with quieter Build weights and distinct patterns. Existing solder joints and crossover hops retain their graph semantics.

## LP/SG manual splits

Validated HH / 2V2T / three-way toggle configurations optionally install Neck Tone and/or Bridge Tone push/pulls. All four hardware combinations work. Each modifier keeps its device, actuator, host, target pickup, wiring function, position, series-ab topology and retained Coil A. Validation accepts only these two compatible associations; it does not enable arbitrary multiple modifiers.

The generic applicator adds neutral passive Coil A and Coil B elements and uses the existing DPDT contact primitive. DOWN leaves both coils in series; UP connects common AC to grounded A2, shunting Coil B. The tone pot retains its existing Modern, 50s or 60s connections. Selector and both push/pulls operate independently, including when one pickup is inactive.

Verification covers 12 dual-push/pull states per wiring style: 36 for LP and 36 for SG. The complete hardware/style matrix contains 162 configurations across both families. HSS retains its 20-state manual-split matrix. Signal/switch routes in the HSS and dual-LP stress fixtures avoid foreign protected component/title regions.

## Platform boundaries

State additions preserve existing instrument, circuit and project versions. Raw Generator state, Forge handoffs, local save/load and public sharing reconstruct the same switching records. Legacy baseline circuits remain equivalent. Unavailable kit hardware is withheld from handoffs rather than inferred from standard-pot kits.

Supported full-humbucker response remains unchanged. Selected split pickups have no validated coil R/L/C model, so response is unavailable. No aggregate values are divided and no equations are added. Coupled selections and previously unsupported wiring responses remain unavailable.

Switching hardware and wiring function remain separate properties. Future auto-split, series/parallel, phase, coil selection, multi-function DPDT, arbitrary modifiers and new selector families need separately validated functions/capabilities. None is enabled here. Rendered visual acceptance remains Luke's responsibility.

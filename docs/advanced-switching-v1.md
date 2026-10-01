# Advanced switching foundation V1

**Supported proof:** optional HSS bridge manual coil split, 1V2T and 1V1T, master-volume push/pull host. Standard HSS remains available without the modifier. Existing instrument/circuit/project versions remain unchanged; no migration.

## Device and actuator

`switching/devices.mjs` owns generic DPDT terminal identities and contact truth. Each pole has `1`, `C`, `2`; DOWN closes AC–A1 and BC–B1, UP closes AC–A2 and BC–B2. These are device states, not inherent split meanings. The pot retains its own resistive terminals. A separate DPDT component has a mechanical host association; placement/actuator artwork owns no electrical contacts.

The current proof uses Pole A only. The joined humbucker series junction runs to AC; A2 is grounded. A1 and the entire B pole have no external conductors. Both B contact pairs still operate independently as required by the primitive.

## Coils and split

Two passive winding elements express the bridge topology:

- Coil A: `bridgePickup.hot` → `bridgePickup.linkA`.
- Coil B: `bridgePickup.linkB` → `bridgePickup.ground`.
- External series join: `linkA` ↔ `linkB`; separate shield bonds to ground.

DOWN leaves the series junction ungrounded: both windings participate in series. UP grounds the junction via AC–A2, shunting Coil B and retaining Coil A. A/B are neutral identities, with no inner/outer or magnetic-polarity claim.

`coils.mjs` contracts actual wires/contacts and finds paths through passive winding elements. Windings never become conductive shorts in `net()`. Participation, shunting and contribution to the selected output derive from connectivity, not a split flag. Trace overlays and explanations consume this result.

Five-way selection and DPDT state are independent. P1/P2 select bridge full-series or Coil A according to manual state. P3/P4/P5 never reconnect the bridge merely because the push/pull changes. Tone assignments remain neck / middle+bridge in 1V2T, and master tone in 1V1T.

## State and boundaries

The additive `instrument.switching` array contains one validated record: device ID/type, push/pull actuator, physical host, target bridge pickup, coil-split wiring function, DOWN/UP position, `series-ab` topology and retained Coil A. Public sharing retains this electrical record and strips private labels/extensions. Generator configuration and return navigation carry the same record. Legacy states without switching retain their electrical relationships.

The shared modifier applicator associates the DPDT with a host pot; changing the allowed association later requires validation/presentation placement, not duplicated DPDT contact truth. The public release validates master volume only.

Split bridge response is unavailable: aggregate humbucker R/L/C values are not divided into guessed coil values. Full bridge response remains supported when DOWN; single middle/neck responses remain supported regardless of the inactive bridge switch. Combined pickup responses remain unavailable.

Reject unsuitable coil access, single-coil targets, unknown functions/devices, multiple modifiers, auto-split, series/parallel, phase, custom coil choice, and manufacturer conductor assumptions. Legacy descriptive unsupported pickup modifications continue withholding graph/handoffs.

Future auto-split can compose selector-controlled contacts with the same coil terminals. Series/parallel or phase requires separately validated wiring/contact functions. Multiple devices and new actuators require explicit capability/schema validation. None is enabled in V1.

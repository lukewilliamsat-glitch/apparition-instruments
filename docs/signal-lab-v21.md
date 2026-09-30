# Signal Lab V2.1

The existing fixed ideal-source voltage transfer solver and topology are unchanged. Response values are not acoustic SPL or perceived loudness.

Shared `assumptions.mjs` defines bounded component options and illustrative lumped pickup R/L/C presets. These are electrical assumptions, not measured or manufacturer data. The solver represents series source resistance and inductance, shunt pickup capacitance, modern tone loading, resistive audio-taper pots, cable capacitance and input resistance. It excludes magnetic/string dynamics, frequency-dependent pickup losses, coupling, phase, splits, acoustic and amplifier/speaker response.

Forge circuit state holds per-channel pickup/pot assumptions and common cable/input loading; rebuilding preserves these and control positions. Physical component values reflect selected pots. Commercial kit handoff is hidden for assumptions/caps the builder cannot faithfully represent. Generic single-coil assumptions change only the electrical source model, not the humbucker physical diagram.

Frozen references retain immutable samples and all numerical assumptions. Metadata includes channel, controls, bleed, capacitor, pots, cable, input and R/L/C. The shared comparison identifies changed values and derives causes. Largest difference remains sampled, with existing negligible thresholds and floor suppression. No comparison is an audibility claim.

Presentation follows response, compare, inspect, adjust and explain. Native selects, existing touch/pointer/keyboard graph and persistent updates remain. Generic presets and component values are session state, not account persistence.

Focused tests: response-lab-v1, signal-lab-v2-core, signal-lab-v2-dom, signal-lab-v21, p12a-circuit-forge. Rendered QA may be skipped if the existing browser executable is unavailable.

Deferred: coupled Both, phase/split/series/parallel pickup physics, measured/manufacturer data, Q UI, amplifier/speaker/acoustic/audio/psychoacoustic models, exports, account persistence, V3 and unrelated store/Admin work.

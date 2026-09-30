# Signal Lab V2 Core

Signal Lab continues to adapt the authoritative Forge circuit to the existing shared single-pickup response engine. No electrical solver equations, Circuit Lab topology, shared wiring renderer, homepage reveal, entry sequence, business data or external orders were changed.

## Comparisons

- Live only displays the current response with no comparison curve. A previously saved frozen reference remains visibly identified as session state but is not plotted.
- Same-volume A/B compares with the same channel, Volume, Tone, tone capacitor, pot values, source, cable and input load, with only the treble bleed removed. It is the default. If no bleed is fitted the two curves agree, and the explanation says so.
- Frozen reference captures an immutable copy of the current sampled curve, electrical state and pickup context. Subsequent changes do not recalculate it. Replace and Clear are explicit; Circuit Lab/Signal Lab switching, pickup switching and responsive layout changes preserve it. A full document reload clears it. Both and unsupported wiring states retain its visible metadata but do not plot an unsupported live curve.

Neck and Bridge retain independent Volume, Tone and tone capacitor state under the established Forge architecture. Both remains unsupported until there is a coupled pickup model. Both channels use the same disclosed generic pickup source, not manufacturer-specific electrical parameters.

## Shared analysis

`dist/electronics/response/analysis.mjs` owns comparison composition, immutable capture, model-state differences, magnitude categories, strongest sampled divergence, logarithmic frequency mapping and sampled response inspection. Forge adapts circuit values and components; UI consumes analysis results.

The comparison marker selects the maximum absolute current-minus-reference difference among the 201 logarithmically spaced samples across 20 Hz–20 kHz. It is not a continuous-frequency optimization. Frozen curves are inspected by interpolation of dB on the logarithmic frequency axis. Readouts report current, reference and signed difference. The marker is suppressed for differences below 0.1 dB or when the result is clipped at the existing −100 dB display floor. Clipped differences are not presented as exact output ratios. Volume 0 is explicitly described as muted.

Magnitude categories describe maximum sampled electrical separation only:

| Absolute difference | Category |
|---|---|
| < 0.1 dB | Negligible |
| 0.1 to < 1 dB | Subtle |
| 1 to < 6 dB | Moderate |
| ≥ 6 dB | Strong |

These conservative display categories are not audibility thresholds and do not predict acoustic or perceived guitar tone. The explanation derives what/where/why from the actual model state; full-volume treble bleed bypass, identical no-bleed comparisons, changed tone loading and generic pickup limitations have explicit handling.

## Interaction and presentation

Graph paths, crosshair and readout update in place on slider input; SVG grids, listeners and the assumptions list are retained. A layout breakpoint recreates only the graph geometry and retains the inspected frequency. Pointer hover and horizontal touch dragging inspect the graph. A labelled native frequency slider provides keyboard and touch access to the same shared mapping. SVG letterboxing is accounted for in short landscape layouts. Solid/circle and dashed/square identities supplement text labels; the maximum-difference marker is a diamond.

Signal Lab includes quick treble-bleed and selected-pickup tone-capacitor controls populated from the existing Configure options. These delegate changes through the established Forge form and circuit state rather than owning a second circuit configuration.

Compact assumptions disclose generic pickup R/L/C, input load, cable capacitance, pot values, audio taper, Modern tone placement, frequency range, pickup interaction and acoustic limitations. Layout changes are scoped to Signal Lab and preserve the accepted mobile workbench/Inspector shell.

## Verification

Focused tests: `signal-lab-v2-core.mjs`, `signal-lab-v2-dom.mjs` and `response-lab-v1.mjs`. They cover numerical preset parity, all supported tone capacitors and channels, full/reduced/muted Volume, same-position baselines, immutable references, replace/clear, generated explanations, magnitude boundaries, logarithmic inspection, interpolation, pointer/touch mapping, persistent DOM, model controls, mobile breakpoint/orientation continuity and Inspector availability. DOM tests check responsive contracts and state, not browser pixel geometry.

Relevant milestone regression additionally covers the Treble Bleed Designer, Circuit Lab, shared electronics, wiring renderer/router, entry readiness, workbench presentation and homepage reveal compatibility. No business-data suites or database mutations are needed.

Deferred: measured pickup models, coupled Both response, phase/split/series/parallel response modelling, advanced resonance/Q UI, cable libraries, amplifiers/speakers/acoustics, sound synthesis/playback, exports and account persistence.

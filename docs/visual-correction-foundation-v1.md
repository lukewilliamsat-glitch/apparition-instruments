# Visual correction foundation V1

Starting authority: c7d9b7c5576c6eafec93e9fbaa8b302680888cd1.
Recovery: visual-correction-recovery at that same commit.

## Educational circuit authority

The Modern Tele graph in wiring-generator/model.mjs and layouts.mjs is the authority. Pot terminal numbering is unchanged: lug 1 is ground/CCW, lug 2 is wiper/output, lug 3 is signal input/CW.

Main signal: pickup → selector → volume lug 3 → volume wiper/lug 2 → output jack TIP.

Tone loading branch: volume signal-input lug 3 → 0.047 µF capacitor → tone lug 2 → tone resistance → tone lug 1 → ground. Tone is a loading branch, never a mandatory series stage. Jack SLEEVE remains a distinct ground terminal.

The landing generator obtains component positions and terminal offsets from the shared authoritative component contract. Its tone line starts at the actual lug-3 anchor. The output approaches TIP from outside the socket body. A separate ground symbol starts at SLEEVE. Negative fixtures reject tone feeds from lug 1 or lug 2, signal-to-sleeve, and grounding the signal input.

## Shared visual correction

Rear-view pots retain casing, shaft/bushing, three solder lugs and all four electrical anchors. Remove the distracting central pad illustration; casing solder remains a technical renderer marker. Move resistance/taper outside the casing in technical views. Editorial pots and jacks omit internal text; pot fold marks are technical-only. Jack TIP spring has explicit unfilled, rounded strokes in the shared layer, preventing browser-default black fill in educational views. Socket, barrel/thread, spring and two terminal anchors remain unchanged.

Shared editorial diagram paint gives primary signal Apparition gold and tone/ground restrained neutrals. Explicit terminal, junction, solder and wire-clear paint prevents inherited electrical-state colours. Whole components stay visible in editorial filtered previews. Technical wire colour semantics, graph, contact pairs, routing and terminal identity remain unchanged. Splash choreography and shared state/specification markers remain; secondary component opacity is raised to retain complete-circuit context.

Propagation: homepage and Interactive Tools conceptual diagrams use the landing generator; homepage/Forge landing static previews use the shared renderer in editorial mode; Generator and Forge engineering diagrams retain the technical default; Hub illustrations use the shared editorial glyphs and stylesheet. Existing blade geometry and mechanism are unchanged.

## Acceptance and scope

Structural fixtures cover visible endpoints, branch origin, authoritative grounding, negative graph mutations, modes and anchor identity. Existing configuration, electrical baseline, Guided Build, responsive/accessibility DOM and presentation regressions protect the functional work.

The bounded rendered pot/jack check was attempted with the existing browser, but its security policy blocked local HTTP and data-URL previews. No browser infrastructure was installed and no workaround was attempted. Rendered acceptance remains PENDING LUKE for desktop/mobile, landing path, splash, pot/jack, Generator, Forge and Hub. Automated checks do not establish rendered visual quality.

P2 component/product-page foundation is DEFERRED to preserve the limited correction budget. No storefront behaviour, commerce/Admin, backend, Supabase, production data, equations, schema, URLs or migrations are changed. No new dependencies, requests or raster assets.

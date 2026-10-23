# NOCTURNE responsive and accessibility-oriented acceptance

**PASS for the tested Chrome fixture.** Source `1bbe60fd216a412eed7349c8d79acdd50a94931e`; [CI 39930046308](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39930046308). No comprehensive accessibility certification is claimed.

| Viewport width | Sections / fields / actions / review / horizontal overflow |
| ---: | --- |
| 390px | PASS — native section chooser, single-column fields, phone action tray |
| 768px | PASS — full-width editor, catalogue shortcut, native fields and tabs |
| 1024px | PASS — full-width editor and deliberate catalogue context |
| 1440px | PASS — adjacent bounded catalogue and editor, visible navigation |
| 1920px | PASS — wider catalogue/editor split and retained controls |

Each width exercises all six sections, descriptive/specification/pricing/eligibility edits, a long description, native review, unobscured action hit tests, Escape and focus restoration. The document remains within its viewport. The phone catalogue shortcut focuses search and retains its draft, and filtering adds no table reads. Native tab Arrow/Home navigation, visible keyboard focus, label/instruction associations, cross-section error-summary navigation and discard-dialog Escape pass.

At 390px and 1024px the self-origin test stylesheet doubles existing measured font sizes and sets the root to 200% so subsequently created comparison text also scales. Long names/SKUs and a long unbroken description remain bounded; review and confirm actions remain reachable. This is deterministic text enlargement, not a claim of native browser zoom emulation. Reduced-motion preference is emulated; computed transitions are zero and presentation scrolling is immediate. Live-summary attributes are checked; spoken screen-reader announcements are not independently tested.

## Fictional workload observations

Each size uses the actual inherited IRONCLAD fixture created with that size. Search applies eight successive local filter values; the selected stable ID survives. These are single synthetic hosted-runner samples, not production latency, billing or egress measurements.

| Fictional products | Eight-filter sequence ms | Extra catalogue reads while editing | Catalogue row mutations while editing |
| ---: | ---: | ---: | ---: |
| 14 | 6.7 | 0 | 0 |
| 100 | 32.8 | 0 | 0 |
| 500 | 133.3 | 0 | 0 |

Catalogue rows are not virtualised. Intentional changed filters rebuild their visible rows through the inherited keyed render guard; typing in the editor leaves those row nodes intact. No new polling or per-keystroke reads are introduced.

Remaining owner choices: supporting-text size versus density, phone native chooser versus visible tabs, fixed phone action tray, and the restrained brass balance. Retained drafts are in-memory for the page lifetime; no durable storage guarantee is added. Actual mobile hardware, touch/virtual-keyboard occlusion and assistive technology remain separate checks.

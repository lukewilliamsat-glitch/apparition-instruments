# Visual and information design findings

This review combines actual source with two genuine historical homepage captures. It is not a fresh render of every storefront screen. Evidence classes and source keys are in [EVIDENCE_INDEX.md](EVIDENCE_INDEX.md); implementation candidates and acceptance criteria are in [ROADMAP.md](ROADMAP.md).

## What already works

The 390/768 SPECTRE baseline captures show a recognisable Apparition wordmark, graphite foundation, cream typography, restrained brass emphasis and prominent purchase-discovery CTA. Guitar photography remains recognisable. The page feels like an independent guitar business; it does not need ornamental fantasy framing or universal skull decoration. Those captures use fallback fonts, not verified external font metrics.

Commercial product source already separates identity/purpose, price/availability/purchase, description, specifications, fitment, education and support. It uses definition lists, natural section headings and positive component-selection advice. The fallback is deliberately labelled specification-led selection. A product without a verified photo should keep that honest fallback rather than show an unrelated or generated component.

The technical tools retain their own diagrams and electrical colours. NOCTURNE's charcoal/brass approval is a consistency reference, not authority to apply Admin layout, density or styling to customer shopping.

## Grounded findings

| Finding | Evidence level / affected surface | Decision |
|---|---|---|
| Failure states are less mature than successful presentation | Source control flow: catalogue import precedes page catches; empty basket/checkout markup depends on modules. RAV01. | Prioritise a visible, accessible state before data startup. Keep ordering fail-closed; do not create a decorative “working” offline checkout. |
| Ordering reassurance contradicts itself | Exact FAQ source versus catalogue/checkout copy. RAV02. | Correct the content contract before broad visual redesign. Describe supported ordering separately from current availability. |
| Product facts occupy a polished shell but are often generic | Nine snapshots: eight generic descriptions; no physical/QC/installation/contents sections. RAV04. | Improve owner-verified product information first; preserve useful electrical tables and existing qualification. |
| Hero collapse on wide screens | Historical real-Chrome before measurements; SPECTRE corrected source already exists. RAV05. | **EXISTING FIX — RELEASE BLOCKED.** Preserve it and satisfy HOMECOMING gates; do not rewrite. |
| Broad craftsmanship wording needs scope | Hero/ticker versus more specific workshop/product explanations. RAV12. | Owner confirms which items are assembled/tested and what the checks mean. Bought-in capacitors/pots must not implicitly become UK-manufactured. This audit does not declare the claims false. |
| Delivery help is indirect | Product “Delivery and ordering questions” points to FAQ without delivery answers. RAV10. | Supply concise owner-approved answers/destination; keep actual charges authoritative at checkout. No invented lead time/free-delivery promise. |
| Shared logo representation is expensive for its display role | 2048² PNG, 2,201,238 committed bytes, used by shared shell. RAV07. | Review optimised transparent display variants after authorisation. Preserve logo geometry, colour and recognisability; measure actual browser improvement later. |
| Single-image product presentation limits physical inspection | Source supports one image; real served image quality unavailable. RAV14. | Optional later real photography/fitment angle work. A carousel is not automatically justified for a small part. Respect NIGHTFALL's single-image verified contract before extending it. |
| Styles have several ownership layers | Homepage loads six stylesheets, with brand/route/customer overrides. Known hero failure is an example of cascade interaction. RAV13. | Record ownership and add targeted regressions in future work; no framework replacement or wholesale CSS consolidation now. |

## Typography, contrast and density

Source defines Space Grotesk for display (despite the variable name `--serif`), Inter for body and JetBrains Mono for technical metadata, with Arial/monospace fallback. The brand logo carries the historic character; forms and specification rows do not need gothic lettering. Type scale/letter spacing should remain legible at enlarged text, especially dense metadata and control names. Actual external-font parity is **NOT TESTED**.

Static sRGB calculation for final customer tokens against #171a17 gives **13.589:1** cream, **8.307:1** muted text and **7.530:1** gold. These are good base pairs, not a page-wide accessibility pass. The #42463d separator is **1.818:1** against that background: suitable contrast cannot be assumed for an essential control boundary. Identify actual control/background/focus combinations before changing it; decorative separators do not all require the same contrast as text or controls.

Current source deliberately includes 44/48px targets, visible gold focus, specification wrapping and responsive stacking. Retain useful information density. Reducing product facts to obtain more whitespace would undermine specialist credibility. Long names, SKU strings, viewport composition and the real touch target rectangles require future browser checks, not aesthetic assertions from CSS.

## Trust and technical positioning

The strongest premium message is specific: useful values/fitment, original clear photos, verified provenance and a precise explanation of selection/assembly/testing. Do not add badges, certification seals, fake reviews, arbitrary matching tolerances or claims of audible superiority from capacitor price/material. Preserve the explicit no-universal-treble-bleed guidance and contextual pot/cap advice.

Contact, Terms/Privacy and compatibility help exist. A future concise purchase-reassurance component could link actual delivery/returns/support facts close to purchase controls, but wording requires owner policy approval. This report does not verify legal compliance. Component Passport remains a clearly labelled future illustrative concept.

No competitor websites were opened. No current market ranking is asserted. A later comparison should use the dimensions in CUSTOMER_JOURNEYS, with exact product/device/price/shipping context, rather than copy a generic luxury template.

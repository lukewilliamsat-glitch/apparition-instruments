# Customer journeys — evidence-led assessment

Evidence levels: **S** source-proven behaviour/content; **H** historical isolated evidence; **R** recommendation/inference; **NT** fresh browser or production behaviour not tested. See [EVIDENCE_INDEX.md](EVIDENCE_INDEX.md). No transaction, customer record or live checkout was accessed.

## A — First-time visitor

**S/H:** The hero explicitly identifies components, wiring kits and technical tools, with a clear collection CTA. Below it, native disclosures explain the three main ranges. “No mythical tone claims” and qualified component/assembly explanations support technical credibility. Contact/FAQ are in the footer; product pages offer a direct compatibility question. Instruments are labelled in development rather than available stock.

The reviewed genuine 390/768 captures retain a legible gold wordmark, strong cream/gold heading, guitar image and prominent CTA. The headline itself is expressive rather than descriptive, but adjacent copy supplies product scope; this is not a proven comprehension failure. Global hand-assembled/individually-tested wording can be read more broadly than the product-specific assembly explanation (RAV12, owner confirmation needed). Wide hero collapse is RAV05, **EXISTING FIX — RELEASE BLOCKED**. Fresh comprehension, scrolling and screen-reader testing: **NT**.

## B — Discovery

**S:** Three deliberate category entry routes and All/category filters are present. Pot filters use shaft/manufacturer/type; manufacturer options are repopulated, type/shaft are static. A Mini pot exists in committed snapshots while Type offers Standard/Push/pull; no Mini-specific choice is supplied. Text search/sorting is absent; adding it is P2 given nine committed product snapshots, not an invented critical blocker.

Cards contain purpose, key facts, price and stock wording; image rendering is lazy with a meaningful fallback. Empty categories get explicit no-available-components copy after successful rendering. No-photo state is deliberately styled, not a fabricated photograph. The import-time failure path can prevent rendering and status setup altogether (RAV01). Static pot count still says 16 while source contains three pot cards; live successful filtering recalculates it. Snapshot counts/stock must not be presented as current outage evidence.

No fresh query/filter/empty/error journey ran. Mobile grids and long names have CSS support, but measured current-browser behaviour is **NT**. Keep local filtering cheap and image payload reduction separate from interface filtering (RAV09/RAV11).

## C — Technical evaluation

**S; fresh browser NT:** All nine product snapshots have a title, price/availability snapshot, technical definition list, fitment guidance, educational link, compatibility help and disabled current-availability purchase control. Capacitor snapshots state capacitance/voltage/tolerance; pot snapshots include resistance/taper/shaft/tolerance and sometimes part reference. Treble bleeds distinguish capacitor-only from parallel RC; resistor rows are intentionally omitted for capacitor-only designs. Model code derives from structured technical specs before legacy text and avoids duplicate rows.

Coverage measured from the committed snapshots:

| Content | Source observation | Interpretation |
|---|---:|---|
| Generic “Explore the specification…” description | 8/9 | Product purpose/technical rows carry most useful meaning; a description template is not a detailed evaluation. |
| Physical/fitment specification section | 0/9 | Generic cautions exist, but no structured bushing/body/clearance dimensions are shown in these snapshots. |
| Optional Installation / Included / Testing and QC section | 0/9 each | Renderer supports them; source snapshot content does not populate them. Not proof they are absent in the live database. |
| Single photo element / fallback | 4/9 photo, 5/9 fallback | The four photo files are generated outputs absent from Git source; actual served image quality/completeness is unknown. |
| Product-specific tolerance text | 5/9 | Present for two capacitors/three pots; do not invent a tolerance for remaining assemblies. |

RAV04 proposes product-specific practical purpose, known dimensions/fitment, included quantity, verified provenance and actually performed QC. No supplied measurement, component origin, certificate or fit guarantee is inferred. “Premium” should explain construction/value/testing or usability, not imply expensive capacitor materials inherently improve audible tone. The premium bleed's enthusiastic “best of the best” copy is weaker than an evidence-backed product distinction.

Existing capacitor copy explicitly rejects brand/construction-only audible guarantees; preserve it. Treble-bleed suitability depends on the complete pickup/pot/cable circuit; PRS-style is a topology/value description, not universal PRS compatibility. Guided kits correctly exclude unsupported active/uncertain pickup requirements and treat shaft uncertainty as provisional. Nominal values, tolerance bands and actual measured results must remain distinct. Component Passport is clearly an illustrative future preview, not a certificate for a sold kit.

## D — Add to basket / configuration

**S:** Cards/details add one component per activation with inline role=status feedback and a basket link. Quantity editing is in the basket. Existing checks reject invalid price, insufficient stock and quantities beyond 99. Operations binds purchase availability and provides text, not colour alone. Component entries merge by SKU; kit entries preserve a validated configuration/specification snapshot and distinguish new/edit/current-option review.

The builder has direct and guided entry, fitment warnings, diagram inspection, print/copy/share fallbacks and clear no-order/no-reservation statements. Diagram enlargement is an inline scrollable view, not an established modal gallery. These are useful existing capabilities, not proposed features.

RAV03: when a stored component no longer resolves, readBasket filters it without an unavailable-line explanation. A subsequent save serialises the reduced list. This is separate from malformed-entry security validation; preserve ineligible records safely without trusting old prices or allowing checkout. RAV01: basket import depends on successful catalogue/kit startup, so local storage alone does not make basket review resilient. Fresh add/quantity/stock/dirty-edit/error/focus journeys: **NT**.

## E — Checkout handoff

**S only:** The review states UK delivery and Stripe handoff, loads current GB shipping, compares a reread basket, checks OPEN, optionally passes an ordinary customer token and uses create-checkout. Returned amount must equal the displayed subtotal/delivery; redirect URL is validated. Errors reenable the original button. Request ID is retained for that page instance; no claim is made about cross-reload durable intent or deployed server idempotency.

Cancellation preserves the basket and says Pending/Unpaid; success source requires independent status before paid wording. Preserve these distinctions. Delivery is calculated from authoritative rules; no actual rate, free-delivery threshold, payment availability or dispatch promise was verified.

RAV15 is a **likely usability/focus concern grounded in source**: every store-status event can rerun render, replace checkout-content and create a fresh form. No checkout focus restoration or shared submitting state is present there. This can erase progress/focus during a pending request; double charging is **not** established. Validate with delayed synthetic replies and periodic status events before implementation. No actual checkout session was created, even with test payment credentials.

## F — Reassurance and help

**S:** Contact asks useful guitar/pickup/layout details; fields have labels, autocomplete and native required/length constraints. Successful enquiry focuses a confirmation region. Validation/rate-limit/failure paths retain text; ambiguous arrival is not reported as success and is not automatically resubmitted. RAV06: that uncertain path leaves the submit control disabled with its sending label, despite a different notice. Future copy/state should make the settled uncertainty clear and preserve safe recovery.

FAQ's statement that checkout/payment are not enabled conflicts with the purchase source (RAV02). Product support sends “Delivery and ordering questions” to that FAQ, which has no delivery section (RAV10). Terms contains delivery/returns/business identity/contact information, but is a long-form policy destination rather than concise purchase reassurance. This audit makes no legal-compliance judgement or new policy recommendation. Owner-approved delivery/returns answers must use actual business terms and current checkout rules.

Public customer aftercare/account source provides order-specific support pathways; no private record, email or account flow was opened. General contact's actual backend delivery and order-context verification remain **NT**. Improving visible information must not bypass ownership checks or substitute a guessed support address.

No external competitor site was accessed. Reviewed repository documentation contains technical references, not a substantiated current competitor shopping study. A later authorised study could compare specification/fitment clarity, original photography, installation support, mobile purchase flow, delivery/returns reassurance, navigation and configuration. No competitor findings are invented here.

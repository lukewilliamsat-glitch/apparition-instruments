# Customer-facing source and candidate register

The public source in main includes homepage/navigation, catalogue and product specifications, kit builder, basket/checkout, account Order/invoice routes, contact, FAQ/terms, Hub and tools. Product photography served by today's deployment has not been inspected. The 25 October successful build is stronger publication evidence than the old failing run, but does not validate every customer journey or source-to-served byte.

| Surface / item | Main source | Unreleased state / next gate |
|---|---|---|
| Homepage/navigation/mobile shell | Existing brand and layered responsive CSS; original hero width defect remains in main source | SPECTRE35 correction is isolated; HOMECOMING packages the same CSS, not another redesign. Owner text/header/device acceptance remains open. |
| Catalogue/product details | Authoritative metadata/stock/prices and technical specs; optional description/fitment/installation/QC fields; existing image adapter disabled | RAV04 practical product content is not implemented by RAVEN. Require supplier/owner facts, no fabricated origin/measurements/tone claims. |
| RAV01/RAV02 startup and ordering copy | Old direct module entry and inconsistent copy source | LANTERN implemented; LIGHTHOUSE closes its original Chrome/Node22/DOM gap. Exact tested native storefront bytes stay separate from final documentation. |
| RAV03 unavailable saved intent | readBasket filters unresolved component SKU; later save can lose it | SENTINEL preserves valid version-1 identity/quantity, escapes text, allows deliberate removal and blocks unresolved checkout; isolated PASS, not live. |
| RAV15 checkout stability | Status-triggered form replacement can disconnect focused/pending controls | SENTINEL preserves form/focus, one active application attempt and existing request identity; no historical duplicate-payment claim. Uncertainty hold is per-document, not durable cross-reload reconciliation. |
| RAV06 contact uncertainty | Existing uncertain notice/duplicate guard; button can still say Sending after settlement | SENTINEL fixes label/busy settlement without automatically resending. Chromium reset transport replay is not a second application fetch. |
| RAV10 delivery guidance | Existing support links, FAQ/terms and backend shipping rules | Better buyer-facing shipping answers remain content/policy work; no guessed charge, free-delivery or dispatch promise. |
| RAV07 assets | Large source logo/artwork and external font dependence | Derivative optimisation not implemented; retain originals and obtain owner visual/licensing approval. Static-host bytes are not Supabase billed egress. |
| RAV08 responsive accessibility | Existing responsive menus/controls; historical enlarged-header limitations | LIGHTHOUSE records 2px overflow at doubled 390px text; SPECTRE has separate pre-existing header limitation. No full WCAG/physical-device/spoken-AT certification. |
| RAV11 discovery/search | Catalogue filters plus editorial Hub discovery; no general search/sort improvement from RAVEN | Optional research/owner decision; no per-keystroke backend reads. Do not confuse Hub search with product search. |
| RAV12/RAV13 claims/fonts/CSS ownership | Existing QC/assembly language and layered styles | Scope factual claims by product/practice; font/CSS cleanup is proposed, not a tested rebrand. |
| RAV14 gallery | Single-image/reference/fallback architecture | Gallery/zoom extension requires real photos, keyboard/touch and NIGHTFALL identity/retention/byte contracts; not implemented. |
| RAV09 imagery | Inactive preparation in main | NIGHTFALL is the evolved isolated solution; actual view, archive, host/publisher and activation remain gated. |

Generated output matters: generate-product-pages.mjs reads the committed products/index.html shell. LANTERN modifies that shell, so inspection does **not** demonstrate that generation discards its entry module. However, combining generation/stamping with NIGHTFALL's adapted readers, real product facts and SENTINEL requires new composed acceptance; existing independent passes do not certify that combination. Preserve current stock/payment/Operations authority and do not activate a saved/static price or stock fallback.

Potentially database-independent candidate adoption: SPECTRE CSS, LANTERN/SENTINEL JS/HTML and owner-approved static guidance/asset derivatives. They still require complete payload/rollback, bounded live acceptance and explicit release authority. New content writes, backend/image activation, gallery schema or COMMAND integration have additional gates.

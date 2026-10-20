# BLACKBOX — customer and Admin journey models

Authorisation 29A · 20 October 2026 · documentation-only research.

Derived from the preserved [original assessment](BLACKBOX_GITHUB_ASSESSMENT_2026-10-20.md) and [unchanged research evidence](RESEARCH_EVIDENCE.json). Findings distinguish VERIFIED source, SYNTHETIC tests, HISTORICAL measurements, DERIVED models and UNKNOWN production usage. No new production measurements or test reruns were performed for publication.

## Source-based journey simulations
These are bounded models built from existing evidence, not new real-browser or production sessions. Counts below concern the specified subflow, not every HTTP request made by a complete page.

| Journey/subflow | Existing evidence | Interpretation |
|---|---|---|
| Empty-basket informational visit | basket-count avoids commerce import for an empty basket; site header can still start Operations | Do not assume every visitor downloads catalogue images. Two Operations RPCs per refresh remain a separate path. |
| Non-empty basket on shared site | basket-count dynamically imports commerce; commerce imports catalogue plus kit configuration | Conditional catalogue/kit work can affect otherwise informational navigation. Exact final duplicate reads may coalesce. |
| Component browse, search and filter | Default public catalogue includes image; filtering is local | Search input itself is not evidence of a new backend request per keystroke. |
| Product detail | Full catalogue and commerce imported; public options requested; separate technical ID lookup may occur for configured commercial support | The one-product page can depend on a full catalogue. Small support lookup is already image-free. |
| Forge/project model startup | Actual shared model import made three mocked GETs: components, kits and permitted mappings | Eager component read contains image, even before project interaction; model deliberately used empty synthetic kit definitions and did not claim complete app acceptance. |
| Admin product list/refresh | Actual repository list has three GETs; repeating it caused six total | No public cache sharing for private reads. Auth/options can add separate calls outside this subflow. |
| Admin stock update plus UI-style refresh | Seven mocked GETs and one fixture-only PATCH; two component lists | Preserve conditional quantity validation. Synthetic mutation is not a production mutation. |
| Twenty matching public reads | One mocked request for concurrent calls and one for settled calls within TTL in separate scenarios | Module/import call counts are not necessarily network transfer counts. |
| Outage / 402 | Error is not cached; no automatic retry inside public read; later explicit attempt can retry | Do not assign full catalogue bytes to the error. Product generation fails before Pages upload/deploy. |
| Visible background tab | Two Operations RPCs per refresh; hidden timer skips network | Model tab duration and response bytes separately. Error backoff is a proposal, not implemented main behaviour. |

## Incomplete evidence
No real-browser timing, visual acceptance, current cache reuse across navigation, user-journey frequency, customer data or live checkout was collected. Full-session totals cannot be asserted from these subflows. No application code was changed to manufacture fixture results.


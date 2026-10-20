# Regression risks and remaining release gates

| Risk | Current mitigation/evidence | Remaining gate |
|---|---|---|
| Wrong/stale product photo | Product/source/hash binding; exact body verification; placeholder on mismatch; generation rejection | Real isolated browser acceptance and separately approved asset publication verification |
| Concurrent Admin replacement | Publisher rejects changed source before writes; UI never writes static URL as source | Read-only post-reset identity/schema verification, then separately approved replacement acceptance |
| Missing/corrupt manifest or archive | Browser placeholder; generator fails closed; durable history verification; uncommitted repair blocks assembly | Review real archive state/permissions/retention and mandatory restoration gate |
| Ordinary deploy deletes old URLs | Durable export retains all image versions; static generator retains per-product companion assets | A separately approved workflow must restore assets on EVERY deployment even with capture disabled |
| Existing Pages payload incompleteness | No deployment and no claim dist is authentic current production | Independently approved complete publication inputs/rollback proof; no Atlas reopening is implied |
| Existing HTTPS object-image references | Strict browser path does not follow arbitrary references; retained generator/publisher currently require embedded-source identities with null image_reference | Verify current source representation before activation; unsupported references block generation rather than being rewritten |
| API schema/RLS drift | No new SQL; existing invoker-view dependency explicit | Live view existence, all required columns, grants/RLS and allowed public visibility remain unverified |
| Identity-view CPU cost | One build query, no new polling, caller cache preserved | Original ~90 ms report is historical; measure safely after explicit approval |
| Browser bandwidth / cache | Content-addressed URL, force-cache fetch and bounded 30-second verification reuse | First cold verification may add a static fetch; actual HTTP-cache/DOM sharing and GitHub cache headers unmeasured |
| Large catalogue verification | Per-body bounds and four concurrent verification slots | Real memory/latency envelope not benchmarked; no timing improvement claimed |
| Admin/inventory/checkout regressions | Protected sources unchanged; component export/repository, kit snapshots and authoritative checkout fixture suites pass | Authenticated owner/browser acceptance remains separate |
| Rollback to earlier catalogue | Immutable manifest pin and old assets retained; mismatch without pin is safely unavailable | Version selection must be explicit and current price/stock must not be rolled back by image-only recovery |
| Privileged publishing | No browser token; no installed publisher workflow/secret; pure functions only | Exact least-privilege GitHub writer/deployer workflow review and separate approval |
| Hosting terms | Existing GitHub Pages architecture preserved | Previously documented commercial-use restriction remains unresolved; candidate does not settle it or authorise hosting migration |

Node 24.19.0 passed; Node 22 is not validated in this pass. DOM fixtures at representative widths and source checks are not real-browser, accessibility, mobile or CDN acceptance. No new dependencies were installed. No live catalogue fingerprint, customer/order data, backend function, billing state or production health was inspected.


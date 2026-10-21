# Environment and isolation

## Actual runtime

- GitHub-hosted Ubuntu 24.04, preinstalled Google Chrome **155.0.8059.39**, real headless Chrome with `chromiumSandbox:true`.
- Test/controller executable: **Node.js 22.20.0**. Actions' own implementation runtimes are separate; their Node 24 warnings do not change the tested Node version.
- Official Microsoft `playwright-core@1.56.1`, installed only into disposable runner tooling with scripts, audit, funding and lockfile creation disabled. No browser download or application dependency change.
- npm package integrity recorded by CI: `sha512-hutraynyn31F+Bifme+Ps9Vq59hKuUCz7H1kDOcBs+2oGguKkWTU50bBWrtz34OUWmIwpBTWDxaRPXrIXkgvmQ==`.

Chrome provenance is the GitHub-hosted image and the executable's recorded version. No independent Chrome archive checksum or signature verification is claimed. The controller's npm integrity is package integrity, not independent browser verification.

## Process isolation before opening application fixtures

`run-isolated.sh` enters new network, mount and PID namespaces using `unshare --net --mount --pid --fork --mount-proc`. Only loopback is brought up; the source asserts a different namespace from its parent, exactly one interface, and exclusively loopback routes. The controller/browser run as the unprivileged runner user with an empty inherited environment except explicit runtime paths, disposable HOME/TMPDIR and locale. The feasibility source asserts `CapEff` is zero. Child Python processes inherit the same network namespace.

IPv4 `192.0.2.1` and IPv6 `2001:db8::1` process probes both returned errno 101 (`ENETUNREACH`). These are harmless documentation addresses, not production targets. Ten actual browser negative controls passed: IPv4 fetch, IPv6 fetch, `.invalid` DNS fetch, image, script, worker fetch, WebSocket, frame, redirect and top-level navigation. No external response was observed, while the local origin remained accessible. [ISOLATION_PROOF.json](ISOLATION_PROOF.json) preserves the actual results, interface addresses and routes.

Fresh disposable browser contexts block service workers; extensions, background networking, component updates, sync and proxies are disabled. No shared production profiles or credentials are used. Isolation is enforced by the process network namespace, not browser interception alone. The Chrome sandbox remains enabled. The same namespace contains the fixture server and Stage B browser/controller processes.

## HTTPS and cache

Stage B creates a temporary loopback certificate and pins its exact SPKI for the disposable Chrome instance. No broad `ignoreHTTPSErrors`, global trust or system configuration change. Private keys and disposable profiles are not included in retained evidence. The fixture uses gzip JSON, immutable image cache headers and no-store manifests. Native HTTP cache remains enabled: no request interception or fabricated cache transport is used.

## Fixture trust boundary

Actual repository pages/modules are served from `dist`. In-memory response overrides replace public backend configuration with the dedicated loopback origin and a dummy publishable key, and enable image delivery only in the served fixture configuration. All catalogue/RPC responses and product PNGs are synthetic. Unknown API routes fail the test. Real product-photo paths are refused. The only CSS override removes the pre-existing external Google Fonts import; original and served CSS SHA-256 values are recorded in the network evidence. Source files are unchanged.

The first Stage B run detected 34 external font attempts; isolation blocked them. The fixture was corrected instead of allowing external access. The final run recorded zero unexpected destinations and zero uncaught browser errors. The recorded `productionRequests:0` is supported by namespace restrictions, negative controls and observed destination records, not treated as a standalone assertion.

## Workflow permissions

The branch workflow has `contents:read`, `persist-credentials:false`, no production environment or secrets, no OIDC/Pages write permissions and no schedule. It triggers only pushes to `engineering/blackbox33-browser-verification` touching its workflow or `tests/blackbox33/**`. Evidence-only commits do not match. Production `static.yml` is unchanged: push to main only, manual dispatch and daily `0 3 * * *`. The stale fifteen-minute comment in that workflow is not its actual cron.

Cloud isolation was demonstrated for these runs. No claim is made that arbitrary future GitHub Actions jobs are automatically isolated.

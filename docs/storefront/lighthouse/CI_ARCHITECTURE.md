# CI architecture and source boundaries

Authorisation 46 permits one new LIGHTHOUSE-only test workflow. `raven-lighthouse.yml` admits push events on exactly `engineering/raven-lighthouse`, with matching job/ref checks and test/startup path filters. It has no schedule, dispatch, production environment, deployment job, Pages permission, service secret or production build. Repository permission is `contents: read`; checkout removes its authentication header. Original workflows remain byte-identical.

| Verified official action | Immutable commit |
| --- | --- |
| actions/checkout | `11d5960a326750d5838078e36cf38b85af677262` |
| actions/setup-node | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| actions/upload-artifact | `ea165f8d65b6e75b540449e92b4886f43607fa02` |

The v4 tag objects and action.yml sources were read from the official repositories before use. The application/controller runtime is Node 22.20.0; action host runtimes are separate. Existing preinstalled Chrome is used with `chromiumSandbox: true`. Ten disposable tool packages are locked to exact registry URLs and SHA-512 integrity, including existing happy-dom 20.14.5 and the established playwright-core 1.56.1 controller. Happy-dom's dependency closure comes from the inherited package lock; Playwright's established integrity is pinned. `npm ci --ignore-scripts --no-audit --no-fund` installs only these disposable tools before application isolation. No production dependencies/build/generator are installed or run.

The shell creates separate network/mount/PID namespaces, raises loopback only, records interfaces/routes and drops to the runner user with a disposable HOME and clean environment. No service credentials or privileged browser profile are forwarded. The exact COMMAND01 isolation module from NOCTURNE is copied unchanged (Git blob `5b81f9a75354430d35b7f5e92706f357d65b67b2`). It establishes zero effective capabilities, distinct namespace, loopback access and ten negative browser controls before any application fixture opens: external IPv4/IPv6, DNS, redirect, image, script, worker, WebSocket, frame and navigation. Process probes verify route denial and inherited namespace.

Node fixtures additionally use the inherited offline guard. LANTERN's Python runner proves its stricter no-socket seccomp controls before running its six suites. Independent DOM/browser tests run inside the proven loopback-only namespace. Failure in one functional suite is retained and fails the overall job, while independent tests can still produce diagnostic evidence; isolation failure stops all application tests.

Native HTML, ESM modules, renderer, basket/checkout controllers and Operations logic execute in Chrome. The fixture substitutes only the public URL/key, fictional backend responses/static Operations snapshot and removal of the complete external Google Fonts import. Existing Arial/monospace fallback styles remain. The server accepts only explicit fictional backend resources, serves local assets, never proxies requests and rejects unknown routes. Browser routing/CSP additionally deny nonfixture origins. No payment session or email is created.

Source checks compare all 912 LANTERN blobs before/after execution. Only test VM lifetime ownership differs; no storefront file changes. Explicit transforms prove every inherited assertion remains. Original PNGs are uploaded with a text/PNG allowlist and 30-day retention; disposable HOME, profiles, tool binaries and credentials are excluded. Evidence is independently downloaded and verified after runner cleanup; details are in EVIDENCE_INDEX.md.

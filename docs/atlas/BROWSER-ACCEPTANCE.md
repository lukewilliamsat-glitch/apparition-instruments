# Atlas isolated browser acceptance package

Authorisation 25 permits local presentation checks, not production publication.
No browser acceptance is claimed by this package. A real engine must execute the
checks. Node parsing, CSP headers, synthetic receipts and screenshots alone do not
establish runtime correctness or process-level isolation.

## Environment gate

Use a disposable profile containing no production sessions. The supported browser
controller must provide request interception/allowlisting, console diagnostics,
screenshots and viewport control. Require effective process-level isolation as
well: for example, an owner-provided container/network namespace with **no external
network interface**, and the browser and fixture server in that same namespace.
Do not change host firewall rules, use a shared signed-in profile or assume localhost
is isolated. Do not install tools implicitly. Provisioning commands depend on the
owner's operating system and approved browser environment; none are run here.

Before opening any candidate page, retain diagnostics for harmless synthetic
IPv4, IPv6, DNS-name, direct-IP, WebSocket and redirect-escape probes. External
destinations must be unreachable and the dedicated loopback fixture must remain
reachable. Do not use Supabase, Stripe or any production endpoint as a probe.
Disable service workers, extensions and browser background networking. Fail this
gate if the supported tools cannot demonstrate these properties.

The current extension connection is unavailable. The available cloud-browser API
advertises no network interception or browser isolation capabilities. No candidate
or live application page was opened during this assessment.

## Serve verified bytes

Recover the bundle and replay the pinned offline inputs using HANDOVER.md in the
recovery ZIP. Use the regenerated Phase 2F baseline and manifest, not `dist` or an
assembled Spectre overlay. The original Phase 2E candidate remains preserved.

After the environment gate passes, within the isolated environment:

```bash
python3 scripts/atlas/serve-runtime-fixture.py \
  --root /replay/phase2f/baseline \
  --manifest /replay/phase2f/baseline-manifest.json \
  --sha256 EXACT_REGENERATED_MANIFEST_SHA256 \
  --allow-loopback
```

The server prints its exact `127.0.0.1` origin. Allow that origin only; block external
HTTP(S), WebSockets, fonts, images, analytics and all mutation-capable APIs. The
server rejects mutation methods and hashes each served body. Its CSP is additional
protection, not a substitute for browser/network isolation. It does not rewrite
authentic HTML, JS or CSS. Do not start another public listener or deploy the files.

## Execute the generated plan

`browser-plan.json` binds twelve named routes and two viewports to exact document
hashes: desktop 1440×900 and mobile 390×844. The resulting 24 route/viewport cases
cover homepage/Operations presentation, components, representative product pages,
News, legal pages, basket, checkout shell and Luthier Hub.

For each case retain a full-page PNG, console errors/unhandled rejections, allowed
and blocked request diagnostics, local image completeness, heading/layout checks,
navigation destinations and evidence that the page's scripts executed. Do not click
checkout, submit forms, follow external links, authenticate or mutate any record.
Check Operations against the exact preserved snapshot title including `Test`.

Classify each check as `passed`, `failed`, `blocked`, `not-executed` or
`requires-live-verification`. Expected backend denial is **blocked integration**,
not a production integration pass. Static rendering can still pass independently.
Investigate missing local resources and fatal frontend exceptions separately.
Do not claim accessibility or visual acceptance beyond the observations performed.

## Review and retain evidence

Produce the `atlas-browser-evidence` receipt described by `browser-evidence.mjs`.
Every passed route requires its exact plan hash, document hash, screenshot hash,
console/network diagnostics and all required checks. Keep the screenshot and
isolation-probe artifacts under a separate evidence root with relative paths.
Do not include cookies, credentials, customer data or private request payloads.

Run the offline validator using the same verified Node 22/network-denial launcher:

```bash
/network-deny /verified/node22 scripts/atlas/review-browser-evidence.mjs \
  /evidence/browser.json EXACT_RECEIPT_SHA256 \
  /replay/phase2f/browser-plan.json EXACT_PLAN_SHA256 \
  /evidence/artifacts
```

Exit 0 means the receipt's structure, coverage and referenced artifacts pass checks.
It does not prove the truth of assertions or grant trust/publication authority.
The existing certification engine still requires a separately trusted independent
inventory/functional witness binding the exact evidence. Never generate a key and
treat its own signature as independent verification. Keep partial/failed evidence.

The current runtime report remains thirteen Node/static checks passed and two
browser groups pending. All 24 planned browser cases are unexecuted here.

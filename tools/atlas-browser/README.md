# Owner-run browser acceptance (Windows)

Status: runnable package prepared, **not executed** here. Docker is unavailable and this managed host denies Unix IPC sockets required by Chrome. No candidate page was opened. No browser acceptance is claimed.

Prerequisites: Windows PowerShell 7, Docker Desktop in Linux-container mode, sufficient free disk space (allow 6 GB), and the verified Phase2F recovery package. No account credentials or production authentication are required. Installing Docker on the owner's computer is an owner-controlled setup step; this programme has not installed it.

The Phase2G recovery ZIP includes `phase2f/baseline`, its exact manifest, and a standalone `browser-source/` copy of this runner's Git-tracked files. Extract it; no Git recovery or Linux reconstruction is required merely to run the Windows browser package. Do not point it at a live site or a different candidate.

From the Phase2G source root, one command:

```powershell
pwsh -File C:\Atlas\recovery\browser-source\tools\atlas-browser\Run-AtlasBrowser.ps1 -Baseline C:\Atlas\recovery\phase2f\baseline -Manifest C:\Atlas\recovery\phase2f\baseline-manifest.json -Evidence C:\Atlas\browser-evidence-01
```

The script pulls version-pinned official Node 22.20.0, GCC 14.2.0 and Playwright 1.62.1 images, resolves their immutable digests, records them and builds with those digests. Image signatures are not independently verified. `package-lock.json` pins both Playwright packages with registry SHA-512 integrity values. Build steps contain no application execution or production input. Cold download/build can take 5–20 minutes; the 24 browser cases should take approximately 1–3 minutes (estimate, not measured here). Subsequent execution can reuse the built image; record the same image ID.

Execution uses `--network none`, drops all capabilities, sets no-new-privileges, mounts the candidate/manifest read-only and supplies no secrets. An inherited Linux seccomp filter additionally denies Internet/raw/netlink sockets, every `connect()` and io_uring; it closes inherited non-stdio descriptors. Chrome uses pipe CDP and local-file responses at an exact logical loopback origin. There is no real TCP listener. Candidate HTML/JS bytes are not rewritten. Service workers and extensions are disabled. All methods except fixture GET and all other origins are rejected. No forms, checkout controls or authentication are activated.

Before candidate loading, native IPv4/IPv6/raw/proxy probes, browser DNS/direct-IP/WebSocket/redirect probes and descendant process seccomp checks must pass. Any failure stops before application loading. Chrome requires `--no-sandbox` in this restricted container: this is **not** a renderer-sandbox claim. Container network denial and inherited kernel filtering are the required boundaries. Do not remove either to resolve a launch failure.

Evidence includes the exact existing Phase2F 24-case plan (12 routes × desktop 1440×900/mobile 390×844), PNG screenshots, console diagnostics, allowed and denied requests, isolation proof and a receipt bound to the candidate manifest. `browser-validation.json` is produced by the existing receipt validator; its structural acceptance does not replace an independent witness or production evidence.

Failures are meaningful. Absolute production image URLs, external dependencies or API-dependent interfaces may be blocked and reported as failed. They must not be mocked into success or described as production defects without further analysis. This runner does not claim authenticated Admin, transactions, live checkout, screen-reader or production integration acceptance.

Validation is performed automatically inside the network-denied execution by `checkBrowserEvidence`. Independent revalidation (using the same image and a separate read-only mount) should call `scripts/atlas/review-browser-evidence.mjs` with the exact plan/report pins; see that CLI's positional contract. Never fabricate receipts or substitute screenshots.

Exact independent revalidation from PowerShell (substitute only the evidence directory):

```powershell
$E = (Resolve-Path C:\Atlas\browser-evidence-01).Path
$R = (Get-FileHash -Algorithm SHA256 "$E/browser-receipt.json").Hash.ToLowerInvariant()
$P = (Get-FileHash -Algorithm SHA256 "$E/browser-plan.json").Hash.ToLowerInvariant()
docker run --rm --network none --cap-drop ALL --security-opt no-new-privileges --read-only --mount "type=bind,source=$E,target=/evidence,readonly" --entrypoint /atlas-network-deny atlas-browser-owner:phase2g /usr/local/bin/node22 /atlas/scripts/atlas/review-browser-evidence.mjs /evidence/browser-receipt.json $R /evidence/browser-plan.json $P /evidence
```

Use the recorded runner image ID instead of the tag for later replay. Exit 0 means structurally accepted evidence, exit 2 means genuine failed/pending cases, and exit 1 means invalid evidence. No exit code is production publication authority.

Troubleshooting: use Linux containers; allow Docker enough disk/RAM; confirm image tags exist. If a pinned image/version cannot be acquired, stop and report it, rather than substituting a runtime. If Unix IPC, native probes, loopback file transport or seccomp checks fail, retain diagnostics and do not bypass isolation. A pre-existing evidence directory is refused; select a new directory. The runner creates no deployment or source changes and can be removed by deleting its disposable Docker image and evidence directory after archiving the evidence.

# Node 22 executed acceptance

Runtime: **Node.js 22.20.0, Linux x64**. The environment initially had Node 24.19.0 only; the previously reported temporary Node 22 directory was absent. The official archive was acquired solely for this disposable cloud acceptance environment. No npm install, lockfile change, system PATH change or runtime replacement occurred.

| Item | Verified value |
|---|---|
| Official archive | `https://nodejs.org/dist/v22.20.0/node-v22.20.0-linux-x64.tar.xz` |
| Official metadata | `https://nodejs.org/dist/v22.20.0/SHASUMS256.txt` |
| Archive SHA-256 | `00bbd05e306ea68b6e13e17360d0e2f680b493ef95f2fea1c4296ff7437530bc` |
| Node executable SHA-256 | `b1cbec894e45a5814b6ab756e1e14f8a76516273197e67e0412b57c1e10d0d9f` |
| Installation | Isolated temporary directory; explicit executable invocation |
| Dependency | Existing `happy-dom` 20.14.5, reused for DOM/generator fixtures |
| Other recorded dependency | Existing PGlite 0.5.8; no live database used |
| TypeScript loading | Node's `--experimental-strip-types`, required by the existing mocked checkout suite |

Integrity was checked before extraction/execution against official same-origin HTTPS checksum metadata. No independently trusted signing-key verification was performed; this is checksum and HTTPS provenance, not a PGP-signature claim. [Machine-readable provenance](RUNTIME_PROVENANCE.json) includes the checksum-metadata hash and exact runtime location. Node runtime component versions are retained in the executed result JSON.

## Execution sequence

1. Inspect original runner, launcher, focused suite, six regression scripts, imports and child processes. Git subprocesses use disposable local bare fixture repositories. Checkout uses explicitly injected fake backend/payment responses and dummy strings; the historical suite's text saying "live Checkout" is a fixture label, not live execution.
2. Run unchanged B31 source with `run-blackbox32.py ... baseline`: **7/7 pass**, original 25 cases pass. No Node 22 incompatibility found.
3. Run 16 new adversarial scenarios with unchanged application source: **13 pass, three fail**. [HARDENING_BEFORE.json](HARDENING_BEFORE.json) preserves their raw errors. Review classifies them as application defects, not runtime or environment failures.
4. Apply the bounded correction, rerun all required suites and the new suite: **8/8 pass**, **41 focused scenarios pass**, six existing regression suites pass. No remaining executed failure.

| Final suite | Result |
|---|---|
| `blackbox31-static-images.mjs` | PASS, 25 cases |
| `egress-static-assets-v2.mjs` | PASS |
| `egress-static-assets-v2-dom.mjs` | PASS; DOM simulation only |
| `component-repository.mjs` | PASS |
| `component-export.mjs` | PASS |
| `kit-snapshot.mjs` | PASS |
| `p07b-checkout.mjs` | PASS; mocked delivery/payment/backend |
| `blackbox32-hardening.mjs` | PASS, 16 cases |

Before every invocation, the launcher applies inherited Linux seccomp syscall denial; six negative controls verify IPv4/IPv6 TCP/UDP socket creation denial, synthetic `.invalid` DNS failure and child-process inheritance, plus NoNewPrivs=1/Seccomp=2. The environment is sanitised, uses a disposable HOME and disables global Git configuration/prompts. All suite processes and their children inherit network denial. Uninjected fetch attempts in focused suites: zero.

## Correction

Previously, matching the static asset hash did not bind the manifest's source label back to the authoritative embedded-source identity. A self-consistent manifest could mislabel a different, validly hashed image. URL-only cache keys also permitted reuse under a contradictory source or byte-count contract. The new code recomputes the canonical data-URL source SHA-256 from verified bytes and keys cached verification by URL/source/MIME/byte count. Genuine identical images still deduplicate.

All changes are within the disabled delivery path. No public signatures, data projections, RLS/authentication, stock authority, save logic, checkout or publisher mechanism changed. The extra base64/source hashing adds local CPU and temporary memory work; browser/mobile performance remains unmeasured.

Browser tooling is classified separately as an environment/capability limitation. No browser result or production compatibility is inferred from these Node tests. No new GitHub Actions workflow was needed, installed or dispatched.

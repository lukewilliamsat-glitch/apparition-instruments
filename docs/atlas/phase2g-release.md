# Atlas Phase2G — decision and release readiness

Authorisation 26, 20 October 2026. Engineering only. No publication authority.

Production main remains `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`. This branch starts at frozen Phase2F `397b16451dd8cc36305aaaf088729a9ad490e573`, tree `232468924a2dc953c8d375e286109219fcac0809`. Its ZIP was independently verified against owner SHA-256 `03987b3409421ac6d1785e46e8bdc2e42eb2b13d74219cd3ddad105221fe1909`. Earlier releases are preserved.

## Reconstruction evidence

The successful historical job log establishes 423 upload paths, source `bb4ba2a932239a3ef397272b27143f0cd3adcccf`, Node 22.23.3, npm 10.9.9, generator order and empty `GOOGLE_SITE_VERIFICATION`. The approved Phase2F candidate manifest remains `f69ee4fa0b73b46a53eb6f3a575fb6e43eb46b37b94ebb41fc99a67fe1438450`.

Every available historical source input was checked against its authenticated Git blob. The executable rehearsal pins the original GitHub proof files, validates commit/tree association, verifies the candidate before/after execution and imports generators as functions with explicit isolated roots. Network-capable production CLIs are never invoked.

All 325 priority source/canonical-stamp paths reproduce exactly. This is a collective transformation proof, **not** an authenticated original Pages payload. Across all 423 paths, 415 have deployment-associated source objects and 54 retain individually observed exact public bytes. No new live GET was made; none is labelled a fresh complete current-production baseline.

The 44 priority generator paths are classified individually:

| Evidence | Paths |
| --- | ---: |
| Exact output from authenticated repository CMS seeds | 39 |
| Exact read-only source template (`products/index.html`) | 1 |
| Unavailable historical catalogue input | 4 |

The four unresolved inputs affect `components/treble-bleeds/index.html`, `products/bleed-cap/index.html`, `products/bleed-prs/index.html`, and `products/pot-short-cts-a/index.html`.

The complete CMS replay renders 31 articles and matches 43 candidate outputs. The source seed records are authentic repository content; their equality to the historical `public_hub_articles` response is unproved. They are not manufactured CMS data or retained RPC responses. A 44th CMS output, `sitemap.xml`, differs: seed-only replay retains `/products/sbe-600/`, whereas the observed candidate has `/products/cde-715p-600/` and `/news/workshop-closure/`. Missing catalogue/Operations predecessor inputs explain why CMS-only replay is insufficient. Authentic observed bodies remain untouched.

Operations replay from preserved public snapshot state reproduces the News index, workshop article and exact Operations JSON. The title “Orders are temporarily paused Test” and snapshot SHA-256 `0f8320dcc2a65cb1ec467ae1c70a3960b26dfd852bbd4c2853d9c8a5501837a3` remain unchanged. This is retained public state, not an original RPC envelope.

## Build reproducibility and limitations

Actual local runtime: verified isolated Node 22.20.0. Five runtime packages, including happy-dom 20.14.5, were extracted into an isolated historical checkout only after checking their exact historical lockfile SHA-512 integrity. No lifecycle scripts ran. Type-only and unrelated build dependencies were omitted. This is not a full recreation of historical Node 22.23.3/npm 10.9.9/npm-ci execution.

Two separate clean synthetic full-pipeline builds are byte-identical. CMS-only repeated generation is idempotent. Reusing an already generated/stamped output directory causes eight synthetic output differences. DOM serialisation converts `&build` into `&amp;build`, which the historical stamping function then interprets as a different query key; News shell reprocessing also changes serialised output. No production generator was changed. Clean source input is therefore mandatory for reconstruction; in-place repeated generation is not certified. Full details and before/after outputs are in the recovery ZIP.

One initial workspace-output inventory detected a directory metadata change and failed closed. The retained diagnostics are not relabelled a pass. Fresh outputs under `/tmp`, without weakening inventory guards, completed successfully.

## Browser evidence

Playwright 1.62.1 is available. Official Chrome for Testing 155.0.8059.84 was obtained from Google's HTTPS distribution, ZIP CRC checked and locally pinned to SHA-256 `cf0f049892dea22e6a6db26d47ed0d7776b7158edcbec4634086633df8bafcbc`. No independent vendor archive checksum/signature was verified.

This managed execution host denies even parent-process `socket(AF_UNIX)` with EPERM, preventing Chrome's process singleton from starting. User/network namespaces are also denied; Docker is unavailable. **Zero candidate application pages were opened. All 24 browser cases remain pending.** No remote-browser retry or unsafe isolation bypass was attempted.

`tools/atlas-browser/` supplies a Windows PowerShell 7/Docker Desktop runner using pinned Playwright dependencies, Node 22.20.0 and a reviewed official browser-image digest. Build context is allowlisted. Execution uses `--network none`, dropped capabilities, no-new-privileges, read-only source mounts, a disposable profile, blocked service workers and inherited seccomp. CDP uses pipes; exact local bytes are served at a logical loopback origin through file-backed request fulfilment, with no TCP listener. Native and browser negative controls precede any application loading. It uses the existing 24-case Phase2F plan and receipt validator, with no transactions or authentication.

The runner, Docker build and PowerShell execution remain unverified here; shell syntax, JSON locks and isolation arguments were checked. Official MCR returned HTTP 200 and image digest `sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e`. Acquisition of that exact image is checked again by the owner script. Never claim the package itself is browser acceptance.

Screenshot receipt hardening now checks PNG chunks, CRC, decompression, row filters and viewport dimensions. A fabricated 24-byte header cannot pass. A structurally valid image still does not prove execution: an independent witness remains required.

## Certification and release rehearsal

The existing certification gate remains fail-closed. Supplemental closure reporting keeps historical reconstruction **Partially attested, publication blocked** separate from current production baseline **Unknown**. No self-attestation, synthetic-input or owner-authority bypass was introduced.

Remaining blockers: unretained historical database responses and payload bytes; no complete current-production byte attestation; missing independent inventory/functional witnesses; unresolved dynamic runtime dependencies; browser acceptance pending. No expired artifact search is required to continue. The original artifact is not assumed recoverable.

Current tooling passed validation-only deterministic assembly twice, preserved 422 protected files, reused the frozen Spectre fixture, proved exact local-candidate rollback and rejected production preflight. Local candidate rollback does not prove restoration of the current live deployment. Interruption/recovery guards remain covered by the focused suite.

Local Node 22 results: 370/370 tests, nine network-denial probes and synthetic demonstration passed. Raw diagnostics are retained in the recovery ZIP. Engineering CI is scoped only to `atlas/phase2g-certification-closure`, has read-only contents permissions, no secrets, Pages, OIDC or artifacts, and invokes inherited network denial. The production workflow and all `dist/` files are unchanged.

## Practical next decision

Run the owner browser package and review genuine results. Separately authorise a **baseline-adoption review** for the explicitly reconstructed, owner-reviewed candidate if the historical inputs are irrecoverable. Such an approval must identify the new baseline and content dispositions; it must not falsely authenticate old deployment bytes or imply publication authority. Production deployment, main changes and any future live/backend verification require their own gates.

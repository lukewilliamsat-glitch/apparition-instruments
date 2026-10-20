# BLACKBOX 32 — partial engineering acceptance

Authorisation 32, 20 October 2026. **PARTIAL ACCEPTANCE; no production authority.**

Branch: `engineering/blackbox32-browser-acceptance`.

Verified production reference: `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`.
Frozen BLACKBOX 31: commit `baf899a62863998b749bca8387793a6b1ed5db61`, tree `8597a99b14e663613ae0749c546a7db56c096654`. All 914 local Git blobs reproduced that exact tree before acceptance; the original workspace remains intact.

Tested successor source commit: `c7c6bdf565ba727426344dbe154251e387f637ae`, tree `d2c33cc7fc3607b663fe03ed6c1765b65ad25334`. Its three changed blobs were independently verified through GitHub against the tested files. The subsequent evidence commit changes only this documentation directory. The branch commit/tree is the final release identity; this document does not attempt a self-referential commit hash.

## Executed result

- Exact frozen B31: all seven required suite invocations pass under isolated official Node 22.20.0.
- Additional adversarial cases initially expose three failed assertions across two related application-integrity defects. Source binding and cache-contract separation are corrected in one application file.
- Final source: **8/8 suite invocations pass: 25 original focused cases, 16 additional cases, six existing regression suites. Six process-network-denial probes pass.**
- Three capture-disabled fixture assemblies retain both historical versions, perform zero new source-image reads and preserve current prices/stock during image-only rollback.
- Real browser, visual/interaction and HTTP-cache acceptance: **BLOCKED / NOT EXECUTED**. Supported Chrome controls provide no documented disposable-profile or outbound isolation facility. No application fixture or production page was opened.

Only `dist/backend/catalogue-image-delivery.mjs` changes application behaviour, on the inactive candidate path. The production switch remains `enabled:false`. Admin, checkout, generator, archive modules, SQL, Edge Functions and the Pages workflow remain unchanged from B31. No workflow was installed or dispatched.

## Evidence

- [Node 22 results and acquisition provenance](NODE22_RESULTS.md)
- [Browser limitation and unexecuted matrix](BROWSER_ACCEPTANCE.md)
- [Synthetic requests, bytes and cache limits](NETWORK_AND_CACHE.md)
- [Executed final regression results](REGRESSION_RESULTS.json)
- [Frozen-candidate Node 22 baseline](NODE22_BASELINE.json)
- [Pre-correction failing cases](HARDENING_BEFORE.json)
- [Source preservation and fingerprints](PRESERVATION.json)
- [Remaining production gates](RELEASE_READINESS.md)

Reproduction in an authorised Linux x86_64 cloud environment with existing dependencies and an isolated Node 22 executable:

```sh
python3 tests/run-blackbox32.py /absolute/path/to/node22 final
```

This compiles the existing seccomp launcher and blocks network syscalls for tests and children. It performs no downloads or deployments. It writes only this branch's acceptance evidence, not frozen B31 evidence. No owner-side installation, recovery ZIP or commands are required.

Next step: obtain a supported disposable cloud browser with demonstrable fixture-only networking and execute the outstanding browser/cache/visual matrix against this exact successor source. Production gates A–E remain separately approval-gated.

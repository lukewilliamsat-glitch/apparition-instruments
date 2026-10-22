# COMMAND 03 — Operation The Bridge

**Mission: PARTIAL. Implementation and functional acceptance: PASS.** Required durable visual evidence remains incomplete: eight genuine captures were made on the isolated CI runner, but no owner-restricted destination was verified and public COMMAND 03 PNG publication was not authorised. Only capture hashes/dimensions and text diagnostics were uploaded. The original PNG bytes were not retained after runner cleanup.

## Verified source and preservation

| Reference | Commit | Tree |
|---|---|---|
| Production main, unchanged | `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f` | `eb2c9f1824602d19ed27f010cf080190a06c713e` |
| COMMAND 01, unchanged | `3b84871ccb338296b52b4fe3fe350be17284d235` | `be3867b1d1adfcf64c0783dce2e9c1e1c7eee7d3` |
| COMMAND 02 starting point, unchanged | `048824545c1fc3655778bc7cca22bc6f2e1bc447` | `720ff196024f27a4ce56cd72c857e31767bb70f5` |
| Final tested COMMAND 03 application | `53c4063cccc6be097bc53a0c04f1c9ef2c75bf7c` | `c3124dac437bb9e72e7a2d7632b1cc6f2f452b1e` |

[Engineering branch](https://github.com/lukewilliamsat-glitch/apparition-instruments/tree/engineering/command03-the-bridge). This evidence-only handover follows the tested application. The twelve source/test/workflow blob hashes in TEST_RESULTS.json define its exact tested code.

All 956 inherited COMMAND 02 files, including its ten approved screenshots and all 899 production-main files, are preserved. COMMAND 01/02 modules are composed unchanged. No unrelated workstream is merged.

## Working implementation

The bridge separates an injected identity lifecycle, independent permission authority, bounded image-free catalogue reader, on-demand detail reader, editor persistence port, image metadata and blocked production mutations.

The fixture transport uses inspected snake-case component/inventory columns. Summary pages omit full descriptions/specs, source images and private costs; fixed legacy spec hints preserve local discovery. Details load by stable identity and are shared between inspector/initial editor opening. Review forces fresh authority. No per-keystroke reads or new polling.

Permission, session generation, product identity and malformed-response guards operate inside the adapter and fixture authority, independently of visible controls. Expired/revoked sessions stop protected operations; local drafts remain scoped to the original identity. An authentication generation must finish a fresh catalogue load before protected presentation reappears.

Version-aware writes remain **synthetic only**. The production-shaped default is read-only and its read identity is not CAS. The inspected real Admin save is sequential across tables and has no verified equivalent component version/idempotency/atomic command. No production URL, client import, credential, SQL or live transport is added.

## Final acceptance

[Run 39766989517](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39766989517): **SUCCESS**, Node **22.20.0**, Chrome **155.0.8059.84**, Ubuntu 24.04 hosted runner.

| Suite | Node passed / failed | Real Chrome groups passed / failed |
|---|---:|---:|
| COMMAND 03 | 59 / 0 | 35 / 0 |
| Inherited COMMAND 01 | 42 / 0 | 32 / 0 |
| Inherited COMMAND 02 | 54 / 0 | 39 / 0 |

Ten pre-application browser isolation controls passed, including IPv4/IPv6, DNS, direct-IP, redirect, script/image/frame/worker/WebSocket and navigation probes. Kernel namespaces, only-loopback routes, inherited-child proof, clean environment and a sandboxed disposable Chrome are recorded. Application requests stayed on its single fixture origin; zero application fetch/XHR/image/WebSocket or production calls, console errors or unhandled page errors.

All five viewport widths, 200% text/reduced motion and 14/100/500-product workloads pass. This is synthetic functional acceptance, not production security, billed egress, comprehensive accessibility or owner visual certification.

## Measurements and corrections

Logical initial table reads are 2 / 3 / 11 for 14 / 100 / 500 products; first detail requires 2 reads shared by inspector and editor; review 2 fresh reads; typing 0; save 1 synthetic command, never an automatic retry. Full-page boundaries use one empty lookahead query. A successful UI save also refreshes the list and, when needed, its selected inspector; the Node postSaveList metric covers only the explicit list operation, not that whole UI sequence. Real authenticated membership/permission calls are not measured here.

Normalised summary JSON is 5,004 / 36,138 / 181,409 raw bytes, locally gzip 939 / 1,717 / 4,969 bytes. These are normalised synthetic model sizes, not measured HTTP bodies or billing. Artificial highly compressible embedded-image comparisons and exact timings are retained in TEST_RESULTS.json; no monthly saving is inferred.

Hardening corrected: a session-loss discard guard, fresh-generation presentation, long sticky inspector reachability and the default read-only list/detail identity. The failed 500-product browser attempt is recorded in CI history; final regressions pass.

## Durable evidence and next gate

- [Source authority](SOURCE_AUTHORITY.md)
- [Adapter architecture](ADAPTER_ARCHITECTURE.md)
- [Security matrix](SECURITY_MATRIX.md)
- [Versioning and writes](VERSIONING_AND_WRITES.md)
- [Browser acceptance and capture status](BROWSER_ACCEPTANCE.md)
- [Executed results / source manifest](TEST_RESULTS.json)
- [Release gates](RELEASE_GATES.md)

[Verified text artifact](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39766989517/artifacts/12420970795): ID 12420970795, 20,836 bytes, SHA-256 `8ebe26669611ca8cb0064971530d62c9958f13496c23a7a703eefa9560c66882`; expires **21 November 2026**. Full archive hash, CRC, no-PNG contents and report source identities were checked. Tests/capture fingerprints are also preserved in Git; no owner download or local installation is required.

Authorisation 39 section 17 does not extend COMMAND 02's exact-public-PNG approval to this mission. Public repository artifact login requirements do not establish an owner-private evidence store. No PNG upload, re-encoding or alternative publication mechanism was attempted.

The smallest next approval is a bounded **fresh capture and approved durable visual-evidence retention pass** against this frozen source. Existing capture fingerprints cannot reconstruct deleted original runner PNGs. Then complete owner review and separately scope real authenticated read/write contract security design. No automatic COMMAND 04 or production work.

Supabase, Stripe, live storefront, real authentication, business records, source images, email, deployments, production workflows, main and frozen branches remain untouched. Current production health and deployed database permissions were not verified.

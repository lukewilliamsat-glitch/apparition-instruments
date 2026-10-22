# COMMAND 03 real-Chrome acceptance

## Executed identity

[Final successful CI](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39766989517), job `119784786896`, source `53c4063cccc6be097bc53a0c04f1c9ef2c75bf7c`, tree `c3124dac437bb9e72e7a2d7632b1cc6f2f452b1e`.

Node **22.20.0**, hosted Chrome **155.0.8059.84**, Ubuntu 24.04. Pinned playwright-core 1.56.1 controller uses the same published-integrity check as COMMAND 01/02. An independent hosted Chrome binary hash is not claimed. GitHub action-runtime deprecation notices are separate from the verified Node 22 application/test runtime.

## Isolation

The inherited Stage A executes before any application fixture. Linux namespace `net:[4026532318]` has only loopback and no external routes. Direct TEST-NET IPv4/IPv6 socket attempts return ENETUNREACH; a child confirms the same namespace. Tests run unprivileged with cleared environment, disposable HOME/profile and browser sandbox. Service workers/extensions/background networking are disabled, with an additional single-origin request guard.

**10/10 negative controls blocked**: HTTP IPv4/IPv6, synthetic DNS, image, redirect, WebSocket, script, worker, frame and navigation. Local fixture access succeeds. No production endpoint is a probe target.

Final COMMAND 03 network: 771 logged static resource requests, one origin, no fetch/XHR/image/WebSocket; all 771 responses are fixture-origin. No console errors, unhandled page errors or production requests. Complete logs remain in the verified text artifact; Git retains a compact network summary.

## Executed results

**35/35 COMMAND 03 Chrome groups pass**. Inherited COMMAND 01 **32/32**, COMMAND 02 **39/39**, same job. Node counts are 59/42/54, all passing.

The final suite exercises unauthenticated startup; synthetic authorisation; least-data catalogue and local filters; shared detail/editor opening; actual reviewed save; bypass-resistant write denial; read-only membership; expiry/revocation; identity-scoped retained drafts; stale reads; version conflict/reload; uncertain committed writes; original-identity reconciliation; bounded read retry; malformed detail/retry; dirty selection; reversed responses; forged role; protected mutations; save failure/retry; keyboard/focus/navigation; and both added session-loss guard/fresh-catalogue regressions.

| Viewport | Document width |
|---:|---:|
| 390 | 390 |
| 768 | 768 |
| 1024 | 1024 |
| 1440 | 1440 |
| 1920 | 1920 |

Increased 200% text, reduced motion, labelled controls, native dialog focus and keyboard operation pass. This is not full WCAG, screen-reader, cross-browser or physical-device certification. Owner design approval remains separate.

The bounded desktop inspector measures 982px client height and 1127px content at 1100px viewport height. Its ordinary user-click Edit action is reachable with overflow auto, including 500 products; no forced click bypass is used.

## Synthetic workloads

| Products | Catalogue refresh ms | Logical table reads | Additional reads while typing |
|---:|---:|---:|---:|
| 14 | 17.2 | 2 | 0 |
| 100 | 28.9 | 3 | 0 |
| 500 | 105.4 | 11 | 0 |

These are single hosted-runner synthetic samples with injected transport delays, not production timing, real Supabase request counts or billed egress measurements.

## Captures and explicit incomplete retention

Eight genuine PNGs were captured from the actual interactive candidate. Dimensions, byte counts and hashes below were produced by the browser runner. They are **capture fingerprints, not downloadable files**. Original PNG bytes were confined to the ephemeral runner and were not retained after cleanup.

| Capture | Bytes | Dimensions | SHA-256 |
|---|---:|---|---|
| unauthenticated.png | 27647 | 1440 × 1100 | `5e5495e2970c77cce1bd7e55fa79f72061ef1abfcb50266c4cab054570f34bd9` |
| authorised-editor.png | 177038 | 1440 × 1100 | `93a6b84cbd5b33f0ded720b8cc421248f4ca171142c943415cfc1c55bc021e38` |
| write-denied.png | 155632 | 1440 × 1100 | `f7fc5a661622c9bb784995d36b51cb1d226bd43166677f6f8fb27c9cfce4bc0b` |
| expired-draft-retained.png | 26759 | 1440 × 1100 | `55935965a70d58a73b6fa7dfa90ac674ae86a3a8e00b128d13726695922044fc` |
| version-conflict.png | 179251 | 1440 × 1100 | `688059affb44c818ae24577fbefcd32fb94f9c2825799e21854da72dc43e0a0c` |
| uncertain-save.png | 158343 | 1440 × 1100 | `d02867c53d8d6b6fbf4062dcf23d4abfea98fcbcf386ce670cbb8a252f2f18b0` |
| mobile-editor.png | 56792 | 390 × 1100 | `9be734bf45455b66718feaca074b2f6f095f7a8a9bfa1f3b411002e0626c23f4` |
| tablet-editor.png | 70062 | 768 × 1100 | `f191c0f3e235e52ad5428626ba7aa54bbb2ee82821a441ac028aa31a6d2a8ec7` |

No COMMAND 03 SCREENSHOTS directory or PNG exists in Git or uploaded artifacts. The public repository offers no verified owner-restricted artifact destination. Authorisation 38A covers ten exact COMMAND 02 payloads only; it is not used to publish these new states. No alternative encoding or upload mechanism was attempted.

The [final text artifact](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39766989517/artifacts/12420970795) contains fourteen JSON/text files and no PNGs. SHA-256 `8ebe26669611ca8cb0064971530d62c9958f13496c23a7a703eefa9560c66882`, 20,836 bytes, expires 21 November 2026. All original compact results/capture fingerprints are preserved in TEST_RESULTS.json as well.

**Functional acceptance PASS; mission PARTIAL while durable visual evidence is incomplete.** A new separately approved capture/retention run is needed; these hashes cannot recover the original runner bytes. Existing COMMAND 02 approved screenshots remain intact at their frozen reference.

## CI history

| Run | Source | Result |
|---|---|---|
| 39765612727 | 1c00e710dbe7574d3c09c3af5ef32c6082d65786 | PASS: 57 Node / 32 new Chrome |
| 39766118610 | 174d24df3418fe97cbed1eede3972102a3c6adb0 | 58 Node pass; 33/34 Chrome; 500-product sticky-inspector action unreachable |
| 39766588380 | 1ad6e623d00dce3bbc9abc7a3a776fc24749721e | PASS: 58 Node / 35 Chrome after scoped inspector fix |
| 39766989517 | 53c4063cccc6be097bc53a0c04f1c9ef2c75bf7c | PASS: 59 Node / 35 Chrome after read-only display-identity regression |

All runs are exact-branch synthetic acceptance, not deployment. The final run is authoritative for the frozen application.

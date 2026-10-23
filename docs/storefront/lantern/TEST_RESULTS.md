# Executed acceptance

**Overall PARTIAL. Offline acceptance PASS. Browser, full DOM integration and Node 22 acceptance outstanding.**

Tested commit `41887b3214a526bd69ca8e3e01d6dec4890cf340`, tree `a2eab9cbbc856821c68fa4d476086ce21aa77fa4`. The GitHub-created tree matched the independently staged local Git tree before publication. Following scratch-session loss, that exact commit was cloned again, checked out with no modifications and the full offline run repeated successfully. No results are inferred from the lost temporary files. The retained JSON contains this fresh execution.

Runtime: Node **24.19.0**, Python **3.12.14**, Linux x86_64. Commands and verbatim stdout/stderr are retained in [TEST_RESULTS.json](TEST_RESULTS.json).

| Executed suite/check | Result | Scope |
| --- | --- | --- |
| `tests/lantern/startup.mjs` | PASS — 83 checks | Node VM, real public repository/response validation and unchanged catalogue source; behavioural DOM double/stub renderer |
| `tests/p07b-checkout.mjs` | PASS, unchanged | Fictional checkout provider; authoritative amounts, restricted-key/GB requirements and mixed baskets |
| `tests/p07b2-checkout-status.mjs` | PASS, unchanged | Mocked session lookup; independently verified paid/fulfilled status |
| `tests/operations-v1-checkout.mjs` | PASS, unchanged | Fictional Operations/service guard; denial and safe failure; no Stripe request |
| `tests/egress-cache-browser.mjs` | PASS, unchanged | Node test doubles despite its filename/stdout; cache reuse/expiry/invalidation, no genuine browser |
| `tests/product-content.mjs` | PASS, unchanged | Product-content validation/presentation functions; preserved prices/stock/images/kit data |
| `tests/lantern/source-integrity.py` | PASS | 899 baseline files; 880 unchanged; 19 exact allowlisted modifications; no workflow change |
| `node --check` on both new application modules, startup tests and updated P10C | PASS | Syntax only |

Reproduction: `python3 tests/lantern/run-offline.py /tmp/lantern-results.json`, then `python3 tests/lantern/source-integrity.py`. Do not run the production build/generator. No dependencies were added or installed.

## Startup coverage and limits

Five actual Components import-time failures are reproduced before the original status handler runs. Across four boundary route types, fixtures cover success, valid empty, 401/402/500, timeout exception, malformed JSON, non-array schema and invalid stock. Checks exercise hidden pending content, deadline/late settlement, unexpected initialisation error, safe failure text/actions, header focus preservation, content focus restoration, stored basket bytes/no storage writes, original scoped product identity, one loader/one injected transport call and successful cache reuse after repeated refreshes. All 16 HTML entry scripts and four fixed original-loader targets are checked. Real commerce functions exercise quantity/stock limits and Operations OPEN/paused/unavailable authority with fictional records.

Components VM cases execute its unchanged entry with a stub renderer. Other route boundary cases evaluate the real catalogue, **not** the complete native product/basket/checkout controllers. The kit-definition rejection path is source-reviewed and covered by generic loader rejection, not a full evaluated kit graph. These are meaningful boundary tests, not full route acceptance. Empty rendering, full event lifecycle, shipping failure, actual announcement timing, focus visibility and browser URL/layout behaviour remain open.

## Isolation established before application import

The Python runner installs a Linux seccomp filter and NoNewPrivs before exec. IPv4/IPv6 TCP/UDP socket creation all fail with EPERM; an exec child inherits denial. Only PATH/LANG/TZ are forwarded; inherited extra descriptors are closed. Socket/connect/listen/message and io_uring calls are denied. The unchanged Node offline guard additionally blocks native networking and default fetch before app imports; tests inject fictional transports. Negative controls report zero application modules opened, then all six suites execute under the same filter. No service credentials, SQL execution, live requests or real orders/payment sessions were used. Inherited stdout containing “live Checkout” names the mocked test scenario, not live execution.

This no-socket harness is appropriate for Node fixtures; it cannot serve a loopback browser and is not represented as the established isolated Chrome harness. `unshare -n -- true` still fails with Operation not permitted. No sandbox was weakened.

## Unexecuted and historical evidence

`tests/p10c-storefront-truth.mjs`, `tests/p10d-product-detail.mjs`, `tests/premium-storefront-v1.mjs` and `tests/holiday-checkout-basket.mjs` require unavailable happy-dom and remain NOT RUN. P10C's two copy expectations and two entry-script targets were explicitly updated for this correction; all its other assertions remain, with original-loader checks added. No assertion was deleted or bypassed. Node 22/Chrome are unavailable. Earlier COMMAND/SPECTRE/NOCTURNE acceptance belongs to other source identities and is not LANTERN acceptance.

Development corrections included a negative-probe string syntax error before app import and an initially mismatched non-Components VM fixture; the pinned fresh run includes their corrections. No production-code test failure is concealed as an environment pass. Full browser/DOM evidence must be supplied before release acceptance.
